<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Contributing to 8cli

Thanks for your interest in improving 8cli. This document covers how to set up the project,
the quality gates your change must pass, and how to submit it.

By contributing, you agree to the project's [Contributor License Agreement](./CLA.md)
(CLA). It confirms you have the right to submit your contribution and grants Qodeca a
broad licence (GPL-3.0-only plus any other terms Qodeca may choose, preserving the
dual-licensing option). Signing is automatic: the CLA-assistant bot posts a one-time
link on your first pull request, and your Git author identity is your signature.

## Prerequisites

- Node.js **22+** (the CLI uses native `fetch`)
- npm

## Local setup

```bash
git clone https://github.com/qodeca/8cli.git
cd 8cli
npm install
```

No build step is needed for development – the CLI runs straight from TypeScript via `tsx`:

```bash
npx tsx bin/8cli.ts --help
npm start -- --url https://your-n8n.example.com wf list
```

## Quality gates

Every change must pass the same checks CI runs. Run them locally before opening a PR:

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format:check  # prettier (use `npm run format` to auto-fix)
npm test              # unit tests (vitest)
npm run check:headers # every source file must carry the SPDX header
npm run build         # compile to dist/
```

CI also runs the end-to-end suites as required checks; run them locally where you can:

```bash
npm run test:e2e        # built CLI vs a real n8n in Docker (Testcontainers) – needs Docker
npm run test:e2e:macos  # the real macOS keychain (macOS only, no Docker)
```

## Conventions

- **License header** – every new file under `bin/` or `src/` must start with:
  ```
  // SPDX-License-Identifier: GPL-3.0-only
  // SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
  ```
  (In `bin/8cli.ts` it goes immediately after the shebang.)
- **Commits** – use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).
- **Output discipline** – success output is JSON to stdout; errors are structured JSON to
  stderr (`{ "error": "...", "code": "ERR_..." }`) with exit code 1. No interactive prompts.
- **Style** – sentence case (not Title Case), en dashes (–) not em dashes, one file per
  command group. Prettier and ESLint enforce formatting.
- **Tests** – add or update tests under `test/` for behavior changes where practical: unit
  tests for pure logic, and e2e specs under `test/e2e/` for command behavior (see the
  command→branch→spec map in [`test/e2e/COVERAGE.md`](./test/e2e/COVERAGE.md)).

## Submitting a change

1. Branch from `main` (`git checkout -b feature/<name>`).
2. Make your change with tests and docs updated.
3. Ensure all quality gates pass.
4. Open a pull request describing the change and linking any related issue.
5. Sign the [CLA](./CLA.md) via the one-time link the bot posts on your PR.

## Reporting bugs and requesting features

Use the GitHub issue templates. For security vulnerabilities, follow
[`SECURITY.md`](./SECURITY.md) – do not open a public issue.

## Releasing (maintainers)

Releases publish to npm automatically via **trusted publishing** (OIDC) – do not run
`npm publish` by hand for normal releases. The flow:

1. Bump `version` in `package.json` (follow [SemVer](https://semver.org)).
2. Move the relevant `CHANGELOG.md` entries from `[Unreleased]` into the new version section.
3. Commit, then create a matching tag and a **GitHub Release** (for example `v0.2.0`).
4. Publishing the release triggers `.github/workflows/publish.yml`, which runs the tests and
   then `npm publish` over OIDC – no token, with provenance attestation generated
   automatically.

Trusted publishing is configured for `@qodeca/8cli` against the `qodeca` GitHub org, the
`8cli` repository, and the `publish.yml` workflow. The package is owned under the Qodeca
npm organization, not a personal account.
