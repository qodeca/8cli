# Model routing

The leader reads this table on every dispatch. It walks a row's chain from left to right and takes
the first lane whose budget is available. `wait` is a real end: the work waits. `wait` is never
replaced by the reserved leader login.

Built in the onboarding interview on 2026-09-21. The chains were seeded from the owner's answers;
nobody has tested them on this project yet. Change a row when it proves wrong.

## Lanes

A lane is a vendor, an account and a model class. Account names and exact model ids are in the
gitignored `.local/xezar/runtime/onboarding-identity.json`, never here.

| Lane | Vendor | Strength | May write to a branch | Budget tracked |
|---|---|---|---|---|
| `claude-strong` | Anthropic, task accounts | strongest | yes | yes |
| `claude-mid` | Anthropic, task accounts | middle | yes | yes |
| `claude-cheap` | Anthropic, task accounts | cheapest | yes | yes |
| `codex` | OpenAI, one account | strong | yes | yes |
| `deepseek` | DeepSeek API through pi or opencode | middle | yes | no – pay-per-use |
| `local` | models hosted on the owner's machines, through pi or opencode | advisory | **no** | no – unlimited |

The reserved leader login is not a lane. It runs no tasks. A missing task login is a hard stop at
dispatch.

## Global prohibitions

Stated once here, never repeated per row. They apply to every row and they override a chain:

1. **Never the authoring model for its own review.** A model does not judge what it wrote.
2. **A locally hosted model never touches a branch.** It may read and advise; it may not write.
3. **A cloud-lane write needs another vendor's review** before it can merge.
4. **A high-risk change needs a different account *and* a different vendor** from the author.

## Class chains

| Class | Chain |
|---|---|
| mechanical | deepseek → claude-cheap → codex → wait |
| writing | claude-strong → codex → deepseek → claude-mid → wait |
| implementation | claude-mid → deepseek → codex → claude-strong → wait |
| review | codex → deepseek → claude-strong (other account) → local (advice) → wait |
| security and release | claude-strong → codex → wait |

## The rows

| # | Task kind | Workflow | Trigger | Class | Chain | Never |
|---|---|---|---|---|---|---|
| 1 | Tracker only: labels, comments from a file, issue filing | `issue-triage.yaml` | The whole change is tracker state; no file in the repository changes. | mechanical | deepseek → claude-cheap → codex → wait | the strongest lanes — this work cannot justify them |
| 2 | Re-check of one record against one comment | `issue-triage.yaml` | A single comment claims one record is wrong, and the check is reading two things and comparing them. | mechanical | deepseek → claude-cheap → codex → wait | the strongest lanes |
| 3 | Evidence pass: gate evidence, phase record, close-out audit | `testing-and-verification.yaml` | The work is collecting what already happened into a record; nothing new is decided. | mechanical | deepseek → claude-cheap → codex → wait | the strongest lanes |
| 4 | Mechanical docs edits | `docs-maintenance.yaml` | Paths, counts, renames, link fixes — no sentence has to be composed. | mechanical | deepseek → claude-cheap → codex → wait | an image-capable lane; nothing here needs it |
| 5 | Root-sync (fast-forward only) | `root-sync.yaml` | The base branch moved and the checkout only has to catch up. | mechanical | none – the leader does this itself | any dispatch at all — the leader does this itself |
| 6 | Docs PR with real writing | `docs-maintenance.yaml` | Someone has to decide what the paragraph says, not just where it points. | writing | claude-strong → codex → deepseek → claude-mid → wait | — |
| 7 | Analysis, specs, research | `research.yaml`, `plan-and-spec.yaml` | The output is a judgement or a design, and the work is larger than one file. | writing | claude-strong → codex → deepseek → claude-mid → wait | the cheapest lanes — the failure is invisible and expensive |
| 8 | Business analysis | `business-analysis.yaml` | The question is about what to build or why, not how. | writing | claude-strong → codex → deepseek → claude-mid → wait | the cheapest lanes |
| 9 | UX mockups | `design.yaml` | A screen has to be proposed before anything is implemented. | writing | claude-strong → codex → claude-mid → wait | a lane that cannot see pictures |
| 10 | Generated images | `design.yaml` | Documentation or a design needs an image that does not exist yet. A deterministic screenshot capture is tooling, **not** this row. | writing | wait – no image-generation lane is confirmed on this machine; ask the owner | every lane without image generation |
| 11 | Bounded bug fix: one file, tests named | `bug-fix.yaml` | The failing test and the file are both already known. | implementation | claude-mid → deepseek → codex → claude-strong → wait | a lane with a known weakness on small precise edits |
| 12 | Multi-file implementation, not UI | `feature-implementation.yaml` | The change spans files and the design is settled. | implementation | claude-mid → deepseek → codex → claude-strong → wait | a locally hosted lane; a single mid lane with no review |
| 13 | UI implementation | `feature-implementation.yaml` | The change alters what a person sees on a screen. | implementation | claude-mid → codex → claude-strong → wait | a locally hosted lane; any lane that cannot see pictures |
| 14 | Kit / checks refactor | `feature-implementation.yaml` | The change is to the pipeline's own tooling rather than the product. | implementation | claude-mid → deepseek → codex → claude-strong → wait | a locally hosted lane |
| 15 | Conflict repair | `integration.yaml` | A merge stopped on a conflict and the resolution needs judgement. | implementation | claude-mid → deepseek → codex → claude-strong → wait | an image-only lane |
| 16 | Merge chain (integration) | `integration.yaml` | Several approved PRs must land in order. | implementation | claude-mid → deepseek → codex → wait | the strongest lanes; a locally hosted lane |
| 17 | Dependency maintenance | `dependency-maintenance.yaml` | A dependency bump, with the gate as the judge. | implementation | claude-mid → deepseek → codex → claude-strong → wait | — |
| 18 | Scoped code re-check | `code-review.yaml` | One earlier finding is being re-checked, not the whole diff. | review | codex → deepseek → claude-strong (other account) → local (advice) → wait | the cheapest lanes; **whichever lane authored the change** |
| 19 | Full cold code review | `code-review.yaml` | The reviewer opens the diff with no prior context. | review | codex → deepseek → claude-strong (other account) → wait | the cheapest lanes; a locally hosted lane; **the lane that wrote the change** |
| 20 | Review response, one verdict | `address-review-findings.yaml` | One verdict has to be answered or fixed. | review | codex → deepseek → claude-strong (other account) → local (advice) → wait | — |
| 21 | Review response folding several verdicts | `address-review-findings.yaml` | Several verdicts disagree, or they interact. | review | codex → deepseek → claude-strong (other account) → wait | the cheapest lanes; a locally hosted lane |
| 22 | Design review: judging screens and pictures | `design-review.yaml` | The verdict depends on looking at a rendered screen. | review | codex → claude-strong (other account) → wait | any lane that cannot see pictures |
| 23 | Browser / manual QA | `qa.yaml` | The check needs a live multi-step run in a browser. | review | codex → deepseek → claude-strong (other account) → wait | a locally hosted lane |
| 24 | Security-sensitive review | `code-review.yaml` | The diff touches authentication, secrets, permissions, or anything reachable from outside. | security and release | claude-strong → codex → wait | a locally hosted lane; an advisory-only lane |
| 25 | Verifying a strong claim from a weaker lane | `code-review.yaml` | A cheaper lane reported something serious and nothing has confirmed it. | security and release | claude-strong → codex → wait | the author; the claimant |
| 26 | Release role | `release.yaml`, `release-prep.yaml` | The owner gave the release go, quoting the commit. | security and release | claude-strong → codex → wait | — |

Rows 5, 9, 10, 13, 16, 19, 21, 22 and 23 differ from their class chain because of their own
`Never` column: no local lane, no lane that cannot see pictures, or no strongest lane. The
`deepseek` lane is left out of the picture rows (9, 13, 22) until somebody confirms it can see
pictures.

**When two triggers both match, take the more specific row.** Several rows overlap on purpose —
row 24 (security-sensitive) is a *subset* of row 19 (full cold review), and row 25 is a subset of
row 24. Without this rule a cold review of an authentication diff routes to row 19 and quietly
loses the security chain. When two rows are equally specific, take the later one.

Two pairs need saying out loud, because their triggers read alike:

- **18 vs 20.** Row 18 *judges* — is this earlier finding actually fixed? Row 20 *changes code* to
  answer a verdict. Judging goes to the review workflow, fixing goes to the response workflow.
- **15 vs 16.** A merge chain that hits a conflict is row 15, not row 16, for as long as the
  conflict is open. Row 16 bans the strongest lanes; a conflict needs judgement, so routing it as
  16 bans exactly the lane the work requires.

## Budget is not in this table

Routing is preference; budget is availability. The budget table is in
`.xezar/docs/account-limits.md`. Unlimited lanes are exempt. An unknown budget is never "out" and
never "fine": the next real dispatch finds out. Nothing probes in a loop.
