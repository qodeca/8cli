# Using 8cli in CI

8cli runs the same in CI as on your laptop: no prompts, JSON out, exit code 1 on failure. This
guide shows three jobs – a nightly backup, a publish on merge and a weekly audit – with GitHub
Actions. The same commands work in any CI. The workflow files are templates to adapt; the 8cli
commands inside them were run against a local n8n.

## Setup that every job needs

- **Node.js 22.22 or newer.**
- **Two secrets** in your CI's secret store: `N8N_URL` and `N8N_API_KEY`. Pass them as
  environment variables. Do not use the keychain (`auth login`) in CI: it is macOS-only and meant
  for people.
- **HTTPS.** 8cli refuses a plain `http://` URL unless it is `localhost` or `127.0.0.1`, or you
  add `--insecure`.
- **A `8cli.json`** in the repository, so `wf save`, `wf diff` and `wf publish` use the same
  folder (see [the workflow lifecycle guide](workflow-lifecycle.md)):

  ```json
  {
    "workflowDir": "workflows"
  }
  ```

Check the connection as the first step of a job; `auth verify` exits with 1 when the key is
wrong, which fails the job early:

```bash
8cli auth verify
```

## Nightly backup

Saves every workflow and commits the files if anything changed.

```yaml
name: n8n backup
on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  backup:
    runs-on: ubuntu-latest
    env:
      N8N_URL: ${{ secrets.N8N_URL }}
      N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install --global @qodeca/8cli
      - run: 8cli auth verify
      - run: 8cli wf save
      - name: Commit changes
        run: |
          git config user.name "n8n backup"
          git config user.email "n8n-backup@users.noreply.github.com"
          git add workflows
          git diff --cached --quiet || git commit -m "Back up n8n workflows"
          git push
```

Back up to a private repository, and check the files before anything is made public. The backup
job only reads workflows. If your n8n supports API key scopes, give it a key that can only read.

## Publish on merge

Publishes the workflow files when they change on the main branch, and fails the job if any file
was rejected. `wf publish` exits with 0 even when some files fail, so the job checks the
`errors` array itself:

```yaml
name: n8n publish
on:
  push:
    branches: [main]
    paths: ['workflows/**']

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    env:
      N8N_URL: ${{ secrets.N8N_URL }}
      N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install --global @qodeca/8cli
      - run: 8cli auth verify
      - name: Preview
        run: 8cli --dry wf publish
      - name: Publish
        run: |
          8cli wf publish | tee publish.json
          jq -e '.errors | length == 0' publish.json
```

The check on its own, run locally against the rejected file from the
[troubleshooting page](../troubleshooting.md#wf-publish-exits-with-0-but-nothing-changed):

```bash
8cli wf publish --file pe/bad.json > publish.json; jq -e '.errors | length == 0' publish.json; echo "exit $?"
```

```text
false
exit 1
```

Publishing every file on every merge is safe for files that match a workflow in n8n (they are
updated). A file whose `id` does not exist there is **created** each time – keep drafts out of
the `workflows` folder.

## Weekly security audit

Runs n8n's audit and keeps the report as a build artefact.

```yaml
name: n8n audit
on:
  schedule:
    - cron: '0 6 * * 1'

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    env:
      N8N_URL: ${{ secrets.N8N_URL }}
      N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install --global @qodeca/8cli
      - run: 8cli audit run > audit.json
      - run: jq -c '[.[] | {risk, sections: [.sections[].title]}]' audit.json
      - uses: actions/upload-artifact@v4
        with:
          name: n8n-audit
          path: audit.json
```

## Tips

- Pin the 8cli version in CI (`npm install --global @qodeca/8cli@0.2.1`) so an upgrade does not
  change a job's behaviour without you noticing.
- A failing command prints `{ "error", "code" }` to stderr; CI logs show it as it is.
- Use `--verbose` when a job fails and you need to see the requests. It never prints the key.
