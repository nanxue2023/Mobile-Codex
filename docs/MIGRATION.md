# Migration To Multi-User

This guide explains how to upgrade an existing single-user Mobile Codex deployment to the new multi-user model.

## What Changed

The relay now uses:

- `users`
- `workspaces`
- `memberships`
- workspace-scoped `agents`, `tasks`, `pairings`, and `pair requests`
- per-user passkeys

The old single global admin model is migrated automatically on first start.

## Automatic Migration Behavior

On the first relay start with the new code:

- the old single admin becomes the first `owner`
- a default workspace named `Primary` is created
- existing agents are assigned to `Primary`
- existing tasks are assigned to `Primary`
- existing pending pair requests and pairings are assigned to `Primary`
- existing passkeys become passkeys for the first owner
- existing browser sessions are converted into user sessions for the first owner

The bootstrap token still works after the upgrade, but it now authenticates as the first owner user.

## Before You Start

1. Stop the relay.
2. Back up the current relay state file.
3. Back up your relay and agent config files.
4. Make sure you still have the bootstrap token in a password manager.

Typical files to back up:

- relay state: `data/relay/state.json` or your production `dataDir`
- relay config: `config/relay.local.json` or `/etc/mobile-codex/relay.prod.json`
- agent config: `config/agent.local.json` or `/etc/mobile-codex/agent.prod.json`

## Upgrade Steps

1. Update the Mobile Codex code on the relay host.
2. Restart the relay with the same config file as before.
3. Log in as the owner with either:
   - an existing passkey that belonged to the old single admin
   - or the bootstrap token
4. Open the `Security` view and confirm:
   - your user appears as the owner
   - the `Primary` workspace exists
   - your old passkeys are listed under your account
5. If you want additional isolated teams or devices, create new workspaces.
6. For each additional person or phone, create a workspace invite and let them join with the invite code.
7. Ask each invited user to register a passkey before daily use.

## Existing Agents

Existing agents stay in the migrated `Primary` workspace.

That means:

- they continue to work after the upgrade
- they are only visible to users who belong to `Primary`

If you want an existing agent to move into a different workspace, do this:

1. Revoke the agent from the UI.
2. Switch to the target workspace.
3. Create a new short pair code there.
4. Re-pair the agent into that workspace.

There is no automatic cross-workspace agent reassignment in this release.

## Existing Users And Phones

Before the upgrade, every phone session was effectively the same admin.

After the upgrade:

- only the first owner keeps recovery-token access
- every additional person should use an invite
- every additional person should register their own passkey

If you personally use multiple phones, you have two choices:

- log in to each phone with the owner recovery token once, then register a passkey on that phone
- or create a separate invited user for a separate workspace if you want strict isolation

## Expected Behavior Changes

After the upgrade:

- task lists are filtered by the current workspace
- agent lists are filtered by the current workspace
- pending pair approvals are filtered by the current workspace
- passkeys belong to the current user, not to the whole relay
- invite codes replace the old “shared admin for everyone” pattern

## Recommended Post-Upgrade Checks

1. Log in as the owner.
2. Create a second workspace.
3. Create an invite for that workspace.
4. Join from a second browser or phone.
5. Confirm the invited user cannot switch into `Primary`.
6. Confirm the invited user is forced to add a passkey before running tasks or pairing agents.
7. Confirm the owner can still pair an agent inside the intended workspace.

## Rollback

If you must roll back:

1. Stop the relay.
2. Restore the old code.
3. Restore the backed-up pre-upgrade `state.json`.
4. Start the old relay again.

Do not try to roll back the code while keeping a state file that has already been migrated to the multi-user format.
