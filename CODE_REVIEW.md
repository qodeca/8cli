<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Code review

What a reviewer checks in this project, and what may never be waved through. Generated together
with `SDLC.md` and `AGENTS.md` from the same confirmed gate list.

## Before reading the diff

The gate must have run and passed:

```bash
.xezar/checks/repo-gates.sh
```

A review of a change whose gate did not run is a review of an unknown state. Ask for the gate
first.

## Who may review

- **Never the authoring model.** A model does not judge what it wrote.
- **A cloud-lane write needs another vendor's review.** Another login of the same vendor is not
  another vendor.
- **A high-risk change needs a different vendor from the author**, whatever login that vendor
  reaches.
- The review chain for this project is in `.xezar/docs/model-routing.md`, rows 34 to 42.

## What every review checks

1. **Correctness** — does it do what the issue asked, and does it fail the way it should when the
   input is wrong?
2. **The output contract** — every command prints valid JSON to stdout, errors go to stderr as
   `{ "error": "...", "code": "ERR_..." }` with exit code 1, and no command ever prompts. A change
   that breaks any of those breaks the tool's whole reason to exist.
3. **Backward compatibility** — see `BACKWARD_COMPATIBILITY.md`. A renamed flag or a changed JSON
   shape is a breaking change even when the code is tidier afterwards.
4. **Secrets** — nothing reaches a config file, a log line, a test fixture or a commit. Credentials
   live in the OS keychain, and keychain values are never printed.
5. **Tests** — a fix carries the test that would have caught it. A test that passes before the fix
   is not that test.
6. **The SPDX header** on every new file under `bin/` and `src/`.
7. **Scope** — a bug fix that also reformats a file is two changes wearing one coat.

## Trust boundaries

A diff that touches any of these is routed to the security-review row **by machine**, not by
anybody remembering to do it:

| Path                                                | Why it is a boundary                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `.claude/settings.json`                             | it holds the `SessionStart` hook, a command this project runs at every session start |
| `.xezar/checks/leader-context.sh`                   | the hook's loader: whatever it prints becomes leader context                         |
| `.xezar/config.json`, `.xezar/pipeline/config.json` | the base branch, the gate list, the deploy keys                                      |
| `.github/workflows/`                                | what CI runs, and what publishes to npm                                              |
| `src/keychain/**`                                   | reads and writes the OS keychain                                                     |
| `src/client/**`                                     | where the API key and the session cookie travel                                      |

The risk in the hook and its loader is not removed by naming it here. It is made visible and
routed: a change to either is read by a security reviewer before anything else.

## Verdicts

- **approve** — every point above holds, and the reviewer says what it checked.
- **request-changes** — one finding is enough. Each finding names the file, the line and what would
  go wrong.
- Three rounds of `changes-requested` on one change stop it and raise the question with the owner.

A security review that found nothing is not a code review that passed. Both run.
