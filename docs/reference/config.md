# `config` – resolved configuration

Shows the configuration 8cli ended up with after reading flags, environment variables, the
config file and the keychain. Use it to answer "which n8n am I talking to, and with which key?"

| Subcommand                    | What it does                     |
| ----------------------------- | -------------------------------- |
| [`config show`](#config-show) | Print the resolved configuration |

For where each value comes from and the `8cli.json` format, see
[configuration and credentials](../configuration.md).

## config show

```text
8cli config show
```

No options. It does not contact n8n.

```bash
8cli --api-key n8n_api_demo1234567890 config show
```

```json
{
  "url": "http://localhost:5678",
  "apiKey": "n8n_...7890",
  "email": "owner@example.com",
  "password": "****",
  "workflowDir": "workflow-files",
  "table": false,
  "dry": false,
  "verbose": false
}
```

With nothing configured:

```json
{
  "url": "(not set)",
  "apiKey": "(not set)",
  "email": "(not set)",
  "password": "(not set)",
  "workflowDir": "workflow-files",
  "table": false,
  "dry": false,
  "verbose": false
}
```

**Output:**

| Field         | Value                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `url`         | The resolved URL, without a trailing `/`, or `(not set)`                                                |
| `apiKey`      | Masked: first four and last four characters (`****` for a key of 8 characters or fewer), or `(not set)` |
| `email`       | The folder-command email **in full**, or `(not set)`                                                    |
| `password`    | `****` when a password is set, or `(not set)`                                                           |
| `workflowDir` | The workflow directory, `workflow-files` unless `8cli.json` sets it                                     |
| `table`       | `true` when `--table` was given                                                                         |
| `dry`         | `true` when `--dry` was given                                                                           |
| `verbose`     | `true` when `--verbose` was given                                                                       |

`--insecure` is not shown.

**Errors:** `ERR_CONFIG` – for example when the URL is plain `http://` and not local:

```json
{
  "error": "Refusing to use an insecure (http://) URL \"http://n8n.example.test:5678\" – the API key would be sent in plaintext. Use an https:// URL, or pass --insecure to override (not recommended).",
  "code": "ERR_CONFIG"
}
```
