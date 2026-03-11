import fs from "node:fs";
import path from "node:path";

export function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--config" && next) {
      result.config = next;
      index += 1;
    } else if (current === "--pair-code" && next) {
      result.pairCode = next;
      index += 1;
    }
  }
  return result;
}

export function loadConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  const raw = fs.readFileSync(absolutePath, "utf8");
  return {
    path: absolutePath,
    dir: path.dirname(absolutePath),
    value: JSON.parse(raw)
  };
}
