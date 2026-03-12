import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const result = {
    relayConfig: "config/relay.prod.json",
    agentConfig: "config/agent.prod.json",
    outputDir: "deploy/generated",
    installRoot: "/opt/mobile-codex",
    relayUser: "mobilecodexrelay",
    agentUser: "mobilecodexagent"
  };

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === "--relay-config" && next) {
      result.relayConfig = next;
      index += 1;
    } else if (current === "--agent-config" && next) {
      result.agentConfig = next;
      index += 1;
    } else if (current === "--output-dir" && next) {
      result.outputDir = next;
      index += 1;
    } else if (current === "--install-root" && next) {
      result.installRoot = next;
      index += 1;
    } else if (current === "--relay-user" && next) {
      result.relayUser = next;
      index += 1;
    } else if (current === "--agent-user" && next) {
      result.agentUser = next;
      index += 1;
    }
  }

  return result;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function validateRelayConfig(config) {
  const problems = [];
  try {
    const origin = new URL(config.publicOrigin);
    if (origin.protocol !== "https:") {
      problems.push("publicOrigin should use https:// in production.");
    }
  } catch {
    problems.push("publicOrigin is not a valid URL.");
  }
  if (config.listenHost !== "127.0.0.1") {
    problems.push("listenHost is not 127.0.0.1. Public relay should normally bind to localhost behind a reverse proxy.");
  }
  if (config.features?.codexExecWrite) {
    problems.push("codexExecWrite is enabled. First production rollout should usually keep it disabled.");
  }
  return problems;
}

function buildRelayService({ relayUser, installRoot, relayConfigPath, stateDir }) {
  return `[Unit]
Description=Mobile Codex Relay
After=network.target

[Service]
Type=simple
User=${relayUser}
Group=${relayUser}
WorkingDirectory=${installRoot}
ExecStart=/usr/bin/npm run relay:start -- --config ${relayConfigPath}
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${stateDir}
ReadOnlyPaths=${installRoot} ${relayConfigPath}

[Install]
WantedBy=multi-user.target
`;
}

function buildAgentService({ agentUser, installRoot, agentConfigPath, workspaceRoot, stateDir }) {
  return `[Unit]
Description=Mobile Codex Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${agentUser}
Group=${agentUser}
WorkingDirectory=${installRoot}
ExecStart=/usr/bin/npm run agent:start -- --config ${agentConfigPath}
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=false
ReadOnlyPaths=${installRoot} ${agentConfigPath}
ReadWritePaths=${workspaceRoot} ${stateDir}

[Install]
WantedBy=multi-user.target
`;
}

function buildCaddyfile(publicOrigin, listenPort) {
  const origin = new URL(publicOrigin);
  return `${origin.host} {
    encode zstd gzip
    reverse_proxy 127.0.0.1:${listenPort}
}
`;
}

function buildSummary({
  relayConfigPath,
  agentConfigPath,
  installRoot,
  relayUser,
  agentUser,
  outputDir,
  publicOrigin,
  stateDir,
  workspaceRoot,
  agentStateDir
}) {
  return `# Production Scaffold

Generated files:

- ${path.join(outputDir, "mobile-codex-relay.service")}
- ${path.join(outputDir, "mobile-codex-agent.service")}
- ${path.join(outputDir, "Caddyfile")}

Assumptions:

- install root: ${installRoot}
- relay user: ${relayUser}
- agent user: ${agentUser}
- relay config: ${relayConfigPath}
- agent config: ${agentConfigPath}
- relay state dir: ${stateDir}
- agent workspace: ${workspaceRoot}
- agent state dir: ${agentStateDir}
- public origin: ${publicOrigin}

Suggested next steps:

1. Copy the repository to ${installRoot} on both target machines.
2. Copy ${path.join(outputDir, "mobile-codex-relay.service")} to /etc/systemd/system/codex-bridge-relay.service on the relay host.
3. Copy ${path.join(outputDir, "mobile-codex-agent.service")} to /etc/systemd/system/codex-bridge-agent.service on the agent host.
4. Copy ${path.join(outputDir, "Caddyfile")} into your Caddy configuration.
5. Start the relay:
   npm run relay:start -- --config ${relayConfigPath}
6. Open ${publicOrigin} on your phone and log in with the printed BOOTSTRAP_TOKEN.
7. Create a pairing code in the UI.
8. Pair the agent:
   npm run agent:pair -- --config ${agentConfigPath} --pair-code YOUR_CODE
9. Enable the systemd services once manual verification succeeds.

Security reminders:

- keep codexExecWrite disabled on first production rollout
- keep relay bound to 127.0.0.1 behind Caddy
- keep the workspace in a dedicated clone
- make sure the agent service user can run codex and has already completed codex login
`;
}

function main() {
  const args = parseArgs(process.argv);
  const relayConfigPath = path.resolve(args.relayConfig);
  const agentConfigPath = path.resolve(args.agentConfig);
  const outputDir = path.resolve(args.outputDir);
  const relayConfig = loadJson(relayConfigPath);
  const agentConfig = loadJson(agentConfigPath);

  const problems = validateRelayConfig(relayConfig);
  if (problems.length > 0) {
    console.error("Production scaffold warnings:");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    console.error("");
  }

  ensureDir(outputDir);
  writeText(
    path.join(outputDir, "mobile-codex-relay.service"),
    buildRelayService({
      relayUser: args.relayUser,
      installRoot: args.installRoot,
      relayConfigPath,
      stateDir: relayConfig.dataDir
    })
  );
  writeText(
    path.join(outputDir, "mobile-codex-agent.service"),
    buildAgentService({
      agentUser: args.agentUser,
      installRoot: args.installRoot,
      agentConfigPath,
      workspaceRoot: agentConfig.workspaceRoot,
      stateDir: agentConfig.stateDir || path.join(path.dirname(agentConfigPath), ".agent-state")
    })
  );
  writeText(
    path.join(outputDir, "Caddyfile"),
    buildCaddyfile(relayConfig.publicOrigin, relayConfig.listenPort)
  );
  writeText(
    path.join(outputDir, "NEXT_STEPS.md"),
    buildSummary({
      relayConfigPath,
      agentConfigPath,
      installRoot: args.installRoot,
      relayUser: args.relayUser,
      agentUser: args.agentUser,
      outputDir,
      publicOrigin: relayConfig.publicOrigin,
      stateDir: relayConfig.dataDir,
      workspaceRoot: agentConfig.workspaceRoot,
      agentStateDir: agentConfig.stateDir || path.join(path.dirname(agentConfigPath), ".agent-state")
    })
  );

  console.log(`Wrote production scaffolding into ${outputDir}`);
  console.log(`- ${path.join(outputDir, "mobile-codex-relay.service")}`);
  console.log(`- ${path.join(outputDir, "mobile-codex-agent.service")}`);
  console.log(`- ${path.join(outputDir, "Caddyfile")}`);
  console.log(`- ${path.join(outputDir, "NEXT_STEPS.md")}`);
}

main();
