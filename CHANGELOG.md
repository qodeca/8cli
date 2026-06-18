<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[unreleased]: https://github.com/qodeca/8cli/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/qodeca/8cli/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/qodeca/8cli/releases/tag/v0.1.0
