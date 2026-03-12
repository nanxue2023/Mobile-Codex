import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import { parseArgs, loadConfig } from "../lib/config.js";
import { clampText, loadJson, nowIso, resolveWithin, sleep } from "../lib/common.js";

const args = parseArgs(process.argv);
const configPath = args.config || path.resolve(process.cwd(), "config/agent.local.json");
const loaded = loadConfig(configPath);
const config = loaded.value;
const agentRuntimeState = {
  agentToken: "",
  sessionCatalog: {
    fetchedAt: 0,
    sessions: []
  }
};

async function apiRequest(baseUrl, pathname, options = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${pathname} ${response.status}: ${body.error || text}`);
  }
  return body;
}

function persistAgentConfig() {
  fs.writeFileSync(loaded.path, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function resolveAgentStateDir() {
  const configured = String(config.stateDir || "").trim();
  return path.resolve(loaded.dir, configured || ".agent-state");
}

function resolveAgentTokenFile() {
  const configured = String(config.agentTokenFile || "").trim();
  if (configured) {
    return path.resolve(loaded.dir, configured);
  }
  return path.join(resolveAgentStateDir(), `${config.agentId || "agent"}.token`);
}

function readAgentTokenFile() {
  try {
    return fs.readFileSync(resolveAgentTokenFile(), "utf8").trim();
  } catch {
    return "";
  }
}

function writeAgentTokenFile(token) {
  const tokenFile = resolveAgentTokenFile();
  fs.mkdirSync(path.dirname(tokenFile), { recursive: true });
  fs.writeFileSync(tokenFile, `${String(token || "").trim()}\n`, { mode: 0o600 });
  fs.chmodSync(tokenFile, 0o600);
  return tokenFile;
}

function currentAgentToken() {
  return String(agentRuntimeState.agentToken || "").trim();
}

function loadAgentToken() {
  const envToken = String(process.env.MOBILE_CODEX_AGENT_TOKEN || "").trim();
  if (envToken) {
    agentRuntimeState.agentToken = envToken;
    return envToken;
  }

  const fileToken = readAgentTokenFile();
  if (fileToken) {
    agentRuntimeState.agentToken = fileToken;
    return fileToken;
  }

  const legacyToken = String(config.agentToken || "").trim();
  if (legacyToken) {
    agentRuntimeState.agentToken = legacyToken;
    return legacyToken;
  }

  agentRuntimeState.agentToken = "";
  return "";
}

function migrateLegacyAgentToken() {
  const legacyToken = String(config.agentToken || "").trim();
  if (!legacyToken) {
    return;
  }
  try {
    writeAgentTokenFile(legacyToken);
    config.agentToken = "";
    persistAgentConfig();
    console.log(`[agent] migrated legacy agent token into ${resolveAgentTokenFile()}`);
  } catch (error) {
    console.warn(
      `[agent] warning: could not migrate legacy agent token into ${resolveAgentTokenFile()}: ${String(error.message || error)}`
    );
  }
}

async function ensureAgentToken() {
  if (currentAgentToken()) {
    return;
  }
  if (!args.pairCode) {
    throw new Error("missing-agent-token-and-pair-code");
  }
  const body = await apiRequest(config.relayBaseUrl, "/api/agent/pair", {
    method: "POST",
    body: {
      pairingCode: args.pairCode,
      agentId: config.agentId,
      label: config.agentLabel,
      hostname: os.hostname(),
      workspaceRootName: path.basename(config.workspaceRoot)
    }
  });
  if (body.status !== "pending" || !body.requestId || !body.requestToken) {
    throw new Error("pair-request-not-created");
  }
  console.log(`[agent] pair request submitted; waiting for approval (${body.requestId})`);

  const deadline = Date.parse(body.expiresAt || "") || Date.now() + 300000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const status = await apiRequest(config.relayBaseUrl, "/api/agent/pair/status", {
      method: "POST",
      body: {
        requestId: body.requestId,
        requestToken: body.requestToken
      }
    });
    if (status.status === "pending") {
      continue;
    }
    if (status.status === "rejected") {
      throw new Error("pair-request-rejected");
    }
    if (status.status === "approved" && status.token) {
      writeAgentTokenFile(status.token);
      agentRuntimeState.agentToken = status.token;
      console.log("[agent] pair request approved");
      return;
    }
    throw new Error(`unexpected-pair-status:${status.status}`);
  }

  throw new Error("pair-request-expired");
}

function advertisedActions() {
  return Object.entries(config.actions || {}).map(([id, action]) => ({
    id,
    label: action.label || id
  }));
}

function advertisedLogs() {
  return Object.entries(config.logSources || {}).map(([id, source]) => ({
    id,
    label: source.label || id
  }));
}

function resetSessionCatalogCache() {
  agentRuntimeState.sessionCatalog.fetchedAt = 0;
}

function isWithinWorkspace(targetPath) {
  const root = path.resolve(config.workspaceRoot);
  const resolved = path.resolve(targetPath);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

function getCodexHome() {
  return path.resolve(config.codex?.homeDir || path.join(os.homedir(), ".codex"));
}

function getCodexSessionsRoot() {
  return path.resolve(config.codex?.sessionsRoot || path.join(getCodexHome(), "sessions"));
}

function getCodexStateDbPath() {
  if (config.codex?.stateDbPath) {
    return path.resolve(config.codex.stateDbPath);
  }

  const home = getCodexHome();
  try {
    const candidates = fs
      .readdirSync(home)
      .filter((name) => /^state_\d+\.sqlite$/.test(name))
      .map((name) => path.join(home, name))
      .map((filePath) => ({
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs
      }))
      .sort((left, right) => right.mtimeMs - left.mtimeMs);
    return candidates[0]?.filePath || path.join(home, "state_5.sqlite");
  } catch {
    return path.join(home, "state_5.sqlite");
  }
}

async function querySqliteJson(sqlitePath, query) {
  const result = await spawnCommand(["sqlite3", "-json", sqlitePath, query], process.cwd(), 15, () => {});
  if (result.code !== 0) {
    throw new Error(result.stderr || "sqlite-query-failed");
  }
  const text = result.stdout.trim();
  return text ? JSON.parse(text) : [];
}

function toIsoFromUnixSeconds(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? new Date(numeric * 1000).toISOString() : nowIso();
}

function summarizeSessionText(value, maxChars = 240) {
  return clampText(String(value || "").replace(/\s+/g, " ").trim(), maxChars);
}

function validateSessionId(value) {
  const sessionId = String(value || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,120}$/.test(sessionId)) {
    throw new Error("invalid-session-id");
  }
  return sessionId;
}

function extractMessageText(role, content) {
  if (!Array.isArray(content)) {
    return "";
  }
  const allowedType = role === "assistant" ? "output_text" : "input_text";
  return summarizeSessionText(
    content
      .filter((item) => item?.type === allowedType && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n"),
    320
  );
}

async function readSessionPreview(rolloutPath) {
  const sessionsRoot = getCodexSessionsRoot();
  const resolvedPath = path.resolve(rolloutPath);
  if (!resolvedPath.startsWith(`${sessionsRoot}${path.sep}`)) {
    return [];
  }

  const previews = [];
  const stream = fs.createReadStream(resolvedPath, { encoding: "utf8" });
  const lines = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  try {
    for await (const line of lines) {
      if (!line) {
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (parsed.type !== "response_item" || parsed.payload?.type !== "message") {
        continue;
      }
      const role = parsed.payload.role;
      if (role !== "user" && role !== "assistant") {
        continue;
      }
      const text = extractMessageText(role, parsed.payload.content);
      if (!text) {
        continue;
      }
      previews.push({
        role,
        text,
        timestamp: parsed.timestamp || nowIso()
      });
      if (previews.length > 6) {
        previews.shift();
      }
    }
  } finally {
    lines.close();
    stream.destroy();
  }

  return previews.slice(-4);
}

async function loadCodexSessions() {
  const sqlitePath = getCodexStateDbPath();
  if (!fs.existsSync(sqlitePath)) {
    return [];
  }

  const listLimit = Math.max(1, Math.min(Number(config.codex?.sessionListLimit || 12), 30));
  const rows = await querySqliteJson(
    sqlitePath,
    [
      "select",
      "id,",
      "rollout_path as rolloutPath,",
      "created_at as createdAt,",
      "updated_at as updatedAt,",
      "source,",
      "cwd,",
      "title,",
      "first_user_message as firstUserMessage",
      "from threads",
      "where archived = 0",
      "order by updated_at desc",
      `limit ${Math.max(listLimit * 3, 20)}`
    ].join(" ")
  );

  const scopedRows = rows.filter((row) => row?.cwd && isWithinWorkspace(row.cwd)).slice(0, listLimit);
  const sessions = [];

  for (const row of scopedRows) {
    let preview = [];
    try {
      preview = await readSessionPreview(row.rolloutPath);
    } catch {
      preview = [];
    }

    sessions.push({
      sessionId: String(row.id || ""),
      title: summarizeSessionText(row.title || row.firstUserMessage || row.id || "Codex Session", 180),
      firstUserMessage: summarizeSessionText(row.firstUserMessage || "", 240),
      updatedAt: toIsoFromUnixSeconds(row.updatedAt),
      createdAt: toIsoFromUnixSeconds(row.createdAt),
      cwd: path.relative(config.workspaceRoot, row.cwd || config.workspaceRoot) || ".",
      source: summarizeSessionText(row.source || "", 24),
      preview
    });
  }

  return sessions;
}

async function getAdvertisedCodexSessions() {
  if (!config.features?.codexExec) {
    return [];
  }

  const ttlMs = Math.max(5000, Math.min(Number(config.codex?.sessionCatalogTtlMs || 30000), 300000));
  const now = Date.now();
  if (now - agentRuntimeState.sessionCatalog.fetchedAt < ttlMs) {
    return agentRuntimeState.sessionCatalog.sessions;
  }

  try {
    const sessions = await loadCodexSessions();
    agentRuntimeState.sessionCatalog = {
      fetchedAt: now,
      sessions
    };
  } catch (error) {
    console.error(`[agent] codex sessions unavailable: ${String(error.message || error)}`);
    agentRuntimeState.sessionCatalog = {
      fetchedAt: now,
      sessions: []
    };
  }
  return agentRuntimeState.sessionCatalog.sessions;
}

async function updateTask(taskId, body) {
  await apiRequest(config.relayBaseUrl, `/api/agent/tasks/${taskId}/update`, {
    method: "POST",
    token: currentAgentToken(),
    body
  });
}

function spawnCommand(argv, cwd, timeoutSec, onOutput) {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutSec * 1000);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      onOutput(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      onOutput(text);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({
        code,
        signal,
        stdout,
        stderr
      });
    });
  });
}

async function captureGitDiff(cwd) {
  try {
    const result = await spawnCommand(["git", "diff", "--no-ext-diff", "--binary"], cwd, 20, () => {});
    return clampText(result.stdout, 20000);
  } catch {
    return "";
  }
}

async function runCodexExec(task) {
  if (!config.features?.codexExec) {
    throw new Error("codex-exec-disabled-locally");
  }

  const isResume = typeof task.resumeSessionId === "string" && task.resumeSessionId.trim().length > 0;
  const wantsWrite = !!task.writeAccess;
  if (isResume && wantsWrite) {
    throw new Error("resume-write-mode-disabled");
  }
  if (wantsWrite && !config.features?.codexExecWrite) {
    throw new Error("codex-write-mode-disabled-locally");
  }

  const targetCwd = resolveWithin(config.workspaceRoot, task.cwd || ".");
  const outputFile = path.join(path.dirname(loaded.path), `.codex-last-${task.taskId}.txt`);
  const argv = isResume
    ? ["codex", "exec", "resume", "--json", "--skip-git-repo-check", "--output-last-message", outputFile]
    : [
        "codex",
        "exec",
        "--json",
        "--skip-git-repo-check",
        "-C",
        targetCwd,
        "--sandbox",
        wantsWrite ? "workspace-write" : "read-only",
        "--output-last-message",
        outputFile
      ];

  if (config.codex?.model) {
    argv.push("--model", config.codex.model);
  }
  if (wantsWrite) {
    argv.push("--full-auto");
  }
  for (const extraArg of config.codex?.extraArgs || []) {
    argv.push(extraArg);
  }
  if (isResume) {
    argv.push(task.resumeSessionId.trim());
    if (task.prompt) {
      argv.push(task.prompt);
    }
  } else {
    argv.push(task.prompt);
  }

  let pendingOutput = "";
  const flushOutput = async (force = false) => {
    if (!pendingOutput && !force) {
      return;
    }
    const outputAppend = clampText(pendingOutput, config.maxTaskLogBytes || 12000);
    pendingOutput = "";
    if (outputAppend) {
      await updateTask(task.taskId, {
        status: "running",
        outputAppend
      });
    }
  };

  const result = await spawnCommand(argv, targetCwd, 1800, (text) => {
    pendingOutput += text;
  });
  await flushOutput(true);

  let lastMessage = "";
  try {
    lastMessage = fs.readFileSync(outputFile, "utf8");
  } catch {
    lastMessage = "";
  }

  const diffText = wantsWrite ? await captureGitDiff(targetCwd) : "";
  resetSessionCatalogCache();
  return {
    status: result.code === 0 ? "completed" : "failed",
    summary: clampText(lastMessage || result.stderr || result.stdout, 2000),
    diffText,
    result: {
      exitCode: result.code,
      signal: result.signal,
      completedAt: nowIso()
    },
    error: result.code === 0 ? "" : clampText(result.stderr || "codex exec failed", 4000)
  };
}

async function runAction(task) {
  if (!config.features?.runAction) {
    throw new Error("run-action-disabled-locally");
  }
  const action = config.actions?.[task.actionId];
  if (!action) {
    throw new Error(`unknown-action:${task.actionId}`);
  }
  const cwd = resolveWithin(config.workspaceRoot, action.cwd || ".");
  const result = await spawnCommand(action.argv, cwd, action.timeoutSec || 300, async (text) => {
    await updateTask(task.taskId, {
      status: "running",
      outputAppend: clampText(text, 4000)
    });
  });
  return {
    status: result.code === 0 ? "completed" : "failed",
    summary: clampText(result.stdout || result.stderr || `action ${task.actionId} finished`, 2000),
    result: {
      actionId: task.actionId,
      exitCode: result.code,
      signal: result.signal,
      completedAt: nowIso()
    },
    error: result.code === 0 ? "" : clampText(result.stderr || "action failed", 4000)
  };
}

async function runReadLog(task) {
  if (!config.features?.readLog) {
    throw new Error("read-log-disabled-locally");
  }
  const source = config.logSources?.[task.logSourceId];
  if (!source) {
    throw new Error(`unknown-log-source:${task.logSourceId}`);
  }
  const lines = Number(source.maxLines || 200);
  const content = fs.readFileSync(source.path, "utf8");
  const tail = content.split(/\r?\n/).slice(-lines).join("\n");
  return {
    status: "completed",
    summary: clampText(tail, 2000),
    result: {
      logSourceId: task.logSourceId,
      lineCount: tail ? tail.split(/\r?\n/).length : 0,
      completedAt: nowIso()
    },
    outputAppend: clampText(tail, config.maxTaskLogBytes || 12000),
    error: ""
  };
}

async function lookupSessionForDeletion(sessionId) {
  const sqlitePath = getCodexStateDbPath();
  if (!fs.existsSync(sqlitePath)) {
    throw new Error("codex-state-db-not-found");
  }

  const safeSessionId = validateSessionId(sessionId);
  const rows = await querySqliteJson(
    sqlitePath,
    [
      "select",
      "id,",
      "rollout_path as rolloutPath,",
      "cwd,",
      "title,",
      "first_user_message as firstUserMessage",
      "from threads",
      `where id = '${safeSessionId.replaceAll("'", "''")}'`,
      "limit 1"
    ].join(" ")
  );
  const row = rows[0];
  if (!row) {
    throw new Error("session-not-found");
  }
  if (!row.cwd || !isWithinWorkspace(row.cwd)) {
    throw new Error("session-outside-workspace");
  }
  return {
    sqlitePath,
    sessionId: safeSessionId,
    rolloutPath: String(row.rolloutPath || ""),
    cwd: String(row.cwd || ""),
    title: summarizeSessionText(row.title || row.firstUserMessage || safeSessionId, 180)
  };
}

function pruneEmptySessionParents(targetPath, rootPath) {
  let current = path.dirname(targetPath);
  const resolvedRoot = path.resolve(rootPath);
  while (current.startsWith(`${resolvedRoot}${path.sep}`)) {
    try {
      if (fs.readdirSync(current).length > 0) {
        return;
      }
      fs.rmdirSync(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

async function deleteCodexSession(task) {
  if (config.features?.deleteSession === false) {
    throw new Error("delete-session-disabled-locally");
  }

  const session = await lookupSessionForDeletion(task.sessionId);
  const sessionsRoot = getCodexSessionsRoot();
  const rolloutPath = path.resolve(session.rolloutPath || "");
  const result = await spawnCommand(
    [
      "sqlite3",
      session.sqlitePath,
      `update threads set archived = 1 where id = '${session.sessionId.replaceAll("'", "''")}';`
    ],
    process.cwd(),
    15,
    () => {}
  );
  if (result.code !== 0) {
    throw new Error(result.stderr || "session-archive-failed");
  }

  if (rolloutPath && rolloutPath.startsWith(`${sessionsRoot}${path.sep}`)) {
    try {
      fs.unlinkSync(rolloutPath);
      pruneEmptySessionParents(rolloutPath, sessionsRoot);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  resetSessionCatalogCache();
  return {
    status: "completed",
    summary: `Deleted session ${session.title}`,
    result: {
      sessionId: session.sessionId,
      deletedAt: nowIso()
    },
    error: ""
  };
}

async function handleTask(task) {
  try {
    await updateTask(task.taskId, {
      status: "running",
      summary: `Started ${task.type}`
    });

    let outcome;
    if (task.type === "codex_exec") {
      outcome = await runCodexExec(task);
    } else if (task.type === "delete_session") {
      outcome = await deleteCodexSession(task);
    } else if (task.type === "run_action") {
      outcome = await runAction(task);
    } else if (task.type === "read_log") {
      outcome = await runReadLog(task);
    } else {
      throw new Error(`unsupported-task:${task.type}`);
    }

    await updateTask(task.taskId, outcome);
  } catch (error) {
    await updateTask(task.taskId, {
      status: "failed",
      error: clampText(String(error.message || error), 4000),
      summary: "Task failed"
    });
  }
}

async function pollLoop() {
  while (true) {
    try {
      const codexSessions = await getAdvertisedCodexSessions();
      const body = await apiRequest(config.relayBaseUrl, "/api/agent/poll", {
        method: "POST",
        token: currentAgentToken(),
        body: {
          label: config.agentLabel,
          workspaceRootName: path.basename(config.workspaceRoot),
          features: config.features,
          actions: advertisedActions(),
          logSources: advertisedLogs(),
          codexSessions
        }
      });

      for (const task of body.tasks || []) {
        await handleTask(task);
      }
    } catch (error) {
      console.error(`[agent] ${String(error.message || error)}`);
    }
    await sleep(config.pollIntervalMs || 2500);
  }
}

async function main() {
  loadJson(loaded.path, config);
  loadAgentToken();
  migrateLegacyAgentToken();
  loadAgentToken();
  await ensureAgentToken();
  console.log(`[agent] started for ${config.agentId}`);
  await pollLoop();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
