# SDLC – how work moves in 8cli

This document says how a change goes from an issue to a merge. `AGENTS.md` says how to work in the
code. `CODE_REVIEW.md` says how a change is judged. `BACKWARD_COMPATIBILITY.md` says what must not
break. All four agree on one gate list; change them together.

## Branches

- Task work targets the base branch. Its name is `baseBranch` in `.xezar/config.json` and in
  `.xezar/pipeline/config.json`. Never write the name into a skill or a script.
- The default branch takes releases only: a pull request from the base branch, then a signed tag.
- One task, one branch, one pull request. Branch names: `feature/<name>`, `fix/<name>`,
  `chore/<name>`, `docs/<name>`. Commits follow Conventional Commits.

## Task phases

Each phase settles one thing. A task records a disposition for every phase: `done`, `skipped`
(with the reason) or `not-applicable`.

| Phase          | What it settles                                              | Label                                                            |
| -------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| Triage         | The issue is real, scoped and not a duplicate                | `priority-*`, `risk-*`, a category label                         |
| Plan and spec  | What will be built and how it is accepted                    | –                                                                |
| Design         | What the user sees, where a change has a user-facing surface | `needs-design` → `design` → `design-approved` or `design-failed` |
| Implementation | Code, tests and docs, on a task branch                       | `in-progress`                                                    |
| Gates          | The full gate list passes on the final commit                | –                                                                |
| Review         | An independent reviewer approves or requests changes         | `review` ↔ `changes-requested`                                   |
| QA             | The built CLI behaves as the acceptance criteria say         | `needs-qa` → `qa` → `qa-approved` or `qa-failed`                 |
| Merge          | Required CI jobs are green and no blocking label is present  | `merge-queue`                                                    |

`blocked` and `do-not-merge` stop any phase.

## Validation – the gate list

One command runs the gate: `.xezar/checks/repo-gates.sh`. It runs, in this order:

1. `npm ci`
2. `.xezar/checks/security-scan.sh`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run format:check`
6. `npm test`
7. `npm run build`
8. `npm run check:headers`
9. `.xezar/checks/repository-checks.sh`

Commands 3 to 8 are `validation.commands` in `.xezar/pipeline/config.json`. A gate that did not run
counts as failed, never as passed.

GitHub requires three CI jobs on a pull request: `check`, `e2e` and `e2e-macos`. The Docker e2e
suite (`npm run test:e2e`) and the macOS keychain suite (`npm run test:e2e:macos`) run in CI, not in
the local gate. Run them locally when a change touches the API clients, a command's output, or the
keychain code.

## Security before the quality verdict

The security scan is gate 2. Its result is resolved before anybody gives a quality verdict. A
change that touches authentication, the keychain code, secrets, `.github/workflows/`, `.mcp.json`,
`.claude/settings.json` or `.xezar/checks/leader-context.sh` is security-sensitive: it gets the
security review row in `.xezar/docs/model-routing.md`.

## Self-review inside the authoring work

The author reads the final diff once before handoff, runs the focused tests and
`npm run typecheck`, and fixes what that finds. At most two self-review fix rounds. Self-review is a
status report. It is not a review.

## Review loop

A model never approves its own work. The reviewer is a different model from the author. For a
cloud lane's change the reviewer is from another vendor. For a `risk-high` change the reviewer is a
different account and a different vendor.

The reviewer posts `APPROVE` or `REQUEST CHANGES` and names the commit it judged (`Head: <sha>`).
Every finding ends with one of three dispositions: fixed in `<sha>`, disputed with evidence, or
deferred to an issue that exists. At most two review rounds per candidate; after that the leader
asks the owner.

## The QA gate

A change to what the CLI prints, to an exit code, to an error code, or to how credentials are
resolved carries `needs-qa`. It does not merge until `qa-approved` is present, backed by evidence:
the commands that were run against the built `dist/bin/8cli.js` and what they printed.
`skip-qa` needs a stated reason. `needs-qa` and `skip-qa` together is a conflict and blocks merge.
An author never applies `qa-approved` to its own change, except under the documented self-QA
exception, which also applies `qa-self-verified`.

## The design gate

The design gate is **on** (`gates.designGate: true` in `.xezar/pipeline/config.json`). To turn it
off, set that one value to `false`.

8cli has no graphical interface today. Its user-facing surface is the terminal: command names,
flags, `--help` text, `--table` layouts, and the shape of JSON output and errors. A change that adds
or reshapes that surface carries `needs-design`. The proposal goes in `designs/<feature>/` – the
command, its flags, example output for the normal, empty and error cases. It waits for
`design-approved`, backed by a `## Design review` comment. `skip-design` needs a stated reason: the
rendered output is unchanged. All design parts (labels, `designs/`, the design skill, the design
review workflow) are installed whether the gate is on or off.

## Releases

The owner authorises a release and quotes the commit. Steps and proofs are in the release runbook
in `.xezar/docs/leader-guide.md`. Publishing runs only from `.github/workflows/publish.yml`.
