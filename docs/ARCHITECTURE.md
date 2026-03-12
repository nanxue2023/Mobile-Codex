# Architecture

## Goal

Give a phone-friendly control plane for Codex tasks without requiring direct mobile SSH access to the development server.

## Data Flow

1. The `agent` runs on the server that owns the workspace.
2. The `agent` only makes outbound requests to the `relay`.
3. The phone opens the `web` PWA from the relay, uses a passkey or recovery token to create an admin session, and then operates through an `HttpOnly` same-site cookie.
4. The PWA creates tasks on the relay.
5. The agent polls for queued tasks, executes locally, then pushes back status, logs, and diff snippets.
6. The relay persists only task metadata; sensitive task content is kept in memory and can be cached locally on the user's device.

## Security Boundaries

- The relay never receives full filesystem access.
- The phone never receives raw shell access in this MVP.
- The agent never executes arbitrary text as shell by default.
- Actions and log reads are predefined in `agent.local.json`.
- `codex_exec` write mode is disabled by default on both relay and agent.
- Relay disk state is intentionally narrower than the UI-visible state.

## Why This Shape

- It matches the useful part of remote-control systems: message relay and task supervision.
- It avoids the usability failure mode of remote desktop on a phone.
- It removes inbound access requirements from the dev server.
- It allows future migration to WebSocket streaming or official Codex app-server integration.
