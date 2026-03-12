const taskCacheKey = "mobileCodexTaskCache.v1";
const sessionCacheKey = "mobileCodexSessionCache.v1";
const cachedTaskFields = ["prompt", "summary", "outputTail", "diffText", "error", "result"];
const state = {
  token: localStorage.getItem("mobileCodexToken") || "",
  data: null,
  pollTimer: null,
  taskCache: loadTaskCache(),
  sessionCache: loadSessionCache(),
  selectedSessionId: ""
};

const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const taskForm = document.querySelector("#task-form");
const pairForm = document.querySelector("#pair-form");
const tasksEl = document.querySelector("#tasks");
const statusLine = document.querySelector("#status-line");
const pairResult = document.querySelector("#pair-result");
const agentSelect = document.querySelector("#agent-id");
const taskType = document.querySelector("#task-type");
const actionSelect = document.querySelector("#task-action-id");
const logSelect = document.querySelector("#task-log-source-id");
const logoutButton = document.querySelector("#logout-button");
const clearTaskCacheButton = document.querySelector("#clear-task-cache-button");
const pairCommandBox = document.querySelector("#pair-command-box");
const pairCommand = document.querySelector("#pair-command");
const copyPairCommandButton = document.querySelector("#copy-pair-command");
const sessionList = document.querySelector("#session-list");
const resumeSessionBanner = document.querySelector("#resume-session-banner");
const resumeSessionLabel = document.querySelector("#resume-session-label");
const clearSessionSelectionButton = document.querySelector("#clear-session-selection");
const promptLabel = document.querySelector("#codex-prompt-row span");

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
    .slice(0, 20);
  state.sessionCache = Object.fromEntries(entries);
  localStorage.setItem(sessionCacheKey, JSON.stringify(state.sessionCache));
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
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {})
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
  const needsDecision = task.status === "awaiting_approval";
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  const selectedAgentId = currentAgentId || state.data.agents?.[0]?.agentId || "";
  if (selectedAgentId) {
    agentSelect.value = selectedAgentId;
  }
  const selectedAgent = (state.data.agents || []).find((agent) => agent.agentId === selectedAgentId);
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

  statusLine.textContent = `${(state.data.agents || []).length} agent(s), ${(state.data.tasks || []).length} recent task(s)`;
  tasksEl.innerHTML = (state.data.tasks || []).map(taskCard).join("") || "<p class='hint'>No tasks yet.</p>";
  renderSessionList(selectedAgent);
  const relayFeatures = state.data.features || {};
  document.querySelector("#write-row").classList.toggle("hidden", taskType.value !== "codex_exec" || !relayFeatures.codexExecWrite);
  syncTaskFields();
}

function sessionCard(session, selected) {
  const preview = (session.preview || [])
    .map(
      (item) =>
        `<p class="session-preview ${item.role === "assistant" ? "assistant" : "user"}"><strong>${escapeHtml(item.role)}</strong> ${escapeHtml(item.text)}</p>`
    )
    .join("");
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
      <div class="actions">
        <button type="button" data-use-session="${escapeHtml(session.sessionId)}">${selected ? "Selected" : "Continue Here"}</button>
      </div>
    </article>
  `;
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

async function refresh() {
  const data = await api("/api/admin/state");
  renderState(data);
  const desiredInterval = Number(data.web?.pollIntervalMs || 2500);
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
  }
  state.pollTimer = setInterval(() => {
    if (state.token) {
      refresh().catch(() => {});
    }
  }, desiredInterval);
}

async function login(bootstrapToken) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: { bootstrapToken }
  });
  state.token = data.token;
  localStorage.setItem("mobileCodexToken", state.token);
  showDashboard(true);
  await refresh();
}

function logout() {
  localStorage.removeItem("mobileCodexToken");
  state.token = "";
  state.data = null;
  state.selectedSessionId = "";
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
  showDashboard(false);
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
    const body = await api("/api/admin/pairings", {
      method: "POST",
      body: {
        note: document.querySelector("#pair-note").value,
        ttlSec: Number(document.querySelector("#pair-ttl").value || 300)
      }
    });
    pairResult.textContent = `Pairing code: ${body.pairingCode}\nExpires: ${body.expiresAt}`;
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
logoutButton.addEventListener("click", logout);
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

sessionList.addEventListener("click", (event) => {
  const sessionId = event.target.getAttribute("data-use-session");
  if (!sessionId) {
    return;
  }
  state.selectedSessionId = sessionId;
  taskType.value = "codex_exec";
  syncTaskFields();
  renderState(state.data || { agents: [], tasks: [] });
  document.querySelector("#task-prompt").focus();
});

syncTaskFields();

if (state.token) {
  showDashboard(true);
  refresh().catch(() => {
    logout();
  });
} else {
  showDashboard(false);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
