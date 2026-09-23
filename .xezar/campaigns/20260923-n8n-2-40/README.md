# Campaign 20260923-n8n-2-40

Updated: 2026-09-23 23:48

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on; plus end-user docs and a polished README (added by owner, see decisions.md). Plan: `plan.md`.

## State

- Base `develop` at fb4c612. Merges this campaign: 1 (#33). Checkpoints met: 1 (#31 closed).

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | DONE – #33 merged as fb4c612, issue closed | – |
| #32 | Validate every command on 2.40.5 | running 94c2ff6c (integration-tests) | review when PR opens |
| #34 | End-user docs in docs/ | b25718f0 continued after XEZ:ASK (docs baseline 85535e2) | review; add validation link after #32 |
| #35 | README (badges, demo, logo) | held | needs #36 merged and #37 direction picked |
| #36 | Scripted demo GIF | running 16a79cec (feature-implementation) | review when PR opens |
| #37 | Logo and banner | BLOCKED e2afa2a5: gate fails on Bash(gh pr merge *) in .claude/settings.json (catalog-check) | owner decides where the merge rule lives |
| #38 | Local n8n creds per worktree vs shared instance (bug) | ready, not dispatched | after #32/#34/#36 stop using the instance (touches scripts/local-n8n) |

## Open pull requests

None.

## Running tasks and file ownership

- 94c2ff6c (claude/opus, qodeca-priv, #32) owns docs/validation/**, test/e2e/**
- b25718f0 (codex/gpt-5.6-terra, default, #34) owns docs/** except docs/validation/** and docs/runbooks/**, plus its docs-check script
- 16a79cec (claude/opus, gmail-priv, #36) owns scripts/demo/**, assets/demo/**, one package.json script line
- e2afa2a5 (codex/gpt-6-astra, default, #37) owns assets/brand/**

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | in use | – |
| claude × gmail-priv | in use | – |
| claude × eqamana-priv, westagilelabs-priv | unknown | – |
| codex × default | in use (2 tasks) | – |

## Owner items

- BLOCKED: `.xezar/checks/catalog-check.mjs:491-496` refuses any non-reading Bash rule in .claude/settings.json – the engine adds project allow rules to READ-ONLY review steps too (xezar #849), so every reviewer agent could merge. Every task's gate now fails. Owner picks: move the rule to the leader launch only (scripts/xezar-leader.sh --allowedTools), or other.
- Delete branch xez/df01cf60 (record deletion is yours; unattended hard stop).
- Parked calls in parked.md.

## Rules that bit

- Local n8n is ONE shared instance (8cli-local-n8n-n8n-1, :5678) but credentials are per worktree (#38). Never let a task run `reset` while others use it; point it at 94c2ff6c's credentials file instead.
- Leader may merge: owner added Bash(gh pr merge *) to .claude/settings.json (cbcb4e7). Merge only with required checks green + approved review; never with --delete-branch while unattended.
- Closes #N does not auto-close issues (develop is not the default branch): close by hand after merge.
- Dispatch with the WORKFLOW the route row names (`.xezar/routing.json` row `workflows`, files in `.xezar/workflows/`), as `source: {source: "workflow", ref: <name>}` – never a bare xez-* skill. Skills skip the kit snapshot, worktree preflight, gate retry and verdict recording (why every task reported "no reviewer verdict recorded"). Owner caught this.
- Agents share the owner's GitHub identity: formal approve/request-changes is rejected as self-review; verdicts land as PR comments + labels.
- SECURITY.md forbids public issues for vulnerabilities.

## Loops

L1 408cc17d (*/10), L2 138eceeb (hourly :49, cron stand-in for the 3600s wakeup), L3 b0ef065d (*/30). Leader attached to xezar.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
