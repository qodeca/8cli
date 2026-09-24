# `source-control` (`sc`) – n8n source control

Reads the status of n8n's Git-based source control and pulls changes into n8n. Pushing is not
possible through n8n's public API.

> **Needs a licensed n8n with source control set up.** On the Community edition `sc status`
> answers `not found` and `sc pull` names the missing license, as shown below. The success
> output is n8n's own response, passed through; it was not run for these docs. See
> [Community and Enterprise n8n](../community-vs-enterprise.md).

| Subcommand                | What it does                                    |
| ------------------------- | ----------------------------------------------- |
| [`sc status`](#sc-status) | Show the source-control settings                |
| [`sc pull`](#sc-pull)     | Pull the connected Git branch into n8n          |
| [`sc push`](#sc-push)     | Always fails: not supported by n8n's public API |

## sc status

```text
8cli sc status
```

No options.

**Output:** n8n's source-control preferences object, passed through (the connected repository,
branch and similar settings).

On Community n8n answers `not found`, without mentioning a license:

```bash
8cli sc status
```

```json
{
  "error": "not found",
  "code": "ERR_SOURCE_CONTROL"
}
```

**Errors:** `ERR_SOURCE_CONTROL`.

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

On Community:

```bash
8cli sc pull
```

```json
{
  "error": "Your license does not allow for feat:sourceControl. To enable feat:sourceControl, please upgrade to a license that supports this feature.",
  "code": "ERR_SOURCE_CONTROL"
}
```

`8cli sc pull --force` returns the same.

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
