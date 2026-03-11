import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs, loadConfig } from "../lib/config.js";
import { clampText, loadJson, nowIso, resolveWithin, sleep } from "../lib/common.js";

const args = parseArgs(process.argv);
const configPath = args.config || path.resolve(process.cwd(), "config/agent.local.json");
const loaded = loadConfig(configPath);
const config = loaded.value;

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

async function ensureAgentToken() {
  if (config.agentToken) {
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
      label: config.agentLabel
    }
  });
  config.agentToken = body.token;
  persistAgentConfig();
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

async function updateTask(taskId, body) {
  await apiRequest(config.relayBaseUrl, `/api/agent/tasks/${taskId}/update`, {
    method: "POST",
    token: config.agentToken,
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

  const wantsWrite = !!task.writeAccess;
  if (wantsWrite && !config.features?.codexExecWrite) {
    throw new Error("codex-write-mode-disabled-locally");
  }

  const targetCwd = resolveWithin(config.workspaceRoot, task.cwd || ".");
  const outputFile = path.join(path.dirname(loaded.path), `.codex-last-${task.taskId}.txt`);
  const argv = [
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
  argv.push(task.prompt);

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

async function handleTask(task) {
  try {
    await updateTask(task.taskId, {
      status: "running",
      summary: `Started ${task.type}`
    });

    let outcome;
    if (task.type === "codex_exec") {
      outcome = await runCodexExec(task);
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
      const body = await apiRequest(config.relayBaseUrl, "/api/agent/poll", {
        method: "POST",
        token: config.agentToken,
        body: {
          label: config.agentLabel,
          workspaceRootName: path.basename(config.workspaceRoot),
          features: config.features,
          actions: advertisedActions(),
          logSources: advertisedLogs()
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
  await ensureAgentToken();
  console.log(`[agent] started for ${config.agentId}`);
  await pollLoop();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
