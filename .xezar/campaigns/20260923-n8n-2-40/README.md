# Campaign 20260923-n8n-2-40

Updated: 2026-09-24 00:00

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on; plus end-user docs and a polished README (added by owner, see decisions.md). Plan: `plan.md`.

## State

- Base `develop` at fb4c612. Merges this campaign: 1 (#33). Checkpoints met: 1 (#31 closed).

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | DONE – #33 merged as fb4c612, issue closed | – |
| #32 | Validate every command on 2.40.5 | running 94c2ff6c (integration-tests) | review when PR opens |
| #34 | End-user docs in docs/ | PR #46, cold review 299619f9 running | act on verdict |
| #35 | README (badges, demo, logo) | held | needs #36 merged and #37 direction picked |
| #36 | Scripted demo GIF | PR #48 open (draft) | review, then QA |
| #37 | Logo and banner | PR #49; owner picked Cut eight; e2afa2a5 finalizing | design review |
| #38 | Local n8n creds per worktree vs shared instance (bug) | ready, not dispatched | after #32/#34/#36 stop using the instance (touches scripts/local-n8n) |
| #39–#45 | 7 defects found by #32 validation (2 high: #39 sc status route, #42 wf publish drops settings) | #45 running dbe24a51; #39-#43 held (each edits test/e2e/**, owned by 94c2ff6c); #44 held (workflow.ts overlap) | dispatch after #32 merges |

## Open pull requests

- #46 (xez/b25718f0, #34 docs) opened by the agent BEFORE readiness/handoff; no labels, no review, no phase record. CI 3/3 green. Not mergeable until the task finishes its workflow and is reviewed.

## Running tasks and file ownership

- 94c2ff6c (claude/opus, qodeca-priv, #32) owns docs/validation/**, test/e2e/**
- e2afa2a5 (codex/gpt-6-astra, default, #37 finalize) owns assets/brand/**
- 299619f9 (claude/opus, qodeca-priv, review PR #46) owns nothing (read-only)
- dbe24a51 (pi/deepseek-flash, #45) owns src/cli.ts, src/formatters/**, its unit test, BACKWARD_COMPATIBILITY.md

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | in use | – |
| claude × gmail-priv | in use | – |
| claude × eqamana-priv, westagilelabs-priv | unknown | – |
| codex × default | in use (2 tasks) | – |

## Owner items

- Delete branch xez/df01cf60 (record deletion is yours; unattended hard stop).
- Parked calls in parked.md.

## Rules that bit

- Local n8n is ONE shared instance (8cli-local-n8n-n8n-1, :5678) but credentials are per worktree (#38). Never let a task run `reset` while others use it; point it at 94c2ff6c's credentials file instead.
- Leader may merge: the rule lives only in scripts/xezar-leader.sh --allowedTools (af31461). Merge only with required checks green + approved review; never with --delete-branch while unattended.
- Closes #N does not auto-close issues (develop is not the default branch): close by hand after merge.
- Dispatch with the WORKFLOW the route row names (`.xezar/routing.json` row `workflows`, files in `.xezar/workflows/`), as `source: {source: "workflow", ref: <name>}` – never a bare xez-* skill. Skills skip the kit snapshot, worktree preflight, gate retry and verdict recording (why every task reported "no reviewer verdict recorded"). Owner caught this.
- Agents share the owner's GitHub identity: formal approve/request-changes is rejected as self-review; verdicts land as PR comments + labels.
- SECURITY.md forbids public issues for vulnerabilities.

## Loops

L1 4d775dcc (*/10), L2 703ef914 (hourly :49, cron stand-in for the 3600s wakeup), L3 db3e0245 (*/30). Unattended restarts: 1/3. Leader attached to xezar.

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
