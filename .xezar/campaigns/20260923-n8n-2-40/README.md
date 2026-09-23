# Campaign 20260923-n8n-2-40

Updated: 2026-09-23 23:38

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on; plus end-user docs and a polished README (added by owner, see decisions.md). Plan: `plan.md`.

## State

- Base `develop` at fb4c612. Merges this campaign: 1 (#33). Checkpoints met: 1 (#31 closed).

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | DONE – #33 merged as fb4c612, issue closed | – |
| #32 | Validate every command on 2.40.5 | held | waits for #31 merged |
| #34 | End-user docs in docs/ | held | after #33 merges; final pass after #32 |
| #35 | README (badges, demo, logo) | held | after #33 merges; needs #36 and #37 assets |
| #36 | Scripted demo GIF | held | after #33 merges (needs local env) |
| #37 | Logo and banner | held | after #33 merges; owner picks a direction before merge |

## Open pull requests

None.

## Running tasks and file ownership

None.

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | in use | – |
| claude × gmail-priv, eqamana-priv, westagilelabs-priv | unknown | – |
| codex × default | unknown | – |

## Owner items

- Delete branch xez/df01cf60 (record deletion is yours; unattended hard stop).
- Parked calls in parked.md.

## Rules that bit

- Leader may merge: owner added Bash(gh pr merge *) to .claude/settings.json (cbcb4e7). Merge only with required checks green + approved review; never with --delete-branch while unattended.
- Closes #N does not auto-close issues (develop is not the default branch): close by hand after merge.
- Dispatch with the WORKFLOW the route row names (`.xezar/routing.json` row `workflows`, files in `.xezar/workflows/`), as `source: {source: "workflow", ref: <name>}` – never a bare xez-* skill. Skills skip the kit snapshot, worktree preflight, gate retry and verdict recording (why every task reported "no reviewer verdict recorded"). Owner caught this.
- Agents share the owner's GitHub identity: formal approve/request-changes is rejected as self-review; verdicts land as PR comments + labels.
- SECURITY.md forbids public issues for vulnerabilities.

## Loops

L1 408cc17d (*/10), L2 138eceeb (hourly :49, cron stand-in for the 3600s wakeup), L3 b0ef065d (*/30). Leader attached to xezar.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
