# `variable` (`var`) – instance variables

Lists, sets and deletes n8n variables – key and value pairs your workflows read as
`$vars.<key>`.

> **Needs a licensed n8n.** On the Community edition every `var` command fails with n8n's
> license message, as shown below. The success output on this page is taken from 8cli's source;
> it was not run for these docs. See [Community and Enterprise n8n](../community-vs-enterprise.md).

| Subcommand                  | What it does                     |
| --------------------------- | -------------------------------- |
| [`var list`](#var-list)     | List all variables               |
| [`var set`](#var-set)       | Create a variable, or replace it |
| [`var delete`](#var-delete) | Delete a variable by key         |

None of the `var` commands honour `--dry`.

## var list

```text
8cli var list
```

No options.

**Output:** an array of `{ id, key, value }`.

On Community:

```bash
8cli var list
```

```json
{
  "error": "Your license does not allow for feat:variables. To enable feat:variables, please upgrade to a license that supports this feature.",
  "code": "ERR_VARIABLE_LIST"
}
```

**Errors:** `ERR_VARIABLE_LIST`.

## var set

Creates a variable. If one with the same key exists, **8cli deletes it first and then creates a
new one**, so the variable gets a new `id`. It is not an in-place update: for a moment the key
does not exist, and if the create fails, the old value is gone.

```text
8cli var set <key> <value>
```

No options.

**Output:** `{ id, key, value }` of the new variable.

On Community:

```bash
8cli var set REGION eu-west-1
```

```json
{
  "error": "Your license does not allow for feat:variables. To enable feat:variables, please upgrade to a license that supports this feature.",
  "code": "ERR_VARIABLE_SET"
}
```

**Errors:** `ERR_VARIABLE_SET`.

## var delete

Deletes the variable with this key (not ID).

```text
8cli var delete <key>
```

No options.

**Output:** `{ key, deleted: true }`.

On Community:

```bash
8cli var delete REGION
```

```json
{
  "error": "Your license does not allow for feat:variables. To enable feat:variables, please upgrade to a license that supports this feature.",
  "code": "ERR_VARIABLE_DELETE"
}
```

**Errors:** `ERR_VARIABLE_NOT_FOUND` (no variable with that key), `ERR_VARIABLE_DELETE`.
