# Deployment

## Recommended Topology

Use two machines:

- Public relay host: only runs `relay/server.js` behind HTTPS
- Private development server: runs `agent/agent.js` and owns the workspace

The development server only needs outbound access to the relay. It does not need inbound ports.

The relay can now host multiple isolated workspaces. Agents, tasks, and pairing approvals belong to a workspace, not to a single global admin bucket.

## Production Layout

Recommended paths:

- Relay host code: `/opt/mobile-codex`
- Relay config: `/etc/mobile-codex/relay.prod.json`
- Relay state: `/var/lib/mobile-codex-relay`
- Agent host code: `/opt/mobile-codex`
- Agent config: `/etc/mobile-codex/agent.prod.json`
- Agent workspace: `/srv/mobile-codex/workspace`

Use dedicated Unix users:

- `mobilecodexrelay` for relay
- `mobilecodexagent` for agent

## Config Generation

The easiest way to create production-shaped configs is:

```bash
npm run init:relay -- --mode production
npm run init:agent -- --mode production
```

You can also choose a custom output path:

```bash
npm run init:relay -- --mode production --output /etc/mobile-codex/relay.prod.json
npm run init:agent -- --mode production --output /etc/mobile-codex/agent.prod.json
```

Notes:

- The relay init script generates a plaintext `BOOTSTRAP_TOKEN` and prints it once.
- The relay config stores only the hash, not the plaintext token.
- The bootstrap token now authenticates as the first owner user. It is no longer the intended daily login path for every person.
- For passkeys, set `publicOrigin` to the real HTTPS origin and optionally set `auth.passkeys.rpId` explicitly if you terminate TLS on a stable domain.
- Both init scripts keep `codexExecWrite` disabled by default.
- The relay init script also sets a pairing command config-path hint used by the web UI.

## Multi-User Model

In production, think in terms of:

- `owner`: manages workspace membership, invites, pairing, and passkeys
- `operator`: can work inside a workspace but cannot manage membership
- `viewer`: read-only

Recommended pattern:

1. The first owner logs in with the bootstrap token.
2. The owner registers a passkey on their phone.
3. The owner creates one or more workspaces.
4. Each additional person joins through an invite code.
5. Each invited user registers their own passkey.
6. Agents are paired inside the intended workspace, not globally.

## Deployment Template Generation

After you have both production configs, generate host-level templates:

```bash
npm run scaffold:production
```

By default this writes:

- `deploy/generated/mobile-codex-relay.service`
- `deploy/generated/mobile-codex-agent.service`
- `deploy/generated/Caddyfile`
- `deploy/generated/NEXT_STEPS.md`

You can also override paths:

```bash
npm run scaffold:production -- \
  --relay-config /etc/mobile-codex/relay.prod.json \
  --agent-config /etc/mobile-codex/agent.prod.json \
  --output-dir /tmp/mobile-codex-deploy
```

This does not modify your system directly. It only generates templates and a checklist.

## TLS

Do not expose the relay over plain HTTP on the internet.

Use one of:

- Caddy or Nginx with TLS certificates
- Cloudflare Tunnel in front of the relay
- Tailscale Funnel if your trust model allows it

Recommended baseline:

- Bind relay to `127.0.0.1:8787`
- Put Caddy in front of it
- Serve only `https://your-domain`
- Use the HTTPS origin as `publicOrigin`; WebAuthn/passkeys depend on that exact origin and RP ID

Example Caddyfile:

```caddy
mobile-codex.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787
}
```

If you used `npm run scaffold:production`, the generated `Caddyfile` will already match your configured `publicOrigin`.

## systemd

### Relay

```ini
[Unit]
Description=Mobile Codex Relay
After=network.target

[Service]
Type=simple
User=mobilecodexrelay
Group=mobilecodexrelay
WorkingDirectory=/opt/mobile-codex
ExecStart=/usr/bin/npm run relay:start -- --config /etc/mobile-codex/relay.prod.json
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/mobile-codex-relay
ReadOnlyPaths=/opt/mobile-codex /etc/mobile-codex/relay.prod.json

[Install]
WantedBy=multi-user.target
```

### Agent

```ini
[Unit]
Description=Mobile Codex Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mobilecodexagent
Group=mobilecodexagent
WorkingDirectory=/opt/mobile-codex
ExecStart=/usr/bin/npm run agent:start -- --config /etc/mobile-codex/agent.prod.json
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=false
ReadOnlyPaths=/opt/mobile-codex /etc/mobile-codex/agent.prod.json
ReadWritePaths=/srv/mobile-codex /var/lib/mobile-codex-agent

[Install]
WantedBy=multi-user.target
```

Important:

- If `node` is not at `/usr/bin/node`, replace it with the real path from `which node`.
- The agent service user must be able to run `codex`.
- The agent service user must already be logged in to Codex if you want `codex exec`.
- The agent config should set `stateDir` to a directory writable by the agent service user, for example `/var/lib/mobile-codex-agent`.
- If you used `npm run scaffold:production`, prefer copying the generated service files instead of retyping them.

## First Pairing

Recommended first-run order:

1. Start relay first.
2. Open the relay URL on your phone.
3. Log in as the owner with `BOOTSTRAP_TOKEN`.
4. Register a passkey on that device.
5. If this is not the default owner workspace, create or switch to the intended workspace.
6. Create a short pair code from the UI.
7. Run the agent once manually with `--pair-code`.
8. Approve the pending device from the phone UI.
9. Confirm the agent appears in the current workspace.
10. Stop the manual agent process.
11. Enable and start the systemd agent service.

Manual agent pairing example:

```bash
sudo -u mobilecodexagent -H /usr/bin/npm run agent:pair -- --config /etc/mobile-codex/agent.prod.json --pair-code YOUR_CODE
```

## Validation Order

After deployment:

1. Verify the HTTPS site loads on phone.
2. Log in once with `BOOTSTRAP_TOKEN`, register a passkey on your phone, then log out and verify passkey login works.
3. Create a second workspace and an invite, then verify an invited user can join and cannot switch into a workspace they do not belong to.
4. Verify the agent appears in the intended workspace only.
5. Submit `read_log`.
6. Submit `run_action`.
7. Submit a read-only `codex_exec`.
8. Only then consider enabling `codexExecWrite`.

## Upgrading An Existing Single-User Install

If you already had a single-user deployment before the multi-user release:

- the old admin is migrated into the first owner user
- a default workspace named `Primary` is created
- existing agents and tasks stay in `Primary`
- old passkeys are attached to that owner

Use the dedicated guide for the full upgrade flow:

- [MIGRATION.md](./MIGRATION.md)

## Hardening Checklist

- Bind the relay to `127.0.0.1` and terminate TLS at a reverse proxy on the same host.
- Restrict relay host firewall to `80/443` only.
- Run the agent under a dedicated Unix user with access only to the target workspace.
- Keep the workspace on a dedicated clone, not your only production checkout.
- Enable OS-level audit logs on the development server if this becomes a daily workflow.
- Keep `codexExecWrite` disabled on first production rollout.
- Keep high-risk actions out of `actions`.
- Keep secret-bearing logs out of `logSources`.
