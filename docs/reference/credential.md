# `credential` (`cred`) – n8n credentials

Lists, deletes and moves the credentials your workflows use (API tokens, OAuth connections,
passwords). 8cli sees only their names, types and owners. **It never sees or prints the secret
values inside them** – n8n's public API does not return them.

8cli cannot create a credential; do that in n8n.

| Subcommand                        | What it does                         |
| --------------------------------- | ------------------------------------ |
| [`cred list`](#cred-list)         | List all credentials                 |
| [`cred delete`](#cred-delete)     | Delete a credential                  |
| [`cred transfer`](#cred-transfer) | Move a credential to another project |

## cred list

```text
8cli cred list
```

No options.

```bash
8cli cred list
```

```json
[
  {
    "id": "3ZITLTW5L6GNpzVE",
    "name": "Orders API header",
    "type": "httpHeaderAuth",
    "createdAt": "2026-09-23T22:11:21.842Z",
    "updatedAt": "2026-09-23T22:11:21.841Z",
    "shared": [
      {
        "id": "h9zoZXuZpQh3QJrj",
        "name": "Local Owner <owner@example.com>",
        "role": "credential:owner",
        "createdAt": "2026-09-23T22:11:21.843Z",
        "updatedAt": "2026-09-23T22:11:21.843Z"
      }
    ]
  }
]
```

**Output:** an array of n8n's credential objects, passed through: `id`, `name`, `type`,
`createdAt`, `updatedAt` and `shared` (the projects that own or share it, with `id`, `name`,
`role`). With `--table`, `shared` shows as `[object Object]`; use JSON for it.

**Errors:** `ERR_CRED_LIST`.

## cred delete

Deletes a credential. Check first that no workflow still uses it.

```text
8cli cred delete <id>
```

No options. Ignores `--dry`.

```bash
8cli cred delete 3ZITLTW5L6GNpzVE
```

```json
{
  "id": "3ZITLTW5L6GNpzVE",
  "deleted": true
}
```

**Output:** `{ id, deleted: true }`.

**Errors:** `ERR_CRED_DELETE` (for example `Not Found`).

## cred transfer

Moves a credential to another project.

```text
8cli cred transfer <id> --to <projectId>
```

| Option             | Required | Meaning                         |
| ------------------ | -------- | ------------------------------- |
| `--to <projectId>` | Yes      | ID of the project to move it to |

Ignores `--dry`. You need a second project to move to, and extra projects need a licensed n8n
(see [`proj`](project.md)). On Community, the only project is your personal one, which already
owns the credential:

```bash
8cli cred transfer 3ZITLTW5L6GNpzVE --to h9zoZXuZpQh3QJrj
```

```json
{
  "error": "You can't transfer a credential into the project that's already owning it.",
  "code": "ERR_CRED_TRANSFER"
}
```

**Output** on success: `{ id, projectId }` – the credential and the project it now belongs to.
Not run for these docs; the success case needs a licensed n8n.

**Errors:** `ERR_CRED_TRANSFER`, for example:

```json
{
  "error": "Could not find project with the id \"aBcDeFgHiJkLmNoP\". Make sure you have the permission to create credentials in it.",
  "code": "ERR_CRED_TRANSFER"
}
```
