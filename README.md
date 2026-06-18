# 8cli

[![CI](https://github.com/qodeca/8cli/actions/workflows/ci.yml/badge.svg)](https://github.com/qodeca/8cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@qodeca/8cli)](https://www.npmjs.com/package/@qodeca/8cli)
[![License: GPL-3.0-only](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

An AI-first command-line interface for remote-managing [n8n](https://n8n.io) instances.
JSON output by default, no interactive prompts, composable with `jq` and other tools –
designed for both AI agents (such as Claude Code) and humans.

```bash
8cli --url https://your-n8n.example.com wf list | jq '.[].name'
```

## Features

- **JSON-native** – every command emits valid JSON to stdout; errors go to stderr as
  `{ "error": "...", "code": "ERR_..." }` with a non-zero exit code.
- **Non-interactive** – all input via flags and arguments; safe for scripts, CI, and agents.
- **Composable** – list commands return arrays, get commands return objects; pipe into `jq`.
- **Secrets in the OS keychain** – API keys never touch config files.
- **No build needed to hack on it** – TypeScript run directly via `tsx` in development.

## Requirements

- Node.js **22+** (uses native `fetch`)
- An n8n instance with API access
- Keychain secret storage is supported on **macOS** only; on Windows/Linux, provide
  credentials via environment variables (see [Configuration](#configuration-and-credentials))

## Install

Published on npm as [`@qodeca/8cli`](https://www.npmjs.com/package/@qodeca/8cli):

```bash
npm install -g @qodeca/8cli
```

Or run without installing:

```bash
npx @qodeca/8cli --url https://your-n8n.example.com wf list
```

## Quick start

```bash
# Store an API key in the OS keychain (macOS)
8cli --url https://your-n8n.example.com auth set-api-key --value <your-api-key>

# ...or pipe the key from stdin so it never appears in your shell history / process list
printf '%s' "$MY_KEY" | 8cli --url https://your-n8n.example.com auth set-api-key --value -

8cli --url https://your-n8n.example.com auth verify

# List workflows (JSON by default)
8cli --url https://your-n8n.example.com wf list

# Human-readable table
8cli --url https://your-n8n.example.com wf list --table

# Compose with jq
8cli --url https://your-n8n.example.com wf list | jq '.[] | {id, name, active}'
```

Configuration can also come from environment variables (`N8N_URL`, `N8N_API_KEY`,
`N8N_EMAIL`, `N8N_PASSWORD`), so the `--url`/`--api-key` flags are optional once they are set.

## Commands

| Group            | Alias  | Subcommands                                                                  |
| ---------------- | ------ | ---------------------------------------------------------------------------- |
| `auth`           |        | `login`, `logout`, `list`, `verify`, `set-api-key`, `set-credentials`        |
| `config`         |        | `show`                                                                       |
| `workflow`       | `wf`   | `list`, `get`, `save`, `publish`, `activate`, `deactivate`, `delete`, `diff` |
| `execution`      | `exec` | `list`, `get`, `delete`                                                      |
| `credential`     | `cred` | `list`, `delete`, `transfer`                                                 |
| `tag`            |        | `list`, `create`, `update`, `delete`                                         |
| `variable`       | `var`  | `list`, `set`, `delete`                                                      |
| `project`        | `proj` | `list`, `create`, `update`, `delete`                                         |
| `user`           |        | `list`, `get`                                                                |
| `folder`         |        | `tree`, `create`, `delete`, `move`, `sync`                                   |
| `datatable`      | `dt`   | `list`, `get`, `rows`, `create`, `delete`, `insert`                          |
| `audit`          |        | `run`                                                                        |
| `source-control` | `sc`   | `status`, `pull`, `push`                                                     |

Run `8cli <group> --help` for the options of any group.

## Global options

| Flag              | Purpose                                     |
| ----------------- | ------------------------------------------- |
| `--url <url>`     | n8n instance URL                            |
| `--api-key <key>` | API key (overrides keychain)                |
| `--config <path>` | Config file path                            |
| `--table`         | Human-readable table output instead of JSON |
| `--dry`           | Preview changes without applying them       |
| `--verbose`       | Debug logging to stderr                     |
| `--insecure`      | Allow plaintext-HTTP URLs (not recommended) |
| `--version`       | Print the CLI version                       |
| `--help`          | Show help for any command                   |

## Errors and exit codes

On success, commands print JSON to **stdout** and exit `0`. On failure, they print a
structured error to **stderr** and exit `1`:

```json
{ "error": "No API key configured. ...", "code": "ERR_NO_API_KEY" }
```

The `code` is a stable `ERR_*` identifier (for example `ERR_NO_URL`, `ERR_NO_API_KEY`,
`ERR_AUTH_VERIFY`, `ERR_WORKFLOW_*`) so scripts and agents can branch on it without parsing
prose. Each command documents its own codes via `8cli <group> <command> --help`.

## Configuration and credentials

Configuration is resolved in priority order: **CLI flags → environment variables →
config file → OS keychain → defaults**. Secrets are **never** written to config files –
they live in the OS keychain (service name `8cli`).

- **macOS** – fully supported via the `security` keychain CLI.
- **Windows / Linux** – keychain backends are stubs and not yet implemented; use the
  `N8N_API_KEY` (and `N8N_EMAIL` / `N8N_PASSWORD`) environment variables in the meantime.

By default 8cli refuses plaintext-`http://` URLs (except loopback hosts like
`localhost`) so the API key is never sent in clear text. Pass `--insecure` to override.

### Environment variables

| Variable       | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `N8N_URL`      | n8n instance URL                                 |
| `N8N_API_KEY`  | Public API key (`X-N8N-API-KEY`)                 |
| `N8N_EMAIL`    | Email for internal API auth (folder commands)    |
| `N8N_PASSWORD` | Password for internal API auth (folder commands) |

Environment variables are convenient for CI but bypass the keychain – avoid committing them
to `.env` files or leaving them in shell history. Prefer `auth login` (keychain) for
day-to-day use, and pipe secrets via `--value -` (stdin) rather than inline flags.

### Config file (`8cli.json`)

A non-secret config file is auto-detected at `8cli.json` (cwd) or `configs/8cli.json`, or
pass `--config <path>`. It holds only non-secret settings:

```json
{
  "url": "https://your-n8n.example.com",
  "workflowDir": "workflow-files"
}
```

### Note on folder commands (internal API)

Most commands use n8n's documented public API (`/api/v1`, `X-N8N-API-KEY` header). The
**`folder`** commands use n8n's **internal** `/rest` API with cookie/session authentication,
because the public API does not expose folder information. As a result:

- Folder commands require email/password credentials (`auth set-credentials` or
  `N8N_EMAIL` / `N8N_PASSWORD`).
- They depend on undocumented, unversioned endpoints that **may change or break across n8n
  upgrades**.

## Disclaimer

8cli is an independent, third-party tool. It is **not** affiliated with, endorsed by, or
sponsored by n8n GmbH. "n8n" is a trademark of n8n GmbH, used here only to describe
compatibility.

"Claude" and "Claude Code" are trademarks of Anthropic; 8cli is not affiliated with or
endorsed by Anthropic — it is simply designed to be usable by terminal coding agents. See
[`TRADEMARKS.md`](./TRADEMARKS.md) for the full trademark policy, including Qodeca's own marks.

## Contributing

Contributions are welcome – see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup and the
quality gates, and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for community standards.
Contributions are accepted under **GPL-3.0-only** and require signing the project
[Contributor License Agreement](./CLA.md); the CLA-assistant bot prompts first-time
contributors automatically on their pull request.

## Security

8cli keeps secrets in the OS keychain (never in config files) and refuses plaintext-HTTP URLs
by default. Report security vulnerabilities **privately** via
[GitHub's private advisory reporting](https://github.com/qodeca/8cli/security/advisories/new) –
see [`SECURITY.md`](./SECURITY.md). Please do not open a public issue for an unfixed vulnerability.

## License

8cli is licensed under the **GNU General Public License v3.0 only** – see
[`LICENSE`](./LICENSE) for the full text. The corresponding source is available at
<https://github.com/qodeca/8cli>. Bundled third-party dependencies and their notices are
listed in [`THIRD-PARTY-LICENSES.md`](./THIRD-PARTY-LICENSES.md); development-only
dependencies are not distributed.

This project was extracted from an internal Qodeca monorepo; prior commit history is not
preserved in this repository.

## Built by Qodeca

8cli is built by **[Qodeca](https://qodeca.com)** — a Warsaw-based software team building
software since 2014 for the fitness, sport, and healthcare industries, where HIPAA, GDPR, and
PCI DSS are the baseline, not the exception. We build a lot of our tooling in the open.

**Related projects:** [erfana](https://github.com/qodeca/erfana) (agent-native Markdown
workspace) · [erfana-skills](https://github.com/qodeca/erfana-skills) (Claude Code plugin).

[qodeca.com](https://qodeca.com) · [LinkedIn](https://www.linkedin.com/company/qodecasoftwaredevelopment) · [hi@qodeca.com](mailto:hi@qodeca.com)
