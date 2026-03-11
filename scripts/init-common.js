import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { atomicWriteJson, sha256Hex, randomToken } from "../lib/common.js";

export function parseInitArgs(argv) {
  const result = {
    mode: "",
    output: "",
    force: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--mode" && next) {
      result.mode = next;
      index += 1;
    } else if (current === "--output" && next) {
      result.output = next;
      index += 1;
    } else if (current === "--force") {
      result.force = true;
    }
  }

  return result;
}

export function createPrompter() {
  return readline.createInterface({ input, output });
}

export async function askChoice(rl, label, options, defaultValue) {
  const optionSet = new Set(options);
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${label}${suffix}: `)).trim() || defaultValue;
    if (optionSet.has(answer)) {
      return answer;
    }
    console.log(`Please choose one of: ${options.join(", ")}`);
  }
}

export async function askText(rl, label, defaultValue, validator = null) {
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${label}${suffix}: `)).trim() || defaultValue;
    if (!validator) {
      return answer;
    }
    const problem = validator(answer);
    if (!problem) {
      return answer;
    }
    console.log(problem);
  }
}

export async function askYesNo(rl, label, defaultValue = true) {
  const fallback = defaultValue ? "y" : "n";
  while (true) {
    const answer = (await rl.question(`${label} [${fallback}]: `)).trim().toLowerCase() || fallback;
    if (answer === "y" || answer === "yes") {
      return true;
    }
    if (answer === "n" || answer === "no") {
      return false;
    }
    console.log("Please answer y or n.");
  }
}

export function validateUrl(value, requireHttps = false) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "URL must start with http:// or https://";
    }
    if (requireHttps && parsed.protocol !== "https:") {
      return "Production mode requires an https:// URL.";
    }
    return "";
  } catch {
    return "Please enter a valid URL.";
  }
}

export function validateAbsolutePath(value) {
  if (!path.isAbsolute(value)) {
    return "Please enter an absolute path.";
  }
  return "";
}

export function validateNonEmpty(value) {
  if (!value) {
    return "This value cannot be empty.";
  }
  return "";
}

export function validateAgentId(value) {
  if (!value) {
    return "Agent id cannot be empty.";
  }
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    return "Use only letters, numbers, dot, underscore, or hyphen.";
  }
  return "";
}

export async function confirmOverwrite(rl, filePath, force) {
  if (!fs.existsSync(filePath) || force) {
    return true;
  }
  return askYesNo(rl, `File exists: ${filePath}. Overwrite`, false);
}

export function writeJsonFile(filePath, value) {
  const absolutePath = path.resolve(filePath);
  atomicWriteJson(absolutePath, value);
  fs.chmodSync(absolutePath, 0o600);
  return absolutePath;
}

export function buildRelaySecrets() {
  const bootstrapToken = randomToken(24);
  const tokenSecret = randomToken(32);
  const bootstrapTokenHash = sha256Hex(bootstrapToken);
  return {
    bootstrapToken,
    bootstrapTokenHash,
    tokenSecret
  };
}

export function printDivider() {
  console.log("");
  console.log("------------------------------------------------------------");
  console.log("");
}
