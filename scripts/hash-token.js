import fs from "node:fs";
import { sha256Hex } from "../lib/common.js";

const stdin = fs.readFileSync(0, "utf8").trim();
if (!stdin) {
  console.error("pipe a token into this script");
  process.exit(1);
}

console.log(sha256Hex(stdin));
