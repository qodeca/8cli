# Data tables, audit and source control

`dt list`, `dt get <id>`, and `dt rows <id> [--limit <n>]` return data tables, one data table, and
rows respectively. `dt create --name <name> --columns <json>` returns `id` and `name`; `dt delete
<id>` returns `id` and `deleted`; `dt insert <id> (--data <json>|--stdin)` returns `insertedRows`.
`--data` accepts a JSON array or `@filepath`. With `--dry`, create, delete and insert return `dry` and
their planned action. Errors include `ERR_DATATABLE_LIST`, `ERR_DATATABLE_GET`,
`ERR_DATATABLE_ROWS`, `ERR_DATATABLE_CREATE`, `ERR_DATATABLE_DELETE`, `ERR_DATATABLE_INSERT`,
`ERR_MISSING_DATA`, `ERR_FILE_READ`, `ERR_INVALID_JSON`, and `ERR_INVALID_DATA`.

`audit run` returns n8n's full security audit report; failures use `ERR_AUDIT`.

`sc status` shows source-control status. `sc pull [--force]` requests a pull and `sc push [--force]`
always returns `ERR_NOT_SUPPORTED`, because the n8n public API has no push operation. Source control
is license-gated on Community n8n. Other source-control failures use `ERR_SOURCE_CONTROL`.

The local Community fixture returned the following from `sc status`:

```json
{
  "error": "not found",
  "code": "ERR_SOURCE_CONTROL"
}
```
