# Code review – how a change is judged in 8cli

Read with `SDLC.md` (the review loop) and `BACKWARD_COMPATIBILITY.md` (what must not break).

## What the reviewer does

- Review a fixed commit, not a moving branch. Name it: `Head: <sha>`, and `Base: <sha>` where the
  merge base matters.
- Read the diff, the issue's acceptance criteria and the gate evidence. Say what you read and what
  you did not.
- Post one verdict as a pull request comment whose first line is `APPROVE` or `REQUEST CHANGES`.
- Never edit the candidate. Never approve your own work.

## What to check

1. **Contract.** JSON to stdout, structured `{ "error", "code" }` to stderr with exit code 1, no
   interactive prompt, list commands print arrays, get commands print objects, `--dry` changes
   nothing. See `CLAUDE.md` § AI-first design principles.
2. **n8n API rules.** The payload rules in `CLAUDE.md` § n8n API gotchas still hold.
3. **Secrets.** No secret in a config file, a log line, an error message, a test fixture or
   `--verbose` output. Secrets live in the OS keychain only.
4. **Tests.** A behaviour change has a unit test. A change to a command's output or to an API
   client has an e2e spec, and `test/e2e/COVERAGE.md` is updated.
5. **Scope.** The change does what the issue asks and no more.
6. **Housekeeping.** The SPDX header on every new `.ts` file, `CHANGELOG.md` for a user-facing
   change, `THIRD-PARTY-LICENSES.md` when dependencies change, docs when behaviour changes.

## Severity guidance

| Severity  | Meaning                                                                                               | Effect                   |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------------ |
| `blocker` | Breaks a contract in `BACKWARD_COMPATIBILITY.md`, leaks a secret, loses data, or makes a gate a no-op | `REQUEST CHANGES`        |
| `major`   | Wrong behaviour on a realistic input, or a missing test for changed behaviour                         | `REQUEST CHANGES`        |
| `minor`   | Correct but fragile, unclear or inconsistent with nearby code                                         | May survive an `APPROVE` |
| `nit`     | Style or wording                                                                                      | May survive an `APPROVE` |

Every finding gets a disposition: fixed in `<sha>`, disputed with evidence, or deferred to an issue
that exists. Silence is not a disposition.

## Security

A security finding is recorded as one finding with severity `blocker` or `major`, never folded into
a quality remark. The security result is resolved before the quality verdict (`SDLC.md` § Security
before the quality verdict).

### Trust boundary: the session hook and its loader

`.claude/settings.json` registers one `SessionStart` hook. It runs
`.xezar/checks/leader-context.sh`. That script's output is put into the leader's context at every
start, resume, clear and compaction. So whoever can change the hook, the script, or the files the
script reads (`.xezar/docs/leader-guide.md`, `.xezar/campaigns/`) can change what the leader
believes and does – without a prompt. `.mcp.json` is in the same class: it decides which server
the leader talks to.

A diff that touches any of these files is security-sensitive. It goes to the security review row
(row 24) in `.xezar/docs/model-routing.md`, to a different account and a different vendor from the
author. The risk is not removed. It is made visible and routed.
