# Contributing

Thanks for contributing to Mobile Codex.

This project is security-sensitive by design. Changes should improve usability without quietly weakening the trust boundary between the phone, relay, and agent.

## Ground Rules

- Keep the default security posture conservative.
- Do not add arbitrary remote shell or arbitrary file-read capabilities by default.
- Do not commit local configs, runtime state, paired tokens, logs, screenshots, or machine-specific paths.
- Prefer feature flags and explicit opt-in for anything that increases execution or data exposure.
- Update docs when setup, deployment, auth, pairing, or security behavior changes.

## Development Workflow

1. Create or update local `.local.json` configs outside committed files.
2. Make focused changes with clear scope.
3. Run the smallest useful verification for your change.
4. Check `git status` before committing.
5. Confirm no sensitive files are staged.

## Pull Request Expectations

- Explain the user-facing change and the security tradeoff.
- Call out any new config fields, storage behavior, or operational steps.
- Include verification notes.
- Keep PRs small when possible.

## Security Checklist

Before opening a PR, double-check:

- no secrets or tokens in tracked files
- no runtime state under `data/` or generated deployment output staged
- no sample configs replaced with real values
- no browser storage or relay persistence added without justification
- no new agent capabilities exposed without relay and agent-side controls

## Reporting Security Issues

If you find a vulnerability, do not open a public issue with exploit details. Share a minimal private report with reproduction steps, impact, and the affected files.
