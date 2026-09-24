<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Commander's own usage errors (a missing required option or argument, an option missing its
  argument, an unknown option or command, excess arguments) now print
  `{ "error": "...", "code": "ERR_USAGE" }` on stderr with exit code 1 instead of a plain-text
  `error: ...` line, which an agent parsing stderr as JSON read as a parse failure. This is a
  break to the stderr format, recorded in `BACKWARD_COMPATIBILITY.md` § 4. `8cli help <unknown>`
  is now one of those usage errors; `--help`, `--version`, a bare `8cli` and a bare command group
  still display help.

### Fixed

- Behaviour change: credentials from `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD` or `--api-key`
  are refused with `ERR_CONFIG_SOURCE_MISMATCH` when the URL comes from a config file and no
  `N8N_URL`/`--url` was given, instead of sending them to the host named by the file; set
  `N8N_URL` too.
- `sc status` calls `GET /api/v1/source-control/status` with the required `direction` query param (`--direction <pull|push>`, default `pull`) instead of the nonexistent `/source-control/preferences`, so a Community instance reports the licence error and a licensed one returns the pending-changes list. An invalid `--direction` value now fails with the new `ERR_USAGE` code on stderr, exit 1, before any request is sent (#39).
- `wf publish` no longer drops workflow settings other than `executionOrder`: it keeps every settings key n8n accepts and drops only the unknown keys n8n rejects (#42).

- Plain HTTP to the IPv6 loopback address is accepted again without `--insecure`:
  `http://[::1]:5678` is treated like `localhost` and `127.0.0.1`. The WHATWG URL parser
  returns the bracketed hostname `[::1]`, which the loopback check did not match. The
  exemption stays narrow – other IPv6 hosts are still refused (#52).

## [0.1.2] - 2026-06-19

### Added

- REUSE 3.3 / SPDX licensing compliance: `LICENSES/GPL-3.0-only.txt`, `REUSE.toml`, and an
  `SPDX-License-Identifier` header on every source file, enforced by a `reuse lint` CI step.
- Open-source governance set: `CLA.md`, `COPYRIGHT`, `TRADEMARKS.md`, `SUPPORT.md`, and
  `CITATION.cff`, plus `.github/CODEOWNERS` and a Dependabot config for npm and GitHub Actions.

### Changed

- Releases are cut from a signed tag, and the npm publish workflow runs behind a protected
  `release` environment (OIDC trusted publishing, no stored token).
- `sc push` is now documented as an unsupported public-API stub in its `--help` text and the
  README; behavior is unchanged (it already returned `ERR_NOT_SUPPORTED`).

### Security

- GitHub Actions are pinned to full commit SHAs, hardening the release supply chain.
- Bumped the transitive dev-only dependency `undici` to clear a high-severity advisory; the
  published package was not affected.

## [0.1.1] - 2026-06-14

### Fixed

- `folder` commands now return a structured `{ "error", "code" }` (exit 1) instead of
  leaking a raw stack trace when the internal API errors.
- `workflow publish` can create new workflows again – it no longer sends the read-only `id`
  that n8n rejects on create (`--dry` reports a provisional id).
- `--table` output no longer crashes for commands that set no explicit column widths
  (`tag`, `credential`, `variable`, `project`, `user`, `datatable`).
- `datatable rows --limit` now caps the number of rows returned instead of paginating
  through every row.
- `auth login` now works: its `--api-key` was shadowed by the global flag, so it reads the
  global `--api-key` (use `-` for stdin).

### Added

- Real-n8n black-box end-to-end test suite (Testcontainers) plus a macOS keychain job and
  gating `e2e` / `e2e-macos` CI jobs. Tests are not shipped in the published package.

## [0.1.0] - 2026-06-13

First public release.

### Added

- AI-first, JSON-native CLI for remote-managing n8n instances.
- Command groups: `auth`, `config`, `workflow`, `execution`, `credential`, `tag`,
  `variable`, `project`, `user`, `folder`, `datatable`, `audit`, `source-control`.
- macOS keychain credential storage; environment-variable and config-file resolution.
- Public API client (`X-N8N-API-KEY`) and internal API client (cookie auth) for folders.
- `--insecure` global flag; plaintext-HTTP n8n URLs are rejected by default (loopback hosts
  excepted) so the API key is never sent in clear text.
- `auth` secret flags accept `-` to read the value from stdin, avoiding exposure of secrets
  in process arguments.
- Test suite (Vitest), ESLint (flat config) + Prettier, and GitHub Actions CI running
  typecheck, lint, format check, tests, build, dependency audit, and SPDX-header checks.
- Project docs and governance: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `THIRD-PARTY-LICENSES.md`, issue/PR templates, and this changelog.

### Security

- `diff` shipped at v9, resolving a denial-of-service advisory in earlier versions.
- Windows/Linux keychain stubs fail with an actionable message instead of silently no-opping.
- Vulnerability reporting via GitHub private reporting (`SECURITY.md`).

[unreleased]: https://github.com/qodeca/8cli/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/qodeca/8cli/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/qodeca/8cli/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qodeca/8cli/releases/tag/v0.1.0
