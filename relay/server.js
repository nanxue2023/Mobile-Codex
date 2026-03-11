import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, loadConfig } from "../lib/config.js";
import {
  atomicWriteJson,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../web");
const args = parseArgs(process.argv);
const configPath = args.config || path.resolve(__dirname, "../config/relay.local.json");
const loaded = loadConfig(configPath);
const config = loaded.value;
const dataDir = path.resolve(loaded.dir, config.dataDir || "./data/relay");
const statePath = path.join(dataDir, "state.json");
const headers = defaultHeaders(config.publicOrigin || "");

ensureDir(dataDir);

const state = loadJson(statePath, {
  version: 1,
  createdAt: nowIso(),
  pairings: {},
  agents: {},
  tasks: {}
});

const rateState = new Map();

function persistState() {
  atomicWriteJson(statePath, state);
}

function cleanupState() {
  const now = Date.now();
  for (const [pairingId, pairing] of Object.entries(state.pairings)) {
    if (Date.parse(pairing.expiresAt) <= now || pairing.usedAt || pairing.revokedAt) {
      delete state.pairings[pairingId];
    }
  }
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

function parseBearer(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

function requireRole(req, res, expectedRole) {
  const token = parseBearer(req);
  if (!token) {
    sendJson(res, 401, { error: "missing-token" }, headers);
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
  return {
    agentId: agent.agentId,
    label: agent.label,
    createdAt: agent.createdAt,
    lastSeenAt: agent.lastSeenAt,
    revokedAt: agent.revokedAt,
    features: agent.features || {},
    actions: agent.actions || [],
    logSources: agent.logSources || [],
    workspaceRootName: agent.workspaceRootName || ""
  };
}

function sanitizeTask(task) {
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
    summary: task.summary || "",
    prompt: task.prompt || "",
    actionId: task.actionId || "",
    logSourceId: task.logSourceId || "",
    cwd: task.cwd || ".",
    outputTail: task.outputTail || "",
    result: task.result || null,
    error: task.error || "",
    diffText: task.diffText || ""
  };
}

function listState() {
  cleanupState();
  persistState();
  return {
    now: nowIso(),
    features: config.features,
    web: config.web || {},
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
  if (type === "codex_exec") {
    return false;
  }
  return true;
}

function createTask(body, res) {
  const allowedTypes = new Set(["codex_exec", "run_action", "read_log"]);
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
  state.tasks[taskId] = {
    taskId,
    agentId: body.agentId,
    type: body.type,
    title: body.title || body.type,
    prompt: body.prompt || "",
    actionId: body.actionId || "",
    logSourceId: body.logSourceId || "",
    cwd: body.cwd || ".",
    writeAccess,
    needsApproval: taskNeedsApproval(body.type),
    status: taskNeedsApproval(body.type) ? "awaiting_approval" : "queued",
    summary: "",
    outputTail: "",
    diffText: "",
    result: null,
    error: "",
    createdAt,
    updatedAt: createdAt
  };
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
  if (typeof body.summary === "string") {
    task.summary = clampText(body.summary, 2048);
  }
  if (typeof body.outputAppend === "string") {
    task.outputTail = clampText(`${task.outputTail || ""}${body.outputAppend}`, 12000);
  }
  if (typeof body.diffText === "string") {
    task.diffText = clampText(body.diffText, 20000);
  }
  if (body.result && typeof body.result === "object") {
    task.result = body.result;
  }
  if (typeof body.error === "string") {
    task.error = clampText(body.error, 4000);
  }
  persistState();
  sendJson(res, 200, { ok: true }, headers);
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
      const token = issueSessionToken("admin", "mobile-admin");
      sendJson(res, 200, { ok: true, token }, headers);
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
          item.codeHash === sha256Hex(body.pairingCode || "")
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
      const token = issueSessionToken("agent", agentId, 60 * 60 * 24 * 30);
      state.agents[agentId] = {
        agentId,
        label: String(body.label || pairing.note || agentId),
        createdAt: nowIso(),
        lastSeenAt: nowIso(),
        revokedAt: null,
        tokenHash: sha256Hex(token),
        features: {},
        actions: [],
        logSources: [],
        workspaceRootName: ""
      };
      pairing.usedAt = nowIso();
      persistState();
      sendJson(res, 200, { ok: true, token }, headers);
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
      const code = randomToken(9);
      const pairingId = randomId("pair");
      state.pairings[pairingId] = {
        pairingId,
        note: String(body.note || "").slice(0, 120),
        codeHash: sha256Hex(code),
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
      persistState();
      sendJson(res, 200, { ok: true }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/agent/poll") {
      const agentPayload = requireRole(req, res, "agent");
      if (!agentPayload) {
        return;
      }
      const body = await readJsonBody(req, 16384);
      const agent = state.agents[agentPayload.sub];
      agent.lastSeenAt = nowIso();
      agent.label = String(body.label || agent.label || agent.agentId).slice(0, 120);
      agent.workspaceRootName = String(body.workspaceRootName || "").slice(0, 120);
      agent.features = body.features || {};
      agent.actions = Array.isArray(body.actions) ? body.actions.slice(0, 50) : [];
      agent.logSources = Array.isArray(body.logSources) ? body.logSources.slice(0, 50) : [];
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
