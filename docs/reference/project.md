# `project` (`proj`) – projects

Lists, creates, renames and deletes n8n projects, which group workflows and credentials and
control who can see them.

> **Needs a licensed n8n.** On the Community edition every `proj` command fails with n8n's
> license message, as shown below – even `proj list`, although Community has a personal project
> per user. The success output on this page is taken from 8cli's source; it was not run for these
> docs. See [Community and Enterprise n8n](../community-vs-enterprise.md).

| Subcommand                    | What it does      |
| ----------------------------- | ----------------- |
| [`proj list`](#proj-list)     | List all projects |
| [`proj create`](#proj-create) | Create a project  |
| [`proj update`](#proj-update) | Rename a project  |
| [`proj delete`](#proj-delete) | Delete a project  |

None of the `proj` commands honour `--dry`.

## proj list

```text
8cli proj list
```

No options.

**Output:** an array of n8n's project objects, passed through as n8n returns them.

On Community:

```bash
8cli proj list
```

```json
{
  "error": "Your license does not allow for feat:projectRole:admin. To enable feat:projectRole:admin, please upgrade to a license that supports this feature.",
  "code": "ERR_PROJECT_LIST"
}
```

**Errors:** `ERR_PROJECT_LIST`.

## proj create

```text
8cli proj create <name>
```

No options. Quote a name with spaces: `8cli proj create 'Finance team'`.

**Output:** `{ id, name }` of the new project.

On Community:

```json
{
  "error": "Your license does not allow for feat:projectRole:admin. To enable feat:projectRole:admin, please upgrade to a license that supports this feature.",
  "code": "ERR_PROJECT_CREATE"
}
```

**Errors:** `ERR_PROJECT_CREATE`.

## proj update

Renames a project.

```text
8cli proj update <id> --name <name>
```

| Option          | Required | Meaning              |
| --------------- | -------- | -------------------- |
| `--name <name>` | Yes      | The new project name |

**Output:** `{ id, name }` after the rename.

On Community (`8cli proj update h9zoZXuZpQh3QJrj --name 'Finance team'`):

```json
{
  "error": "Your license does not allow for feat:projectRole:admin. To enable feat:projectRole:admin, please upgrade to a license that supports this feature.",
  "code": "ERR_PROJECT_UPDATE"
}
```

**Errors:** `ERR_PROJECT_UPDATE`.

## proj delete

Deletes a project. With `--transfer-to`, n8n first moves the project's workflows and
credentials to another project.

```text
8cli proj delete <id> [--transfer-to <projectId>]
```

| Option                      | Required | Meaning                                              |
| --------------------------- | -------- | ---------------------------------------------------- |
| `--transfer-to <projectId>` | No       | Move the project's resources here before deleting it |

Without `--transfer-to`, what happens to the project's workflows and credentials is up to n8n.
Use it unless you mean to lose them.

**Output:** `{ id, deleted: true }`.

On Community (`8cli proj delete h9zoZXuZpQh3QJrj --transfer-to aBcDeFgHiJkLmNoP`):

```json
{
  "error": "Your license does not allow for feat:projectRole:admin. To enable feat:projectRole:admin, please upgrade to a license that supports this feature.",
  "code": "ERR_PROJECT_DELETE"
}
```

**Errors:** `ERR_PROJECT_DELETE`.
