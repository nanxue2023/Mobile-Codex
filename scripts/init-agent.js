import path from "node:path";
import {
  askChoice,
  askText,
  askYesNo,
  confirmOverwrite,
  createPrompter,
  parseInitArgs,
  printDivider,
  validateAbsolutePath,
  validateAgentId,
  validateNonEmpty,
  validateUrl,
  writeJsonFile
} from "./init-common.js";

const args = parseInitArgs(process.argv);

const presets = {
  test: {
    output: "config/agent.local.json",
    relayBaseUrl: "http://127.0.0.1:8787",
    agentId: "server-main",
    agentLabel: "Main Server",
    workspaceRoot: process.cwd()
  },
  production: {
    output: "config/agent.prod.json",
    relayBaseUrl: "https://mobile-codex.example.com",
    agentId: "server-main",
    agentLabel: "Main Server",
    workspaceRoot: "/srv/mobile-codex/workspace"
  }
};

async function main() {
  const rl = createPrompter();
  try {
    console.log("Mobile Codex agent init");
    console.log("This script generates an agent config with safe defaults.");
    printDivider();

    const mode = await askChoice(
      rl,
      "Choose mode (test or production)",
      ["test", "production"],
      args.mode || "test"
    );
    const preset = presets[mode];
    const outputPath = await askText(rl, "Config output path", args.output || preset.output, validateNonEmpty);
    const okToWrite = await confirmOverwrite(rl, outputPath, args.force);
    if (!okToWrite) {
      console.log("Aborted.");
      return;
    }

    const relayBaseUrl = await askText(
      rl,
      "Relay base URL",
      preset.relayBaseUrl,
      (value) => validateUrl(value, mode === "production")
    );
    const agentId = await askText(rl, "Agent id", preset.agentId, validateAgentId);
    const agentLabel = await askText(rl, "Agent label", preset.agentLabel, validateNonEmpty);
    const workspaceRoot = await askText(rl, "Workspace root (absolute path)", preset.workspaceRoot, validateAbsolutePath);

    const actions = {};
    const includeStatusAction = await askYesNo(rl, "Add a sample read-only Git status action", true);
    if (includeStatusAction) {
      actions.status = {
        label: "Git Status",
        cwd: ".",
        argv: ["git", "status", "--short"],
        timeoutSec: 20
      };
    }

    const includeNpmTestAction = await askYesNo(rl, "Add a sample npm test action", mode === "test");
    if (includeNpmTestAction) {
      actions.test = {
        label: "Run Tests",
        cwd: ".",
        argv: ["npm", "test"],
        timeoutSec: 600
      };
    }

    const logSources = {};
    const logPath = await askText(
      rl,
      "Optional absolute log path (leave blank to skip)",
      "",
      (value) => (value ? validateAbsolutePath(value) : "")
    );
    if (logPath) {
      const logId = await askText(rl, "Log source id", "app-log", validateAgentId);
      const logLabel = await askText(rl, "Log source label", "Application Log", validateNonEmpty);
      const maxLinesRaw = await askText(rl, "Max log lines to return", "200", (value) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5000) {
          return "Please enter a whole number between 1 and 5000.";
        }
        return "";
      });
      logSources[logId] = {
        label: logLabel,
        path: logPath,
        maxLines: Number(maxLinesRaw)
      };
    }

    const config = {
      relayBaseUrl,
      agentId,
      agentLabel,
      agentToken: "",
      workspaceRoot,
      pollIntervalMs: 2500,
      maxTaskLogBytes: 12000,
      features: {
        codexExec: true,
        codexExecWrite: false,
        runAction: true,
        readLog: true
      },
      actions,
      logSources,
      codex: {
        model: "",
        extraArgs: [],
        writeModeDefaultsToOff: true
      }
    };

    const writtenPath = writeJsonFile(outputPath, config);
    printDivider();
    console.log(`Wrote agent config: ${writtenPath}`);
    console.log("");
    console.log("Notes:");
    console.log("- agentToken is intentionally empty before first pairing.");
    console.log("- First successful pairing will write agentToken back into this file.");
    console.log("- codexExecWrite is disabled by default for safety.");
    console.log("");
    console.log("Next step:");
    console.log("1. Start the relay and log into the web UI.");
    console.log("2. Create a pairing code from the UI.");
    console.log(`3. Run: node agent/agent.js --config ${path.resolve(writtenPath)} --pair-code YOUR_CODE`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(String(error.message || error));
  process.exitCode = 1;
});
