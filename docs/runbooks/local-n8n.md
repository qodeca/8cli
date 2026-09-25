# Local n8n 2.40.5

A long-running n8n on your machine for checking 8cli by hand or by an agent. It is the free
Community edition with no license, so the license-gated groups (variable, project, folder,
source control) answer with the gated error, not as working features.

- Image: `n8nio/n8n:2.40.5`, pinned by digest in `scripts/local-n8n/compose.yaml` (the same pin
  as the e2e suite in `test/e2e/setup/global.ts`).
- URL: `http://localhost:5678`, bound to loopback only. Set `N8N_LOCAL_PORT` to use another port.
- Needs: Docker with Compose, Node.js 22.22+, `npm install` done.

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

The credentials go to `8cli/local-n8n/credentials.env` inside the repository's git common
directory, on every platform. The local n8n container is shared by every git worktree of the
repository, so the credentials are shared too: the main checkout and every worktree resolve the
same file with `git rev-parse --git-common-dir`, and none keeps its own copy. Git never tracks a
file inside its own directory. The file is mode 600 in a mode 700 directory; it is replaced in one
step, never rewritten in place, and a symlink at that path is refused (`ERR_ENV_FILE_SYMLINK`).
Every command reports the absolute path as `credentials.envFile`. Load it before running 8cli:

```bash
set -a; . "$(git rev-parse --path-format=absolute --git-common-dir)/8cli/local-n8n/credentials.env"; set +a
npx tsx bin/8cli.ts wf list
```

`--store env` is accepted and is the default. `--store keychain` is refused with
`ERR_STORE_DISABLED` and the message "The keychain store is disabled until the keychain backend
keeps secrets out of process arguments; use the env file store (--store env, the default)". The
helper supports environment-file storage only.

### Moving from a per-checkout file

Before the shared file, each checkout kept its own `.local/xezar/n8n/credentials.env`. When n8n
already has an owner and the shared file is absent, `start` and `seed` check the old file of the
checkout they run in, then the one in the main checkout. The first one that `8cli auth verify`
accepts is copied into the shared file (mode 600, in one step) and reported as
`"seeded":"adopted"` with `credentials.adoptedFrom`, its path; no value is printed. A symlink or
anything that is not a regular file at an old location is refused (`ERR_ENV_FILE_SYMLINK`,
`ERR_ENV_FILE_TYPE`), and a file that is incomplete or fails `auth verify` is not adopted.

When nothing works, the command fails with `ERR_ALREADY_OWNED`, naming the shared path and the old
locations it checked. If another worktree seeded the instance, copy its file by hand, then run
`start` again:

```bash
shared="$(git rev-parse --path-format=absolute --git-common-dir)/8cli/local-n8n"
mkdir -p "$shared" && chmod 700 "$shared"
cp /path/to/that/worktree/.local/xezar/n8n/credentials.env "$shared/credentials.env"
chmod 600 "$shared/credentials.env"
```

Run `reset` only when no working copy exists: it deletes the local n8n data.

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
