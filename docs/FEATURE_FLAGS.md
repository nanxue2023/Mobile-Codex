# Feature Flags

Every feature is controlled twice:

- Relay-level: whether the UI is allowed to create the task type at all
- Agent-level: whether the server is willing to execute that task type locally

A feature is usable only if both are enabled.

## `pairings`

- Default: `true`
- Purpose: allow creation of one-time agent pairing codes
- Disable when: all agents are already provisioned and you want a frozen topology
- Risk if enabled: a leaked bootstrap token can mint new pairing codes
- Mitigation: short TTL, rate limits, rotate bootstrap token

## `codexExec`

- Default: `true`
- Purpose: allow the phone to submit Codex tasks
- Disable when: you only want action buttons and logs
- Risk if enabled: Codex can inspect workspace content and may perform reads or limited commands depending on sandbox mode
- Mitigation: keep write mode off, keep workspace narrowly scoped

## `codexExecWrite`

- Default: `false`
- Purpose: allow `codex exec` to run in `workspace-write`
- Disable when: you want planning or analysis only
- Risk if enabled: Codex can modify files in the workspace and run sandboxed commands
- Mitigation: use a dedicated repo clone, require human review of diffs before merging

## `runAction`

- Default: `true`
- Purpose: allow execution of predefined actions by id
- Disable when: you do not want any server-side command execution from the phone
- Risk if enabled: a misconfigured action may expose sensitive commands or mutate the wrong directory
- Mitigation: keep actions explicit, no shell wrappers, minimal cwd scope, short timeouts

## `readLog`

- Default: `true`
- Purpose: return tail output from predefined log sources
- Disable when: logs may contain secrets or regulated data
- Risk if enabled: secrets in logs can appear on the phone
- Mitigation: define only scrubbed logs, cap lines, add redaction before enabling in production
