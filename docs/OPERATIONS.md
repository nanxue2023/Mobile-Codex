# Operations

## Safe Defaults

- Keep `codexExecWrite` off.
- Keep action definitions short and explicit.
- Avoid exposing production logs as `logSources`.
- Use a dedicated repository clone for the agent.

## Feature Enablement Plan

### Phase 1

- Enable `pairings`
- Enable `codexExec`
- Enable `runAction`
- Enable `readLog`
- Keep `codexExecWrite` disabled
- Verify each feature with a harmless task before wider use

### Phase 2

- Add a dedicated staging clone
- Restrict actions to read-only or test-only commands
- Add log redaction if needed
- Then consider enabling `codexExecWrite`

### Phase 3

- Add stronger authentication such as WebAuthn
- Add audit export
- Add structured diff approval and apply workflows

## Rollback Plan

If a feature causes concern:

1. Turn it off in relay config.
2. Turn it off in agent config.
3. Restart the affected process.
4. Revoke all agent tokens if the issue involved auth or pairing.

## Per-Feature Toggle Procedure

### `pairings`

Enable:

1. Set `features.pairings=true` in relay config.
2. Restart relay.
3. Create one test pairing code and confirm expiry works.

Disable:

1. Set `features.pairings=false` in relay config.
2. Restart relay.
3. Revoke any newly paired agents if you suspect misuse.

### `codexExec`

Enable:

1. Set relay `features.codexExec=true`.
2. Set agent `features.codexExec=true`.
3. Submit a read-only prompt first.

Disable:

1. Set relay `features.codexExec=false`.
2. Set agent `features.codexExec=false`.
3. Restart both sides.

### `codexExecWrite`

Enable:

1. Use a dedicated clone, not your only checkout.
2. Set relay `features.codexExecWrite=true`.
3. Set agent `features.codexExecWrite=true`.
4. Submit a trivial file edit task and inspect returned diff.

Disable:

1. Set relay `features.codexExecWrite=false`.
2. Set agent `features.codexExecWrite=false`.
3. Restart both sides.
4. Review uncommitted changes in the workspace.

### `runAction`

Enable:

1. Define explicit `actions` in agent config.
2. Set relay `features.runAction=true`.
3. Set agent `features.runAction=true`.
4. Test each action id once.

Disable:

1. Set relay `features.runAction=false`.
2. Set agent `features.runAction=false`.
3. Restart both sides.
4. Remove high-risk actions from config if they are no longer needed.

### `readLog`

Enable:

1. Define scrubbed `logSources` in agent config.
2. Set relay `features.readLog=true`.
3. Set agent `features.readLog=true`.
4. Verify the returned tail does not expose secrets.

Disable:

1. Set relay `features.readLog=false`.
2. Set agent `features.readLog=false`.
3. Restart both sides.
4. Rotate any secret found in previously exposed logs.
