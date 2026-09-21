# SDLC

How work moves through 8cli. The leader enforces this; a person can override any of it by saying so.

## Branches

- `develop` is the base branch. Every pull request targets it.
- `main` carries releases. Nothing lands on `main` except a merge from `develop`.
- Work happens on a branch named `feature/<name>`, `fix/<name>`, `chore/<name>` or `docs/<name>`.
- Commits follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

## Definition of ready

An issue may be picked up when all of these are true:

- It has one category label (`bug`, `feature`, `refactor`, `security`, `dependencies`, `documentation`).
- It has one priority label and one risk label.
- A bug names how to reproduce it and what should happen instead.
- A feature has a covering spec, or is small enough that the issue itself is the spec and says so.
- It is not `blocked`.

## The gate

One command runs everything: `.xezar/checks/repo-gates.sh`

In order: `npm ci` → `.xezar/checks/security-scan.sh` → `npm run typecheck` → `npm run lint` →
`npm run format:check` → `npm run check:headers` → `npm test` → `npm run build` →
`.xezar/checks/repository-checks.sh`

**Security before the quality verdict.** The security scan sits at position two on purpose: its
result is resolved before anyone gives a quality verdict.

The two end-to-end suites are not in the gate – `npm run test:e2e` needs Docker and
`npm run test:e2e:macos` needs a real macOS keychain. They are required CI checks instead:
`check`, `e2e`, `e2e-macos`.

## Definition of done

- The gate is green locally and the three required CI checks are green on the pull request.
- A behaviour change has a test that fails without it.
- Any change to a public surface is recorded in `BACKWARD_COMPATIBILITY.md`.
- A new `.ts` file under `bin/` or `src/` carries the SPDX header.
- The pull request carries its full label set: one pipeline label, one category, one QA label,
  one priority, one risk.

## Stages

Filed → ready → in progress → design (only when a user-visible CLI surface changes) → review →
QA → merge-queue → merged → release.

`blocked` and `do-not-merge` override every stage.

## The design gate

It is **on**. A change that alters a command name, a flag, help text or an output shape needs
`needs-design`, then `design-approved`, before review. Everything else skips it with `skip-design`
and a one-line reason.

## Release

The owner authorises every release, quoting the commit. The commit must already be merged and
already an ancestor of `main`. The leader holds no publishing credential – publishing runs from a
GitHub Release through OIDC trusted publishing, and the last step is always a person's.
