# Configuration and credentials

8cli resolves configuration in this order: command-line flags, environment variables, `8cli.json`,
keychain, then defaults. Secrets are never written to `8cli.json`.

| Setting               | CLI option        | Environment variable |
| --------------------- | ----------------- | -------------------- |
| n8n URL               | `--url <url>`     | `N8N_URL`            |
| API key               | `--api-key <key>` | `N8N_API_KEY`        |
| Internal API email    | –                 | `N8N_EMAIL`          |
| Internal API password | –                 | `N8N_PASSWORD`       |

The global options are `--url`, `--api-key`, `--config <path>`, `--table`, `--dry`, `--verbose`,
`--insecure`, `--help` and `--version`. `--insecure` permits a plaintext HTTP URL and sends the API
key in clear text; use it only for a trusted local instance.

Run `8cli config show` to inspect resolved settings. API keys are masked. On macOS, `auth login`,
`auth set-api-key` and `auth set-credentials` use keychain service `8cli`; `auth logout` removes
the stored values and `auth list` reports only which credential types exist.
