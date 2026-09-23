# Campaign 20260923-n8n-2-40

Updated: 2026-09-23 23:25

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on; plus end-user docs and a polished README (added by owner, see decisions.md). Plan: `plan.md`.

## State

- Base `develop` at 8706723. Merges this campaign: 0. Checkpoints met: 0.

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | BLOCKED: PR #33 merge-ready at ec95666, merge denied by this session's permission guard | owner merges PR #33 (or allows the merge) |
| #32 | Validate every command on 2.40.5 | held | waits for #31 merged |
| #34 | End-user docs in docs/ | held | after #33 merges; final pass after #32 |
| #35 | README (badges, demo, logo) | held | after #33 merges; needs #36 and #37 assets |
| #36 | Scripted demo GIF | held | after #33 merges (needs local env) |
| #37 | Logo and banner | held | after #33 merges; owner picks a direction before merge |

## Open pull requests

- #33 (xez/df01cf60) head ec95666, all 3 checks green, mergeState CLEAN, label merge-queue. Security re-check fe3e3c7b APPROVE; cold review da103014 APPROVE (at d0532ae). Merge attempt denied by the Claude Code auto-mode guard ("Merge Without Review"). Branch kept (deleting a branch is a hard stop while unattended).

## Running tasks and file ownership

None.

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | in use | – |
| claude × gmail-priv, eqamana-priv, westagilelabs-priv | unknown | – |
| codex × default | unknown | – |

## Owner items

- BLOCKED: merge PR #33 (`gh pr merge 33 --squash --match-head-commit ec956668a5f5f81f9b995af2b4203254522b3c27`), or add a permission rule so the leader can merge. Everything else (#32, #34–#37) waits for this merge, by owner decision.
- Delete branch xez/df01cf60 after merge (record deletion is yours).
- Parked calls in parked.md.

## Rules that bit

- Agents share the owner's GitHub identity: formal approve/request-changes is rejected as self-review; verdicts land as PR comments + labels.
- SECURITY.md forbids public issues for vulnerabilities.

## Loops

L1 408cc17d (*/10), L2 138eceeb (hourly :49, cron stand-in for the 3600s wakeup), L3 b0ef065d (*/30). Leader attached to xezar.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
