# `source-control` (`sc`) – n8n source control

Reads the status of n8n's Git-based source control and pulls changes into n8n. Pushing is not
possible through n8n's public API.

> **Needs a licensed n8n with source control set up.** On the Community edition `sc status` and
> `sc pull` fail with `ERR_SOURCE_CONTROL` and an error message that names the license. The success
> output is n8n's own response, passed through; it was not run for these docs. See
> [Community and Enterprise n8n](../community-vs-enterprise.md).

| Subcommand                | What it does                                    |
| ------------------------- | ----------------------------------------------- |
| [`sc status`](#sc-status) | List the changes waiting to be pulled or pushed |
| [`sc pull`](#sc-pull)     | Pull the connected Git branch into n8n          |
| [`sc push`](#sc-push)     | Always fails: not supported by n8n's public API |

## sc status

```text
8cli sc status [--direction <pull|push>]
```

| Option                     | Required | Meaning                                           |
| -------------------------- | -------- | ------------------------------------------------- |
| `--direction <pull\|push>` | No       | Which changes to list: `pull` (default) or `push` |

Calls n8n's `GET /api/v1/source-control/status` with the chosen direction. An invalid
`--direction` value fails with `ERR_USAGE` before any request is sent.

**Output:** n8n's status response, passed through: the list of changes that a pull (or a push)
would move between n8n and the connected Git branch.

On Community, `sc status` (with either direction) fails with `ERR_SOURCE_CONTROL` and an error
message that names the license.

**Errors:** `ERR_SOURCE_CONTROL`, `ERR_USAGE`.

## sc pull

Asks n8n to pull from its connected Git branch.

```text
8cli sc pull [--force]
```

| Option    | Required | Meaning                                            |
| --------- | -------- | -------------------------------------------------- |
| `--force` | No       | Overwrite changes made in n8n with the Git version |

Ignores `--dry`.

**Output:** n8n's pull result, passed through.

On Community, `sc pull` and `sc pull --force` fail with `ERR_SOURCE_CONTROL` and an error message
that names the license.

**Errors:** `ERR_SOURCE_CONTROL`.

## sc push

Always fails, without contacting n8n: n8n's public API has no push. Push from the n8n UI.

```text
8cli sc push [--force]
```

| Option    | Required | Meaning              |
| --------- | -------- | -------------------- |
| `--force` | No       | Accepted and ignored |

```bash
8cli sc push
```

```json
{
  "error": "Push is not supported via the n8n public API – use the n8n UI or internal API instead",
  "code": "ERR_NOT_SUPPORTED"
}
```

**Errors:** `ERR_NOT_SUPPORTED`, always.
