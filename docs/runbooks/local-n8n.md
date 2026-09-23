# Local n8n 2.40.5

A long-running n8n on your machine for checking 8cli by hand or by an agent. It is the free
Community edition with no license, so the license-gated groups (variable, project, folder,
source control) answer with the gated error, not as working features.

- Image: `n8nio/n8n:2.40.5`, pinned by digest in `scripts/local-n8n/compose.yaml` (the same pin
  as the e2e suite in `test/e2e/setup/global.ts`).
- URL: `http://localhost:5678`, bound to loopback only. Set `N8N_LOCAL_PORT` to use another port.
- Needs: Docker with Compose, Node.js 22+, `npm install` done.

## Start

```bash
npm run n8n:local -- start
```

Starts the container, waits until n8n is ready and seeds it when it is fresh. Safe to run again:
on an instance that is already seeded it only checks that the stored credentials still work. The
container restarts with Docker, so it stays up until you stop it.

## Seed

```bash
npm run n8n:local -- seed
```

Creates the owner user (`owner@example.com`, random password) and a full-scope API key, then
stores them where 8cli reads them. `start` and `reset` run this for you. No secret is printed.

| Store              | Where                                                                                       | How 8cli picks it up                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `keychain` (macOS) | macOS keychain, service `8cli`, via `8cli auth set-api-key` and `8cli auth set-credentials` | `npx tsx bin/8cli.ts --url http://localhost:5678 wf list`                 |
| `env` (elsewhere)  | `.local/xezar/n8n/credentials.env`, mode 600, gitignored                                    | `set -a; . .local/xezar/n8n/credentials.env; set +a`, then `8cli wf list` |

The keychain is the default on macOS and the env file everywhere else. Pick one with
`--store keychain` or `--store env` on any command. Seeding an instance that already has an
owner, when the chosen store has no working key for it, fails with `ERR_ALREADY_OWNED` – run
`reset`.

## Reset

```bash
npm run n8n:local -- reset
```

Deletes the container and its data volume, starts a fresh n8n and seeds it. Every workflow,
credential and execution in the local instance is lost; the stored key and password are
replaced with new ones.

## Stop

```bash
npm run n8n:local -- stop
```

Stops the container and keeps the data. `start` brings it back.

## Output

Each command prints one JSON object to stdout, for example
`{"command":"start","url":"http://localhost:5678","version":"2.40.5","seeded":"created",...}`.
Progress and Docker output go to stderr. Errors go to stderr as `{ "error", "code" }` with exit
code 1.
