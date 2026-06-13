<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca
-->

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Test suite (Vitest) covering URL security checks, API-key masking, keychain account
  helpers, and output formatting.
- ESLint (flat config) + Prettier, with `lint`, `format`, and `format:check` scripts.
- Continuous integration (GitHub Actions) running typecheck, lint, format check, tests,
  build, dependency audit, and SPDX-header verification on every push and pull request.
- `--insecure` global flag; plaintext-HTTP n8n URLs are now rejected by default (loopback
  hosts excepted) so the API key is never sent in clear text.
- `auth` secret flags accept `-` to read the value from stdin, avoiding exposure of secrets
  in process arguments.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, and `CHANGELOG.md`.

### Changed

- `diff` upgraded to v9 (resolves a denial-of-service advisory in earlier versions).
- Published npm tarball now ships compiled JavaScript only (declaration files and source
  maps are no longer emitted).
- Windows/Linux keychain stubs now fail with an actionable message pointing to environment
  variables.
- Security policy switched to GitHub private vulnerability reporting.

## [0.1.0] - 2026-06-13

### Added

- Initial release: AI-first, JSON-native CLI for remote-managing n8n instances.
- Command groups: `auth`, `config`, `workflow`, `execution`, `credential`, `tag`,
  `variable`, `project`, `user`, `folder`, `datatable`, `audit`, `source-control`.
- macOS keychain credential storage; environment-variable and config-file resolution.
- Public API client (`X-N8N-API-KEY`) and internal API client (cookie auth) for folders.

[unreleased]: https://github.com/qodeca/8cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qodeca/8cli/releases/tag/v0.1.0
