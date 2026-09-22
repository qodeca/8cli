<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Code review – 8cli

Every pull request gets one independent review. The reviewer did not write the change and
does not share its model. The gate commands are the floor, not the review.

## What to check

- **Contracts.** JSON on stdout for success, `{ "error": "...", "code": "ERR_..." }` on
  stderr with exit code 1 for errors, no interactive prompts. List commands output arrays,
  get commands output objects, write commands report `{ "files": [...] }`.
- **n8n API rules** from `CLAUDE.md`: `PUT /workflows/{id}` gets only its allowed fields,
  `active` is stripped, settings carry only `executionOrder`, executions use
  `?includeData=true`.
- **Secrets.** Nothing secret is written to a config file, a log or an error message.
- **Headers.** Every new `.ts` file under `bin/` and `src/` has the SPDX header.
- **Compatibility.** A change to a command, flag, output shape or exit code is checked against
  `BACKWARD_COMPATIBILITY.md`.
- **Tests.** New behaviour has a test that fails without the change (`SDLC.md` § Review loop).

## Severity guidance

- **Blocking** – wrong output or exit code, a broken contract, a leaked secret, data loss on
  an n8n instance, a failing gate.
- **Should fix** – a missing test for new behaviour, an unclear error message, a doc that is
  now wrong.
- **Nit** – style the formatter does not catch. File nits as follow-up issues; they never
  block.

## Security

These paths are trust boundaries. A diff that touches any of them goes to the security-review
row as well as the code review, and the gate's `SECURITY` record sets `reviewerRequired`:

- `.claude/settings.json` and `.xezar/checks/leader-context.sh` – the `SessionStart` hook and
  its loader. A branch that changes either gets code execution in every Claude Code session
  opened on that branch, including a reviewer's task worktree.
- `.xezar/pipeline/config.json` and `.xezar/config.json` – the base branch, the gates and the
  `deploy.*` lists.
- `.github/workflows/` – what CI runs and what publishes to npm.
- `src/keychain/`, `src/config.ts` and `src/client/` – where 8cli handles credentials.

The risk is not removed. It is made visible and routed.
