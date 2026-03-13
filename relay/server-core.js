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
const passkeyConfig = getPasskeyConfig(config);
const shortCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roleOrder = {
  viewer: 1,
  operator: 2,
  owner: 3
};
const adminSessionCookie = {
  name: passkeyConfig.origin.startsWith("https://") ? "__Host-mobilecodex_session" : "mobilecodex_session",
  secure: passkeyConfig.origin.startsWith("https://")
};

ensureDir(dataDir);

const state = loadJson(statePath, {
  version: 4,
  createdAt: nowIso(),
  users: {},
  workspaces: {},
  memberships: {},
  invitations: {},
  recoveryCodes: {},
  pairings: {},
  pairRequests: {},
  agents: {},
  tasks: {},
  auth: {
    bootstrapUserId: "",
    adminUserIds: [],
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

function normalizeDisplayName(value, fallback = "User") {
  const trimmed = clampText(String(value || "").trim(), 80);
  return trimmed || fallback;
}

function createUser(displayName, createdAt = nowIso()) {
  const userId = randomId("user");
  state.users[userId] = {
    userId,
    userHandle: base64UrlEncode(randomToken(18)),
    displayName: normalizeDisplayName(displayName, "User"),
    createdAt,
    disabledAt: null,
    lastWorkspaceId: ""
  };
  return state.users[userId];
}

function createWorkspace(name, createdAt = nowIso()) {
  const workspaceId = randomId("ws");
  state.workspaces[workspaceId] = {
    workspaceId,
    name: clampText(String(name || "Workspace"), 80) || "Workspace",
    createdAt,
    archivedAt: null
  };
  return state.workspaces[workspaceId];
}

function activeMemberships() {
  return Object.values(state.memberships).filter(
    (membership) => membership && !membership.revokedAt && state.users[membership.userId] && state.workspaces[membership.workspaceId]
  );
}

function createMembership(userId, workspaceId, role, createdAt = nowIso()) {
  const existing = getMembership(userId, workspaceId);
  if (existing) {
    return existing;
  }
  const membershipId = randomId("membership");
  state.memberships[membershipId] = {
    membershipId,
    userId,
    workspaceId,
    role: roleOrder[role] ? role : "viewer",
    createdAt,
    revokedAt: null
  };
  return state.memberships[membershipId];
}

function userHasRoleAnywhere(userId, minimumRole = "owner") {
  return activeMemberships().some(
    (membership) => membership.userId === userId && roleAtLeast(membership.role, minimumRole)
  );
}

function firstWorkspaceIdForUser(userId) {
  const memberships = activeMemberships()
    .filter((membership) => membership.userId === userId)
    .sort((left, right) => Date.parse(left.createdAt || "") - Date.parse(right.createdAt || ""));
  return memberships[0]?.workspaceId || "";
}

function getMembership(userId, workspaceId) {
  return activeMemberships().find((membership) => membership.userId === userId && membership.workspaceId === workspaceId) || null;
}

function passkeysForUser(userId) {
  return state.auth.passkeys.filter((passkey) => passkey.userId === userId);
}

function isRelayOwner(userId) {
  const normalized = String(userId || "");
  if (!normalized) {
    return false;
  }
  return normalized === state.auth.bootstrapUserId || state.auth.adminUserIds.includes(normalized);
}

function ensureBootstrapWorkspace() {
  const now = nowIso();
  let bootstrapUserId = String(state.auth.bootstrapUserId || "").trim();
  const legacyAdminUserId = String(state.auth.adminUserId || "").trim();
  if (!bootstrapUserId || !state.users[bootstrapUserId]) {
    bootstrapUserId = legacyAdminUserId && !state.users[legacyAdminUserId] ? legacyAdminUserId : bootstrapUserId;
  }
  if (!bootstrapUserId || !state.users[bootstrapUserId]) {
    const owner = createUser("Owner", now);
    bootstrapUserId = owner.userId;
  }

  state.auth.bootstrapUserId = bootstrapUserId;
  const bootstrapUser = state.users[bootstrapUserId];
  bootstrapUser.userHandle ||= base64UrlEncode(randomToken(18));
  bootstrapUser.displayName = normalizeDisplayName(bootstrapUser.displayName, "Owner");
  bootstrapUser.createdAt ||= now;
  bootstrapUser.disabledAt ||= null;

  if (Object.keys(state.workspaces).length === 0) {
    createWorkspace("Primary", now);
  }

  const bootstrapWorkspaceId = firstWorkspaceIdForUser(bootstrapUserId) || Object.values(state.workspaces)[0]?.workspaceId || "";
  if (bootstrapWorkspaceId && !getMembership(bootstrapUserId, bootstrapWorkspaceId)) {
    createMembership(bootstrapUserId, bootstrapWorkspaceId, "owner", now);
  }
  bootstrapUser.lastWorkspaceId ||= firstWorkspaceIdForUser(bootstrapUserId) || bootstrapWorkspaceId || "";
  return bootstrapUser.lastWorkspaceId;
}

function normalizeLoadedState() {
  const now = nowIso();
  state.version = 4;
  state.createdAt ||= now;
  state.users ||= {};
  state.workspaces ||= {};
  state.memberships ||= {};
  state.invitations ||= {};
  state.recoveryCodes ||= {};
  state.pairings ||= {};
  state.pairRequests ||= {};
  state.agents ||= {};
  state.tasks ||= {};
  state.auth ||= {};
  state.auth.bootstrapUserId ||= "";
  state.auth.adminUserIds = Array.isArray(state.auth.adminUserIds)
    ? state.auth.adminUserIds.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  state.auth.passkeys = Array.isArray(state.auth.passkeys) ? state.auth.passkeys : [];
  state.auth.sessions = Array.isArray(state.auth.sessions) ? state.auth.sessions : [];

  const defaultWorkspaceId = ensureBootstrapWorkspace();
  if (!state.auth.adminUserIds.includes(state.auth.bootstrapUserId)) {
    state.auth.adminUserIds.unshift(state.auth.bootstrapUserId);
  }
  state.auth.adminUserIds = Array.from(new Set(state.auth.adminUserIds)).filter((userId) => !!state.users[userId]);

  for (const user of Object.values(state.users)) {
    user.userHandle ||= base64UrlEncode(randomToken(18));
    user.displayName = normalizeDisplayName(user.displayName, "User");
    user.createdAt ||= now;
    user.disabledAt ||= null;
    user.lastWorkspaceId ||= firstWorkspaceIdForUser(user.userId) || "";
  }

  for (const workspace of Object.values(state.workspaces)) {
    workspace.name = clampText(String(workspace.name || "Workspace"), 80) || "Workspace";
    workspace.createdAt ||= now;
    workspace.archivedAt ||= null;
  }

  for (const membership of Object.values(state.memberships)) {
    membership.role = roleOrder[membership.role] ? membership.role : "viewer";
    membership.createdAt ||= now;
    membership.revokedAt ||= null;
  }

  for (const passkey of state.auth.passkeys) {
    passkey.userId = state.users[passkey.userId] ? passkey.userId : state.auth.bootstrapUserId;
    passkey.passkeyId ||= sha256Hex(String(passkey.credentialId || randomToken(10)));
    passkey.label = normalizeDisplayName(passkey.label, "Passkey");
    passkey.createdAt ||= now;
    passkey.lastUsedAt ||= null;
    passkey.transports = Array.isArray(passkey.transports) ? passkey.transports : [];
  }

  state.auth.sessions = state.auth.sessions
    .map((session) => ({
      sessionIdHash: String(session.sessionIdHash || ""),
      userId: state.users[session.userId] ? session.userId : state.auth.bootstrapUserId,
      currentWorkspaceId: String(session.currentWorkspaceId || defaultWorkspaceId || ""),
      createdAt: session.createdAt || now,
      expiresAt: session.expiresAt || futureIso(config.sessionTtlSec || 43200),
      recovery: !!session.recovery,
      needsPasskeyEnrollment: !!session.needsPasskeyEnrollment
    }))
    .filter((session) => !!session.sessionIdHash);

  for (const invitation of Object.values(state.invitations)) {
    invitation.type = invitation.type === "account" ? "account" : "workspace";
    invitation.workspaceId = invitation.type === "account" ? "" : invitation.workspaceId || defaultWorkspaceId || "";
    invitation.role = roleOrder[invitation.role] ? invitation.role : "viewer";
    invitation.note = clampText(String(invitation.note || ""), 120);
    invitation.createdAt ||= now;
    invitation.expiresAt ||= futureIso(86400);
    invitation.usedAt ||= null;
    invitation.revokedAt ||= null;
    invitation.createdByUserId ||= state.auth.bootstrapUserId;
  }

  for (const recovery of Object.values(state.recoveryCodes)) {
    recovery.userId = state.users[recovery.userId] ? recovery.userId : "";
    recovery.note = clampText(String(recovery.note || ""), 120);
    recovery.createdAt ||= now;
    recovery.expiresAt ||= futureIso(3600);
    recovery.usedAt ||= null;
    recovery.revokedAt ||= null;
    recovery.createdByUserId ||= state.auth.bootstrapUserId;
  }

  for (const pairing of Object.values(state.pairings)) {
    pairing.workspaceId ||= defaultWorkspaceId || "";
    pairing.note = clampText(String(pairing.note || ""), 120);
    pairing.createdAt ||= now;
    pairing.expiresAt ||= futureIso(300);
    pairing.usedAt ||= null;
    pairing.revokedAt ||= null;
  }

  for (const request of Object.values(state.pairRequests)) {
    request.workspaceId ||= defaultWorkspaceId || "";
    request.status ||= "pending";
    request.note = clampText(String(request.note || ""), 120);
    request.label = clampText(String(request.label || request.agentId || "Pending Device"), 120);
    request.hostname = clampText(String(request.hostname || ""), 120);
    request.workspaceRootName = clampText(String(request.workspaceRootName || ""), 120);
    request.createdAt ||= now;
    request.expiresAt ||= futureIso(300);
    request.approvedAt ||= null;
    request.rejectedAt ||= null;
    request.completedAt ||= null;
  }

  for (const agent of Object.values(state.agents)) {
    agent.workspaceId ||= defaultWorkspaceId || "";
    agent.label = clampText(String(agent.label || agent.agentId || "Agent"), 120);
    agent.createdAt ||= now;
    agent.lastSeenAt ||= now;
    agent.revokedAt ||= null;
    agent.features ||= {};
    agent.actions = Array.isArray(agent.actions) ? agent.actions : [];
    agent.logSources = Array.isArray(agent.logSources) ? agent.logSources : [];
    agent.workspaceRootName = clampText(String(agent.workspaceRootName || ""), 120);
  }

  for (const task of Object.values(state.tasks)) {
    task.workspaceId ||= defaultWorkspaceId || "";
    task.createdAt ||= now;
    task.updatedAt ||= task.createdAt;
    task.needsApproval = !!task.needsApproval;
    task.writeAccess = !!task.writeAccess;
    task.resumeSessionId = clampText(String(task.resumeSessionId || ""), 120);
    task.sessionId = clampText(String(task.sessionId || ""), 120);
    task.cwd = clampText(String(task.cwd || "."), 240) || ".";
    task.actionId = clampText(String(task.actionId || ""), 80);
    task.logSourceId = clampText(String(task.logSourceId || ""), 80);
    task.title = clampText(String(task.title || task.type || "Task"), 120);
    delete task.prompt;
    delete task.summary;
    delete task.outputTail;
    delete task.diffText;
    delete task.result;
    delete task.error;
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
    if (Date.parse(pairing.expiresAt || "") <= now || pairing.usedAt || pairing.revokedAt) {
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

  for (const [inviteId, invitation] of Object.entries(state.invitations)) {
    const expiresAt = Date.parse(invitation.expiresAt || "");
    const terminalAt = Date.parse(invitation.usedAt || invitation.revokedAt || "");
    const expired = Number.isFinite(expiresAt) && expiresAt <= now;
    const oldTerminal = (invitation.usedAt || invitation.revokedAt) && Number.isFinite(terminalAt) && terminalAt <= now - 24 * 60 * 60 * 1000;
    if (expired || oldTerminal) {
      delete state.invitations[inviteId];
    }
  }

  for (const [recoveryId, recovery] of Object.entries(state.recoveryCodes)) {
    const expiresAt = Date.parse(recovery.expiresAt || "");
    const terminalAt = Date.parse(recovery.usedAt || recovery.revokedAt || "");
    const expired = Number.isFinite(expiresAt) && expiresAt <= now;
    const oldTerminal = (recovery.usedAt || recovery.revokedAt) && Number.isFinite(terminalAt) && terminalAt <= now - 24 * 60 * 60 * 1000;
    if (expired || oldTerminal || !recovery.userId || !state.users[recovery.userId]) {
      delete state.recoveryCodes[recoveryId];
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

function issueUserSession(userId, options = {}) {
  cleanupState();
  const sessionToken = randomToken(24);
  const workspaceId = String(options.workspaceId || firstWorkspaceIdForUser(userId) || "");
  state.auth.sessions.unshift({
    sessionIdHash: sha256Hex(sessionToken),
    userId,
    currentWorkspaceId: workspaceId,
    createdAt: nowIso(),
    expiresAt: futureIso(config.sessionTtlSec || 43200),
    recovery: !!options.recovery,
    needsPasskeyEnrollment: !!options.needsPasskeyEnrollment
  });
  if (state.auth.sessions.length > 64) {
    state.auth.sessions = state.auth.sessions
      .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || ""))
      .slice(0, 64);
  }
  if (state.users[userId]) {
    state.users[userId].lastWorkspaceId = workspaceId;
  }
  persistState();
  return sessionToken;
}

function findUserSession(sessionToken) {
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

function revokeUserSession(sessionToken) {
  const tokenHash = sha256Hex(String(sessionToken || ""));
  const before = state.auth.sessions.length;
  state.auth.sessions = state.auth.sessions.filter((item) => item.sessionIdHash !== tokenHash);
  if (state.auth.sessions.length !== before) {
    persistState();
  }
}

function revokeSessionsForUser(userId) {
  const before = state.auth.sessions.length;
  state.auth.sessions = state.auth.sessions.filter((item) => item.userId !== userId);
  if (state.auth.sessions.length !== before) {
    persistState();
  }
  return before - state.auth.sessions.length;
}

function activeSessionCountForUser(userId) {
  const now = Date.now();
  return state.auth.sessions.filter((session) => session.userId === userId && Date.parse(session.expiresAt || "") > now).length;
}

function activeRecoveryCodesForUser(userId) {
  const now = Date.now();
  return Object.values(state.recoveryCodes)
    .filter(
      (recovery) =>
        recovery.userId === userId &&
        !recovery.usedAt &&
        !recovery.revokedAt &&
        Date.parse(recovery.expiresAt || "") > now
    )
    .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || ""));
}

function latestActiveRecoveryForUser(userId) {
  return activeRecoveryCodesForUser(userId)[0] || null;
}

function parseBearer(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

function issueAgentToken(agentId, workspaceId, ttlSec = 60 * 60 * 24 * 30) {
  return createSignedToken(
    {
      role: "agent",
      sub: agentId,
      ws: workspaceId,
      exp: Math.floor(Date.now() / 1000) + ttlSec
    },
    config.tokenSecret
  );
}

function requireAgentSession(req, res) {
  const token = parseBearer(req);
  if (!token) {
    sendJson(res, 401, { error: "missing-token" }, headers);
    return null;
  }
  const verified = verifySignedToken(token, config.tokenSecret);
  if (!verified.ok || verified.payload.role !== "agent") {
    sendJson(res, 401, { error: "invalid-token", detail: verified.reason || "role-mismatch" }, headers);
    return null;
  }
  const agent = state.agents[verified.payload.sub];
  if (!agent || agent.revokedAt || agent.tokenHash !== sha256Hex(token)) {
    sendJson(res, 401, { error: "agent-revoked" }, headers);
    return null;
  }
  if (verified.payload.ws && agent.workspaceId && verified.payload.ws !== agent.workspaceId) {
    sendJson(res, 401, { error: "agent-workspace-mismatch" }, headers);
    return null;
  }
  return {
    agent,
    payload: verified.payload,
    token
  };
}

function roleAtLeast(actualRole, requiredRole) {
  if (!requiredRole) {
    return true;
  }
  return (roleOrder[actualRole] || 0) >= (roleOrder[requiredRole] || 0);
}

function listUserWorkspaceMemberships(userId) {
  return activeMemberships()
    .filter((membership) => membership.userId === userId)
    .map((membership) => ({
      membership,
      workspace: state.workspaces[membership.workspaceId]
    }))
    .filter((item) => item.workspace && !item.workspace.archivedAt)
    .sort((left, right) => left.workspace.name.localeCompare(right.workspace.name));
}

function ensureSessionWorkspace(session, userId) {
  const user = state.users[userId];
  const current = String(session.currentWorkspaceId || "");
  if (current && getMembership(userId, current) && state.workspaces[current] && !state.workspaces[current].archivedAt) {
    return current;
  }
  const preferred = user?.lastWorkspaceId && getMembership(userId, user.lastWorkspaceId) ? user.lastWorkspaceId : "";
  const next = preferred || firstWorkspaceIdForUser(userId) || "";
  let changed = false;
  if (session.currentWorkspaceId !== next) {
    session.currentWorkspaceId = next;
    changed = true;
  }
  if (user && user.lastWorkspaceId !== next) {
    user.lastWorkspaceId = next;
    changed = true;
  }
  if (changed) {
    persistState();
  }
  return next;
}

function buildPermissions(role, needsPasskeyEnrollment, hasWorkspaceMembership) {
  if (needsPasskeyEnrollment) {
    return {
      viewWorkspace: !!hasWorkspaceMembership,
      switchWorkspace: !!hasWorkspaceMembership,
      createTasks: false,
      approveTasks: false,
      pairAgents: false,
      revokeAgents: false,
      manageMembers: false,
      createWorkspaces: false,
      createAccountInvites: false,
      managePasskeys: true,
      manageRelayUsers: false
    };
  }
  return {
    viewWorkspace: !!hasWorkspaceMembership,
    switchWorkspace: !!hasWorkspaceMembership,
    createTasks: !!hasWorkspaceMembership && roleAtLeast(role, "operator"),
    approveTasks: !!hasWorkspaceMembership && roleAtLeast(role, "operator"),
    pairAgents: !!hasWorkspaceMembership && roleAtLeast(role, "operator"),
    revokeAgents: !!hasWorkspaceMembership && roleAtLeast(role, "owner"),
    manageMembers: !!hasWorkspaceMembership && roleAtLeast(role, "owner"),
    createWorkspaces: true,
    createAccountInvites: false,
    managePasskeys: true,
    manageRelayUsers: false
  };
}

function emptyPermissions() {
  return {
    viewWorkspace: false,
    switchWorkspace: false,
    createTasks: false,
    approveTasks: false,
    pairAgents: false,
    revokeAgents: false,
    manageMembers: false,
    createWorkspaces: false,
    createAccountInvites: false,
    managePasskeys: false,
    manageRelayUsers: false
  };
}

function sanitizeUser(user) {
  return {
    userId: user.userId,
    displayName: user.displayName,
    createdAt: user.createdAt
  };
}

function summarizeCredentialId(credentialId) {
  const value = String(credentialId || "");
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function summarizePasskey(passkey) {
  return {
    passkeyId: passkey.passkeyId || sha256Hex(String(passkey.credentialId || "")),
    displayId: summarizeCredentialId(passkey.credentialId),
    label: passkey.label || "Passkey",
    createdAt: passkey.createdAt,
    lastUsedAt: passkey.lastUsedAt || null,
    transports: Array.isArray(passkey.transports) ? passkey.transports : []
  };
}

function sanitizeWorkspaceMembership(item) {
  return {
    membershipId: item.membership.membershipId,
    workspaceId: item.workspace.workspaceId,
    name: item.workspace.name,
    role: item.membership.role,
    createdAt: item.workspace.createdAt
  };
}

function sanitizeMember(membership) {
  const user = state.users[membership.userId];
  return {
    membershipId: membership.membershipId,
    userId: membership.userId,
    displayName: user?.displayName || "Unknown User",
    role: membership.role,
    createdAt: membership.createdAt
  };
}

function sanitizeInvitation(invitation) {
  return {
    inviteId: invitation.inviteId,
    type: invitation.type || "workspace",
    workspaceId: invitation.workspaceId || "",
    workspaceName: invitation.workspaceId ? state.workspaces[invitation.workspaceId]?.name || "" : "",
    role: invitation.role,
    note: invitation.note || "",
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    usedAt: invitation.usedAt || null,
    revokedAt: invitation.revokedAt || null,
    createdByDisplayName: state.users[invitation.createdByUserId]?.displayName || "Unknown"
  };
}

function sanitizeRecovery(recovery) {
  return {
    recoveryId: recovery.recoveryId,
    userId: recovery.userId,
    note: recovery.note || "",
    createdAt: recovery.createdAt,
    expiresAt: recovery.expiresAt,
    usedAt: recovery.usedAt || null,
    revokedAt: recovery.revokedAt || null,
    createdByDisplayName: state.users[recovery.createdByUserId]?.displayName || "Unknown"
  };
}

function sanitizeManagedUser(user) {
  const memberships = listUserWorkspaceMemberships(user.userId).map(sanitizeWorkspaceMembership);
  const latestRecovery = latestActiveRecoveryForUser(user.userId);
  return {
    userId: user.userId,
    displayName: user.displayName,
    createdAt: user.createdAt,
    disabledAt: user.disabledAt || null,
    isRelayOwner: isRelayOwner(user.userId),
    passkeyCount: passkeysForUser(user.userId).length,
    activeSessionCount: activeSessionCountForUser(user.userId),
    activeRecovery: latestRecovery ? sanitizeRecovery(latestRecovery) : null,
    lastWorkspaceId: user.lastWorkspaceId || "",
    lastWorkspaceName: user.lastWorkspaceId ? state.workspaces[user.lastWorkspaceId]?.name || "" : "",
    memberships
  };
}

function resolveSessionContext(session) {
  const user = state.users[session.userId];
  if (!user || user.disabledAt) {
    return null;
  }
  const workspaceId = ensureSessionWorkspace(session, user.userId);
  const membership = workspaceId ? getMembership(user.userId, workspaceId) : null;
  const workspace = membership ? state.workspaces[workspaceId] || null : null;
  const role = membership?.role || "";
  return {
    session,
    user,
    workspaceId,
    membership,
    workspace,
    role,
    permissions: {
      ...buildPermissions(role, !!session.needsPasskeyEnrollment, !!membership),
      createAccountInvites: !session.needsPasskeyEnrollment && isRelayOwner(user.userId),
      manageRelayUsers: !session.needsPasskeyEnrollment && isRelayOwner(user.userId)
    }
  };
}

function authSummary(context = null) {
  return {
    passkeysEnabled: passkeyConfig.enabled,
    hasPasskeys: state.auth.passkeys.length > 0,
    passkeyCount: context ? passkeysForUser(context.user.userId).length : 0,
    recoveryLoginEnabled: true,
    origin: passkeyConfig.origin,
    rpId: passkeyConfig.rpId,
    sessionCookieName: adminSessionCookie.name,
    currentUser: context ? sanitizeUser(context.user) : null,
    isRelayOwner: context ? isRelayOwner(context.user.userId) : false,
    currentWorkspaceId: context?.workspaceId || "",
    currentRole: context?.role || "",
    workspaces: context ? listUserWorkspaceMemberships(context.user.userId).map(sanitizeWorkspaceMembership) : [],
    permissions: context ? context.permissions : emptyPermissions(),
    needsPasskeyEnrollment: !!context?.session.needsPasskeyEnrollment,
    passkeys: context ? passkeysForUser(context.user.userId).map(summarizePasskey) : []
  };
}

function invalidSessionResponse(res, error = "invalid-session") {
  sendJson(
    res,
    401,
    { error },
    {
      ...headers,
      "set-cookie": clearAdminSessionCookieHeader()
    }
  );
}

function requireUserSession(req, res, options = {}) {
  const sessionToken = parseCookies(req)[adminSessionCookie.name] || "";
  if (!sessionToken) {
    invalidSessionResponse(res, "missing-session");
    return null;
  }
  const session = findUserSession(sessionToken);
  if (!session) {
    invalidSessionResponse(res, "invalid-session");
    return null;
  }
  const context = resolveSessionContext(session);
  if (!context) {
    revokeUserSession(sessionToken);
    invalidSessionResponse(res, "session-user-invalid");
    return null;
  }
  if (options.requireWorkspace !== false && !context.workspaceId) {
    sendJson(res, 403, { error: "no-workspace-selected" }, headers);
    return null;
  }
  if (!options.allowUnenrolled && context.session.needsPasskeyEnrollment) {
    sendJson(res, 403, { error: "passkey-enrollment-required", auth: authSummary(context) }, headers);
    return null;
  }
  if (options.minRole && !roleAtLeast(context.role, options.minRole)) {
    sendJson(res, 403, { error: "insufficient-role" }, headers);
    return null;
  }
  return context;
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

function randomShortCode(length = 8, groupSize = 4) {
  const values = Buffer.from(randomToken(length), "hex");
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += shortCodeAlphabet[values[index] % shortCodeAlphabet.length];
  }
  const groups = [];
  for (let index = 0; index < output.length; index += groupSize) {
    groups.push(output.slice(index, index + groupSize));
  }
  return groups.join("-");
}

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "");
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

function sanitizeTaskResult(taskType, result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }
  if (taskType === "codex_exec") {
    return {
      exitCode: Number.isFinite(Number(result.exitCode)) ? Number(result.exitCode) : null,
      signal: clampText(String(result.signal || ""), 80),
      completedAt: clampText(String(result.completedAt || ""), 80)
    };
  }
  if (taskType === "run_action") {
    return {
      actionId: clampText(String(result.actionId || ""), 80),
      exitCode: Number.isFinite(Number(result.exitCode)) ? Number(result.exitCode) : null,
      signal: clampText(String(result.signal || ""), 80),
      completedAt: clampText(String(result.completedAt || ""), 80)
    };
  }
  if (taskType === "read_log") {
    return {
      logSourceId: clampText(String(result.logSourceId || ""), 80),
      lineCount: Math.max(0, Math.min(Number(result.lineCount || 0), 5000)),
      completedAt: clampText(String(result.completedAt || ""), 80)
    };
  }
  if (taskType === "delete_session") {
    return {
      sessionId: clampText(String(result.sessionId || ""), 120),
      deleted: !!result.deleted,
      completedAt: clampText(String(result.completedAt || ""), 80)
    };
  }
  if (taskType === "read_session") {
    const messages = Array.isArray(result.messages)
      ? result.messages.slice(0, 80).map((item) => ({
          role: clampText(String(item?.role || ""), 24),
          text: clampText(String(item?.text || ""), 400)
        }))
      : [];
    return {
      sessionId: clampText(String(result.sessionId || ""), 120),
      title: clampText(String(result.title || ""), 200),
      cwd: clampText(String(result.cwd || ""), 240),
      messageCount: Math.max(0, Math.min(Number(result.messageCount || messages.length), 80)),
      messages,
      completedAt: clampText(String(result.completedAt || ""), 80)
    };
  }
  return null;
}

function currentWorkspaceMembers(workspaceId) {
  return activeMemberships()
    .filter((membership) => membership.workspaceId === workspaceId)
    .sort((left, right) => {
      const roleDiff = (roleOrder[right.role] || 0) - (roleOrder[left.role] || 0);
      if (roleDiff !== 0) {
        return roleDiff;
      }
      return String(state.users[left.userId]?.displayName || "").localeCompare(String(state.users[right.userId]?.displayName || ""));
    });
}

function listState(context) {
  cleanupState();
  persistState();
  const workspaceId = context.workspaceId;
  const enrollmentLocked = !!context.session.needsPasskeyEnrollment;
  return {
    now: nowIso(),
    features: config.features,
    web: config.web || {},
    auth: authSummary(context),
    currentWorkspace: context.workspace
      ? {
          workspaceId: context.workspace.workspaceId,
          name: context.workspace.name,
          role: context.role,
          createdAt: context.workspace.createdAt
        }
      : null,
    members: !enrollmentLocked && context.permissions.manageMembers && workspaceId
      ? currentWorkspaceMembers(workspaceId).map(sanitizeMember)
      : [],
    invitations: !enrollmentLocked
      ? visibleInvitationsForContext(context)
          .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || ""))
          .map(sanitizeInvitation)
      : [],
    users: !enrollmentLocked && context.permissions.manageRelayUsers
      ? Object.values(state.users)
          .sort((left, right) => String(left.displayName || "").localeCompare(String(right.displayName || "")))
          .map(sanitizeManagedUser)
      : [],
    pendingPairRequests: enrollmentLocked
      ? []
      : Object.values(state.pairRequests)
      .filter((request) => request.workspaceId === workspaceId && request.status === "pending")
      .sort((left, right) => Date.parse(right.createdAt || "") - Date.parse(left.createdAt || ""))
      .slice(0, 20)
      .map(sanitizePairRequest),
    agents: enrollmentLocked
      ? []
      : Object.values(state.agents)
      .filter((agent) => agent.workspaceId === workspaceId)
      .map(sanitizeAgent)
      .sort((left, right) => left.agentId.localeCompare(right.agentId)),
    tasks: enrollmentLocked
      ? []
      : Object.values(state.tasks)
      .filter((task) => task.workspaceId === workspaceId)
      .map(sanitizeTask)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
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

function requireTask(taskId, context, res) {
  const task = state.tasks[taskId];
  if (!task || (context.workspaceId && task.workspaceId !== context.workspaceId)) {
    sendJson(res, 404, { error: "task-not-found" }, headers);
    return null;
  }
  return task;
}

function requireAgentRecord(agentId, context, res) {
  const agent = state.agents[agentId];
  if (!agent || (context.workspaceId && agent.workspaceId !== context.workspaceId)) {
    sendJson(res, 404, { error: "agent-not-found" }, headers);
    return null;
  }
  return agent;
}

function requirePairRequestRecord(requestId, context, res) {
  const request = state.pairRequests[requestId];
  if (!request || (context.workspaceId && request.workspaceId !== context.workspaceId)) {
    sendJson(res, 404, { error: "pair-request-not-found" }, headers);
    return null;
  }
  return request;
}

function requireInvitationRecord(inviteId, context, res) {
  const invitation = state.invitations[inviteId];
  if (
    !invitation ||
    ((invitation.type || "workspace") === "workspace" && context.workspaceId && invitation.workspaceId !== context.workspaceId)
  ) {
    sendJson(res, 404, { error: "invitation-not-found" }, headers);
    return null;
  }
  return invitation;
}

function requireManagedUser(userId, res) {
  const user = state.users[String(userId || "")];
  if (!user) {
    sendJson(res, 404, { error: "user-not-found" }, headers);
    return null;
  }
  return user;
}

function requireMembershipRecord(membershipId, res) {
  const membership = state.memberships[String(membershipId || "")];
  if (!membership || membership.revokedAt) {
    sendJson(res, 404, { error: "membership-not-found" }, headers);
    return null;
  }
  const user = state.users[membership.userId];
  const workspace = state.workspaces[membership.workspaceId];
  if (!user || !workspace || workspace.archivedAt) {
    sendJson(res, 404, { error: "membership-not-found" }, headers);
    return null;
  }
  return membership;
}

function activeOwnerCountForWorkspace(workspaceId) {
  return activeMemberships().filter((membership) => membership.workspaceId === workspaceId && membership.role === "owner").length;
}

function taskNeedsApproval(type) {
  if (type === "codex_exec" || type === "delete_session" || type === "read_session") {
    return false;
  }
  return true;
}

function createTask(body, context, res) {
  const allowedTypes = new Set(["codex_exec", "run_action", "read_log", "delete_session", "read_session"]);
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
  if (body.type === "read_session" && config.features.readSession === false) {
    sendJson(res, 403, { error: "feature-disabled" }, headers);
    return;
  }
  if (body.type === "delete_session" && config.features.deleteSession === false) {
    sendJson(res, 403, { error: "feature-disabled" }, headers);
    return;
  }

  const agent = requireAgentRecord(String(body.agentId || ""), context, res);
  if (!agent) {
    return;
  }
  if (agent.revokedAt) {
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
  const resumeSessionId = body.type === "codex_exec" ? clampText(String(body.resumeSessionId || ""), 120) : "";
  const sessionId = body.type === "delete_session" || body.type === "read_session" ? clampText(String(body.sessionId || ""), 120) : "";
  state.tasks[taskId] = {
    taskId,
    workspaceId: context.workspaceId,
    agentId: agent.agentId,
    type: body.type,
    title: clampText(String(body.title || body.type), 120),
    actionId: clampText(String(body.actionId || ""), 80),
    logSourceId: clampText(String(body.logSourceId || ""), 80),
    resumeSessionId,
    sessionId,
    cwd: clampText(String(body.cwd || "."), 240) || ".",
    writeAccess,
    needsApproval: taskNeedsApproval(body.type),
    status: taskNeedsApproval(body.type) ? "awaiting_approval" : "queued",
    createdAt,
    updatedAt: createdAt
  };
  volatileTaskData.set(taskId, {
    prompt: clampText(String(body.prompt || ""), 12000),
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

function handleTaskUpdate(task, body, agentContext, res) {
  if (task.agentId !== agentContext.agent.agentId || task.workspaceId !== agentContext.agent.workspaceId) {
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
    volatile.result = sanitizeTaskResult(task.type, body.result);
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

function findActivePairingByCode(code) {
  const normalized = normalizeCode(code);
  return Object.values(state.pairings).find(
    (pairing) =>
      !pairing.usedAt &&
      !pairing.revokedAt &&
      Date.parse(pairing.expiresAt || "") > Date.now() &&
      pairing.codeHash === sha256Hex(normalized)
  );
}

function findActiveInvitationByCode(code) {
  const normalized = normalizeCode(code);
  return Object.values(state.invitations).find(
    (invitation) =>
      !invitation.usedAt &&
      !invitation.revokedAt &&
      Date.parse(invitation.expiresAt || "") > Date.now() &&
      invitation.codeHash === sha256Hex(normalized)
  );
}

function findActiveRecoveryByCode(code) {
  const normalized = normalizeCode(code);
  return Object.values(state.recoveryCodes).find(
    (recovery) =>
      recovery.userId &&
      !recovery.usedAt &&
      !recovery.revokedAt &&
      Date.parse(recovery.expiresAt || "") > Date.now() &&
      recovery.codeHash === sha256Hex(normalized)
  );
}

function issueRecoveryCodeForUser(userId, createdByUserId, ttlSec, note = "") {
  for (const recovery of activeRecoveryCodesForUser(userId)) {
    recovery.revokedAt = nowIso();
  }
  const recoveryCode = randomShortCode(12, 4);
  const recoveryId = randomId("recovery");
  state.recoveryCodes[recoveryId] = {
    recoveryId,
    userId,
    note: clampText(String(note || ""), 120),
    codeHash: sha256Hex(normalizeCode(recoveryCode)),
    createdAt: nowIso(),
    expiresAt: futureIso(Math.max(300, Math.min(Number(ttlSec || 3600), 7 * 24 * 60 * 60))),
    usedAt: null,
    revokedAt: null,
    createdByUserId
  };
  persistState();
  return {
    recoveryCode,
    recovery: sanitizeRecovery(state.recoveryCodes[recoveryId])
  };
}

function visibleInvitationsForContext(context) {
  const activeInvitations = Object.values(state.invitations).filter(
    (invitation) => !invitation.usedAt && !invitation.revokedAt && Date.parse(invitation.expiresAt || "") > Date.now()
  );
  const workspaceInvitations =
    context.permissions.manageMembers && context.workspaceId
      ? activeInvitations.filter(
          (invitation) => (invitation.type || "workspace") === "workspace" && invitation.workspaceId === context.workspaceId
        )
      : [];
  const accountInvitations = isRelayOwner(context.user.userId)
    ? activeInvitations.filter((invitation) => (invitation.type || "workspace") === "account")
    : [];

  const seen = new Set();
  return [...workspaceInvitations, ...accountInvitations].filter((invitation) => {
    if (seen.has(invitation.inviteId)) {
      return false;
    }
    seen.add(invitation.inviteId);
    return true;
  });
}

function setSessionWorkspace(session, user, workspaceId) {
  session.currentWorkspaceId = workspaceId;
  user.lastWorkspaceId = workspaceId;
  persistState();
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
      const session = sessionToken ? findUserSession(sessionToken) : null;
      const context = session ? resolveSessionContext(session) : null;
      sendJson(
        res,
        200,
        {
          ok: true,
          authenticated: !!context,
          auth: authSummary(context)
        },
        sessionToken && !context
          ? {
              ...headers,
              "set-cookie": clearAdminSessionCookieHeader()
            }
          : headers
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
      const bootstrapUserId = state.auth.bootstrapUserId;
      const workspaceId = firstWorkspaceIdForUser(bootstrapUserId);
      const sessionToken = issueUserSession(bootstrapUserId, {
        workspaceId,
        recovery: true,
        needsPasskeyEnrollment: false
      });
      const context = resolveSessionContext(findUserSession(sessionToken));
      sendJson(
        res,
        200,
        { ok: true, auth: authSummary(context) },
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
        revokeUserSession(sessionToken);
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

    if (req.method === "POST" && pathname === "/api/auth/workspace") {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: true
      });
      if (!context) {
        return;
      }
      const body = await readJsonBody(req, 4096);
      const workspaceId = String(body.workspaceId || "");
      if (!workspaceId || !getMembership(context.user.userId, workspaceId)) {
        sendJson(res, 404, { error: "workspace-not-found" }, headers);
        return;
      }
      setSessionWorkspace(context.session, context.user, workspaceId);
      const nextContext = resolveSessionContext(context.session);
      sendJson(res, 200, { ok: true, auth: authSummary(nextContext) }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/invitations/redeem") {
      const ip = req.socket.remoteAddress || "unknown";
      if (!rateLimit(`invite-redeem:${ip}`, config.maxLoginAttemptsPerMinute || 10)) {
        sendJson(res, 429, { error: "rate-limited" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      const invitation = findActiveInvitationByCode(body.inviteCode || "");
      if (!invitation) {
        sendJson(res, 401, { error: "invalid-invite-code" }, headers);
        return;
      }
      let context = null;
      const sessionToken = parseCookies(req)[adminSessionCookie.name] || "";
      const existingSession = sessionToken ? findUserSession(sessionToken) : null;
      if (existingSession) {
        context = resolveSessionContext(existingSession);
      }

      const invitationType = invitation.type || "workspace";

      if (context) {
        if (invitationType === "account") {
          sendJson(res, 409, { error: "already-authenticated-use-workspace-invite-only" }, headers);
          return;
        }
        if (getMembership(context.user.userId, invitation.workspaceId)) {
          sendJson(res, 409, { error: "already-workspace-member" }, headers);
          return;
        }
        createMembership(context.user.userId, invitation.workspaceId, invitation.role, nowIso());
        invitation.usedAt = nowIso();
        invitation.redeemedByUserId = context.user.userId;
        setSessionWorkspace(context.session, context.user, invitation.workspaceId);
        const nextContext = resolveSessionContext(context.session);
        sendJson(res, 200, { ok: true, auth: authSummary(nextContext) }, headers);
        return;
      }

      const newUser = createUser(body.displayName || "New User", nowIso());
      if (invitationType === "workspace") {
        createMembership(newUser.userId, invitation.workspaceId, invitation.role, nowIso());
        newUser.lastWorkspaceId = invitation.workspaceId;
      } else {
        newUser.lastWorkspaceId = "";
      }
      invitation.usedAt = nowIso();
      invitation.redeemedByUserId = newUser.userId;
      persistState();
      const newSessionToken = issueUserSession(newUser.userId, {
        workspaceId: invitationType === "workspace" ? invitation.workspaceId : "",
        recovery: false,
        needsPasskeyEnrollment: passkeyConfig.enabled
      });
      const nextContext = resolveSessionContext(findUserSession(newSessionToken));
      sendJson(
        res,
        200,
        { ok: true, auth: authSummary(nextContext) },
        {
          ...headers,
          "set-cookie": adminSessionCookieHeader(newSessionToken)
        }
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/recovery/redeem") {
      const ip = req.socket.remoteAddress || "unknown";
      if (!rateLimit(`recovery-redeem:${ip}`, config.maxLoginAttemptsPerMinute || 10)) {
        sendJson(res, 429, { error: "rate-limited" }, headers);
        return;
      }
      const existingSessionToken = parseCookies(req)[adminSessionCookie.name] || "";
      if (existingSessionToken && findUserSession(existingSessionToken)) {
        sendJson(res, 409, { error: "already-authenticated" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      const recovery = findActiveRecoveryByCode(body.recoveryCode || "");
      if (!recovery) {
        sendJson(res, 401, { error: "invalid-recovery-code" }, headers);
        return;
      }
      const user = state.users[recovery.userId];
      if (!user || user.disabledAt) {
        sendJson(res, 403, { error: "user-disabled-or-missing" }, headers);
        return;
      }
      recovery.usedAt = nowIso();
      persistState();
      const workspaceId =
        (user.lastWorkspaceId && getMembership(user.userId, user.lastWorkspaceId) ? user.lastWorkspaceId : "") ||
        firstWorkspaceIdForUser(user.userId) ||
        "";
      const sessionToken = issueUserSession(user.userId, {
        workspaceId,
        recovery: true,
        needsPasskeyEnrollment: !!passkeyConfig.enabled
      });
      const nextContext = resolveSessionContext(findUserSession(sessionToken));
      sendJson(
        res,
        200,
        { ok: true, auth: authSummary(nextContext) },
        {
          ...headers,
          "set-cookie": adminSessionCookieHeader(sessionToken)
        }
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/passkeys/register/options") {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: true
      });
      if (!context) {
        return;
      }
      if (!passkeyConfig.enabled) {
        sendJson(res, 403, { error: "passkeys-disabled" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      const issued = issueChallenge(volatileAuthState.registrationChallenges, passkeyConfig.challengeTtlMs, {
        sessionIdHash: context.session.sessionIdHash,
        userId: context.user.userId,
        label: normalizeDisplayName(body.label, "Passkey")
      });
      const publicKey = {
        challenge: issued.challenge,
        rp: {
          id: passkeyConfig.rpId,
          name: passkeyConfig.rpName
        },
        user: {
          id: context.user.userHandle,
          name: context.user.displayName,
          displayName: context.user.displayName
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        timeout: passkeyConfig.timeoutMs,
        attestation: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: passkeyConfig.userVerification
        },
        excludeCredentials: passkeysForUser(context.user.userId).map((passkey) => ({
          type: "public-key",
          id: passkey.credentialId,
          transports: Array.isArray(passkey.transports) ? passkey.transports : []
        }))
      };
      sendJson(res, 200, { ok: true, registrationId: issued.challengeId, publicKey }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/passkeys/register/verify") {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: true
      });
      if (!context) {
        return;
      }
      if (!passkeyConfig.enabled) {
        sendJson(res, 403, { error: "passkeys-disabled" }, headers);
        return;
      }
      const body = await readJsonBody(req, 65536);
      const registration = takeActiveChallenge(volatileAuthState.registrationChallenges, body.registrationId);
      if (!registration || registration.sessionIdHash !== context.session.sessionIdHash || registration.userId !== context.user.userId) {
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
        passkeyId: sha256Hex(verified.credentialId),
        credentialId: verified.credentialId,
        userId: context.user.userId,
        publicKeySpki: verified.publicKeySpki,
        signCount: verified.signCount,
        label: registration.label || "Passkey",
        createdAt: nowIso(),
        lastUsedAt: null,
        transports: verified.transports
      });
      context.session.needsPasskeyEnrollment = false;
      persistState();
      const nextContext = resolveSessionContext(context.session);
      sendJson(res, 200, { ok: true, auth: authSummary(nextContext) }, headers);
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
      const issued = issueChallenge(volatileAuthState.authenticationChallenges, passkeyConfig.challengeTtlMs, { ip });
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
      const user = state.users[passkey.userId];
      const workspaceId =
        (user?.lastWorkspaceId && getMembership(passkey.userId, user.lastWorkspaceId) ? user.lastWorkspaceId : "") ||
        firstWorkspaceIdForUser(passkey.userId) ||
        "";
      const sessionToken = issueUserSession(passkey.userId, {
        workspaceId,
        recovery: false,
        needsPasskeyEnrollment: false
      });
      const nextContext = resolveSessionContext(findUserSession(sessionToken));
      sendJson(
        res,
        200,
        { ok: true, auth: authSummary(nextContext) },
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
      const pairing = findActivePairingByCode(body.pairingCode || "");
      if (!pairing) {
        sendJson(res, 401, { error: "invalid-pairing-code" }, headers);
        return;
      }
      const agentId = String(body.agentId || "").trim();
      if (!agentId) {
        sendJson(res, 400, { error: "missing-agent-id" }, headers);
        return;
      }
      const existingAgent = state.agents[agentId];
      if (existingAgent && !existingAgent.revokedAt) {
        sendJson(res, 409, { error: "agent-id-already-registered" }, headers);
        return;
      }
      const pendingDuplicate = Object.values(state.pairRequests).find(
        (request) => request.agentId === agentId && request.status === "pending"
      );
      if (pendingDuplicate) {
        sendJson(res, 409, { error: "pair-request-already-pending" }, headers);
        return;
      }
      const requestId = randomId("pairreq");
      const requestToken = randomToken(18);
      state.pairRequests[requestId] = {
        requestId,
        pairingId: pairing.pairingId,
        workspaceId: pairing.workspaceId,
        status: "pending",
        accessHash: sha256Hex(requestToken),
        note: pairing.note || "",
        agentId,
        label: clampText(String(body.label || pairing.note || agentId), 120),
        hostname: clampText(String(body.hostname || ""), 120),
        workspaceRootName: clampText(String(body.workspaceRootName || ""), 120),
        createdAt: nowIso(),
        expiresAt: pairing.expiresAt,
        approvedAt: null,
        rejectedAt: null,
        completedAt: null
      };
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
        const token = issueAgentToken(request.agentId, request.workspaceId);
        state.agents[request.agentId] = {
          agentId: request.agentId,
          workspaceId: request.workspaceId,
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
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: true
      });
      if (!context) {
        return;
      }
      sendJson(res, 200, listState(context), headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/workspaces") {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const body = await readJsonBody(req, 4096);
      const workspace = createWorkspace(body.name || "Workspace", nowIso());
      createMembership(context.user.userId, workspace.workspaceId, "owner", nowIso());
      setSessionWorkspace(context.session, context.user, workspace.workspaceId);
      const nextContext = resolveSessionContext(context.session);
      sendJson(res, 201, { ok: true, workspace, auth: authSummary(nextContext) }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/invitations") {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const body = await readJsonBody(req, 4096);
      const inviteType = body.type === "account" ? "account" : "workspace";
      if (inviteType === "workspace" && !context.workspaceId) {
        sendJson(res, 400, { error: "workspace-invite-requires-current-workspace" }, headers);
        return;
      }
      if (inviteType === "workspace" && !roleAtLeast(context.role, "owner")) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      if (inviteType === "account" && !isRelayOwner(context.user.userId)) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      const role = roleOrder[body.role] ? body.role : "viewer";
      const inviteCode = randomShortCode(12, 4);
      const inviteId = randomId("invite");
      state.invitations[inviteId] = {
        inviteId,
        type: inviteType,
        workspaceId: inviteType === "workspace" ? context.workspaceId : "",
        role: inviteType === "workspace" ? role : "",
        note: clampText(String(body.note || ""), 120),
        codeHash: sha256Hex(normalizeCode(inviteCode)),
        createdAt: nowIso(),
        expiresAt: futureIso(Math.max(300, Math.min(Number(body.ttlSec || 86400), 7 * 24 * 60 * 60))),
        usedAt: null,
        revokedAt: null,
        createdByUserId: context.user.userId
      };
      persistState();
      sendJson(
        res,
        201,
        {
          ok: true,
          inviteCode,
          invitation: sanitizeInvitation(state.invitations[inviteId])
        },
        headers
      );
      return;
    }

    const revokeInvitationMatch = pathname.match(/^\/api\/admin\/invitations\/([^/]+)\/revoke$/);
    if (req.method === "POST" && revokeInvitationMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const invitation = requireInvitationRecord(revokeInvitationMatch[1], context, res);
      if (!invitation) {
        return;
      }
      if ((invitation.type || "workspace") === "workspace" && (!context.workspaceId || invitation.workspaceId !== context.workspaceId || !roleAtLeast(context.role, "owner"))) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      if ((invitation.type || "workspace") === "account" && !isRelayOwner(context.user.userId)) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      invitation.revokedAt = nowIso();
      persistState();
      sendJson(res, 200, { ok: true, invitation: sanitizeInvitation(invitation) }, headers);
      return;
    }

    const disableUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/disable$/);
    if (req.method === "POST" && disableUserMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      if (!context.permissions.manageRelayUsers) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      const user = requireManagedUser(decodeURIComponent(disableUserMatch[1]), res);
      if (!user) {
        return;
      }
      if (isRelayOwner(user.userId)) {
        sendJson(res, 409, { error: "relay-owner-protected" }, headers);
        return;
      }
      user.disabledAt = nowIso();
      revokeSessionsForUser(user.userId);
      persistState();
      sendJson(res, 200, { ok: true, user: sanitizeManagedUser(user) }, headers);
      return;
    }

    const enableUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/enable$/);
    if (req.method === "POST" && enableUserMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      if (!context.permissions.manageRelayUsers) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      const user = requireManagedUser(decodeURIComponent(enableUserMatch[1]), res);
      if (!user) {
        return;
      }
      user.disabledAt = null;
      persistState();
      sendJson(res, 200, { ok: true, user: sanitizeManagedUser(user) }, headers);
      return;
    }

    const deleteUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/delete$/);
    if (req.method === "POST" && deleteUserMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      if (!context.permissions.manageRelayUsers) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      const user = requireManagedUser(decodeURIComponent(deleteUserMatch[1]), res);
      if (!user) {
        return;
      }
      if (isRelayOwner(user.userId)) {
        sendJson(res, 409, { error: "relay-owner-protected" }, headers);
        return;
      }
      if (listUserWorkspaceMemberships(user.userId).length > 0) {
        sendJson(res, 409, { error: "user-still-has-memberships" }, headers);
        return;
      }
      if (passkeysForUser(user.userId).length > 0) {
        sendJson(res, 409, { error: "user-still-has-passkeys" }, headers);
        return;
      }
      revokeSessionsForUser(user.userId);
      for (const [recoveryId, recovery] of Object.entries(state.recoveryCodes)) {
        if (recovery.userId === user.userId) {
          delete state.recoveryCodes[recoveryId];
        }
      }
      delete state.users[user.userId];
      persistState();
      sendJson(res, 200, { ok: true, userId: user.userId }, headers);
      return;
    }

    const revokeUserSessionsMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/sessions\/revoke$/);
    if (req.method === "POST" && revokeUserSessionsMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      if (!context.permissions.manageRelayUsers) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      const user = requireManagedUser(decodeURIComponent(revokeUserSessionsMatch[1]), res);
      if (!user) {
        return;
      }
      const revokedSessions = revokeSessionsForUser(user.userId);
      sendJson(res, 200, { ok: true, revokedSessions, user: sanitizeManagedUser(user) }, headers);
      return;
    }

    const recoveryCodeCreateMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/recovery-codes$/);
    if (req.method === "POST" && recoveryCodeCreateMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      if (!context.permissions.manageRelayUsers) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      const user = requireManagedUser(decodeURIComponent(recoveryCodeCreateMatch[1]), res);
      if (!user) {
        return;
      }
      if (user.disabledAt) {
        sendJson(res, 409, { error: "user-disabled" }, headers);
        return;
      }
      const body = await readJsonBody(req, 4096);
      const issued = issueRecoveryCodeForUser(
        user.userId,
        context.user.userId,
        Number(body.ttlSec || 3600),
        String(body.note || "")
      );
      sendJson(
        res,
        201,
        {
          ok: true,
          recoveryCode: issued.recoveryCode,
          recovery: issued.recovery,
          user: sanitizeManagedUser(user)
        },
        headers
      );
      return;
    }

    const revokeMembershipMatch = pathname.match(/^\/api\/admin\/memberships\/([^/]+)\/revoke$/);
    if (req.method === "POST" && revokeMembershipMatch) {
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const membership = requireMembershipRecord(decodeURIComponent(revokeMembershipMatch[1]), res);
      if (!membership) {
        return;
      }
      const canManageMembership =
        context.permissions.manageRelayUsers ||
        (context.workspaceId === membership.workspaceId && roleAtLeast(context.role, "owner"));
      if (!canManageMembership) {
        sendJson(res, 403, { error: "insufficient-role" }, headers);
        return;
      }
      if (membership.role === "owner" && activeOwnerCountForWorkspace(membership.workspaceId) <= 1) {
        sendJson(res, 409, { error: "last-workspace-owner-protected" }, headers);
        return;
      }
      membership.revokedAt = nowIso();
      persistState();
      sendJson(res, 200, { ok: true, membershipId: membership.membershipId }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/pairings") {
      const context = requireUserSession(req, res, {
        minRole: "operator",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const body = await readJsonBody(req, 4096);
      const code = randomShortCode(8, 4);
      const pairingId = randomId("pair");
      state.pairings[pairingId] = {
        pairingId,
        workspaceId: context.workspaceId,
        note: clampText(String(body.note || ""), 120),
        codeHash: sha256Hex(normalizeCode(code)),
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
      const context = requireUserSession(req, res, {
        minRole: "operator",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const body = await readJsonBody(req, 16384);
      createTask(body, context, res);
      return;
    }

    const approveMatch = pathname.match(/^\/api\/admin\/tasks\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      const context = requireUserSession(req, res, {
        minRole: "operator",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const task = requireTask(approveMatch[1], context, res);
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
      const context = requireUserSession(req, res, {
        minRole: "operator",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const task = requireTask(rejectMatch[1], context, res);
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

    const revokeAgentMatch = pathname.match(/^\/api\/admin\/agents\/([^/]+)\/revoke$/);
    if (req.method === "POST" && revokeAgentMatch) {
      const context = requireUserSession(req, res, {
        minRole: "owner",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const agent = requireAgentRecord(revokeAgentMatch[1], context, res);
      if (!agent) {
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
      const context = requireUserSession(req, res, {
        minRole: "operator",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const request = requirePairRequestRecord(pairApproveMatch[1], context, res);
      if (!request) {
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
      const context = requireUserSession(req, res, {
        minRole: "operator",
        allowUnenrolled: false
      });
      if (!context) {
        return;
      }
      const request = requirePairRequestRecord(pairRejectMatch[1], context, res);
      if (!request) {
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
      const context = requireUserSession(req, res, {
        requireWorkspace: false,
        allowUnenrolled: true
      });
      if (!context) {
        return;
      }
      const passkeyId = decodeURIComponent(passkeyRevokeMatch[1]);
      const userPasskeys = passkeysForUser(context.user.userId);
      if (userPasskeys.length <= 1 && !context.session.recovery) {
        sendJson(res, 409, { error: "last-passkey-blocked" }, headers);
        return;
      }
      const index = state.auth.passkeys.findIndex(
        (passkey) => passkey.userId === context.user.userId && (passkey.passkeyId || sha256Hex(passkey.credentialId)) === passkeyId
      );
      if (index < 0) {
        sendJson(res, 404, { error: "passkey-not-found" }, headers);
        return;
      }
      state.auth.passkeys.splice(index, 1);
      persistState();
      const nextContext = resolveSessionContext(context.session);
      sendJson(res, 200, { ok: true, auth: authSummary(nextContext) }, headers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/agent/poll") {
      const agentContext = requireAgentSession(req, res);
      if (!agentContext) {
        return;
      }
      const body = await readJsonBody(req, 131072);
      const { agent } = agentContext;
      agent.lastSeenAt = nowIso();
      agent.label = clampText(String(body.label || agent.label || agent.agentId), 120);
      agent.workspaceRootName = clampText(String(body.workspaceRootName || ""), 120);
      agent.features = body.features || {};
      agent.actions = Array.isArray(body.actions) ? body.actions.slice(0, 50) : [];
      agent.logSources = Array.isArray(body.logSources) ? body.logSources.slice(0, 50) : [];
      volatileAgentData.set(agent.agentId, {
        codexSessions: Array.isArray(body.codexSessions) ? body.codexSessions.slice(0, 20).map(sanitizeSessionSummary) : []
      });
      persistState();

      const tasks = Object.values(state.tasks)
        .filter((task) => task.workspaceId === agent.workspaceId && task.agentId === agent.agentId && task.status === "queued")
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
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
      const agentContext = requireAgentSession(req, res);
      if (!agentContext) {
        return;
      }
      const task = state.tasks[updateMatch[1]];
      if (!task) {
        sendJson(res, 404, { error: "task-not-found" }, headers);
        return;
      }
      const body = await readJsonBody(req, 1024 * 1024);
      handleTaskUpdate(task, body, agentContext, res);
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
