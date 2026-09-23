# Campaign 20260923-n8n-2-40

Updated: 2026-09-23 22:47

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on. Plan: `plan.md`.

## State

- Base `develop` at 8706723. Merges this campaign: 0. Checkpoints met: 0.

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | ready | dispatch |
| #32 | Validate every command on 2.40.5 | held | waits for #31 merged |

## Open pull requests

None.

## Running tasks and file ownership

None.

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × (rotation) | unknown | – |
| codex × default | unknown | – |

## Owner items

None.

## Rules that bit

None yet.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
