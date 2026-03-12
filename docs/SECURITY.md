# Security

## Threat Model

Assume:

- The relay may be reachable from the public internet.
- The development server must not expose SSH or an IDE directly.
- A stolen phone should not immediately imply server compromise.
- Codex may produce risky actions if given too much execution freedom.

## Current Protections

- Bootstrap token is stored as SHA-256 hash on the relay.
- Daily mobile sessions use relay-backed `HttpOnly` same-site cookies instead of browser-readable bearer tokens.
- WebAuthn/passkey challenges stay in relay memory only and expire quickly.
- Agent pairing uses short-lived one-time pairing codes.
- Agent tokens can be revoked from the web UI.
- Passkey credentials persist only the public key, credential id, transport hints, and usage counter.
- Relay and agent both enforce feature flags.
- Relay persists only minimal task metadata to disk. Prompt text, task output, diff text, and result bodies are kept out of `state.json`.
- Task details can be cached locally in the browser on the user's device instead of on the relay.
- Codex session catalogs and preview snippets are collected on the agent and stay out of relay disk state.
- Codex session browsing is limited to sessions whose recorded CWD stays under the configured `workspaceRoot`.
- Resume-mode Codex tasks block autonomous write mode by default.
- The agent exposes predefined actions and predefined log sources, not arbitrary command lines or paths.
- Agent tokens are stored in a dedicated local state directory with `0600` permissions instead of being written back to the config file.
- `codex_exec` write mode is disabled by default.
- Diff snippets are capped in size before being returned to the phone.
- Security headers and a restrictive CSP are enabled on the web UI.
- Login and pairing endpoints are rate-limited.

## Strong Recommendations

- Put the relay behind HTTPS only.
- Prefer a dedicated small public relay host over exposing the development server.
- Store the bootstrap token in a password manager, not in notes or chat.
- Use a relay domain separate from any production domain.
- Rotate the bootstrap token and token secret after suspected exposure.
- Keep `runAction` and `readLog` narrowed to the minimum useful set.
- Keep `codexExecWrite` off until you trust the surrounding controls.
- Treat the bootstrap token as recovery-only access once you have registered at least one passkey.

## Deliberate Omissions

These are not implemented in the MVP and should be considered before broader use:

- Multi-user RBAC
- End-to-end encryption between phone and agent
- Signed audit export
- Content scanning for secrets before log or diff return
- Replay protection beyond token expiry and revocation
- Per-user encrypted local browser caches

## Incident Response

If you suspect compromise:

1. Revoke the affected agent from the UI.
2. Stop the agent process on the server.
3. Rotate `bootstrapAdminTokenHash` and `tokenSecret`.
4. Delete relay state in `data/relay/state.json` after preserving it for analysis.
5. Re-pair agents with new pairing codes.
6. Clear local browser storage on any device that cached task details.
