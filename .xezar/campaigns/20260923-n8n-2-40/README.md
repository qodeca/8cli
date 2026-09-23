# Campaign 20260923-n8n-2-40

Updated: 2026-09-23 22:55

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on. Plan: `plan.md`.

## State

- Base `develop` at 8706723. Merges this campaign: 0. Checkpoints met: 0.

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | PR #33 open, e2e will be red (2 golden snapshots changed by n8n 2.40.5) | owner decides where the snapshot fix lands |
| #32 | Validate every command on 2.40.5 | held | waits for #31 merged |

## Open pull requests

- #33 (xez/df01cf60) – local n8n env + e2e pin 2.40.5. No review yet. Touches .github/workflows/ci.yml (image ref only).

## Running tasks and file ownership

None (df01cf60 done).

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | in use | – |
| claude × gmail-priv, eqamana-priv, westagilelabs-priv | unknown | – |
| codex × default | unknown | – |

## Owner items

- #33 e2e red: wf get key order changed; dt get gained sizeBytes. Where does the fix land?

## Rules that bit

None yet.

## Loops

L1 408cc17d (*/10), L2 138eceeb (hourly :49, cron stand-in for the 3600s wakeup), L3 b0ef065d (*/30). Leader attached to xezar.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
