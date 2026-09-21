<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Agents

How an agent works in this repository. `CLAUDE.md` holds what the project _is_; this file holds
how work runs through it.

## The one gate

```bash
.xezar/checks/repo-gates.sh
```

It runs, in order: `npm ci`, the security scan, `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test`, `npm run build`, `npm run check:headers`, then the kit's
repository checks. Exit 0 only when every gate ran and passed. A gate that could not run is a
failure, never a pass.

`npm run test:e2e` needs Docker and is not in the gate; CI runs it as the `e2e` job. Run it before
touching `src/client/` or the command surface.

## Where things live

| What                | Where                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Entry point         | `bin/8cli.ts`                                                                            |
| Source              | `src/`                                                                                   |
| Tests               | `test/` (`test/e2e/` needs Docker, `test/e2e-macos/` does not)                           |
| Committed documents | `docs/` — designs, architecture, spikes, runbooks, deprecations, performance, migrations |
| Pipeline config     | `.xezar/pipeline/config.json`                                                            |
| Routing table       | `.xezar/docs/model-routing.md`                                                           |
| Leader guide        | `.xezar/docs/leader-guide.md`                                                            |
| Local working state | `.local/xezar/` — gitignored, never committed                                            |

## Branches and releases

Work lands on **`develop`**. `main` is the release branch. Feature branches are
`feature/<name>`; commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

CI requires `check`, `e2e` and `e2e-macos` on every pull request.

## The rules that matter most here

1. **JSON on stdout, structured errors on stderr, never a prompt.** This is the product, not a
   preference.
2. **Secrets never reach a file in this repository.** They live in the OS keychain. Never print a
   keychain value, not even while debugging.
3. **Every file under `bin/` and `src/` carries the SPDX header.** `npm run check:headers` enforces
   it.
4. **Read `SDLC.md` before opening a pull request** and `CODE_REVIEW.md` before reviewing one.
5. **`BACKWARD_COMPATIBILITY.md` lists what may not break.** A flag rename is a breaking change.

## Get the skills

The `xez-*` skill collection is installed **per machine** and is never committed. Install it in a
fresh checkout with:

```bash
DISABLE_TELEMETRY=1 npx -y skills add qodeca/xezar-skills --skill '*' --agent claude-code --agent codex --yes
```

Both `--agent` values matter: together they put real files under `.agents/skills/` with links under
`.claude/skills/`, which is the layout the engine keeps up to date. One value alone makes copies.

## Start the leader

```bash
./scripts/xezar-leader.sh
```

Keep the engine window open. Every other Claude Code session in this checkout is an ordinary
session and does not lead the project.
