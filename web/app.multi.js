const taskCacheKey = "mobileCodexTaskCache.v1";
const sessionCacheKey = "mobileCodexSessionCache.v1";
const cachedTaskFields = ["prompt", "summary", "outputTail", "diffText", "error", "result"];
const state = {
  authenticated: false,
  data: null,
  authStatus: null,
  pollTimer: null,
  taskCache: loadTaskCache(),
  sessionCache: loadSessionCache(),
  selectedSessionId: "",
  activeView: localStorage.getItem("mobileCodexActiveView") || "workspace"
};

const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const viewNav = document.querySelector("#view-nav");
const viewTabs = Array.from(document.querySelectorAll("[data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const loginForm = document.querySelector("#login-form");
const inviteLoginForm = document.querySelector("#invite-login-form");
const passkeyForm = document.querySelector("#passkey-form");
const taskForm = document.querySelector("#task-form");
const pairForm = document.querySelector("#pair-form");
const workspaceForm = document.querySelector("#workspace-form");
const joinWorkspaceForm = document.querySelector("#join-workspace-form");
const inviteForm = document.querySelector("#invite-form");
const tasksEl = document.querySelector("#tasks");
const statusLine = document.querySelector("#status-line");
const pairResult = document.querySelector("#pair-result");
const inviteResult = document.querySelector("#invite-result");
const workspaceSelect = document.querySelector("#workspace-id");
const agentSelect = document.querySelector("#agent-id");
const currentUserLine = document.querySelector("#current-user-line");
const taskType = document.querySelector("#task-type");
const actionSelect = document.querySelector("#task-action-id");
const logSelect = document.querySelector("#task-log-source-id");
const logoutButton = document.querySelector("#logout-button");
const clearTaskCacheButton = document.querySelector("#clear-task-cache-button");
const pairCommandBox = document.querySelector("#pair-command-box");
const pairCommand = document.querySelector("#pair-command");
const copyPairCommandButton = document.querySelector("#copy-pair-command");
const pairRequestsEl = document.querySelector("#pair-requests");
const sessionList = document.querySelector("#session-list");
const resumeSessionBanner = document.querySelector("#resume-session-banner");
const resumeSessionLabel = document.querySelector("#resume-session-label");
const clearSessionSelectionButton = document.querySelector("#clear-session-selection");
const promptLabel = document.querySelector("#codex-prompt-row span");
const passkeyLoginButton = document.querySelector("#passkey-login-button");
const passkeyLoginBox = document.querySelector("#passkey-login-box");
const passkeyLoginHint = document.querySelector("#passkey-login-hint");
const recoveryLoginBox = document.querySelector("#recovery-login-box");
const authStatusLine = document.querySelector("#auth-status-line");
const passkeyList = document.querySelector("#passkey-list");
const passkeyLabelInput = document.querySelector("#passkey-label");
const memberList = document.querySelector("#member-list");
const inviteList = document.querySelector("#invite-list");

function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(normalized + padding);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function loadTaskCache() {
  try {
    return JSON.parse(localStorage.getItem(taskCacheKey) || "{}");
  } catch {
    return {};
  }
}

function loadSessionCache() {
  try {
    return JSON.parse(localStorage.getItem(sessionCacheKey) || "{}");
  } catch {
    return {};
  }
}

function persistTaskCache() {
  const entries = Object.entries(state.taskCache)
    .sort((left, right) => String(right[1]?.cachedAt || "").localeCompare(String(left[1]?.cachedAt || "")))
    .slice(0, 100);
  state.taskCache = Object.fromEntries(entries);
  localStorage.setItem(taskCacheKey, JSON.stringify(state.taskCache));
}

function persistSessionCache() {
  const entries = Object.entries(state.sessionCache)
    .sort((left, right) => String(right[1]?.cachedAt || "").localeCompare(String(left[1]?.cachedAt || "")))
    .slice(0, 30);
  state.sessionCache = Object.fromEntries(entries);
  localStorage.setItem(sessionCacheKey, JSON.stringify(state.sessionCache));
}

function setActiveView(viewName) {
  const nextView = viewPanels.some((panel) => panel.dataset.viewPanel === viewName) ? viewName : "workspace";
  state.activeView = nextView;
  localStorage.setItem("mobileCodexActiveView", nextView);
  for (const tab of viewTabs) {
    tab.classList.toggle("active", tab.dataset.viewTarget === nextView);
  }
  for (const panel of viewPanels) {
    panel.classList.toggle("active", panel.dataset.viewPanel === nextView);
  }
}

function webauthnAvailable() {
  return typeof window.PublicKeyCredential !== "undefined" && !!navigator.credentials && window.isSecureContext;
}

function decodeCredentialDescriptor(descriptor) {
  return {
    ...descriptor,
    id: base64UrlToBytes(descriptor.id)
  };
}

function decodeCreationOptions(publicKey) {
  return {
    ...publicKey,
    challenge: base64UrlToBytes(publicKey.challenge),
    user: {
      ...publicKey.user,
      id: base64UrlToBytes(publicKey.user.id)
    },
    excludeCredentials: Array.isArray(publicKey.excludeCredentials)
      ? publicKey.excludeCredentials.map(decodeCredentialDescriptor)
      : []
  };
}

function decodeRequestOptions(publicKey) {
  return {
    ...publicKey,
    challenge: base64UrlToBytes(publicKey.challenge),
    allowCredentials: Array.isArray(publicKey.allowCredentials)
      ? publicKey.allowCredentials.map(decodeCredentialDescriptor)
      : []
  };
}

function serializeCredential(credential) {
  const response = credential.response;
  const payload = {
    id: credential.id,
    rawId: bytesToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToBase64Url(response.clientDataJSON)
    }
  };

  if (response.attestationObject) {
    payload.response.attestationObject = bytesToBase64Url(response.attestationObject);
  }
  if (response.authenticatorData) {
    payload.response.authenticatorData = bytesToBase64Url(response.authenticatorData);
  }
  if (response.signature) {
    payload.response.signature = bytesToBase64Url(response.signature);
  }
  if (response.userHandle) {
    payload.response.userHandle = bytesToBase64Url(response.userHandle);
  }
  if (typeof response.getTransports === "function") {
    payload.response.transports = response.getTransports();
  }

  return payload;
}

function mergeTaskFromCache(task) {
  const cached = state.taskCache[task.taskId];
  if (!cached) {
    return task;
  }
  const merged = { ...task };
  for (const field of cachedTaskFields) {
    const value = merged[field];
    const shouldUseCached =
      field === "result" ? value == null && cached[field] != null : (!value || value.length === 0) && cached[field];
    if (shouldUseCached) {
      merged[field] = cached[field];
    }
  }
  return merged;
}

function updateTaskCache(tasks) {
  for (const task of tasks) {
    const existing = state.taskCache[task.taskId] || {};
    const next = { ...existing };
    for (const field of cachedTaskFields) {
      const value = task[field];
      if (field === "result") {
        if (value != null) {
          next[field] = value;
        }
      } else if (typeof value === "string" && value.length > 0) {
        next[field] = value;
      }
    }
    if (Object.keys(next).length > 0) {
      next.cachedAt = new Date().toISOString();
      state.taskCache[task.taskId] = next;
    }
  }
  persistTaskCache();
}

function mergeAgentSessionsFromCache(agent) {
  const cached = state.sessionCache[agent.agentId];
  if (Array.isArray(agent.codexSessions) && agent.codexSessions.length > 0) {
    return agent;
  }
  if (!cached?.sessions?.length) {
    return {
      ...agent,
      codexSessions: []
    };
  }
  return {
    ...agent,
    codexSessions: cached.sessions
  };
}

function updateSessionCache(agents) {
  for (const agent of agents) {
    if (Array.isArray(agent.codexSessions) && agent.codexSessions.length > 0) {
      state.sessionCache[agent.agentId] = {
        cachedAt: new Date().toISOString(),
        sessions: agent.codexSessions.slice(0, 20)
      };
    }
  }
  persistSessionCache();
}

function getCurrentAuth() {
  return state.data?.auth || state.authStatus || null;
}

function currentPermissions() {
  return getCurrentAuth()?.permissions || {};
}

function findSelectedAgent() {
  return (state.data?.agents || []).find((agent) => agent.agentId === agentSelect.value) || null;
}

function findSelectedSession(agent = findSelectedAgent()) {
  if (!agent || !state.selectedSessionId) {
    return null;
  }
  return (agent.codexSessions || []).find((session) => session.sessionId === state.selectedSessionId) || null;
}

function clearSelectedSession() {
  state.selectedSessionId = "";
  syncTaskFields();
}

function authNeedsPasskeyEnrollment() {
  return !!getCurrentAuth()?.needsPasskeyEnrollment;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shellEscape(value) {
  return `'${String(value).replaceAll("'", `'\"'\"'`)}'`;
}

function buildPairCommand(pairingCode) {
  const configPathHint = state.data?.web?.pairCommandConfigPathHint || "config/agent.local.json";
  return `npm run agent:pair -- --config ${shellEscape(configPathHint)} --pair-code ${shellEscape(pairingCode)}`;
}

function showDashboard(visible) {
  loginPanel.classList.toggle("hidden", visible);
  dashboard.classList.toggle("hidden", !visible);
  if (visible) {
    setActiveView(state.activeView);
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function taskCard(task) {
  const permissions = currentPermissions();
  const needsDecision = task.status === "awaiting_approval" && permissions.approveTasks;
  const output = task.outputTail ? `<pre>${escapeHtml(task.outputTail)}</pre>` : "";
  const diff = task.diffText ? `<details><summary>Diff</summary><pre>${escapeHtml(task.diffText)}</pre></details>` : "";
  const error = task.error ? `<p class="error">${escapeHtml(task.error)}</p>` : "";
  return `
    <article class="task-card">
      <header>
        <div>
          <strong>${escapeHtml(task.title || task.type)}</strong>
          <p>${escapeHtml(task.agentId)} · ${escapeHtml(task.status)}</p>
        </div>
        <div class="task-meta">${new Date(task.updatedAt).toLocaleString()}</div>
      </header>
      ${task.prompt ? `<p class="task-body">${escapeHtml(task.prompt)}</p>` : ""}
      ${task.resumeSessionId ? `<p class="task-body">Session: ${escapeHtml(task.resumeSessionId)}</p>` : ""}
      ${task.sessionId ? `<p class="task-body">Target Session: ${escapeHtml(task.sessionId)}</p>` : ""}
      ${task.actionId ? `<p class="task-body">Action: ${escapeHtml(task.actionId)}</p>` : ""}
      ${task.logSourceId ? `<p class="task-body">Log: ${escapeHtml(task.logSourceId)}</p>` : ""}
      ${task.summary ? `<p class="task-summary">${escapeHtml(task.summary)}</p>` : ""}
      ${error}
      ${output}
      ${diff}
      ${
        needsDecision
          ? `<div class="actions">
               <button data-approve="${task.taskId}" type="button">Approve</button>
               <button data-reject="${task.taskId}" type="button" class="secondary">Reject</button>
             </div>`
          : ""
      }
    </article>
  `;
}

function pairRequestCard(request) {
  const canApprove = currentPermissions().pairAgents;
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(request.label || request.agentId || "Pending Device")}</strong>
          <p>${escapeHtml(request.agentId)} · ${escapeHtml(request.hostname || "unknown host")}</p>
        </div>
        <div class="task-meta">${new Date(request.createdAt).toLocaleString()}</div>
      </header>
      ${request.note ? `<p class="task-body">${escapeHtml(request.note)}</p>` : ""}
      ${request.workspaceRootName ? `<p class="task-summary">Workspace: ${escapeHtml(request.workspaceRootName)}</p>` : ""}
      ${
        canApprove
          ? `<div class="actions">
               <button type="button" data-approve-pair="${request.requestId}">Approve Device</button>
               <button type="button" class="secondary" data-reject-pair="${request.requestId}">Reject</button>
             </div>`
          : "<p class='hint'>Workspace operators can approve or reject this device.</p>"
      }
    </article>
  `;
}

function sessionCard(session, selected) {
  const preview = (session.preview || [])
    .map(
      (item) =>
        `<p class="session-preview ${item.role === "assistant" ? "assistant" : "user"}"><strong>${escapeHtml(item.role)}</strong> ${escapeHtml(item.text)}</p>`
    )
    .join("");
  const canContinue = currentPermissions().createTasks;
  return `
    <article class="session-card ${selected ? "selected" : ""}">
      <header>
        <div>
          <strong>${escapeHtml(session.title || "Codex Session")}</strong>
          <p>${escapeHtml(session.sessionId)} · ${escapeHtml(session.cwd || ".")}</p>
        </div>
        <div class="task-meta">${new Date(session.updatedAt).toLocaleString()}</div>
      </header>
      ${session.firstUserMessage ? `<p class="task-body">${escapeHtml(session.firstUserMessage)}</p>` : ""}
      ${preview || "<p class='hint'>No preview available yet.</p>"}
      ${
        canContinue
          ? `<div class="actions">
               <button type="button" data-use-session="${escapeHtml(session.sessionId)}">${selected ? "Selected" : "Continue Here"}</button>
               <button type="button" class="secondary" data-delete-session="${escapeHtml(session.sessionId)}">Delete</button>
             </div>`
          : "<p class='hint'>Workspace operators can continue or delete sessions.</p>"
      }
    </article>
  `;
}

function passkeyCard(passkey) {
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(passkey.label || "Passkey")}</strong>
          <p>${escapeHtml(passkey.displayId || passkey.passkeyId || "")}</p>
        </div>
        <div class="task-meta">${passkey.lastUsedAt ? `Used ${new Date(passkey.lastUsedAt).toLocaleDateString()}` : "Never used"}</div>
      </header>
      <p class="task-body">Created ${new Date(passkey.createdAt).toLocaleString()}</p>
      ${
        (passkey.transports || []).length
          ? `<p class="task-summary">Transports: ${escapeHtml(passkey.transports.join(", "))}</p>`
          : ""
      }
      <div class="actions">
        <button type="button" class="secondary" data-revoke-passkey="${encodeURIComponent(passkey.passkeyId)}">Revoke</button>
      </div>
    </article>
  `;
}

function memberCard(member) {
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(member.displayName)}</strong>
          <p>${escapeHtml(member.role)}</p>
        </div>
        <div class="task-meta">${new Date(member.createdAt).toLocaleDateString()}</div>
      </header>
    </article>
  `;
}

function invitationCard(invitation) {
  return `
    <article class="session-card">
      <header>
        <div>
          <strong>${escapeHtml(invitation.role)}</strong>
          <p>${escapeHtml(invitation.createdByDisplayName || "Workspace owner")}</p>
        </div>
        <div class="task-meta">Expires ${new Date(invitation.expiresAt).toLocaleString()}</div>
      </header>
      ${invitation.note ? `<p class="task-body">${escapeHtml(invitation.note)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-revoke-invite="${invitation.inviteId}">Revoke Invite</button>
      </div>
    </article>
  `;
}

function removeSessionFromLocalState(agentId, sessionId) {
  if (state.sessionCache[agentId]?.sessions) {
    state.sessionCache[agentId].sessions = state.sessionCache[agentId].sessions.filter((item) => item.sessionId !== sessionId);
    persistSessionCache();
  }
  if (state.data?.agents) {
    state.data.agents = state.data.agents.map((agent) =>
      agent.agentId === agentId
        ? {
            ...agent,
            codexSessions: (agent.codexSessions || []).filter((item) => item.sessionId !== sessionId)
          }
        : agent
    );
  }
}

function renderSessionList(agent) {
  const sessions = agent?.codexSessions || [];
  const selectedSession = findSelectedSession(agent);
  resumeSessionBanner.classList.toggle("hidden", !selectedSession);
  resumeSessionLabel.textContent = selectedSession
    ? `${selectedSession.title} · ${selectedSession.sessionId} · ${selectedSession.cwd || "."}`
    : "";
  sessionList.innerHTML = sessions.length
    ? sessions.map((session) => sessionCard(session, session.sessionId === state.selectedSessionId)).join("")
    : "<p class='hint'>No Codex sessions found for this workspace yet.</p>";
}

function renderAuthStatus(auth) {
  state.authStatus = auth || null;
  const passkeysEnabled = !!auth?.passkeysEnabled;
  const hasPasskeys = !!auth?.hasPasskeys;
  const supported = webauthnAvailable();

  passkeyLoginBox.classList.toggle("hidden", !passkeysEnabled || !hasPasskeys);
  passkeyLoginButton.disabled = !supported;
  recoveryLoginBox.open = !passkeysEnabled || !hasPasskeys;
  passkeyLoginHint.textContent = !supported
    ? "This browser cannot use passkeys here. Use Safari/Chrome on a secure origin, or fall back to the recovery token."
    : hasPasskeys
      ? "Use the passkey already registered for this relay."
      : "No passkeys registered yet.";

  if (!state.authenticated || !auth) {
    currentUserLine.textContent = "Signed out.";
    return;
  }

  const workspaceLabel = auth.workspaces?.find((workspace) => workspace.workspaceId === auth.currentWorkspaceId)?.name || "No workspace";
  currentUserLine.textContent = `${auth.currentUser?.displayName || "User"} · ${auth.currentRole || "no role"} · ${workspaceLabel}`;
  if (auth.needsPasskeyEnrollment) {
    authStatusLine.textContent = "Register a passkey on this device before running tasks or pairing agents.";
  } else if (passkeysEnabled) {
    authStatusLine.textContent = `${auth.passkeyCount} passkey(s) on this account. Recovery token remains available only for the relay owner.`;
  } else {
    authStatusLine.textContent = "Passkeys are unavailable here. Check HTTPS/publicOrigin and passkey configuration.";
  }
  passkeyForm.classList.toggle("hidden", !passkeysEnabled || !supported);
  passkeyList.innerHTML = (auth.passkeys || []).length
    ? auth.passkeys.map(passkeyCard).join("")
    : "<p class='hint'>No passkeys registered yet. Add this device before you log out.</p>";
}

function renderWorkspaceSelect(auth) {
  const previousValue = workspaceSelect.value;
  workspaceSelect.innerHTML = "";
  const workspaces = auth?.workspaces || [];
  if (!workspaces.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No workspace";
    workspaceSelect.append(option);
    workspaceSelect.disabled = true;
    return;
  }
  workspaceSelect.disabled = false;
  for (const workspace of workspaces) {
    const option = document.createElement("option");
    option.value = workspace.workspaceId;
    option.textContent = `${workspace.name} (${workspace.role})`;
    workspaceSelect.append(option);
  }
  workspaceSelect.value = auth.currentWorkspaceId || previousValue || workspaces[0].workspaceId;
}

function renderSecurityPanels(data) {
  const auth = data.auth || getCurrentAuth() || {};
  const permissions = auth.permissions || {};
  workspaceForm.classList.toggle("hidden", !permissions.createWorkspaces);
  joinWorkspaceForm.classList.toggle("hidden", !state.authenticated);
  inviteForm.classList.toggle("hidden", !permissions.manageMembers || !data.currentWorkspace);
  memberList.innerHTML =
    permissions.manageMembers && data.currentWorkspace
      ? (data.members || []).map(memberCard).join("") || "<p class='hint'>No members yet.</p>"
      : "<p class='hint'>Workspace owners can manage members and invites here.</p>";
  inviteList.innerHTML =
    permissions.manageMembers && data.currentWorkspace
      ? (data.invitations || []).length
        ? data.invitations.map(invitationCard).join("")
        : "<p class='hint'>No active invites for this workspace.</p>"
      : "";
}

function renderState(data) {
  const agents = (data.agents || []).map(mergeAgentSessionsFromCache);
  updateSessionCache(agents);
  const tasks = (data.tasks || []).map(mergeTaskFromCache);
  updateTaskCache(tasks);
  state.data = {
    ...data,
    agents,
    tasks
  };
  renderAuthStatus(state.data.auth || state.authStatus);
  renderWorkspaceSelect(state.data.auth || {});
  renderSecurityPanels(state.data);

  const permissions = currentPermissions();
  const currentAgentId = agentSelect.value;
  agentSelect.innerHTML = "";
  actionSelect.innerHTML = "";
  logSelect.innerHTML = "";

  for (const agent of state.data.agents || []) {
    const option = document.createElement("option");
    option.value = agent.agentId;
    option.textContent = `${agent.label || agent.agentId} (${agent.agentId})`;
    agentSelect.append(option);
  }

  const selectedAgentId = (state.data.agents || []).some((agent) => agent.agentId === currentAgentId)
    ? currentAgentId
    : state.data.agents?.[0]?.agentId || "";
  if (selectedAgentId) {
    agentSelect.value = selectedAgentId;
  }
  const selectedAgent = (state.data.agents || []).find((agent) => agent.agentId === selectedAgentId) || null;
  if (state.selectedSessionId && !(selectedAgent?.codexSessions || []).some((session) => session.sessionId === state.selectedSessionId)) {
    state.selectedSessionId = "";
  }

  for (const action of selectedAgent?.actions || []) {
    const option = document.createElement("option");
    option.value = action.id;
    option.textContent = action.label || action.id;
    actionSelect.append(option);
  }
  for (const source of selectedAgent?.logSources || []) {
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.label || source.id;
    logSelect.append(option);
  }

  const workspaceName = state.data.currentWorkspace?.name || "No workspace";
  statusLine.textContent = `${workspaceName} · ${(state.data.agents || []).length} agent(s), ${(state.data.tasks || []).length} recent task(s)`;
  tasksEl.innerHTML = (state.data.tasks || []).map(taskCard).join("") || "<p class='hint'>No tasks yet.</p>";
  pairRequestsEl.innerHTML = (state.data.pendingPairRequests || []).length
    ? state.data.pendingPairRequests.map(pairRequestCard).join("")
    : "<p class='hint'>No pending devices waiting for approval.</p>";
  renderSessionList(selectedAgent);

  taskForm.classList.toggle("hidden", !permissions.createTasks || !state.data.currentWorkspace);
  pairForm.classList.toggle("hidden", !permissions.pairAgents || !state.data.currentWorkspace);

  if (authNeedsPasskeyEnrollment()) {
    setActiveView("security");
  }
  syncTaskFields();
}

function syncTaskFields() {
  const type = taskType.value;
  const isResume = Boolean(state.selectedSessionId);
  const relayFeatures = state.data?.features || {};
  document.querySelector("#codex-prompt-row").classList.toggle("hidden", type !== "codex_exec");
  document.querySelector("#cwd-row").classList.toggle("hidden", type !== "codex_exec" || isResume);
  document.querySelector("#write-row").classList.toggle("hidden", type !== "codex_exec" || isResume || !relayFeatures.codexExecWrite);
  document.querySelector("#action-row").classList.toggle("hidden", type !== "run_action");
  document.querySelector("#log-row").classList.toggle("hidden", type !== "read_log");
  promptLabel.textContent = isResume ? "Continue Prompt" : "Prompt";
}

async function refreshAuthStatus() {
  try {
    const body = await api("/api/auth/status");
    state.authenticated = !!body.authenticated;
    renderAuthStatus(body.auth);
  } catch {
    state.authenticated = false;
    renderAuthStatus(null);
  }
}

async function refresh() {
  const data = await api("/api/admin/state");
  state.authenticated = true;
  showDashboard(true);
  renderState(data);
  const desiredInterval = Number(data.web?.pollIntervalMs || 2500);
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
  }
  state.pollTimer = setInterval(() => {
    if (!state.authenticated) {
      return;
    }
    refresh().catch(async () => {
      clearAuthenticatedState();
      showDashboard(false);
      await refreshAuthStatus().catch(() => {});
    });
  }, desiredInterval);
}

async function login(bootstrapToken) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: { bootstrapToken }
  });
  state.authenticated = true;
  showDashboard(true);
  renderAuthStatus(data.auth || state.authStatus);
  await refresh();
}

async function redeemInvite(inviteCode, displayName = "") {
  const data = await api("/api/auth/invitations/redeem", {
    method: "POST",
    body: {
      inviteCode,
      displayName
    }
  });
  state.authenticated = true;
  showDashboard(true);
  renderAuthStatus(data.auth || state.authStatus);
  await refresh();
}

async function loginWithPasskey() {
  if (!webauthnAvailable()) {
    throw new Error("passkeys-unavailable-in-this-browser");
  }
  const options = await api("/api/auth/passkeys/login/options", {
    method: "POST",
    body: {}
  });
  const credential = await navigator.credentials.get({
    publicKey: decodeRequestOptions(options.publicKey)
  });
  if (!credential) {
    throw new Error("passkey-login-cancelled");
  }
  const verified = await api("/api/auth/passkeys/login/verify", {
    method: "POST",
    body: {
      loginId: options.loginId,
      credential: serializeCredential(credential)
    }
  });
  state.authenticated = true;
  showDashboard(true);
  renderAuthStatus(verified.auth || state.authStatus);
  await refresh();
}

async function registerPasskey() {
  if (!webauthnAvailable()) {
    throw new Error("passkeys-unavailable-in-this-browser");
  }
  const label = passkeyLabelInput.value.trim() || "This Device";
  const options = await api("/api/auth/passkeys/register/options", {
    method: "POST",
    body: { label }
  });
  const credential = await navigator.credentials.create({
    publicKey: decodeCreationOptions(options.publicKey)
  });
  if (!credential) {
    throw new Error("passkey-registration-cancelled");
  }
  const verified = await api("/api/auth/passkeys/register/verify", {
    method: "POST",
    body: {
      registrationId: options.registrationId,
      credential: serializeCredential(credential)
    }
  });
  renderAuthStatus(verified.auth || state.authStatus);
  passkeyLabelInput.value = "";
  await refresh();
}

function clearAuthenticatedState() {
  state.authenticated = false;
  state.data = null;
  state.selectedSessionId = "";
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout transport failures and clear local UI state anyway.
  }
  clearAuthenticatedState();
  showDashboard(false);
  await refreshAuthStatus().catch(() => {});
}

async function switchWorkspace(workspaceId) {
  await api("/api/auth/workspace", {
    method: "POST",
    body: { workspaceId }
  });
  clearSelectedSession();
  await refresh();
}

async function createWorkspace(name) {
  await api("/api/admin/workspaces", {
    method: "POST",
    body: { name }
  });
  await refresh();
}

async function createInvite(role, ttlSec, note) {
  const result = await api("/api/admin/invitations", {
    method: "POST",
    body: {
      role,
      ttlSec,
      note
    }
  });
  inviteResult.textContent = `Invite code: ${result.inviteCode}\nRole: ${result.invitation.role}\nExpires: ${result.invitation.expiresAt}`;
  await refresh();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const token = document.querySelector("#bootstrap-token").value.trim();
    await login(token);
  } catch (error) {
    alert(String(error.message || error));
  }
});

inviteLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const inviteCode = document.querySelector("#invite-code").value.trim();
    const displayName = document.querySelector("#invite-display-name").value.trim();
    await redeemInvite(inviteCode, displayName);
    document.querySelector("#invite-code").value = "";
    document.querySelector("#invite-display-name").value = "";
  } catch (error) {
    alert(String(error.message || error));
  }
});

passkeyLoginButton.addEventListener("click", async () => {
  try {
    await loginWithPasskey();
  } catch (error) {
    alert(String(error.message || error));
  }
});

passkeyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await registerPasskey();
  } catch (error) {
    alert(String(error.message || error));
  }
});

workspaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const input = document.querySelector("#workspace-name");
    await createWorkspace(input.value.trim());
    input.value = "";
    setActiveView("workspace");
  } catch (error) {
    alert(String(error.message || error));
  }
});

joinWorkspaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const input = document.querySelector("#join-invite-code");
    await redeemInvite(input.value.trim());
    input.value = "";
    setActiveView("workspace");
  } catch (error) {
    alert(String(error.message || error));
  }
});

inviteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await createInvite(
      document.querySelector("#invite-role").value,
      Number(document.querySelector("#invite-ttl").value || 86400),
      document.querySelector("#invite-note").value.trim()
    );
  } catch (error) {
    alert(String(error.message || error));
  }
});

viewNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view-target]");
  if (!button) {
    return;
  }
  setActiveView(button.dataset.viewTarget);
});

workspaceSelect.addEventListener("change", async () => {
  if (!workspaceSelect.value) {
    return;
  }
  try {
    await switchWorkspace(workspaceSelect.value);
  } catch (error) {
    alert(String(error.message || error));
  }
});

taskType.addEventListener("change", syncTaskFields);
agentSelect.addEventListener("change", () => {
  clearSelectedSession();
  renderState(state.data || { agents: [], tasks: [] });
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const type = taskType.value;
    const body = {
      agentId: agentSelect.value,
      type,
      title: type === "codex_exec" ? "Codex Task" : type === "run_action" ? "Run Action" : "Read Log"
    };
    if (type === "codex_exec") {
      body.prompt = document.querySelector("#task-prompt").value;
      body.cwd = document.querySelector("#task-cwd").value || ".";
      body.writeAccess = state.selectedSessionId ? false : document.querySelector("#task-write").checked;
      if (state.selectedSessionId) {
        body.resumeSessionId = state.selectedSessionId;
        body.title = "Continue Session";
      }
    } else if (type === "run_action") {
      body.actionId = actionSelect.value;
      body.title = `Action: ${actionSelect.value}`;
    } else if (type === "read_log") {
      body.logSourceId = logSelect.value;
      body.title = `Read Log: ${logSelect.value}`;
    }
    await api("/api/admin/tasks", {
      method: "POST",
      body
    });
    await refresh();
  } catch (error) {
    alert(String(error.message || error));
  }
});

pairForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setActiveView("agents");
    const body = await api("/api/admin/pairings", {
      method: "POST",
      body: {
        note: document.querySelector("#pair-note").value,
        ttlSec: Number(document.querySelector("#pair-ttl").value || 300)
      }
    });
    pairResult.textContent = `Short pair code: ${body.pairingCode}\nExpires: ${body.expiresAt}\nThis code is single-use and still requires phone approval.`;
    pairCommand.value = buildPairCommand(body.pairingCode);
    pairCommandBox.classList.remove("hidden");
  } catch (error) {
    alert(String(error.message || error));
  }
});

copyPairCommandButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(pairCommand.value);
    copyPairCommandButton.textContent = "Copied";
    setTimeout(() => {
      copyPairCommandButton.textContent = "Copy Pair Command";
    }, 1200);
  } catch {
    pairCommand.focus();
    pairCommand.select();
    alert("Copy failed. The command has been selected for manual copy.");
  }
});

document.querySelector("#refresh-button").addEventListener("click", refresh);
logoutButton.addEventListener("click", () => {
  logout().catch(() => {});
});
clearTaskCacheButton.addEventListener("click", () => {
  state.taskCache = {};
  state.sessionCache = {};
  localStorage.removeItem(taskCacheKey);
  localStorage.removeItem(sessionCacheKey);
  if (state.data) {
    renderState(state.data);
  }
});
clearSessionSelectionButton.addEventListener("click", () => {
  clearSelectedSession();
  renderState(state.data || { agents: [], tasks: [] });
});

tasksEl.addEventListener("click", async (event) => {
  const approveId = event.target.getAttribute("data-approve");
  const rejectId = event.target.getAttribute("data-reject");
  try {
    if (approveId) {
      await api(`/api/admin/tasks/${approveId}/approve`, { method: "POST" });
      await refresh();
    } else if (rejectId) {
      await api(`/api/admin/tasks/${rejectId}/reject`, { method: "POST" });
      await refresh();
    }
  } catch (error) {
    alert(String(error.message || error));
  }
});

pairRequestsEl.addEventListener("click", async (event) => {
  const approveId = event.target.getAttribute("data-approve-pair");
  const rejectId = event.target.getAttribute("data-reject-pair");
  try {
    if (approveId) {
      await api(`/api/admin/pair-requests/${approveId}/approve`, { method: "POST" });
      await refresh();
    } else if (rejectId) {
      await api(`/api/admin/pair-requests/${rejectId}/reject`, { method: "POST" });
      await refresh();
    }
  } catch (error) {
    alert(String(error.message || error));
  }
});

sessionList.addEventListener("click", (event) => {
  const sessionId = event.target.getAttribute("data-use-session");
  const deleteSessionId = event.target.getAttribute("data-delete-session");
  if (sessionId) {
    state.selectedSessionId = sessionId;
    taskType.value = "codex_exec";
    setActiveView("workspace");
    syncTaskFields();
    renderState(state.data || { agents: [], tasks: [] });
    document.querySelector("#task-prompt").focus();
    return;
  }
  if (!deleteSessionId) {
    return;
  }
  const selectedAgent = findSelectedAgent();
  const session = findSelectedSession(selectedAgent) && state.selectedSessionId === deleteSessionId
    ? findSelectedSession(selectedAgent)
    : (selectedAgent?.codexSessions || []).find((item) => item.sessionId === deleteSessionId);
  const label = session ? `${session.title} (${session.sessionId})` : deleteSessionId;
  if (!confirm(`Delete this Codex session from the agent?\n\n${label}\n\nThis cannot be undone.`)) {
    return;
  }
  api("/api/admin/tasks", {
    method: "POST",
    body: {
      agentId: agentSelect.value,
      type: "delete_session",
      title: "Delete Session",
      sessionId: deleteSessionId
    }
  })
    .then(async () => {
      removeSessionFromLocalState(agentSelect.value, deleteSessionId);
      if (state.selectedSessionId === deleteSessionId) {
        clearSelectedSession();
      }
      if (state.data) {
        renderState(state.data);
      }
      await refresh();
    })
    .catch((error) => {
      alert(String(error.message || error));
    });
});

passkeyList.addEventListener("click", async (event) => {
  const passkeyId = event.target.getAttribute("data-revoke-passkey");
  if (!passkeyId) {
    return;
  }
  if (!confirm("Revoke this passkey?")) {
    return;
  }
  try {
    const result = await api(`/api/admin/passkeys/${passkeyId}/revoke`, {
      method: "POST"
    });
    renderAuthStatus(result.auth || state.authStatus);
    await refresh();
  } catch (error) {
    alert(String(error.message || error));
  }
});

inviteList.addEventListener("click", async (event) => {
  const inviteId = event.target.getAttribute("data-revoke-invite");
  if (!inviteId) {
    return;
  }
  if (!confirm("Revoke this invite?")) {
    return;
  }
  try {
    await api(`/api/admin/invitations/${inviteId}/revoke`, {
      method: "POST"
    });
    await refresh();
  } catch (error) {
    alert(String(error.message || error));
  }
});

syncTaskFields();
setActiveView(state.activeView);
showDashboard(false);

refreshAuthStatus()
  .catch(() => {})
  .finally(() => {
    refresh().catch(() => {
      clearAuthenticatedState();
      showDashboard(false);
    });
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
