# Backward compatibility

8cli is a CLI and a published npm package (`@qodeca/8cli`). These are the surfaces other people
and other scripts depend on. Breaking one is a major version, announced, never a side effect.

## The public surfaces

**Command names and aliases.** `auth`, `config`, `wf`, `exec`, `cred`, `tag`, `var`, `proj`,
`user`, `folder`, `dt`, `audit`, `sc` and their subcommands. Renaming or removing one breaks every
script that calls it.

**Global flags.** `--url`, `--api-key`, `--config`, `--table`, `--dry`, `--verbose`, `--insecure`.
Changing what a flag means is a break even when the name stays.

**JSON output shapes.** stdout is the contract. Adding a field is safe; renaming, removing or
retyping one is a break. List commands return arrays, get commands return objects.

**Error contract.** stderr carries `{ "error": "...", "code": "ERR_..." }` and the exit code is 1.
An error code is part of the contract: scripts branch on it.

**Exit codes.** 0 on success, 1 on a handled error.

**Config resolution order.** CLI flags → env vars → config file → keychain → defaults. Reordering
this silently changes which credential a user's existing setup picks.

**Env var names.** `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`.

**Keychain account names.** Service `8cli`, accounts `{url}/api-key`, `{url}/email`,
`{url}/password`. Changing the shape orphans every stored credential on every user's machine.

**The package.** The `8cli` bin name, and Node 22+ as the minimum. The package ships compiled JS
only – no `.d.ts`, no source maps – so there is no TypeScript type surface to break.

## Not public

Anything under `src/` that is not reachable from the surfaces above: internal client methods,
formatter internals, the shape of `--verbose` debug output on stderr, and the contents of
`.xezar/`.

## The rule

A pull request that changes any surface above must say so in its description and add a line here.
A reviewer who finds an unrecorded break requests changes.
