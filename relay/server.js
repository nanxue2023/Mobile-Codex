import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, loadConfig } from "../lib/config.js";
import {
  atomicWriteJson,
  base64UrlEncode,
  clampText,
  createSignedToken,
  defaultHeaders,
  ensureDir,
  futureIso,
  loadJson,
  nowIso,
  randomId,
  randomToken,
  readJsonBody,
  sendJson,
  sendText,
  sha256Hex,
  verifySignedToken
} from "../lib/common.js";
import {
  cleanupChallengeStore,
  getPasskeyConfig,
  issueChallenge,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "../lib/webauthn.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../web");
const args = parseArgs(process.argv);
const configPath = args.config || path.resolve(__dirname, "../config/relay.local.json");
const loaded = loadConfig(configPath);
const config = loaded.value;
const dataDir = path.resolve(loaded.dir, config.dataDir || "./data/relay");
const statePath = path.join(dataDir, "state.json");
const headers = defaultHeaders(config.publicOrigin || "");
const terminalTaskStatuses = new Set(["completed", "failed", "rejected", "interrupted"]);
const sensitiveTaskFields = ["prompt", "summary", "outputTail", "diffText", "result", "error"];
const passkeyConfig = getPasskeyConfig(config);
const shortPairCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const adminSessionCookie = {
  name: passkeyConfig.origin.startsWith("https://") ? "__Host-mobilecodex_session" : "mobilecodex_session",
  secure: passkeyConfig.origin.startsWith("https://")
};

ensureDir(dataDir);

const state = loadJson(statePath, {
  version: 1,
  createdAt: nowIso(),
  pairings: {},
  pairRequests: {},
  agents: {},
  tasks: {},
  auth: {
    adminUserId: base64UrlEncode(randomToken(16)),
    passkeys: [],
    sessions: []
  }
});
const volatileTaskData = new Map();
const volatileAgentData = new Map();
const volatileAuthState = {
  registrationChallenges: new Map(),
  authenticationChallenges: new Map()
};

const rateState = new Map();

function persistState() {
  atomicWriteJson(statePath, state);
}

function normalizeLoadedState() {
  const now = nowIso();
  state.pairings ||= {};
  state.pairRequests ||= {};
  state.agents ||= {};
  state.tasks ||= {};
  state.auth ||= {};
  state.auth.adminUserId ||= base64UrlEncode(randomToken(16));
  state.auth.passkeys = Array.isArray(state.auth.passkeys) ? state.auth.passkeys : [];
  state.auth.sessions = Array.isArray(state.auth.sessions) ? state.auth.sessions : [];

  for (const task of Object.values(state.tasks)) {
    for (const field of sensitiveTaskFields) {
      delete task[field];
    }
    if (!terminalTaskStatuses.has(task.status)) {
      task.status = "interrupted";
      task.updatedAt = now;
    }
  }
}

normalizeLoadedState();
persistState();

function cleanupState() {
  const now = Date.now();
  cleanupChallengeStore(volatileAuthState.registrationChallenges);
  cleanupChallengeStore(volatileAuthState.authenticationChallenges);
  for (const [pairingId, pairing] of Object.entries(state.pairings)) {
    if (Date.parse(pairing.expiresAt) <= now || pairing.usedAt || pairing.revokedAt) {
      delete state.pairings[pairingId];
    }
  }
  for (const [requestId, request] of Object.entries(state.pairRequests)) {
    const expiresAt = Date.parse(request.expiresAt || "");
    const terminalAt = Date.parse(request.completedAt || request.rejectedAt || "");
    const expired = Number.isFinite(expiresAt) && expiresAt <= now;
    const oldTerminal = request.status !== "pending" && Number.isFinite(terminalAt) && terminalAt <= now - 24 * 60 * 60 * 1000;
    if (expired || oldTerminal) {
      delete state.pairRequests[requestId];
    }
  }
  state.auth.sessions = state.auth.sessions.filter((session) => Date.parse(session.expiresAt || "") > now);
}

function rateLimit(key, maxPerMinute) {
  const minute = Math.floor(Date.now() / 60000);
  const bucketKey = `${key}:${minute}`;
  const count = rateState.get(bucketKey) || 0;
  if (count >= maxPerMinute) {
    return false;
  }
  rateState.set(bucketKey, count + 1);
  return true;
}

function issueSessionToken(role, subject, ttlSec = config.sessionTtlSec || 43200) {
  return createSignedToken(
    {
      role,
      sub: subject,
      exp: Math.floor(Date.now() / 1000) + ttlSec
    },
    config.tokenSecret
  );
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function adminSessionCookieHeader(token, maxAgeSec = config.sessionTtlSec || 43200) {
  return [
    `${adminSessionCookie.name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Number(maxAgeSec) || 0)}`,
    ...(adminSessionCookie.secure ? ["Secure"] : [])
  ].join("; ");
}

function clearAdminSessionCookieHeader() {
  return [
    `${adminSessionCookie.name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    ...(adminSessionCookie.secure ? ["Secure"] : [])
  ].join("; ");
}

function issueAdminSession() {
  cleanupState();
  const sessionToken = randomToken(24);
  state.auth.sessions.push({
    sessionIdHash: sha256Hex(sessionToken),
    createdAt: nowIso(),
    expiresAt: futureIso(config.sessionTtlSec || 43200)
  });
  if (state.auth.sessions.length > 16) {
    state.auth.sessions = state.auth.sessions
      .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || ""))
      .slice(0, 16);
  }
  persistState();
  return sessionToken;
}

function findAdminSession(sessionToken) {
  const tokenHash = sha256Hex(String(sessionToken || ""));
  const session = state.auth.sessions.find((item) => item.sessionIdHash === tokenHash);
  if (!session) {
    return null;
  }
  if (Date.parse(session.expiresAt || "") <= Date.now()) {
    state.auth.sessions = state.auth.sessions.filter((item) => item.sessionIdHash !== tokenHash);
    persistState();
    return null;
  }
  return session;
}

function revokeAdminSession(sessionToken) {
  const tokenHash = sha256Hex(String(sessionToken || ""));
  const next = state.auth.sessions.filter((item) => item.sessionIdHash !== tokenHash);
  if (next.length === state.auth.sessions.length) {
    return false;
  }
  state.auth.sessions = next;
  persistState();
  return true;
}

function summarizePasskey(passkey) {
  return {
    credentialId: passkey.credentialId,
    label: passkey.label || "Passkey",
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt || null,
    transports: Array.isArray(passkey.transports) ? passkey.transports : []
  };
}

function authSummary() {
  return {
    passkeysEnabled: passkeyConfig.enabled,
    hasPasskeys: state.auth.passkeys.length > 0,
    passkeyCount: state.auth.passkeys.length,
    recoveryLoginEnabled: true,
    origin: passkeyConfig.origin,
    rpId: passkeyConfig.rpId,
    sessionCookieName: adminSessionCookie.name,
    passkeys: state.auth.passkeys.map(summarizePasskey)
  };
}

function takeActiveChallenge(store, challengeId) {
  const key = String(challengeId || "");
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry;
}

function randomShortPairCode(length = 8) {
  const values = Buffer.from(randomToken(length), "hex");
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += shortPairCodeAlphabet[values[index] % shortPairCodeAlphabet.length];
  }
  return `${output.slice(0, 4)}-${output.slice(4)}`;
}

function normalizePairingCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "");
}

function parseBearer(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

function requireRole(req, res, expectedRole) {
  if (expectedRole === "admin") {
    const sessionToken = parseCookies(req)[adminSessionCookie.name] || "";
    if (sessionToken) {
      const session = findAdminSession(sessionToken);
      if (!session) {
        sendJson(
          res,
          401,
          { error: "invalid-session" },
          {
            ...headers,
            "set-cookie": clearAdminSessionCookieHeader()
          }
        );
        return null;
      }
      return {
        role: "admin",
        sub: "mobile-admin",
        sessionIdHash: session.sessionIdHash
      };
    }
  }

  const token = parseBearer(req);
  if (!token) {
    sendJson(res, 401, { error: expectedRole === "admin" ? "missing-session" : "missing-token" }, headers);
    return null;
  }

  const verified = verifySignedToken(token, config.tokenSecret);
  if (!verified.ok || verified.payload.role !== expectedRole) {
    sendJson(res, 401, { error: "invalid-token", detail: verified.reason || "role-mismatch" }, headers);
    return null;
  }

  if (expectedRole === "agent") {
    const agent = state.agents[verified.payload.sub];
    if (!agent || agent.revokedAt || agent.tokenHash !== sha256Hex(token)) {
      sendJson(res, 401, { error: "agent-revoked" }, headers);
      return null;
    }
  }

  return verified.payload;
}

function sanitizeAgent(agent) {
  const volatile = volatileAgentData.get(agent.agentId) || {};
  return {
    agentId: agent.agentId,
    label: agent.label,
    createdAt: agent.createdAt,
    lastSeenAt: agent.lastSeenAt,
    revokedAt: agent.revokedAt,
    features: agent.features || {},
    actions: agent.actions || [],
    logSources: agent.logSources || [],
    workspaceRootName: agent.workspaceRootName || "",
    codexSessions: Array.isArray(volatile.codexSessions) ? volatile.codexSessions : []
  };
}

function sanitizeSessionPreviewItem(item) {
  return {
    role: item?.role === "assistant" ? "assistant" : "user",
    text: clampText(String(item?.text || ""), 320),
    timestamp: typeof item?.timestamp === "string" ? item.timestamp : nowIso()
  };
}

function sanitizeSessionSummary(session) {
  return {
    sessionId: clampText(String(session?.sessionId || ""), 120),
    title: clampText(String(session?.title || "Codex Session"), 180),
    firstUserMessage: clampText(String(session?.firstUserMessage || ""), 240),
    updatedAt: typeof session?.updatedAt === "string" ? session.updatedAt : nowIso(),
    createdAt: typeof session?.createdAt === "string" ? session.createdAt : nowIso(),
    cwd: clampText(String(session?.cwd || "."), 180),
    source: clampText(String(session?.source || ""), 24),
    preview: Array.isArray(session?.preview) ? session.preview.slice(-4).map(sanitizeSessionPreviewItem) : []
  };
}

function sanitizePairRequest(request) {
  return {
    requestId: request.requestId,
    pairingId: request.pairingId,
    status: request.status,
    note: request.note || "",
    agentId: request.agentId,
    label: request.label,
    hostname: request.hostname || "",
    workspaceRootName: request.workspaceRootName || "",
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    approvedAt: request.approvedAt || null,
    rejectedAt: request.rejectedAt || null
  };
}

function sanitizeTask(task) {
  const volatile = volatileTaskData.get(task.taskId) || {};
  return {
    taskId: task.taskId,
    agentId: task.agentId,
    type: task.type,
    title: task.title,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    needsApproval: task.needsApproval,
    approvedAt: task.approvedAt || null,
    rejectedAt: task.rejectedAt || null,
    writeAccess: !!task.writeAccess,
    resumeSessionId: task.resumeSessionId || "",
    sessionId: task.sessionId || "",
    summary: volatile.summary || "",
    prompt: volatile.prompt || "",
    actionId: task.actionId || "",
    logSourceId: task.logSourceId || "",
    cwd: task.cwd || ".",
    outputTail: volatile.outputTail || "",
    result: volatile.result || null,
    error: volatile.error || "",
    diffText: volatile.diffText || ""
  };
}

function listState() {
  cleanupState();
  persistState();
  return {
    now: nowIso(),
    features: config.features,
    web: config.web || {},
    auth: authSummary(),
    pendingPairRequests: Object.values(state.pairRequests)
      .filter((request) => request.status === "pending")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 20)
      .map(sanitizePairRequest),
    agents: Object.values(state.agents).map(sanitizeAgent).sort((a, b) => a.agentId.localeCompare(b.agentId)),
    tasks: Object.values(state.tasks)
      .map(sanitizeTask)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 100)
  };
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(webRoot, `.${safePath}`);
  if (!filePath.startsWith(webRoot)) {
    sendText(res, 403, "forbidden", headers);
    return;
  }

  try {
    const body = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".webmanifest": "application/manifest+json; charset=utf-8",
      ".png": "image/png"
    };
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "content-length": body.length,
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=300",
      ...headers
    });
    res.end(body);
  } catch {
    sendText(res, 404, "not-found", headers);
  }
}

function requireTask(taskId, res) {
  const task = state.tasks[taskId];
  if (!task) {
    sendJson(res, 404, { error: "task-not-found" }, headers);
    return null;
  }
  return task;
}

function taskNeedsApproval(type) {
  if (type === "codex_exec" || type === "delete_session") {
    return false;
  }
  return true;
}

function createTask(body, res) {
  const allowedTypes = new Set(["codex_exec", "run_action", "read_log", "delete_session"]);
  if (!allowedTypes.has(body.type)) {
    sendJson(res, 400, { error: "unsupported-task-type" }, headers);
    return;
  }

  if (body.type === "codex_exec" && !config.features.codexExec) {
    sendJson(res, 403, { error: "feature-disabled" }, headers);
    return;
  }
  if (body.type === "run_action" && !config.features.runAction) {
    sendJson(res, 403, { error: "feature-disabled" }, headers);
    return;
  }
  if (body.type === "read_log" && !config.features.readLog) {
    sendJson(res, 403, { error: "feature-disabled" }, headers);
    return;
  }
  if (body.type === "delete_session" && config.features.deleteSession === false) {
    sendJson(res, 403, { error: "feature-disabled" }, headers);
    return;
  }

  const agent = state.agents[body.agentId];
  if (!agent || agent.revokedAt) {
    sendJson(res, 400, { error: "agent-not-available" }, headers);
    return;
  }

  const writeAccess = !!body.writeAccess;
  if (body.type === "codex_exec" && writeAccess && !config.features.codexExecWrite) {
    sendJson(res, 403, { error: "write-mode-disabled" }, headers);
    return;
  }

  const taskId = randomId("task");
  const createdAt = nowIso();
  const resumeSessionId = body.type === "codex_exec" ? String(body.resumeSessionId || "").slice(0, 120) : "";
  const sessionId = body.type === "delete_session" ? String(body.sessionId || "").slice(0, 120) : "";
  state.tasks[taskId] = {
    taskId,
    agentId: body.agentId,
    type: body.type,
    title: body.title || body.type,
    actionId: body.actionId || "",
    logSourceId: body.logSourceId || "",
    resumeSessionId,
    sessionId,
    cwd: body.cwd || ".",
    writeAccess,
    needsApproval: taskNeedsApproval(body.type),
    status: taskNeedsApproval(body.type) ? "awaiting_approval" : "queued",
    createdAt,
    updatedAt: createdAt
  };
  volatileTaskData.set(taskId, {
    prompt: body.prompt || "",
    summary: "",
    outputTail: "",
    diffText: "",
    result: null,
    error: ""
  });
  persistState();
  sendJson(res, 201, { ok: true, task: sanitizeTask(state.tasks[taskId]) }, headers);
}

function updateTaskDecision(task, approved) {
  if (task.status !== "awaiting_approval") {
    return false;
  }
  task.updatedAt = nowIso();
  if (approved) {
    task.status = "queued";
    task.approvedAt = nowIso();
  } else {
    task.status = "rejected";
    task.rejectedAt = nowIso();
  }
  persistState();
  return true;
}

function handleTaskUpdate(task, body, agentPayload, res) {
  if (task.agentId !== agentPayload.sub) {
    sendJson(res, 403, { error: "agent-mismatch" }, headers);
    return;
  }

  if (body.status) {
    task.status = body.status;
  }
  task.updatedAt = nowIso();
  const volatile = volatileTaskData.get(task.taskId) || {
    prompt: "",
    summary: "",
    outputTail: "",
    diffText: "",
    result: null,
    error: ""
  };
  if (typeof body.summary === "string") {
    volatile.summary = clampText(body.summary, 2048);
  }
  if (typeof body.outputAppend === "string") {
    volatile.outputTail = clampText(`${volatile.outputTail || ""}${body.outputAppend}`, 12000);
  }
  if (typeof body.diffText === "string") {
    volatile.diffText = clampText(body.diffText, 20000);
  }
  if (body.result && typeof body.result === "object") {
    volatile.result = body.result;
  }
  if (typeof body.error === "string") {
    volatile.error = clampText(body.error, 4000);
  }
  volatileTaskData.set(task.taskId, volatile);
  persistState();
  sendJson(res, 200, { ok: true }, headers);
}

function updatePairRequestDecision(request, approved) {
  if (request.status !== "pending") {
    return false;
  }
  if (approved) {
    request.status = "approved";
    request.approvedAt = nowIso();
  } else {
    request.status = "rejected";
    request.rejectedAt = nowIso();
  }
  persistState();
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...headers,
      "access-control-allow-origin": config.publicOrigin || "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization"
    });
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, now: nowIso() }, headers);
      return;
    }

    if (req.method === "GET" && pathname === "/api/auth/status") {
      const sessionToken = parseCookies(req)[adminSessionCookie.name] || "";
      sendJson(
        res,
        200,
        {
          ok: true,
          authenticated: !!findAdminSession(sessionToken),
          auth: authSummary()
        },
        headers
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const ip = req.socket.remoteAddress || "unknown";
      if (!rateLimit(`login:${ip}`, config.maxLoginAttemptsPerMinute || 10)) {
        sendJson(res, 429, { error: "rate-limited" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      if (!body.bootstrapToken || sha256Hex(body.bootstrapToken) !== config.bootstrapAdminTokenHash) {
        sendJson(res, 401, { error: "invalid-bootstrap-token" }, headers);
        return;
      }
      const sessionToken = issueAdminSession();
      sendJson(
        res,
        200,
        { ok: true, auth: authSummary() },
        {
          ...headers,
          "set-cookie": adminSessionCookieHeader(sessionToken)
        }
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      const sessionToken = parseCookies(req)[adminSessionCookie.name] || "";
      if (sessionToken) {
        revokeAdminSession(sessionToken);
      }
      sendJson(
        res,
        200,
        { ok: true },
        {
          ...headers,
          "set-cookie": clearAdminSessionCookieHeader()
        }
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/passkeys/register/options") {
      const admin = requireRole(req, res, "admin");
      if (!admin) {
        return;
      }
      if (!passkeyConfig.enabled) {
        sendJson(res, 403, { error: "passkeys-disabled" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      const issued = issueChallenge(volatileAuthState.registrationChallenges, passkeyConfig.challengeTtlMs, {
        adminSessionRef: admin.sessionIdHash || sha256Hex(parseBearer(req) || ""),
        label: clampText(String(body.label || "Passkey"), 80)
      });
      const publicKey = {
        challenge: issued.challenge,
        rp: {
          id: passkeyConfig.rpId,
          name: passkeyConfig.rpName
        },
        user: {
          id: state.auth.adminUserId,
          name: "mobile-admin",
          displayName: "Mobile Codex Admin"
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        timeout: passkeyConfig.timeoutMs,
        attestation: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: passkeyConfig.userVerification
        },
        excludeCredentials: state.auth.passkeys.map((passkey) => ({
          type: "public-key",
          id: passkey.credentialId,
          transports: Array.isArray(passkey.transports) ? passkey.transports : []
        }))
      };
      sendJson(res, 200, { ok: true, registrationId: issued.challengeId, publicKey }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/passkeys/register/verify") {
      const admin = requireRole(req, res, "admin");
      if (!admin) {
        return;
      }
      if (!passkeyConfig.enabled) {
        sendJson(res, 403, { error: "passkeys-disabled" }, headers);
        return;
      }
      const body = await readJsonBody(req, 65536);
      const registration = takeActiveChallenge(volatileAuthState.registrationChallenges, body.registrationId);
      const adminSessionRef = admin.sessionIdHash || sha256Hex(parseBearer(req) || "");
      if (!registration || registration.adminSessionRef !== adminSessionRef) {
        sendJson(res, 400, { error: "registration-not-found" }, headers);
        return;
      }
      volatileAuthState.registrationChallenges.delete(String(body.registrationId || ""));
      let verified;
      try {
        verified = verifyRegistrationResponse({
          credential: body.credential,
          expectedChallenge: registration.challenge,
          expectedOrigin: passkeyConfig.origin,
          expectedRpId: passkeyConfig.rpId,
          userVerification: passkeyConfig.userVerification
        });
      } catch (error) {
        sendJson(res, 400, { error: "passkey-registration-invalid", detail: String(error.message || error) }, headers);
        return;
      }
      if (state.auth.passkeys.some((passkey) => passkey.credentialId === verified.credentialId)) {
        sendJson(res, 409, { error: "passkey-already-registered" }, headers);
        return;
      }
      state.auth.passkeys.push({
        credentialId: verified.credentialId,
        publicKeySpki: verified.publicKeySpki,
        signCount: verified.signCount,
        label: registration.label || "Passkey",
        createdAt: nowIso(),
        lastUsedAt: null,
        transports: verified.transports
      });
      persistState();
      sendJson(res, 200, { ok: true, auth: authSummary() }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/passkeys/login/options") {
      if (!passkeyConfig.enabled) {
        sendJson(res, 403, { error: "passkeys-disabled" }, headers);
        return;
      }
      if (state.auth.passkeys.length === 0) {
        sendJson(res, 400, { error: "no-passkeys-registered" }, headers);
        return;
      }
      const ip = req.socket.remoteAddress || "unknown";
      if (!rateLimit(`passkey-login:${ip}`, config.maxLoginAttemptsPerMinute || 10)) {
        sendJson(res, 429, { error: "rate-limited" }, headers);
        return;
      }
      const issued = issueChallenge(volatileAuthState.authenticationChallenges, passkeyConfig.challengeTtlMs, {
        ip
      });
      const publicKey = {
        challenge: issued.challenge,
        rpId: passkeyConfig.rpId,
        timeout: passkeyConfig.timeoutMs,
        userVerification: passkeyConfig.userVerification,
        allowCredentials: state.auth.passkeys.map((passkey) => ({
          type: "public-key",
          id: passkey.credentialId,
          transports: Array.isArray(passkey.transports) ? passkey.transports : []
        }))
      };
      sendJson(res, 200, { ok: true, loginId: issued.challengeId, publicKey }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/passkeys/login/verify") {
      if (!passkeyConfig.enabled) {
        sendJson(res, 403, { error: "passkeys-disabled" }, headers);
        return;
      }
      const ip = req.socket.remoteAddress || "unknown";
      if (!rateLimit(`passkey-verify:${ip}`, config.maxLoginAttemptsPerMinute || 10)) {
        sendJson(res, 429, { error: "rate-limited" }, headers);
        return;
      }
      const body = await readJsonBody(req, 65536);
      const login = takeActiveChallenge(volatileAuthState.authenticationChallenges, body.loginId);
      if (!login) {
        sendJson(res, 400, { error: "login-not-found" }, headers);
        return;
      }
      volatileAuthState.authenticationChallenges.delete(String(body.loginId || ""));
      const credentialId = String(body.credential?.id || body.credential?.rawId || "");
      const passkey = state.auth.passkeys.find((item) => item.credentialId === credentialId);
      if (!passkey) {
        sendJson(res, 401, { error: "unknown-passkey" }, headers);
        return;
      }
      let verified;
      try {
        verified = verifyAuthenticationResponse({
          credential: body.credential,
          storedCredential: passkey,
          expectedChallenge: login.challenge,
          expectedOrigin: passkeyConfig.origin,
          expectedRpId: passkeyConfig.rpId,
          userVerification: passkeyConfig.userVerification
        });
      } catch (error) {
        sendJson(res, 401, { error: "passkey-login-invalid", detail: String(error.message || error) }, headers);
        return;
      }
      passkey.signCount = verified.signCount;
      passkey.lastUsedAt = nowIso();
      persistState();
      const sessionToken = issueAdminSession();
      sendJson(
        res,
        200,
        { ok: true, auth: authSummary() },
        {
          ...headers,
          "set-cookie": adminSessionCookieHeader(sessionToken)
        }
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/agent/pair") {
      if (!config.features.pairings) {
        sendJson(res, 403, { error: "pairings-disabled" }, headers);
        return;
      }
      const ip = req.socket.remoteAddress || "unknown";
      if (!rateLimit(`pair:${ip}`, config.maxPairAttemptsPerMinute || 20)) {
        sendJson(res, 429, { error: "rate-limited" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      const pairing = Object.values(state.pairings).find(
        (item) =>
          !item.usedAt &&
          !item.revokedAt &&
          Date.parse(item.expiresAt) > Date.now() &&
          item.codeHash === sha256Hex(normalizePairingCode(body.pairingCode || ""))
      );
      if (!pairing) {
        sendJson(res, 401, { error: "invalid-pairing-code" }, headers);
        return;
      }
      const agentId = String(body.agentId || "").trim();
      if (!agentId) {
        sendJson(res, 400, { error: "missing-agent-id" }, headers);
        return;
      }
      const requestId = randomId("pairreq");
      state.pairRequests[requestId] = {
        requestId,
        pairingId: pairing.pairingId,
        status: "pending",
        accessHash: "",
        note: pairing.note || "",
        agentId,
        label: String(body.label || pairing.note || agentId).slice(0, 120),
        hostname: String(body.hostname || "").slice(0, 120),
        workspaceRootName: String(body.workspaceRootName || "").slice(0, 120),
        createdAt: nowIso(),
        expiresAt: pairing.expiresAt,
        approvedAt: null,
        rejectedAt: null,
        completedAt: null
      };
      const requestToken = randomToken(18);
      state.pairRequests[requestId].accessHash = sha256Hex(requestToken);
      pairing.usedAt = nowIso();
      persistState();
      sendJson(res, 200, { ok: true, status: "pending", requestId, requestToken, expiresAt: pairing.expiresAt }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/agent/pair/status") {
      const body = await readJsonBody(req, 4096);
      const request = state.pairRequests[String(body.requestId || "")];
      if (!request) {
        sendJson(res, 404, { error: "pair-request-not-found" }, headers);
        return;
      }
      if (request.accessHash !== sha256Hex(String(body.requestToken || ""))) {
        sendJson(res, 401, { error: "pair-request-token-invalid" }, headers);
        return;
      }
      if (request.status === "pending") {
        sendJson(res, 200, { ok: true, status: "pending" }, headers);
        return;
      }
      if (request.status === "rejected") {
        sendJson(res, 200, { ok: true, status: "rejected" }, headers);
        return;
      }
      if (request.status === "approved") {
        const token = issueSessionToken("agent", request.agentId, 60 * 60 * 24 * 30);
        state.agents[request.agentId] = {
          agentId: request.agentId,
          label: request.label,
          createdAt: nowIso(),
          lastSeenAt: nowIso(),
          revokedAt: null,
          tokenHash: sha256Hex(token),
          features: {},
          actions: [],
          logSources: [],
          workspaceRootName: request.workspaceRootName || ""
        };
        volatileAgentData.set(request.agentId, { codexSessions: [] });
        request.status = "completed";
        request.completedAt = nowIso();
        request.accessHash = "";
        persistState();
        sendJson(res, 200, { ok: true, status: "approved", token }, headers);
        return;
      }
      sendJson(res, 200, { ok: true, status: request.status }, headers);
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/state") {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      sendJson(res, 200, listState(), headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/pairings") {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const body = await readJsonBody(req, 4096);
      const code = randomShortPairCode(8);
      const pairingId = randomId("pair");
      state.pairings[pairingId] = {
        pairingId,
        note: String(body.note || "").slice(0, 120),
        codeHash: sha256Hex(normalizePairingCode(code)),
        createdAt: nowIso(),
        expiresAt: futureIso(Math.max(60, Math.min(Number(body.ttlSec || 300), 1800))),
        usedAt: null,
        revokedAt: null
      };
      persistState();
      sendJson(
        res,
        201,
        {
          ok: true,
          pairingId,
          pairingCode: code,
          expiresAt: state.pairings[pairingId].expiresAt
        },
        headers
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/tasks") {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const body = await readJsonBody(req, 16384);
      createTask(body, res);
      return;
    }

    const approveMatch = pathname.match(/^\/api\/admin\/tasks\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const task = requireTask(approveMatch[1], res);
      if (!task) {
        return;
      }
      if (!updateTaskDecision(task, true)) {
        sendJson(res, 409, { error: "task-not-awaiting-approval" }, headers);
        return;
      }
      sendJson(res, 200, { ok: true, task: sanitizeTask(task) }, headers);
      return;
    }

    const rejectMatch = pathname.match(/^\/api\/admin\/tasks\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const task = requireTask(rejectMatch[1], res);
      if (!task) {
        return;
      }
      if (!updateTaskDecision(task, false)) {
        sendJson(res, 409, { error: "task-not-awaiting-approval" }, headers);
        return;
      }
      sendJson(res, 200, { ok: true, task: sanitizeTask(task) }, headers);
      return;
    }

    const revokeMatch = pathname.match(/^\/api\/admin\/agents\/([^/]+)\/revoke$/);
    if (req.method === "POST" && revokeMatch) {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const agent = state.agents[revokeMatch[1]];
      if (!agent) {
        sendJson(res, 404, { error: "agent-not-found" }, headers);
        return;
      }
      agent.revokedAt = nowIso();
      volatileAgentData.delete(agent.agentId);
      persistState();
      sendJson(res, 200, { ok: true }, headers);
      return;
    }

    const pairApproveMatch = pathname.match(/^\/api\/admin\/pair-requests\/([^/]+)\/approve$/);
    if (req.method === "POST" && pairApproveMatch) {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const request = state.pairRequests[pairApproveMatch[1]];
      if (!request) {
        sendJson(res, 404, { error: "pair-request-not-found" }, headers);
        return;
      }
      if (!updatePairRequestDecision(request, true)) {
        sendJson(res, 409, { error: "pair-request-not-pending" }, headers);
        return;
      }
      sendJson(res, 200, { ok: true, request: sanitizePairRequest(request) }, headers);
      return;
    }

    const pairRejectMatch = pathname.match(/^\/api\/admin\/pair-requests\/([^/]+)\/reject$/);
    if (req.method === "POST" && pairRejectMatch) {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const request = state.pairRequests[pairRejectMatch[1]];
      if (!request) {
        sendJson(res, 404, { error: "pair-request-not-found" }, headers);
        return;
      }
      if (!updatePairRequestDecision(request, false)) {
        sendJson(res, 409, { error: "pair-request-not-pending" }, headers);
        return;
      }
      sendJson(res, 200, { ok: true, request: sanitizePairRequest(request) }, headers);
      return;
    }

    const passkeyRevokeMatch = pathname.match(/^\/api\/admin\/passkeys\/([^/]+)\/revoke$/);
    if (req.method === "POST" && passkeyRevokeMatch) {
      if (!requireRole(req, res, "admin")) {
        return;
      }
      const credentialId = decodeURIComponent(passkeyRevokeMatch[1]);
      const index = state.auth.passkeys.findIndex((passkey) => passkey.credentialId === credentialId);
      if (index < 0) {
        sendJson(res, 404, { error: "passkey-not-found" }, headers);
        return;
      }
      state.auth.passkeys.splice(index, 1);
      persistState();
      sendJson(res, 200, { ok: true, auth: authSummary() }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/agent/poll") {
      const agentPayload = requireRole(req, res, "agent");
      if (!agentPayload) {
        return;
      }
      const body = await readJsonBody(req, 131072);
      const agent = state.agents[agentPayload.sub];
      agent.lastSeenAt = nowIso();
      agent.label = String(body.label || agent.label || agent.agentId).slice(0, 120);
      agent.workspaceRootName = String(body.workspaceRootName || "").slice(0, 120);
      agent.features = body.features || {};
      agent.actions = Array.isArray(body.actions) ? body.actions.slice(0, 50) : [];
      agent.logSources = Array.isArray(body.logSources) ? body.logSources.slice(0, 50) : [];
      volatileAgentData.set(agent.agentId, {
        codexSessions: Array.isArray(body.codexSessions) ? body.codexSessions.slice(0, 20).map(sanitizeSessionSummary) : []
      });
      persistState();

      const tasks = Object.values(state.tasks)
        .filter((task) => task.agentId === agent.agentId && task.status === "queued")
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        .slice(0, 1);

      for (const task of tasks) {
        task.status = "running";
        task.updatedAt = nowIso();
      }
      persistState();
      sendJson(res, 200, { ok: true, tasks: tasks.map(sanitizeTask) }, headers);
      return;
    }

    const updateMatch = pathname.match(/^\/api\/agent\/tasks\/([^/]+)\/update$/);
    if (req.method === "POST" && updateMatch) {
      const agentPayload = requireRole(req, res, "agent");
      if (!agentPayload) {
        return;
      }
      const task = requireTask(updateMatch[1], res);
      if (!task) {
        return;
      }
      const body = await readJsonBody(req, 1024 * 1024);
      handleTaskUpdate(task, body, agentPayload, res);
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res, pathname);
      return;
    }

    sendJson(res, 404, { error: "not-found" }, headers);
  } catch (error) {
    sendJson(res, 500, { error: "internal-error", detail: String(error.message || error) }, headers);
  }
});

server.listen(config.listenPort, config.listenHost, () => {
  console.log(`relay listening on http://${config.listenHost}:${config.listenPort}`);
});
