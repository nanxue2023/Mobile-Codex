# Architecture

## Goal

Give a phone-friendly control plane for Codex tasks without requiring direct mobile SSH access to the development server.

## Data Flow

1. The `agent` runs on the server that owns the workspace.
2. The `agent` only makes outbound requests to the `relay`.
3. The phone opens the `web` PWA from the relay, uses a passkey or owner recovery token to create a user session, and then operates through an `HttpOnly` same-site cookie.
4. The session is scoped to a selected workspace.
5. The PWA creates tasks on the relay inside that workspace.
6. The agent polls for queued tasks in its workspace, executes locally, then pushes back status, logs, and diff snippets.
7. The relay persists only task metadata; sensitive task content is kept in memory and can be cached locally on the user's device.

## Multi-User Model

The relay now uses four core concepts:

- `user`: a human identity with one or more passkeys
- `workspace`: an isolation boundary for agents, tasks, and pairing
- `membership`: a user's role inside a workspace
- `invitation`: a short-lived code for joining a workspace

Roles are intentionally simple:

- `owner`
- `operator`
- `viewer`

## Security Boundaries

- The relay never receives full filesystem access.
- The phone never receives raw shell access in this MVP.
- The agent never executes arbitrary text as shell by default.
- Actions and log reads are predefined in `agent.local.json`.
- `codex_exec` write mode is disabled by default on both relay and agent.
- Relay disk state is intentionally narrower than the UI-visible state.
- Agents and tasks are isolated by workspace on the relay side.

## Why This Shape

- It matches the useful part of remote-control systems: message relay and task supervision.
- It avoids the usability failure mode of remote desktop on a phone.
- It removes inbound access requirements from the dev server.
- It allows future migration to WebSocket streaming or official Codex app-server integration.
