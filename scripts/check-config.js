import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "../lib/config.js";

const args = parseArgs(process.argv);
const configPath = args.config || path.resolve(process.cwd(), "config/relay.local.json");
const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON.parse(raw);
console.log(`loaded ${configPath}`);
console.log(`top-level keys: ${Object.keys(parsed).join(", ")}`);
