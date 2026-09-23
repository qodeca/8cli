# Getting started

This page takes you from nothing to a working `8cli wf list` in about five minutes.

## What you need

- **Node.js 22.22 or newer.** 8cli uses the `fetch` built into Node.js. Check with `node --version`.
- **An n8n instance** you can reach over HTTPS (or over plain HTTP on `localhost`).
- **An n8n API key.** In n8n, open **Settings → n8n API** and create a key. Copy it once; n8n
  does not show it again.
- **Only for folder commands:** the email and password of an n8n user. See
  [folder commands and the internal API](guides/folders.md).

## Install

Install it globally:

```bash
npm install --global @qodeca/8cli
8cli --version
```

```text
0.1.2
```

Or run it without installing:

```bash
npx @qodeca/8cli --help
```

The package is `@qodeca/8cli`; the command it installs is `8cli`.

## Connect to n8n

8cli needs two things: the URL of your n8n and an API key. The simplest way, on every operating
system, is two environment variables:

```bash
export N8N_URL=https://n8n.example.com
export N8N_API_KEY=<your n8n API key>
```

Other ways – command-line flags, a `8cli.json` file, the macOS keychain – are on
[configuration and credentials](configuration.md).

> **macOS only: the keychain.** On macOS you can store the key once in the system keychain
> instead of an environment variable. The keychain is not implemented on Linux or Windows yet;
> there, use the environment variables above.
>
> ```bash
> printf '%s' "$MY_KEY" | 8cli --url https://n8n.example.com auth set-api-key --value -
> ```
>
> The `-` makes 8cli read the key from standard input, so it never appears in your shell
> history. See [`auth`](reference/auth.md).

## Check the connection

```bash
8cli auth verify
```

```json
{
  "url": "http://localhost:5678",
  "authenticated": true
}
```

If the key is wrong, you get `"authenticated": false` and exit code 1:

```json
{
  "url": "http://localhost:5678",
  "authenticated": false,
  "error": "Unauthorized",
  "statusCode": 401
}
```

## Run your first commands

List your workflows:

```bash
8cli wf list
```

```json
[
  {
    "id": "Jr53yjULv3JYJRgF",
    "name": "Daily sales report",
    "active": false,
    "updatedAt": "2026-09-23T21:41:31.336Z"
  },
  {
    "id": "h7WdtiYbnI8jPk1M",
    "name": "Sync CRM contacts",
    "active": false,
    "updatedAt": "2026-09-23T21:41:31.366Z"
  }
]
```

(Trimmed to two of four workflows.) The output is JSON, so you can pipe it into `jq`:

```bash
8cli wf list | jq -r '.[].name'
```

```text
Daily sales report
Sync CRM contacts
Invoice reminder
New lead to Slack
```

Want a table for your own eyes? Add `--table`:

```bash
8cli wf list --table
```

```text
┌──────┬────────────────────────────────────────┬────────┬────────────────────────┐
│ ID   │ Name                                   │ Active │ Updated                │
├──────┼────────────────────────────────────────┼────────┼────────────────────────┤
│ Jr5… │ Daily sales report                     │ false  │ 2026-09-23T21:41:31.3… │
├──────┼────────────────────────────────────────┼────────┼────────────────────────┤
│ h7W… │ Sync CRM contacts                      │ false  │ 2026-09-23T21:41:31.3… │
└──────┴────────────────────────────────────────┴────────┴────────────────────────┘
```

Tables cut long values short, so use the JSON output when you need an ID.

Back up every workflow to local files:

```bash
8cli wf save --dir backup
```

```json
{
  "files": [
    "/work/backup/Jr53yjULv3JYJRgF_Daily sales report.json",
    "/work/backup/h7WdtiYbnI8jPk1M_Sync CRM contacts.json",
    "/work/backup/qGfEkzEK64bJll67_Invoice reminder.json",
    "/work/backup/x7Mn2vO5DDjRZYfD_New lead to Slack.json"
  ]
}
```

## Getting help

Every command has `--help`:

```bash
8cli --help
8cli wf --help
8cli wf save --help
```

## Next steps

- [Command reference](reference/README.md) – everything each command does.
- [Back up, diff and publish workflows](guides/workflow-lifecycle.md) – keep workflows in Git.
- [Using 8cli from AI agents](guides/ai-agents.md).
- [Community and Enterprise n8n](community-vs-enterprise.md) – some commands need a licensed n8n.
