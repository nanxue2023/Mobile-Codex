# Mobile Codex

[简体中文](./README.zh-CN.md)

Mobile-first remote control for Codex.

Mobile Codex lets you use Codex from your phone without exposing SSH, a full IDE, or a raw shell on the public internet. It now supports true multi-user isolation through workspaces, invites, and per-user passkeys.

The project is built around three pieces:

- `relay`: a public-facing control plane and PWA host
- `agent`: a private-side worker that stays next to your workspace
- `web`: a phone-friendly UI for tasks, pairing, logs, and session continuation

## ✨ What It Does

- Submit `codex exec` tasks from a phone-friendly web UI
- Browse recent Codex sessions from the selected agent and continue one safely
- Delete unwanted Codex sessions from the selected agent
- Run predefined safe actions by id
- Read predefined log sources by id
- Pair and revoke agents from the browser
- Pair agents with a short code plus phone approval instead of long direct-use codes
- Use passkeys for daily login, keeping the bootstrap token as owner recovery-only access
- Create isolated workspaces for different people, devices, or environments
- Invite users into a workspace without sharing the owner recovery token
- Keep dangerous capabilities off by default

## 🔐 Security Defaults

- No arbitrary remote shell by default
- No arbitrary file reads by default
- `codexExecWrite` disabled by default
- Agent only needs outbound access to the relay
- Feature flags enforced on both relay and agent
- Daily login uses an `HttpOnly` same-site session cookie instead of a browser-readable token
- Users, workspaces, memberships, agents, pair requests, and tasks are isolated by workspace on the relay
- Relay disk state stores metadata only; task details can stay on the user's device
- Codex session previews are sourced on the agent, kept in relay memory only, and may be cached in the browser
- Session browsing is limited to Codex sessions whose CWD stays under the configured `workspaceRoot`
- Resume mode defaults to read-only continuation; write-mode resume is blocked
- Agent tokens live in a dedicated state directory instead of being written back into the config file
- WebAuthn/passkeys are per-user on secure origins; the bootstrap token remains as break-glass owner recovery

## 🏗️ Repo Layout

- `relay/`: public-facing broker and static PWA host
- `agent/`: private-side worker that runs next to your workspace
- `web/`: installable mobile-first UI
- `config/`: example configuration files
- `docs/`: setup, deployment, security, and operations guides

## 🚀 Quick Start

### Local Test

1. Run `npm run init:relay`
2. Run `npm run init:agent`
3. Start the relay with `npm run relay:start`
4. Sign in as the owner with the bootstrap token and add a passkey
5. Open the web UI and create a short pair code inside the target workspace
6. Pair the agent with `npm run agent:pair -- --pair-code YOUR_CODE`
7. Approve the pending device from your phone
8. Start the agent normally with `npm run agent:start`

### Production

1. Run `npm run init:relay -- --mode production`
2. Run `npm run init:agent -- --mode production`
3. Generate deployment templates with `npm run scaffold:production`
4. Copy the generated `systemd` and `Caddy` templates from `deploy/generated/`
5. Start the relay with `npm run relay:start -- --config /etc/mobile-codex/relay.prod.json`
6. Sign in as the owner, add a passkey, and create workspaces or invites if needed
7. Create a short pair code in the intended workspace, run the suggested pair command on the agent host, then approve the pending device from your phone

Use the detailed tutorial and deployment guide when you want the full manual flow or host-level hardening details.

## 📚 Documentation

- [Detailed tutorial](./docs/TUTORIAL.md)
- [Production deployment](./docs/DEPLOYMENT.md)
- [Single-user to multi-user migration](./docs/MIGRATION.md)
- [Security model](./docs/SECURITY.md)
- [Feature flags](./docs/FEATURE_FLAGS.md)
- [Operations and rollback](./docs/OPERATIONS.md)
- [Architecture notes](./docs/ARCHITECTURE.md)
- [Contributing](./CONTRIBUTING.md)

## 🤝 Contributing

Contributions are welcome, especially around deployment hardening, mobile UX, and safer agent controls.

Before opening a PR:

- read [CONTRIBUTING.md](./CONTRIBUTING.md)
- keep the default security posture intact
- do not commit local configs, runtime state, or paired tokens
- update docs when behavior or setup changes

## 🧼 Repo Hygiene

This repository intentionally does not include:

- local runtime state
- paired agent tokens
- local `.local.json` configs
- machine-specific paths

Create your own local configs by copying:

- [config/relay.example.json](./config/relay.example.json)
- [config/agent.example.json](./config/agent.example.json)

## 📄 License

[MIT](./LICENSE)
