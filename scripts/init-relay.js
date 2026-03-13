import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  askChoice,
  askText,
  buildRelaySecrets,
  confirmOverwrite,
  createPrompter,
  parseInitArgs,
  printDivider,
  validateNonEmpty,
  validateUrl,
  writeJsonFile
} from "./init-common.js";

const args = parseInitArgs(process.argv);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const presets = {
  test: {
    output: "config/relay.local.json",
    listenHost: "127.0.0.1",
    listenPort: "8787",
    publicOrigin: "http://127.0.0.1:8787",
    dataDir: path.join(projectRoot, "data", "relay"),
    pairCommandConfigPathHint: "config/agent.local.json"
  },
  production: {
    output: "config/relay.prod.json",
    listenHost: "127.0.0.1",
    listenPort: "8787",
    publicOrigin: "https://mobile-codex.example.com",
    dataDir: "/var/lib/mobile-codex-relay",
    pairCommandConfigPathHint: "/etc/mobile-codex/agent.prod.json"
  }
};

async function main() {
  const rl = createPrompter();
  try {
    console.log("Mobile Codex relay init");
    console.log("This script generates a relay config with safe defaults.");
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

    const listenHost = await askText(rl, "Listen host", preset.listenHost, validateNonEmpty);
    const listenPortRaw = await askText(rl, "Listen port", preset.listenPort, (value) => {
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return "Please enter a valid TCP port between 1 and 65535.";
      }
      return "";
    });
    const listenPort = Number(listenPortRaw);
    const publicOrigin = await askText(
      rl,
      "Public origin",
      preset.publicOrigin,
      (value) => validateUrl(value, mode === "production")
    );
    const dataDir = await askText(rl, "Relay state directory", preset.dataDir, validateNonEmpty);
    const pairCommandConfigPathHint = await askText(
      rl,
      "Agent config path hint shown in the pairing command",
      preset.pairCommandConfigPathHint,
      validateNonEmpty
    );

    const secrets = buildRelaySecrets();
    const config = {
      listenHost,
      listenPort,
      publicOrigin,
      dataDir,
      sessionTtlSec: 43200,
      maxLoginAttemptsPerMinute: 10,
      maxPairAttemptsPerMinute: 20,
      bootstrapAdminTokenHash: secrets.bootstrapTokenHash,
      tokenSecret: secrets.tokenSecret,
      features: {
        pairings: true,
        codexExec: true,
        readSession: true,
        deleteSession: true,
        codexExecWrite: false,
        runAction: true,
        readLog: true
      },
      web: {
        appName: "Mobile Codex",
        pollIntervalMs: 2500,
        pairCommandConfigPathHint
      }
    };

    const writtenPath = writeJsonFile(outputPath, config);
    printDivider();
    console.log(`Wrote relay config: ${writtenPath}`);
    console.log("");
    console.log("Save this bootstrap token now. It is not stored in plaintext.");
    console.log(`BOOTSTRAP_TOKEN=${secrets.bootstrapToken}`);
    console.log("");
    console.log("Notes:");
    console.log("- Use BOOTSTRAP_TOKEN to log into the web UI.");
    console.log("- The config file stores only bootstrapAdminTokenHash.");
    console.log("- codexExecWrite is disabled by default for safety.");
    console.log("");
    console.log("Next step:");
    console.log(`npm run relay:start -- --config ${path.resolve(writtenPath)}`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(String(error.message || error));
  process.exitCode = 1;
});
