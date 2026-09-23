# Campaign 20260923-n8n-2-40

Updated: 2026-09-23 23:13

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on; plus end-user docs and a polished README (added by owner, see decisions.md). Plan: `plan.md`.

## State

- Base `develop` at 8706723. Merges this campaign: 0. Checkpoints met: 0.

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | PR #33 repaired at 3bd4964, CI running | security re-check 3e110750 |
| #32 | Validate every command on 2.40.5 | held | waits for #31 merged |
| #34 | End-user docs in docs/ | held | after #33 merges; final pass after #32 |
| #35 | README (badges, demo, logo) | held | after #33 merges; needs #36 and #37 assets |
| #36 | Scripted demo GIF | held | after #33 merges (needs local env) |
| #37 | Logo and banner | held | after #33 merges; owner picks a direction before merge |

## Open pull requests

- #33 (xez/df01cf60) head 3bd4964 (repair round 1: ee87dbd, 3bd4964), CI running. Security b5dde695: request changes – (1) keychain backend src/keychain/macos.ts:14-17 passes secret via `security -w <value>` argv (pre-existing product bug); (2) env file written before chmod when file pre-exists. Cold review da103014: APPROVE, one nit (document why sizeBytes 4096 is stable). Formal GH review impossible (same identity as author).

## Running tasks and file ownership

- 3e110750 (codex/gpt-6-astra, default) read-only security re-check of PR #33

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | in use | – |
| claude × gmail-priv, eqamana-priv, westagilelabs-priv | unknown | – |
| codex × default | in use | – |

## Owner items

None (snapshot fix: owner chose PR #33).

## Rules that bit

- Agents share the owner's GitHub identity: formal approve/request-changes is rejected as self-review; verdicts land as PR comments + labels.
- SECURITY.md forbids public issues for vulnerabilities.

## Loops

L1 408cc17d (*/10), L2 138eceeb (hourly :49, cron stand-in for the 3600s wakeup), L3 b0ef065d (*/30). Leader attached to xezar.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
