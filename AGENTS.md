# Agents

How an AI agent works in this repository. Humans: see `README.md` and `CONTRIBUTING.md`.

## Read these first

| File                           | What it is for                                              |
| ------------------------------ | ----------------------------------------------------------- |
| `CLAUDE.md`                    | the project's own conventions and n8n API gotchas           |
| `SDLC.md`                      | branches, definition of ready, the gate, definition of done |
| `CODE_REVIEW.md`               | the review checklist and the trust boundary                 |
| `BACKWARD_COMPATIBILITY.md`    | the public surfaces that must not break                     |
| `.xezar/docs/leader-guide.md`  | the project leader's standing instructions                  |
| `.xezar/docs/model-routing.md` | which lane runs which kind of task                          |

## The gate

One command: `.xezar/checks/repo-gates.sh`

It runs `npm ci`, the security scan, `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm run check:headers`, `npm test`, `npm run build`, then `.xezar/checks/repository-checks.sh`.

The two end-to-end suites are not in the gate. `npm run test:e2e` needs Docker;
`npm run test:e2e:macos` needs a real macOS keychain. CI runs both as required checks.

## Get the skills

The `xez-*` skills are installed per machine and are **never committed**. In a fresh clone, run:

```
npx -y skills add qodeca/xezar-skills --skill '*' --agent claude-code --agent codex --yes
```

Both `--agent` values matter: together they put real files under `.agents/skills/` with links
under `.claude/skills/`, which is the layout the engine keeps up to date. One value makes copies
that fight the engine on every start.

## Start the leader

```
./scripts/xezar-leader.sh
```

The engine must already be running in its own terminal window: `xezar --single-project --no-open`.
The launcher carries `--dangerously-load-development-channels`, which lets the engine push events
into the session. Read the comment at the top of the script before running it.

## House rules

- Sentence case, not Title Case. En dashes, not em dashes.
- JSON to stdout, structured errors to stderr, no interactive prompts.
- Every new `.ts` file under `bin/` or `src/` starts with the SPDX header.
- Local artifacts go under `.local/xezar/` in a named subfolder. Nothing loose at its top level.
