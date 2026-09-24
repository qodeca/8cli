# `datatable` (`dt`) – data tables

Creates, reads, fills and deletes n8n data tables – simple tables your workflows can read and
write, stored inside n8n. Works on the Community edition.

| Subcommand                | What it does                |
| ------------------------- | --------------------------- |
| [`dt list`](#dt-list)     | List all data tables        |
| [`dt get`](#dt-get)       | Print one data table        |
| [`dt rows`](#dt-rows)     | List a table's rows         |
| [`dt create`](#dt-create) | Create a table              |
| [`dt delete`](#dt-delete) | Delete a table and its rows |
| [`dt insert`](#dt-insert) | Add rows to a table         |

**Error codes work differently here.** When n8n answers with an error, `dt` passes it through as
`ERR_HTTP_<status>` (for example `ERR_HTTP_404`), or n8n's own code if it sends one. The
`ERR_DATATABLE_*` codes appear only when the request never got an answer. See
[where an error code comes from](../output-and-errors.md#where-an-error-code-comes-from).

## dt list

```text
8cli dt list
```

No options.

```bash
8cli dt list
```

```json
[
  {
    "updatedAt": "2026-09-23T22:13:41.144Z",
    "createdAt": "2026-09-23T22:13:41.144Z",
    "id": "S1NeX6x9xdFj19Tm",
    "name": "orders",
    "projectId": "h9zoZXuZpQh3QJrj",
    "columns": [
      {
        "updatedAt": "2026-09-23T22:13:41.144Z",
        "createdAt": "2026-09-23T22:13:41.144Z",
        "id": "HS5KvXf0Zw1PIEX8",
        "name": "orderId",
        "type": "string",
        "index": 0
      },
      {
        "updatedAt": "2026-09-23T22:13:41.144Z",
        "createdAt": "2026-09-23T22:13:41.144Z",
        "id": "CJ1SqCjOjUui4XzB",
        "name": "total",
        "type": "number",
        "index": 1
      }
    ],
    "sizeBytes": 4096
  }
]
```

With `--table`, columns are ID, Name and Columns (the column names):

```text
┌────────────────────┬──────────────────────────────┬────────────────┐
│ ID                 │ Name                         │ Columns        │
├────────────────────┼──────────────────────────────┼────────────────┤
│ S1NeX6x9xdFj19Tm   │ orders                       │ orderId, total │
└────────────────────┴──────────────────────────────┴────────────────┘
```

**Output:** an array of n8n's data table objects, passed through: `id`, `name`, `projectId`,
`columns` (each `id`, `name`, `type`, `index`, `createdAt`, `updatedAt`), `sizeBytes`,
`createdAt`, `updatedAt`.

**Errors:** `ERR_HTTP_<status>`, `ERR_DATATABLE_LIST`.

## dt get

```text
8cli dt get <id>
```

No options.

```bash
8cli dt get S1NeX6x9xdFj19Tm | jq -c '{id, name, projectId, columns: [.columns[] | {name, type}]}'
```

```text
{"id":"S1NeX6x9xdFj19Tm","name":"orders","projectId":"h9zoZXuZpQh3QJrj","columns":[{"name":"orderId","type":"string"},{"name":"total","type":"number"}]}
```

**Output:** one data table object, the same shape as in `dt list`.

**Errors:** `ERR_HTTP_404` when there is no such table, `ERR_DATATABLE_GET`:

```json
{
  "error": "Could not find the data table: 'doesNotExist0001'",
  "code": "ERR_HTTP_404"
}
```

## dt rows

Lists the rows of a table.

```text
8cli dt rows <id> [--limit <n>]
```

| Option        | Required | Default | Meaning                |
| ------------- | -------- | ------- | ---------------------- |
| `--limit <n>` | No       | `100`   | At most this many rows |

```bash
8cli dt rows S1NeX6x9xdFj19Tm --limit 2
```

```json
[
  {
    "orderId": "A-1001",
    "total": 42.5,
    "id": 1,
    "createdAt": "2026-09-23T22:13:47.827Z",
    "updatedAt": "2026-09-23T22:13:47.827Z"
  },
  {
    "orderId": "A-1002",
    "total": 19.9,
    "id": 2,
    "createdAt": "2026-09-23T22:13:47.827Z",
    "updatedAt": "2026-09-23T22:13:47.827Z"
  }
]
```

**Output:** an array of rows. Each row has your columns plus `id` (a number), `createdAt` and
`updatedAt`. With `--table`, one table column per field.

**Errors:** `ERR_HTTP_<status>`, `ERR_DATATABLE_ROWS`.

## dt create

Creates a table with the columns you give.

```text
8cli dt create --name <name> --columns <json>
```

| Option             | Required | Meaning                                                                |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| `--name <name>`    | Yes      | Table name                                                             |
| `--columns <json>` | Yes      | A JSON array of `{ "name", "type" }`, for example `string` or `number` |

Honours `--dry`: checks the JSON and shows what it would create.

```bash
8cli dt create --name orders --columns '[{"name":"orderId","type":"string"},{"name":"total","type":"number"}]'
```

```json
{
  "id": "S1NeX6x9xdFj19Tm",
  "name": "orders"
}
```

```bash
8cli --dry dt create --name orders --columns '[{"name":"orderId","type":"string"},{"name":"total","type":"number"}]'
```

```json
{
  "dry": true,
  "action": "create",
  "name": "orders",
  "columns": [
    {
      "name": "orderId",
      "type": "string"
    },
    {
      "name": "total",
      "type": "number"
    }
  ]
}
```

**Output:** `{ id, name }`; with `--dry`, `{ dry: true, action: "create", name, columns }`.

**Errors:** `ERR_INVALID_JSON` (`--columns` is not JSON), `ERR_HTTP_<status>` (n8n refused the
table), `ERR_DATATABLE_CREATE`.

```json
{
  "error": "Invalid JSON for --columns",
  "code": "ERR_INVALID_JSON"
}
```

## dt delete

Deletes a table and all its rows.

```text
8cli dt delete <id>
```

No options. Honours `--dry`.

```bash
8cli dt delete S1NeX6x9xdFj19Tm
```

```json
{
  "id": "S1NeX6x9xdFj19Tm",
  "deleted": true
}
```

```bash
8cli --dry dt delete S1NeX6x9xdFj19Tm
```

```json
{
  "dry": true,
  "action": "delete",
  "id": "S1NeX6x9xdFj19Tm"
}
```

**Output:** `{ id, deleted: true }`; with `--dry`, `{ dry: true, action: "delete", id }`. The dry
run does not check that the table exists.

**Errors:** `ERR_HTTP_404` when there is no such table, `ERR_DATATABLE_DELETE`.

## dt insert

Adds rows to a table. The rows are a JSON array of objects whose keys are column names.

```text
8cli dt insert <id> (--data <json|@file> | --stdin)
```

| Option          | Required | Meaning                                               |
| --------------- | -------- | ----------------------------------------------------- |
| `--data <json>` | One of   | The rows as JSON, or `@path` to read them from a file |
| `--stdin`       | the two  | Read the rows from standard input                     |

If you give both, `--stdin` wins. Honours `--dry`: checks the JSON and reports how many rows it
would insert.

From the command line:

```bash
8cli dt insert S1NeX6x9xdFj19Tm --data '[{"orderId":"A-1001","total":42.5},{"orderId":"A-1002","total":19.9}]'
```

```json
{
  "insertedRows": 2
}
```

From a file:

```bash
8cli dt insert S1NeX6x9xdFj19Tm --data @rows.json
```

```json
{
  "insertedRows": 1
}
```

From standard input:

```bash
printf '[{"orderId":"A-1004","total":120}]' | 8cli dt insert S1NeX6x9xdFj19Tm --stdin
```

```json
{
  "insertedRows": 1
}
```

Dry run:

```bash
8cli --dry dt insert S1NeX6x9xdFj19Tm --data @rows.json
```

```json
{
  "dry": true,
  "action": "insert",
  "id": "S1NeX6x9xdFj19Tm",
  "rowCount": 1
}
```

**Output:** `{ insertedRows }`; with `--dry`, `{ dry: true, action: "insert", id, rowCount }`.

**Errors:**

| Code                   | When                                       |
| ---------------------- | ------------------------------------------ |
| `ERR_MISSING_DATA`     | Neither `--data` nor `--stdin`             |
| `ERR_FILE_READ`        | `--data @file` and the file cannot be read |
| `ERR_INVALID_JSON`     | The rows are not valid JSON                |
| `ERR_INVALID_DATA`     | The rows are JSON but not an array         |
| `ERR_HTTP_<status>`    | n8n refused the rows                       |
| `ERR_DATATABLE_INSERT` | The request never got an answer            |

```json
{
  "error": "Row data must be a JSON array of objects",
  "code": "ERR_INVALID_DATA"
}
```
