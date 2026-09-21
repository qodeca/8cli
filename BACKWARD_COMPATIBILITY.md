<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Backward compatibility

What this project must not break without a deprecation plan. 8cli is consumed by scripts, by `jq`
pipelines and by AI agents, none of which can read a release note. A change that is tidier and
incompatible is still incompatible.

## The public surfaces

| Surface                       | What must not break                                                                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Command names and aliases** | `wf`, `exec`, `cred`, `tag`, `var`, `proj`, `user`, `folder`, `dt`, `audit`, `sc`, `auth`, `config` and their subcommands. Renaming one breaks every script that calls it.                    |
| **Flags**                     | `--url`, `--api-key`, `--config`, `--table`, `--dry`, `--verbose`, `--insecure`, and each command's own flags. A removed or renamed flag is a breaking change; an added optional flag is not. |
| **stdout JSON shape**         | Field names and nesting of what each command prints. List commands print arrays, get commands print objects. Removing or renaming a field is breaking. Adding a field is not.                 |
| **Error contract**            | Errors go to stderr as `{ "error": "...", "code": "ERR_..." }` with exit code 1. The `code` values are part of the contract: callers branch on them.                                          |
| **Exit codes**                | 0 on success, 1 on a structured error.                                                                                                                                                        |
| **Keychain entries**          | Service `8cli`, accounts `{url}/api-key`, `{url}/email`, `{url}/password`. Changing a name orphans a credential a user already stored.                                                        |
| **Config resolution order**   | CLI flags → env vars → config file → keychain → defaults, and the env var names `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`.                                                        |
| **Package and binary**        | The package `@qodeca/8cli` and the command `8cli`.                                                                                                                                            |
| **Node floor**                | Node 22+. Raising it is a breaking change for anyone on the old floor.                                                                                                                        |

## What is not a public surface

Everything under `src/` is internal: there are no published type declarations and no library entry
point (`files` ships `dist` only). Classes, method names and file layout may change freely, as long
as no surface in the table above moves with them.

## How a break is made

A change that has to break one of these needs a deprecation plan under `docs/deprecations/` first:
who is affected, what replaces it, and the dates. Nothing is removed before that page exists and
the replacement works.

A breaking change is flagged in the pull request and carries a major version when it is released.
