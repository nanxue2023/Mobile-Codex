# Deployment

## Recommended Topology

Use two machines:

- Public relay host: only runs `relay/server.js` behind HTTPS
- Private development server: runs `agent/agent.js` and owns the workspace

The development server only needs outbound access to the relay. It does not need inbound ports.

## Production Layout

Recommended paths:

- Relay host code: `/opt/codex-bridge-mvp`
- Relay config: `/etc/codex-bridge/relay.prod.json`
- Relay state: `/var/lib/codex-bridge-relay`
- Agent host code: `/opt/codex-bridge-mvp`
- Agent config: `/etc/codex-bridge/agent.prod.json`
- Agent workspace: `/srv/codex-bridge/workspace`

Use dedicated Unix users:

- `codexrelay` for relay
- `codexagent` for agent

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
bridge.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787
}
```

## systemd

### Relay

```ini
[Unit]
Description=Codex Bridge Relay
After=network.target

[Service]
Type=simple
User=codexrelay
Group=codexrelay
WorkingDirectory=/opt/codex-bridge-mvp
ExecStart=/usr/bin/node /opt/codex-bridge-mvp/relay/server.js --config /etc/codex-bridge/relay.prod.json
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/codex-bridge-relay
ReadOnlyPaths=/opt/codex-bridge-mvp /etc/codex-bridge/relay.prod.json

[Install]
WantedBy=multi-user.target
```

### Agent

```ini
[Unit]
Description=Codex Bridge Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=codexagent
Group=codexagent
WorkingDirectory=/opt/codex-bridge-mvp
ExecStart=/usr/bin/node /opt/codex-bridge-mvp/agent/agent.js --config /etc/codex-bridge/agent.prod.json
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=false
ReadOnlyPaths=/opt/codex-bridge-mvp /etc/codex-bridge/agent.prod.json
ReadWritePaths=/srv/codex-bridge /etc/codex-bridge/agent.prod.json

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
sudo -u codexagent -H /usr/bin/node /opt/codex-bridge-mvp/agent/agent.js --config /etc/codex-bridge/agent.prod.json --pair-code YOUR_CODE
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
