# Model routing

The leader consults this table on every dispatch. It walks a chain top down and takes the first
lane whose budget is available.

## What a lane is

A lane is **a tool plus a model**. An account is not a lane: accounts are the rotation
*underneath* a Claude lane, used when the current account runs out of tokens. A lane is only
"out" when every account for it is out.

| Short | Lane |
|---|---|
| O | `claude` / `opus[1m]` |
| S | `claude` / `sonnet` |
| H | `claude` / `haiku` |
| F | `claude` / `fable` |
| G | `codex` / `gpt-5.6-sol` |
| A | `codex` / `gpt-6-astra` |
| D | `pi` / `deepseek-api/deepseek-flash` |
| V | `pi` / `dgx-spark/deepseek-v4-flash-vision` (local) |
| Q | `pi` / `mac-m4/qwen38-flash-next` (local) |

`opencode` is disabled on this machine and is in no chain.

## Special-purpose lanes, never chosen by budget

- **F** – escalation only, for work the owner or the leader marks extremely important and
  complicated. It is never reached by a chain running out.
- **A** – graphics, diagrams and pictures only. Rows 9 and 10.

## Accounts

Rotation inside any `claude` lane, in order: the first project account, then the next, and so on
through the registry. **The reserved leader login is not in the rotation and never runs a task.**
Account ids live in the gitignored half of the manifest, not here.

V and Q are unlimited: no budget tracking.

## Global prohibitions – they override a chain

1. Never the authoring model for its own review.
2. A locally hosted model never touches a branch. It may read and advise.
3. A cloud-lane write needs another vendor's review before it can merge.
4. A high-risk change needs a different account **and** a different vendor from the author.

When two triggers match, take the more specific row. When equally specific, take the later one.

## The chains, by class

| Class | Chain |
|---|---|
| mechanical | H → D → V → Q → wait |
| writing | O → G → S → wait |
| implementation | O → G → S → D → wait |
| review | G → O → D → wait |
| security and release | O → G → D → wait |

## The rows

| # | Task kind | Workflow | Chain |
|---|---|---|---|
| 1 | Tracker only: labels, comments, issue filing | `issue-triage.yaml` | H → D → V → Q → wait |
| 2 | Re-check of one record against one comment | `issue-triage.yaml` | H → D → V → Q → wait |
| 3 | Evidence pass: gate evidence, phase record, close-out | `testing-and-verification.yaml` | H → D → V → Q → wait |
| 4 | Mechanical docs edits | `docs-maintenance.yaml` | H → D → Q → wait |
| 5 | Root-sync (fast-forward only) | `root-sync.yaml` | the leader does it; no dispatch |
| 6 | Docs PR with real writing | `docs-maintenance.yaml` | O → G → S → wait |
| 7 | Analysis, specs, research | `research.yaml`, `plan-and-spec.yaml` | O → G → S → wait |
| 8 | Business analysis | `business-analysis.yaml` | O → G → S → wait |
| 9 | UX mockups | `design.yaml` | A → wait |
| 10 | Generated images | `design.yaml` | A → wait |
| 11 | Bounded bug fix: one file, tests named | `bug-fix.yaml` | O → G → S → D → wait |
| 12 | Multi-file implementation, not UI | `feature-implementation.yaml` | O → G → S → D → wait |
| 13 | UI implementation | `feature-implementation.yaml` | O → G → S → wait |
| 14 | Kit / checks refactor | `feature-implementation.yaml` | O → G → S → D → wait |
| 15 | Conflict repair | `integration.yaml` | O → G → S → D → wait |
| 16 | Merge chain (integration) | `integration.yaml` | S → D → wait |
| 17 | Dependency maintenance | `dependency-maintenance.yaml` | O → G → S → D → wait |
| 18 | Scoped code re-check | `code-review.yaml` | G → O → wait |
| 19 | Full cold code review | `code-review.yaml` | G → O → wait |
| 20 | Review response, one verdict | `address-review-findings.yaml` | G → O → D → wait |
| 21 | Review response folding several verdicts | `address-review-findings.yaml` | G → O → wait |
| 22 | Design review: judging screens and pictures | `design-review.yaml` | G → O → V → wait |
| 23 | Browser / manual QA | `qa.yaml` | G → O → D → wait |
| 24 | Security-sensitive review | `code-review.yaml` | O → G → wait |
| 25 | Verifying a strong claim from a weaker lane | `code-review.yaml` | O → G → wait |
| 26 | Release role | `release.yaml`, `release-prep.yaml` | O → G → D → wait |

Row 13 keeps only vision-capable lanes. Row 4 drops V because nothing there needs to see a
picture. Row 16 bans the strongest lanes. Rows 18, 19, 21 and 24 drop the cheapest and the local
lanes, and never use the lane that authored the change.

## Budget

Routing is preference; budget is availability. The budget record is keyed by tool × account.
An entry carries a reset time and expires to `unknown` – which is neither "out" nor "fine". The
next real dispatch that prefers that lane finds out. Nothing probes in a loop: a probe *is* a
first use and opens a fresh window.
