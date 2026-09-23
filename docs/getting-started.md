# Getting started

Install the package globally, or use it without installation:

```bash
npm install --global @qodeca/8cli
npx @qodeca/8cli --help
```

Connect with `--url` and an API key stored in your OS keychain. Put global options before the
command group. Use `-` to read a secret from standard input rather than placing it in shell
history or process arguments.

```bash
printf '%s' "$N8N_API_KEY" | 8cli --url https://n8n.example.test --api-key - auth login
8cli --url https://n8n.example.test auth verify
8cli --url https://n8n.example.test wf list
```

`auth verify` returns an object with `url` and `authenticated`. List commands return arrays;
use `--table` only when a human-readable table is wanted. See [configuration](configuration.md).

Against the local n8n 2.40.5 fixture, the verification command returned:

```json
{
  "url": "http://localhost:5678",
  "authenticated": true
}
```

The first workflow in the same fixture was:

```json
{
  "id": "Jr53yjULv3JYJRgF",
  "name": "Daily sales report",
  "active": false,
  "updatedAt": "2026-09-23T21:41:31.336Z"
}
```
