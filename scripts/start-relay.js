import path from "node:path";
import { spawn } from "node:child_process";
import { parseStartArgs, projectRoot, resolveConfigPath } from "./start-common.js";

const args = parseStartArgs(process.argv);

try {
  const configPath = resolveConfigPath("relay", args.config);
  const scriptPath = path.join(projectRoot, "relay", "server.js");
  const child = spawn(process.execPath, [scriptPath, "--config", configPath], {
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
