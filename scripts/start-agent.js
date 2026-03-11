import path from "node:path";
import { spawn } from "node:child_process";
import { ensurePairCode, parseStartArgs, projectRoot, resolveConfigPath } from "./start-common.js";

const args = parseStartArgs(process.argv);

try {
  const configPath = resolveConfigPath("agent", args.config);
  const scriptPath = path.join(projectRoot, "agent", "agent.js");
  const childArgs = [scriptPath, "--config", configPath];

  if (args.pair) {
    ensurePairCode(args.pairCode);
    childArgs.push("--pair-code", args.pairCode);
  } else if (args.pairCode) {
    childArgs.push("--pair-code", args.pairCode);
  }

  const child = spawn(process.execPath, childArgs, {
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error(String(error.message || error));
  process.exit(1);
}
