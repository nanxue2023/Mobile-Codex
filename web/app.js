const state = {
  token: localStorage.getItem("codexBridgeToken") || "",
  data: null,
  pollTimer: null
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
  state.data = data;
  const currentAgentId = agentSelect.value;
  agentSelect.innerHTML = "";
  actionSelect.innerHTML = "";
  logSelect.innerHTML = "";

  for (const agent of data.agents || []) {
    const option = document.createElement("option");
    option.value = agent.agentId;
    option.textContent = `${agent.label || agent.agentId} (${agent.agentId})`;
    agentSelect.append(option);
  }

  const selectedAgentId = currentAgentId || data.agents?.[0]?.agentId || "";
  if (selectedAgentId) {
    agentSelect.value = selectedAgentId;
  }
  const selectedAgent = (data.agents || []).find((agent) => agent.agentId === selectedAgentId);
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

  statusLine.textContent = `${(data.agents || []).length} agent(s), ${(data.tasks || []).length} recent task(s)`;
  tasksEl.innerHTML = (data.tasks || []).map(taskCard).join("") || "<p class='hint'>No tasks yet.</p>";
  const relayFeatures = data.features || {};
  document.querySelector("#write-row").classList.toggle("hidden", taskType.value !== "codex_exec" || !relayFeatures.codexExecWrite);
}

function syncTaskFields() {
  const type = taskType.value;
  document.querySelector("#codex-prompt-row").classList.toggle("hidden", type !== "codex_exec");
  document.querySelector("#cwd-row").classList.toggle("hidden", type !== "codex_exec");
  document.querySelector("#write-row").classList.toggle("hidden", type !== "codex_exec");
  document.querySelector("#action-row").classList.toggle("hidden", type !== "run_action");
  document.querySelector("#log-row").classList.toggle("hidden", type !== "read_log");
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
  localStorage.setItem("codexBridgeToken", state.token);
  showDashboard(true);
  await refresh();
}

function logout() {
  localStorage.removeItem("codexBridgeToken");
  state.token = "";
  state.data = null;
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
agentSelect.addEventListener("change", () => renderState(state.data || { agents: [], tasks: [] }));

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
      body.writeAccess = document.querySelector("#task-write").checked;
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
  } catch (error) {
    alert(String(error.message || error));
  }
});

document.querySelector("#refresh-button").addEventListener("click", refresh);
logoutButton.addEventListener("click", logout);

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
