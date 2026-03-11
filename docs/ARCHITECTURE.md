# Architecture

## Goal

Give a phone-friendly control plane for Codex tasks without requiring direct mobile SSH access to the development server.

## Data Flow

1. The `agent` runs on the server that owns the workspace.
2. The `agent` only makes outbound requests to the `relay`.
3. The phone opens the `web` PWA from the relay and authenticates with a bootstrap token.
4. The PWA creates tasks on the relay.
5. The agent polls for queued tasks, executes locally, then pushes back status, logs, and diff snippets.

## Security Boundaries

- The relay never receives full filesystem access.
- The phone never receives raw shell access in this MVP.
- The agent never executes arbitrary text as shell by default.
- Actions and log reads are predefined in `agent.local.json`.
- `codex_exec` write mode is disabled by default on both relay and agent.

## Why This Shape

- It matches the useful part of remote-control systems: message relay and task supervision.
- It avoids the usability failure mode of remote desktop on a phone.
- It removes inbound access requirements from the dev server.
- It allows future migration to WebSocket streaming or official Codex app-server integration.
