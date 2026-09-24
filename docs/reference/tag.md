# `tag` – workflow tags

Lists, creates, renames and deletes the tags you can put on workflows.

| Subcommand                  | What it does  |
| --------------------------- | ------------- |
| [`tag list`](#tag-list)     | List all tags |
| [`tag create`](#tag-create) | Create a tag  |
| [`tag update`](#tag-update) | Rename a tag  |
| [`tag delete`](#tag-delete) | Delete a tag  |

None of the `tag` commands honour `--dry`: with `--dry` they still make the change.

## tag list

```text
8cli tag list
```

No options.

```bash
8cli tag list
```

```json
[
  {
    "id": "p4kFYVrUuNHyaRhk",
    "name": "billing"
  },
  {
    "id": "slPdPQIChDRrKCsR",
    "name": "reporting"
  }
]
```

**Output:** an array of `{ id, name }`. Empty: `[]`.

**Errors:** `ERR_TAG_LIST`.

## tag create

```text
8cli tag create <name>
```

No options.

```bash
8cli tag create billing
```

```json
{
  "id": "p4kFYVrUuNHyaRhk",
  "name": "billing"
}
```

**Output:** `{ id, name }` of the new tag.

**Errors:** `ERR_TAG_CREATE`. Tag names are unique:

```json
{
  "error": "Tag already exists",
  "code": "ERR_TAG_CREATE"
}
```

## tag update

Renames a tag.

```text
8cli tag update <id> --name <name>
```

| Option          | Required | Meaning          |
| --------------- | -------- | ---------------- |
| `--name <name>` | Yes      | The new tag name |

```bash
8cli tag update slPdPQIChDRrKCsR --name finance-reports
```

```json
{
  "id": "slPdPQIChDRrKCsR",
  "name": "finance-reports"
}
```

**Output:** `{ id, name }` after the rename.

**Errors:** `ERR_TAG_UPDATE`.

## tag delete

Deletes a tag.

```text
8cli tag delete <id>
```

No options.

```bash
8cli tag delete slPdPQIChDRrKCsR
```

```json
{
  "id": "slPdPQIChDRrKCsR",
  "deleted": true
}
```

**Output:** `{ id, deleted: true }`.

**Errors:** `ERR_TAG_DELETE` (for example `Not Found`).
