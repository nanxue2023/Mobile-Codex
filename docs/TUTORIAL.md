# Tutorial

This guide walks from zero to a working local test setup.

If you want production deployment, read [DEPLOYMENT.md](./DEPLOYMENT.md) after this guide.

For production, the shortest path is now:

1. `npm run init:relay -- --mode production`
2. `npm run init:agent -- --mode production`
3. `npm run scaffold:production`
4. copy the generated deployment templates

## 1. What You Will Build

You will run:

- one `relay`
- one `agent`
- one browser session on your phone or desktop

The relay hosts the web UI and brokers messages.  
The agent runs next to your workspace and executes approved tasks locally.

## 2. Prerequisites

You need:

- Node.js 24+
- a working `codex` command on the agent machine
- this project checked out locally

In commands below, replace:

```text
/path/to/mobile-codex
```

with your real project path.

## 2.5 Recommended Setup Flow

The easiest path is now:

1. `npm run init:relay`
2. `npm run init:agent`
3. `npm run relay:start`
4. create a pairing code in the UI
5. `npm run agent:pair -- --pair-code YOUR_CODE`
6. later use `npm run agent:start`

The manual JSON editing steps below are still included so you can understand what the scripts generate.

## 3. The Three Important Values

During setup you will create three values:

| Name | Purpose | Where it goes |
| --- | --- | --- |
| `BOOTSTRAP_TOKEN` | password you type into the web login screen | keep it outside config |
| `BOOTSTRAP_TOKEN_HASH` | SHA-256 hash of `BOOTSTRAP_TOKEN` | `relay.local.json` |
| `TOKEN_SECRET` | relay secret for signed session tokens | `relay.local.json` |

Important:

- the phone login uses `BOOTSTRAP_TOKEN`
- the relay config uses `BOOTSTRAP_TOKEN_HASH`
- the relay config also uses `TOKEN_SECRET`

## 4. Generate `BOOTSTRAP_TOKEN` and `TOKEN_SECRET`

Go to the project:

```bash
cd /path/to/mobile-codex
```

Run twice:

```bash
npm run gen-secret
npm run gen-secret
```

Treat them like this:

- first output = `BOOTSTRAP_TOKEN`
- second output = `TOKEN_SECRET`

Example:

```bash
BOOTSTRAP_TOKEN='paste-the-first-output-here'
TOKEN_SECRET='paste-the-second-output-here'
```

## 5. Generate `BOOTSTRAP_TOKEN_HASH`

Run:

```bash
printf '%s' "$BOOTSTRAP_TOKEN" | npm run hash-token
```

The output is your:

- `BOOTSTRAP_TOKEN_HASH`

Example:

```bash
BOOTSTRAP_TOKEN_HASH='paste-the-hash-output-here'
```

## 6. Easiest Path: Generate Local Config Files

Run:

```bash
npm run init:relay
npm run init:agent
```

Choose `test` mode in both scripts.

The scripts will:

- generate the relay secrets safely
- write `config/relay.local.json`
- write `config/agent.local.json`
- keep `codexExecWrite` disabled by default

After that, the recommended commands are:

```bash
npm run relay:start
npm run agent:pair -- --pair-code YOUR_CODE
```

Later restarts:

```bash
npm run agent:start
```

After that, you can skip ahead to:

- [Open the Web UI](#11-open-the-web-ui)

## 7. Manual Path: Copy Local Config Files

Copy the examples:

```bash
cp config/relay.example.json config/relay.local.json
cp config/agent.example.json config/agent.local.json
```

These `.local.json` files are intentionally ignored by git.

## 8. Manual Path: Edit `config/relay.local.json`

Open the file:

```bash
nano config/relay.local.json
```

Use a local test config like this:

```json
{
  "listenHost": "127.0.0.1",
  "listenPort": 8787,
  "publicOrigin": "http://127.0.0.1:8787",
  "dataDir": "../data/relay",
  "sessionTtlSec": 43200,
  "maxLoginAttemptsPerMinute": 10,
  "maxPairAttemptsPerMinute": 20,
  "bootstrapAdminTokenHash": "replace-with-BOOTSTRAP_TOKEN_HASH",
  "tokenSecret": "replace-with-TOKEN_SECRET",
  "features": {
    "pairings": true,
    "codexExec": true,
    "codexExecWrite": false,
    "runAction": true,
    "readLog": true
  },
  "web": {
    "appName": "Mobile Codex",
    "pollIntervalMs": 2500
  }
}
```

Replace only:

- `bootstrapAdminTokenHash`
- `tokenSecret`

Keep these for first test:

- `listenHost = 127.0.0.1`
- `listenPort = 8787`
- `publicOrigin = http://127.0.0.1:8787`
- `codexExecWrite = false`

## 9. Manual Path: Edit `config/agent.local.json`

Open:

```bash
nano config/agent.local.json
```

Use a local test config like this:

```json
{
  "relayBaseUrl": "http://127.0.0.1:8787",
  "agentId": "server-main",
  "agentLabel": "Main Server",
  "stateDir": "/absolute/path/to/mobile-codex-agent-state",
  "workspaceRoot": "/path/to/your/workspace",
  "pollIntervalMs": 2500,
  "maxTaskLogBytes": 12000,
  "features": {
    "codexExec": true,
    "codexExecWrite": false,
    "runAction": true,
    "readLog": true
  },
  "actions": {
    "status": {
      "label": "Git Status",
      "cwd": ".",
      "argv": ["git", "status", "--short"],
      "timeoutSec": 20
    }
  },
  "logSources": {
    "app-log": {
      "label": "Application Log",
      "path": "/absolute/path/to/your.log",
      "maxLines": 200
    }
  },
  "codex": {
    "model": "",
    "extraArgs": [],
    "writeModeDefaultsToOff": true
  }
}
```

Replace these:

- `workspaceRoot`
- `stateDir`
- `actions`
- `logSources`

Keep these for first test:

- `codexExecWrite = false`

Notes:

- `workspaceRoot` must be an absolute path
- `stateDir` must point to a directory the agent user can write
- `actions` are predefined commands, not arbitrary shell
- `logSources` are predefined absolute paths, not arbitrary file reads

## 10. Start the Relay

Run:

```bash
npm run relay:start
```

Expected output:

```text
relay listening on http://127.0.0.1:8787
```

## 11. Open the Web UI

Open:

```text
http://127.0.0.1:8787
```

Log in using:

- `BOOTSTRAP_TOKEN`

Do not use the hash in the login screen.

## 12. Create a Pairing Code

In the UI:

1. open `Pair Agent`
2. enter a note
3. keep or adjust the TTL
4. click `Create Pair Code`

You will get a one-time pairing code.

The UI now also shows a copyable suggested command, for example:

```bash
npm run agent:pair -- --config 'config/agent.local.json' --pair-code 'YOUR_CODE'
```

Use that command directly on the agent machine if the shown config path matches your setup.

## 13. Start the Agent

Use the pairing code:

```bash
npm run agent:pair -- --pair-code YOUR_CODE
```

If the UI generated a command with `--config ...`, prefer copying that exact command.

On first success:

- the agent will pair with the relay
- a token file will be created under `stateDir` with `0600` permissions

Next time you can start it without the pairing code:

```bash
npm run agent:start
```

## 14. Confirm the Agent Is Visible

Go back to the UI and refresh.

You should see:

- the `agentId`
- the `agentLabel`
- the configured actions
- the configured log sources

## 15. First Safe Tests

Use this order:

1. `Read Log`
2. `Run Action`
3. read-only `Codex Task`

Why:

- `Read Log` confirms the path and relay-to-agent flow
- `Run Action` confirms command execution
- `Codex Task` confirms the Codex integration

## 16. Common Mistakes

### The UI loads but the agent never appears

Check:

- relay is running
- agent is running
- `relayBaseUrl` is correct
- the configured `stateDir` exists and is writable by the agent user

### `Run Action` fails

Check:

- `cwd` is valid relative to `workspaceRoot`
- `argv` is correct
- the command actually works in that workspace

Example:

- `git status` fails if the workspace is not a git repository

### `Read Log` returns nothing

Check:

- the log path exists
- the agent user can read it
- `maxLines` is large enough

### `Codex Task` cannot modify files

That is expected if:

- relay has `codexExecWrite = false`
- agent has `codexExecWrite = false`

Both sides must be set to `true` before write mode is allowed.

## 17. When You Are Ready for Production

After local testing succeeds, continue here:

- [Production deployment](./DEPLOYMENT.md)
- [Security model](./SECURITY.md)
- [Operations and rollback](./OPERATIONS.md)
