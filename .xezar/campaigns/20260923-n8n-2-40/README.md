# Campaign 20260923-n8n-2-40

Updated: 2026-09-25 00:00

Goal: 8cli validated against n8n 2.40.5, with a long-running local n8n to do it on; plus end-user docs and a polished README (added by owner, see decisions.md). Plan: `plan.md`.

## State

- Base `develop` at e8758ed. Merges this campaign: 25 (#33, #50, #48, #49, #51, #55, #54, #59, #46, #56, #63, #58, #68, #65, #71, #73, #75, #79, #74, #78, #80, #81, #82, #83, #84). Checkpoints met: 1 (#31 closed).

## Work

| Issue | What | State | Next action |
|---|---|---|---|
| #31 | Local n8n 2.40.5 environment | DONE – #33 merged as fb4c612, issue closed | – |
| #32 | Validate every command on 2.40.5 | PR #50 APPROVED at e8efaee, CI green | merge (waits on owner settings rule); unblocks #39-#43 |
| #34 | End-user docs in docs/ | PR #46 repair 1 done at 013ae9e | code APPROVED (f0bd0691); security REQUEST CHANGES (3 major) | fce0311: code APPROVED, security REQUEST CHANGES (S-4..S-7) | repair round 3 e22b046a running (owner: fix everything) |
| #35 | README (badges, demo, logo) | held | needs #36 merged and #37 direction picked |
| #36 | Scripted demo GIF | PR #48 approved + qa-approved at 634e0db, ready | merge (waits on owner rule) |
| #37 | Logo and banner | PR #49 design-approved, CI green, ready | BLOCKED: merge denied by auto-mode classifier |
| #52, #53 | [::1] refused; folder move to root (found by #34 docs) | #52 PR #54 approved + qa-approved at de874cd, mergeable; #53 held (e2e overlap with PR #50, CHANGELOG with #52) | – |
| GHSA-h6g4-mq8c-5chp | Private advisory fix (owner added 2026-09-24) | fix done on the private fork PR | private review, then the owner publishes |
| #38 | Local n8n creds per worktree vs shared instance (bug) | ready, not dispatched | after #32/#34/#36 stop using the instance (touches scripts/local-n8n) |
| #39–#45 | 7 defects found by #32 validation (2 high: #39 sc status route, #42 wf publish drops settings) | #45 PR #51 PR #51 APPROVED + qa-approved at 51a55ed, mergeable; #39-#43 held (each edits test/e2e/**, owned by 94c2ff6c); #44 held (workflow.ts overlap) | dispatch after #32 merges |

## Open pull requests

- #55 (owner, Codex login default -> codex-cli): security no findings at f922d46, route check ok, CI green – mergeable.

- #46 (xez/b25718f0, #34 docs) opened by the agent BEFORE readiness/handoff; no labels, no review, no phase record. CI 3/3 green. Not mergeable until the task finishes its workflow and is reviewed.

## Running tasks and file ownership (16:25)

| Task | Item | Owns |
|---|---|---|
| e080520d | #40 user role (pi) | src/client/public-api.ts (listUsers/getUser), a unit test, test/e2e/user.e2e.ts, test/e2e/__snapshots__/user-get.json, CHANGELOG.md line |



DONE (00:00): 8cli 0.2.0 published – @qodeca/8cli@0.2.0 on npm, dist-tag latest (publish run 36064388870 success after owner approval). Tag v0.2.0 on main c5e7ba4, Release https://github.com/qodeca/8cli/releases/tag/v0.2.0. Hand-off: everything committed and pushed; continue on the other machine from develop.

Running (00:39): f72fd069 release-prep 0.2.1 retry (claude/sonnet, qodeca-priv) on PR #85 branch xez/48aa3ecd (48aa3ecd failed at readiness: no phase record). Owns package.json, package-lock.json, CHANGELOG.md, CITATION.cff, docs/getting-started.md, docs/global-options.md, docs/guides/ci.md. Then independent review, merge, develop -> main PR, signed tag v0.2.1, GitHub Release, owner approves npm, publish advisory (fixed 0.2.1, range <= 0.2.0).

## Accounts

| Runner × login | State | Resets |
|---|---|---|
| claude × qodeca-priv | ok – 5h 1%, weekly 45% | 5h 03:49, weekly 2026-09-28 18:59 |
| claude × gmail-priv | ok – 5h 0%, weekly 33% | 5h 04:30, weekly 2026-09-25 21:00 |
| claude × eqamana-priv | out (weekly 100%) | 2026-09-26 17:59 |
| claude × westagilelabs-priv | out (weekly 100%) | 2026-09-25 09:00 |
| codex × codex-cli | ok – weekly 24% | weekly 2026-09-29 14:45 |
| pi (own accounts) | not reported by read_quota | – |

Read from read_quota at 00:25. claude × default is the reserved leader login, not in any rotation.

## Owner items

- BLOCKED: leader merge of PR #49 denied by the Claude Code auto-mode classifier even with --allowedTools "Bash(gh pr merge *)". Owner chose "Allow the leader in settings" – owner adds the rule. #50 merged 09:06 by the leader (owner authorized); the other merges were refused by the classifier. Merged 10:44 by the owner: #48, #49, #51, #55 (and #50 at 09:06). #54 and #59 have merge conflicts (DIRTY) – conflict repair.

## Rules that bit

- Local n8n is ONE shared instance (8cli-local-n8n-n8n-1, :5678) but credentials are per worktree (#38). Never let a task run `reset` while others use it; point it at 94c2ff6c's credentials file instead.
- Leader may merge: the rule lives only in scripts/xezar-leader.sh --allowedTools (af31461). Merge only with required checks green + approved review; never with --delete-branch while unattended.
- Closes #N does not auto-close issues (develop is not the default branch): close by hand after merge.
- Dispatch with the WORKFLOW the route row names (`.xezar/routing.json` row `workflows`, files in `.xezar/workflows/`), as `source: {source: "workflow", ref: <name>}` – never a bare xez-* skill. Skills skip the kit snapshot, worktree preflight, gate retry and verdict recording (why every task reported "no reviewer verdict recorded"). Owner caught this.
- Agents share the owner's GitHub identity: formal approve/request-changes is rejected as self-review; verdicts land as PR comments + labels.
- SECURITY.md forbids public issues for vulnerabilities.

## Loops

L1 dc98e447 (*/10), L2 7f521448 (:07), L3 f6161025 (*/30), re-created 19:37 after a session restart. Unattended ON since 14:24, restarts 0/3. Leader attached to xezar (re-attached 23:35 after owner /mcp reconnect).

## Restart

Read this file, newest timeline, `parked.md`, `decisions.md`; re-create loops from `.xezar/loops.json`; `node .xezar/checks/route.mjs --check`.
