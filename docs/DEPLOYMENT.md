# Deployment

## Recommended Topology

Use two machines:

- Public relay host: only runs `relay/server.js` behind HTTPS
- Private development server: runs `agent/agent.js` and owns the workspace

The development server only needs outbound access to the relay. It does not need inbound ports.

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
- Both init scripts keep `codexExecWrite` disabled by default.
- The relay init script also sets a pairing command config-path hint used by the web UI.

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

Example Caddyfile:

```caddy
mobile-codex.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787
}
```

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
ReadWritePaths=/srv/mobile-codex /etc/mobile-codex/agent.prod.json

[Install]
WantedBy=multi-user.target
```

Important:

- If `node` is not at `/usr/bin/node`, replace it with the real path from `which node`.
- The agent service user must be able to run `codex`.
- The agent service user must already be logged in to Codex if you want `codex exec`.

## First Pairing

Recommended first-run order:

1. Start relay first.
2. Open the relay URL on your phone.
3. Log in with `BOOTSTRAP_TOKEN`.
4. Create a pairing code from the UI.
5. Run the agent once manually with `--pair-code`.
6. Confirm the agent appears in the UI.
7. Stop the manual agent process.
8. Enable and start the systemd agent service.

Manual agent pairing example:

```bash
sudo -u mobilecodexagent -H /usr/bin/npm run agent:pair -- --config /etc/mobile-codex/agent.prod.json --pair-code YOUR_CODE
```

## Validation Order

After deployment:

1. Verify the HTTPS site loads on phone.
2. Verify login works with `BOOTSTRAP_TOKEN`.
3. Verify the agent appears.
4. Submit `read_log`.
5. Submit `run_action`.
6. Submit a read-only `codex_exec`.
7. Only then consider enabling `codexExecWrite`.

## Hardening Checklist

- Bind the relay to `127.0.0.1` and terminate TLS at a reverse proxy on the same host.
- Restrict relay host firewall to `80/443` only.
- Run the agent under a dedicated Unix user with access only to the target workspace.
- Keep the workspace on a dedicated clone, not your only production checkout.
- Enable OS-level audit logs on the development server if this becomes a daily workflow.
- Keep `codexExecWrite` disabled on first production rollout.
- Keep high-risk actions out of `actions`.
- Keep secret-bearing logs out of `logSources`.
