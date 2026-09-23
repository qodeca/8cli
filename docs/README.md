# 8cli documentation

8cli is an AI-first n8n command-line tool. Commands write JSON to stdout; failures write a
structured JSON error to stderr and exit with code 1.

## Start here

- [Getting started](getting-started.md) – install, connect and verify.
- [Configuration and credentials](configuration.md) – keychain, environment variables and config.
- [Command reference](reference/README.md) – every command group and option.
- [Guides](guides/README.md) – AI agents, jq, CI and workflow backup.
- [Troubleshooting](troubleshooting.md) – common setup and API problems.
- [Design notes](designs/README.md) – contributor-facing material.

## Community and Enterprise

The local n8n 2.40.5 Community edition has no license. `var`, `proj`, `folder` and `sc` are
license-gated there: the CLI returns n8n's structured failure rather than a feature result.
Use an appropriately licensed n8n instance for those groups.
