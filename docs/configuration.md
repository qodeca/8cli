# Configuration and credentials

8cli needs to know which n8n to talk to and how to prove who you are. This page covers every
place it looks, in the order it looks, and the `8cli.json` file.

## What 8cli needs

| Setting            | Needed by                                                               | Where it can come from                                |
| ------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| n8n URL            | every command except `auth list`                                        | `--url`, `N8N_URL`, `8cli.json`                       |
| API key            | every command except `config`, `folder` and the `auth` storage commands | `--api-key`, `N8N_API_KEY`, macOS keychain            |
| Email and password | only `folder` commands                                                  | `N8N_EMAIL` / `N8N_PASSWORD`, macOS keychain          |
| Workflow directory | `wf save`, `wf publish`, `wf diff`, `folder sync`                       | `8cli.json` (`workflowDir`), default `workflow-files` |

## The order 8cli looks in

For each setting 8cli takes the first value it finds:

1. **Command-line flags** – `--url`, `--api-key`, `--config`.
2. **Environment variables** – `N8N_URL`, `N8N_API_KEY`, `N8N_EMAIL`, `N8N_PASSWORD`.
3. **The config file** – `8cli.json` (only `url` and `workflowDir`).
4. **The macOS keychain** – API key, email and password, stored per URL.
5. **Defaults** – `workflowDir` is `workflow-files`; nothing else has a default.

So `--url` beats `N8N_URL`, which beats `url` in `8cli.json`.

If the URL comes only from a config file, 8cli refuses an API key from `--api-key` or
`N8N_API_KEY`, or login credentials from `N8N_EMAIL` or `N8N_PASSWORD`, with
`ERR_CONFIG_SOURCE_MISMATCH`. Set `--url` or `N8N_URL` alongside those credentials, or use
keychain credentials stored for the file's URL.

## Environment variables

| Variable       | Holds                                                   |
| -------------- | ------------------------------------------------------- |
| `N8N_URL`      | The n8n base URL, for example `https://n8n.example.com` |
| `N8N_API_KEY`  | The n8n API key                                         |
| `N8N_EMAIL`    | Email of an n8n user (folder commands only)             |
| `N8N_PASSWORD` | Password of that user (folder commands only)            |

Environment variables work the same on macOS, Linux and Windows, and they are the recommended
way on Linux, Windows and in CI.

## The config file: `8cli.json`

The config file holds **non-secret settings only**. 8cli never reads an API key or a password
from it.

**Where 8cli looks.** Without `--config`, it checks two places in the current directory, in
this order, and uses the first one it finds:

1. `./8cli.json`
2. `./configs/8cli.json`

With `--config <path>`, it reads only that file.

**Keys.**

| Key           | Type   | Default          | Used for                                                                                                          |
| ------------- | ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `url`         | string | none             | The n8n URL, when neither `--url` nor `N8N_URL` is set                                                            |
| `workflowDir` | string | `workflow-files` | Where `wf save`, `wf publish`, `wf diff` and `folder sync` keep workflow files, relative to the current directory |

Any other key is ignored.

**Example.** A project that keeps its workflows in `./workflows`:

```json
{
  "url": "https://n8n.example.com",
  "workflowDir": "workflows"
}
```

Check what 8cli made of it with [`config show`](reference/config.md). In this example `N8N_URL`
is unset, so the URL comes from the file; the API key comes from the keychain account for
that URL:

```bash
8cli config show
```

```json
{
  "url": "https://n8n.example.com",
  "apiKey": "n8n_...7890",
  "email": "owner@example.com",
  "password": "****",
  "workflowDir": "workflows",
  "table": false,
  "dry": false,
  "verbose": false
}
```

> **Watch out:** a `8cli.json` that is not valid JSON is skipped without a warning, and 8cli
> falls back to the defaults. If `workflowDir` seems ignored, run `8cli config show`.

**Why `workflowDir` matters.** `wf save` and `wf diff` accept `--dir`, but `wf publish` does not:
it always reads from `workflowDir`. If you back up with `wf save --dir workflows` and publish
with `wf publish`, publish looks in `workflow-files` and finds nothing (`ERR_NO_FILES`). Set
`workflowDir` once in `8cli.json` and leave out `--dir`, and every command uses the same folder.
See [back up, diff and publish workflows](guides/workflow-lifecycle.md).

## The macOS keychain

On macOS, 8cli can keep your API key, email and password in the system keychain, so you do not
have to export them in every shell.

- **Service:** `8cli`
- **Accounts:** `<url>/api-key`, `<url>/email`, `<url>/password` – one set per n8n URL.

Store and remove them with the [`auth`](reference/auth.md) commands:

```bash
printf '%s' "$MY_KEY" | 8cli --url https://n8n.example.com auth set-api-key --value -
8cli --url https://n8n.example.com auth list
8cli --url https://n8n.example.com auth logout
```

After that, `--url https://n8n.example.com` (or `N8N_URL`) is all a command needs: 8cli looks
up the key stored for that exact URL. A trailing `/` is ignored, but `http://` and `https://`,
or a different port, count as different URLs.

> **Linux and Windows:** keychain storage is not implemented yet. `auth login`, `auth logout`,
> `auth list`, `auth set-api-key` and `auth set-credentials` fail there with an `ERR_AUTH_*`
> error whose message says: _"Secret storage via the keychain is not yet implemented on Linux.
> Set the N8N_API_KEY (and N8N_EMAIL / N8N_PASSWORD) environment variables instead."_ (on
> Windows it names Windows). Other commands skip the keychain silently. Use the environment
> variables.

## Several n8n instances

Keep one URL per instance and switch with `--url`:

```bash
8cli --url https://staging.n8n.example.com wf list
8cli --url https://n8n.example.com wf list
```

(Illustration only: these two commands need two real instances and were not run for these docs.)
With the keychain, store a key for each URL once. With environment variables, set `N8N_URL`
and `N8N_API_KEY` together for each project using a small wrapper or `direnv`.

## Plain HTTP URLs

8cli refuses a plain `http://` URL, because the API key would travel unencrypted. Two
exceptions:

- **Local addresses are allowed:** `http://localhost` and `http://127.0.0.1`, on any port,
  work without any flag. The IPv6 form `http://[::1]` is refused in 8cli 0.1.2 – use
  `http://127.0.0.1` or add `--insecure`.
- **`--insecure`** allows any `http://` URL. Use it only on a network you trust.

See [security notes](security.md#plain-http-urls).

## Related pages

- [Global options](global-options.md) – all flags that work with every command.
- [`config show`](reference/config.md) – see what 8cli resolved.
- [Security notes](security.md).
