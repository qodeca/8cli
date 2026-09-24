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

`wf delete` gained `--force` (#43): it unpublishes a published workflow before deleting it. The
flag is additive – without it `wf delete` still refuses a published workflow rather than
unpublishing one, and `--dry` keeps its meaning of "send no write request". The `wf delete`
dry run now reads the workflow (`GET /workflows/{id}`) to learn whether it is published, so,
unlike before, it can fail with `ERR_WORKFLOW_DELETE` on a read error other than 404 – a bad
key, an unreachable host, a 403. A missing workflow (404) still previews a plain delete.

## 3. Output shapes

JSON on stdout: list commands print arrays, get commands print objects, write commands report
`{ "files": [...] }`. A field may be added; an existing field is not removed, renamed or retyped.
`user list` and `user get` now send `includeRole=true`, so their output carries the additive
`role` field (for example `global:owner`) that n8n omits otherwise (#40); no existing field
changed. `dt rows --limit` above n8n's 250-row page cap now returns rows instead of
`ERR_HTTP_400`: the CLI pages at `min(limit, 250)` and still prints the same JSON array, trimmed
to `--limit` (#41); no field changed.

`wf delete --dry` gained two boolean fields that follow the flags given: `wouldUnpublish`
(`true` when the workflow is published and `--force` was given, so the run would unpublish it
first) and `wouldBeRefused` (`true` when the workflow is published and `--force` was not given,
so n8n would refuse the delete). Both are `false` for an unpublished workflow. The dry run still
exits 0 in every case. With `--force`, the real run reads the workflow and unpublishes it only
when published; an unpublished workflow gets a plain delete. The normal delete output
`{ "id", "deleted": true }` is unchanged.

Key order is not part of this contract: a get command passes n8n's response through, so the order
of the keys follows the n8n version it talks to. Against n8n 2.40.5, `wf get` returns the 2.40.5
key order, and `dt get` carries the new top-level `sizeBytes` field that 2.40.5 added. Both are
n8n-side changes – no 8cli code changed for them.

## 4. Errors and exit codes

Errors are `{ "error": "...", "code": "ERR_..." }` on stderr with exit code 1. Error codes are a
contract: callers branch on them.

`wf delete` on a published workflow keeps n8n's refusal and its `ERR_WORKFLOW_DELETE` code and
exit status, and now appends a hint naming the way out (`wf deactivate`, or `--force`) (#43).

Commander's own usage errors – a missing required option or argument, an option missing its
argument, an unknown option or command, excess arguments – are errors like any other: they print
`{ "error": "...", "code": "ERR_USAGE" }` on stderr with exit code 1, where the message is
commander's with its `error: ` prefix removed. Until this change they printed a plain-text
`error: ...` line, which an agent parsing stderr as JSON read as a parse failure; routing them
through `outputError` is the recorded decision for that break (0.x, so allowed – but not silent).

Help display is not an error and keeps its old shape: `--help`, `--version` and `help <command>`
write to stdout and exit 0, while the bare invocation and a bare command group (`wf`, `dt`, …)
print help to stderr and exit 1. An unknown command named to `help` is a usage error like any
other: `8cli help nope` prints `{ "error": "unknown command 'nope'", "code": "ERR_USAGE" }` on
stderr with exit code 1.

## 5. Configuration

The resolution order (CLI flags → env vars → config file → keychain → defaults), the environment
variables `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`, the `8cli.json` config file, and
the keychain service `8cli` with its account names `{url}/api-key`, `{url}/email`,
`{url}/password`. Changing a keychain account name strands every stored credential.
