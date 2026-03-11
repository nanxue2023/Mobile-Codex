import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, "..");

export function parseStartArgs(argv) {
  const result = {
    config: "",
    pairCode: "",
    pair: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--config" && next) {
      result.config = next;
      index += 1;
    } else if (current === "--pair-code" && next) {
      result.pairCode = next;
      index += 1;
    } else if (current === "--pair") {
      result.pair = true;
    }
  }

  return result;
}

export function resolveConfigPath(kind, explicitPath = "") {
  if (explicitPath) {
    const absolute = path.resolve(explicitPath);
    if (!fs.existsSync(absolute)) {
      throw new Error(`Config not found: ${absolute}`);
    }
    return absolute;
  }

  const candidates = [
    path.join(projectRoot, "config", `${kind}.local.json`),
    path.join(projectRoot, "config", `${kind}.prod.json`)
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      `No ${kind} config found. Run "npm run init:${kind}" first, or pass --config /absolute/path/to/${kind}.json`
    );
  }
  return found;
}

export function ensurePairCode(pairCode) {
  if (!pairCode) {
    throw new Error("Missing --pair-code. Create a pairing code in the web UI, then run: npm run agent:pair -- --pair-code YOUR_CODE");
  }
}
