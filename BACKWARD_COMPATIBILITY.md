<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Backward compatibility – 8cli

These are the public surfaces 8cli must not break without a deprecation plan
(`deprecation-plan` workflow, under `docs/deprecations`). 8cli is at 0.x, so a breaking change
is allowed in a minor version, but it is still named in `CHANGELOG.md` and never slipped in.

- **The command name** `8cli` and the npm package `@qodeca/8cli`.
- **Commands and aliases** – `auth`, `config`, `workflow` (`wf`), `execution` (`exec`),
  `credential` (`cred`), `tag`, `variable` (`var`), `project` (`proj`), `user`, `folder`,
  `datatable` (`dt`), `audit`, `source-control` (`sc`) and their subcommands.
- **Flags** – the global options (`--url`, `--api-key`, `--config`, `--table`, `--dry`,
  `--verbose`, `--insecure`) and every subcommand flag.
- **Output shapes** – JSON on stdout by default: arrays for list commands, objects for get
  commands, `{ "files": [...] }` for write commands.
- **Errors and exit codes** – `{ "error": "...", "code": "ERR_..." }` on stderr with exit
  code 1. Error codes are part of the contract; scripts match on them.
- **Config resolution** – the order CLI flags → env vars → config file → keychain → defaults,
  the env var names `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`, and the `8cli.json`
  file.
- **Keychain layout** – service `8cli`, accounts `{url}/api-key`, `{url}/email`,
  `{url}/password`. Changing it strands stored credentials.

## Notice

No notice period is recorded yet. A deprecation plan proposes one as the owner's decision.
