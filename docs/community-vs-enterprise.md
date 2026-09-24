# Community and Enterprise n8n

n8n comes in a free Community edition and paid, licensed editions. Some features behind 8cli's
commands exist only with a license. 8cli sends the request either way; on Community, n8n refuses
it and 8cli reports the refusal as a normal error.

## What works where

Tested against n8n 2.40.5 Community with no license.

| Group            | Community | What you see on Community                                                                  |
| ---------------- | --------- | ------------------------------------------------------------------------------------------ |
| `auth`, `config` | Yes       | Works (these are local; `auth verify` calls n8n)                                           |
| `wf`             | Yes       | Works                                                                                      |
| `exec`           | Yes       | Works                                                                                      |
| `cred`           | Yes       | Works; `cred transfer` needs a second project, which needs a license                       |
| `tag`            | Yes       | Works                                                                                      |
| `user`           | Yes       | Works                                                                                      |
| `dt`             | Yes       | Works                                                                                      |
| `audit`          | Yes       | Works                                                                                      |
| `var`            | **No**    | `Your license does not allow for feat:variables…`                                          |
| `proj`           | **No**    | `Your license does not allow for feat:projectRole:admin…`                                  |
| `folder`         | **No**    | `Plan lacks license for this feature`                                                      |
| `sc`             | **No**    | `sc status`: `not found`; `sc pull`: `Your license does not allow for feat:sourceControl…` |

## What the refusals look like

Each refusal is an ordinary 8cli error on stderr with exit code 1. The code is the command's own
code; the message is n8n's.

**Variables:**

```bash
8cli var list
```

```json
{
  "error": "Your license does not allow for feat:variables. To enable feat:variables, please upgrade to a license that supports this feature.",
  "code": "ERR_VARIABLE_LIST"
}
```

**Projects:**

```bash
8cli proj list
```

```json
{
  "error": "Your license does not allow for feat:projectRole:admin. To enable feat:projectRole:admin, please upgrade to a license that supports this feature.",
  "code": "ERR_PROJECT_LIST"
}
```

**Folders** (the login works; the folder request is refused):

```bash
8cli folder tree
```

```json
{
  "error": "Plan lacks license for this feature",
  "code": "ERR_FOLDER_TREE"
}
```

**Source control.** `sc status` does not mention a license. n8n answers `not found`, because
the source-control endpoint is not there without the feature:

```bash
8cli sc status
```

```json
{
  "error": "not found",
  "code": "ERR_SOURCE_CONTROL"
}
```

`sc pull` names the license:

```json
{
  "error": "Your license does not allow for feat:sourceControl. To enable feat:sourceControl, please upgrade to a license that supports this feature.",
  "code": "ERR_SOURCE_CONTROL"
}
```

## Telling a license refusal from a real failure

Only the message tells them apart; the code is the same one you get for any other failure of
that command. In a script:

```bash
8cli var list 2>err.json || {
  if jq -e '.error | test("license|Plan lacks")' err.json >/dev/null; then
    echo "variables need a licensed n8n"
  fi
}
```

`sc status` on Community says only `not found`; treat `not found` from `sc status` as "source
control is not available here".

## Licensed editions

The licensed behaviour of `var`, `proj`, `folder` and `sc` is documented from 8cli's source and
n8n's public API. It has not been run for these docs, because the test instance has no license.
Each of those pages says so.
