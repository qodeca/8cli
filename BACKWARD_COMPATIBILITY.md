# Backward compatibility

The public surfaces of 8cli that a change must not break without a recorded decision and a
changelog entry. 8cli is at 0.x, so a break is allowed – but never a silent one.

## 1. Command names and aliases

The command groups and subcommands listed in `CLAUDE.md` § Architecture (`wf`, `exec`, `cred`,
`tag`, `var`, `proj`, `user`, `folder`, `dt`, `audit`, `sc`, `auth`, `config`) and their aliases.
Removing or renaming one breaks every script that calls it.

## 2. Flags

The global options (`--url`, `--api-key`, `--config`, `--table`, `--dry`, `--verbose`,
`--insecure`) and every subcommand flag. A flag may gain a new value; it may not change the
meaning of an existing one.

## 3. Output shapes

JSON on stdout: list commands print arrays, get commands print objects, write commands report
`{ "files": [...] }`. A field may be added; an existing field is not removed, renamed or retyped.

## 4. Errors and exit codes

Errors are `{ "error": "...", "code": "ERR_..." }` on stderr with exit code 1. Error codes are a
contract: callers branch on them.

## 5. Configuration

The resolution order (CLI flags → env vars → config file → keychain → defaults), the environment
variables `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`, the `8cli.json` config file, and
the keychain service `8cli` with its account names `{url}/api-key`, `{url}/email`,
`{url}/password`. Changing a keychain account name strands every stored credential.
