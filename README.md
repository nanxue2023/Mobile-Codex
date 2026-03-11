# Codex Bridge MVP

[简体中文](./README.zh-CN.md)

Mobile-first remote control for Codex.

This project is a security-first MVP for running Codex from your phone without exposing your development server directly to the public internet.

## ✨ What It Does

- Submit `codex exec` tasks from a phone-friendly web UI
- Run predefined safe actions by id
- Read predefined log sources by id
- Pair and revoke agents from the browser
- Keep dangerous capabilities off by default

## 🏗️ Architecture

- `relay/`: public-facing broker and static PWA host
- `agent/`: private-side worker that runs next to your workspace
- `web/`: installable mobile-first UI
- `config/`: example configuration files
- `docs/`: setup, deployment, security, and operations guides

## 🔐 Security Defaults

- No arbitrary remote shell by default
- No arbitrary file reads by default
- `codexExecWrite` disabled by default
- Agent only needs outbound access to the relay
- Feature flags enforced on both relay and agent

## 🚀 Quick Start

1. Copy the example configs.
2. Follow the detailed tutorial.
3. Test locally first.
4. Move to the production deployment guide.

## 📚 Documentation

- [Detailed tutorial](./docs/TUTORIAL.md)
- [Production deployment](./docs/DEPLOYMENT.md)
- [Security model](./docs/SECURITY.md)
- [Feature flags](./docs/FEATURE_FLAGS.md)
- [Operations and rollback](./docs/OPERATIONS.md)
- [Architecture notes](./docs/ARCHITECTURE.md)

## 🧼 Repo Hygiene

This repository intentionally does not include:

- local runtime state
- paired agent tokens
- local `.local.json` configs
- machine-specific paths

Create your own local configs by copying:

- [config/relay.example.json](./config/relay.example.json)
- [config/agent.example.json](./config/agent.example.json)
