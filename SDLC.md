<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# SDLC – how a change moves through 8cli

This file states this project's position on each stage. The kit's workflows and role skills
cite its sections by name, so the headings stay as written.

## Task phases

A development task passes through: triage and preflight, analysis, discovery and plan, author,
readiness, canonical checks, seal, handoff, independent review, QA or design review when they
apply, and acceptance verification. Each phase writes its record, and a phase that does not
apply writes "not applicable and why". What each record holds is in
`.xezar/docs/phase-record.md`; `.xezar/checks/phase-record.sh` writes them.

The base branch is `develop`. `main` receives releases only.

## Security before the quality verdict

The gate runs the security scan second, right after `npm ci` and before any check that gives
a quality signal. Its result is resolved before anyone gives a quality verdict. The order lives
in `.xezar/checks/repo-gates.sh`, so the runner enforces it.

## The QA gate

On. A pull request labelled `needs-qa` cannot merge until QA signs it off with
`qa-approved`, which automation never applies. Evidence is a PR comment whose first line is
the heading `## QA`: the reviewed commit sha, what was exercised and how, the verdict (PASS or
FAIL), and each finding with one disposition. For 8cli, "exercised" means running the built CLI
(`node dist/bin/8cli.js …`) and checking its JSON output, stderr errors and exit codes.

## The design gate

On. 8cli is a CLI, and its command names, flags, help text, JSON output shapes and exit codes
are the surface its users touch. A change to that surface is labelled `needs-design` and is
settled under `docs/designs` before code is written. All design parts are installed either
way. To switch the gate off, set `gates.designGate` to `false` in
`.xezar/pipeline/config.json`.

## Review loop

Every pull request gets an independent review, and a model never reviews its own work.
`changes-requested` returns it to the author; each finding ends fixed in a named commit,
disputed with evidence, or deferred to a named issue.

**Naming the break.** A new or changed behaviour test names a concrete regression – the file,
the line, and the change that would cause it – and the author records an actual failing run,
quoting the assertion that failed. A test written after the diagnosis passes against the bug
more often than anyone expects, and a green-either-way test is how the same regression ships
twice. Guard tests that pass both ways are fine and worth keeping; the record says which kind
each one is.

## Self-review inside the author phase, and the repair counters

The author self-reviews before handoff. Three counters bound repair, each recorded before the
round it allows: two self-review fix rounds per candidate, two workflow gate-repair returns, and
two quality-gate repairs of the same failure. An exhausted counter stops the run and reports;
it never lowers a severity, a threshold or a mandatory check.

## The QA and design self-verification exceptions

An agent may verify its own work only under these exceptions, and then it applies
`qa-self-verified` beside the verdict, so a reader can tell a self-check from an independent
sign-off. Outside them, the author reports and someone else decides.

## Security review

A diff that touches credentials, the keychain code (`src/keychain/`), config resolution
(`src/config.ts`), the API clients, or anything the pipeline trusts (see
`CODE_REVIEW.md` § Security) goes to the security-review row as well as the code review.
Neither replaces the other. The reviewer reads `SECURITY.md` first.

## Architecture review

A plan, spec or diff that changes how the CLI is cut – a new command group, a new client, a
change to output or error contracts – is judged against the decision records under
`docs/architecture`. None are recorded yet, so the review reports what the change would
quietly decide.

## Acceptance

A finished change is checked against each accepted criterion of its issue, one by one, by
running it. Acceptance is separate from QA: QA asks whether it works, acceptance asks whether
it did what the issue asked.

## Deploy authority

8cli is a published npm package and is not deployed anywhere. `deploy.environments` and
`deploy.rollback` are `[]`, so the deploy workflow refuses here. Its parts are installed
either way; to wake it, list an environment and a workflow with a `workflow_dispatch` trigger
and a `sha` input. A release needs the owner's go (see the leader guide's release runbook).

## Performance and localisation

Asleep: `performance.budgets` and `localisation.locales` are `[]`. Both workflows are
installed and refuse until the owner fills the list.
