# Software delivery lifecycle

How a change moves from an idea to `develop` in 8cli. The leader (a Claude Code session started
with `scripts/xezar-leader.sh`) dispatches the work; the rules below bind every task it runs and
every person who reviews one.

## Branches

- `develop` is the base branch. Every task pull request targets it, and it is protected: the
  required checks are `check`, `e2e` and `e2e-macos`.
- `main` is the release branch. It moves only by a release (`.xezar/docs/leader-guide.md` §
  Release runbook).

## The gate

One command runs the whole agent gate: `.xezar/checks/repo-gates.sh`. It installs, runs the
security stage, then these commands in order, then the kit's repository checks:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run format:check`
4. `npm test`
5. `npm run build`
6. `npm run check:headers`

A gate that could not run counts as a failure, never as a pass. CI runs more than this list –
`reuse lint`, `npm audit --audit-level=high` and both e2e suites – so a green local gate is not a
green pull request.

## Task phases

A development task passes through these phases, and each one settles one thing:

| Phase  | Settles                                         | Marked by                                      |
| ------ | ----------------------------------------------- | ---------------------------------------------- |
| Triage | kind, priority and risk of the work             | a category, `priority-*` and `risk-*` label    |
| Design | the command surface, when `needs-design` is set | `design-approved` or `skip-design`             |
| Author | the change, its tests, a green gate             | the draft pull request, `review`               |
| Review | an independent verdict                          | `changes-requested` or approval                |
| QA     | the behaviour a user sees                       | `qa-approved`, `qa-self-verified` or `skip-qa` |
| Merge  | landing on `develop`                            | `merge-queue`, then a squash merge             |

Each task records one disposition per phase: done, skipped with the reason, or blocked with what
it waits for.

## Security before the quality verdict

The security stage of the gate runs second, right after the install and before any command that
gives a quality signal. A quality verdict is never given on a change whose security result is not
resolved.

## Review loop

The reviewer approves or requests changes; nothing in between. On `changes-requested` the author
owns the next move, answers every finding with a disposition (fixed in a named commit, disputed
with evidence, or deferred to a named issue), and asks for a re-review.

**Naming the break.** A new or changed behaviour test names a concrete regression – the file, the
line, and the change that would cause it – and the author records an actual failing run, quoting
the assertion that failed. A test written after the diagnosis passes against the bug more often
than anyone expects, and a green-either-way test is how the same regression ships twice. Guard
tests that pass both ways are fine and worth keeping; the record just says which kind each one
is.

## Self-review inside the author phase, and the repair counters

The author reviews their own diff before asking for review, and runs the gate. Each workflow
counts its repair attempts; when a counter runs out, the task stops and reports rather than
trying again. A model never approves its own work: self-review is a status report, not a review.

## The QA gate

The QA gate is **on** (`qaGate: true`). A pull request with `needs-qa` stays unmergeable until QA
signs off with `qa-approved`. QA evidence is a pull request comment that names the head commit
it checked. `skip-qa` needs a stated reason, such as a change with no user-visible behaviour.

## The design gate

The design gate is **awake** in this project (`gates.designGate: true`). For a CLI the design
surface is the command names, flags, help text, JSON output shapes and exit codes. A pull request
carrying `needs-design` does not pass review until `design-approved` is present. Its parts are
installed either way; to switch it off, set `gates.designGate` to `false` in
`.xezar/pipeline/config.json`.

## The QA and design self-verification exceptions

A run may verify its own change only in the narrow, documented case its workflow names, and then
it applies `qa-self-verified` beside the approval, so a reader can tell a self-check from an
independent sign-off at a glance. Design has no self-verification: `design-approved` always comes
from someone other than the author.

## Security review

A change that touches a trust boundary – authentication and the keychain code in
`src/keychain/`, credential handling in `src/config.ts`, the API clients in `src/client/`, a
workflow under `.github/workflows/`, a check script, the routing file or either config file – is
routed to the security-review row. What the project promised is in `SECURITY.md`; the review
defends that and nothing more.

## Architecture review

A change that adds a command group, a dependency, a new API client or a change to config
resolution order gets an architecture review against `CLAUDE.md` § Architecture and
`BACKWARD_COMPATIBILITY.md`.

## Acceptance

A task is accepted when its pull request's required checks are green, every review finding has a
disposition, the QA gate is satisfied, and the issue's acceptance criteria are each shown met.

## Deploy authority

8cli has no deploy: it is published to npm by a release. `deploy.environments` and
`deploy.rollback` are `[]`, so the deploy and rollback workflows refuse to run. Their parts are
installed; to wake them, list `<environment>=<workflow file>` entries whose workflow has a
`workflow_dispatch` trigger with a `sha` input.

## Performance

No performance budgets are set (`performance.budgets: []`), so the performance workflow does not
run. Its parts are installed; a budget is the owner's promise and is added by hand.

## Localisation

8cli has no locales (`localisation.locales: []`), so the localisation workflow does not run. Its
parts are installed; to wake it, list the locale tags.
