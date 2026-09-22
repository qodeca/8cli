<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# AGENTS.md – 8cli

8cli is an AI-first n8n remote management CLI in TypeScript (Node.js 22+). `CLAUDE.md` holds
the architecture, the command pattern and the n8n API rules; read it first.

## Before you hand work off

- Work on a branch from `develop`, never on `develop` or `main` directly.
- Run the gate: `.xezar/checks/repo-gates.sh`. It runs `npm ci`, the security scan,
  `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`,
  `npm run check:headers` and the repository checks, in that order.
- CI also runs `reuse lint`, `npm audit --audit-level=high`, `npm run test:e2e` (Docker) and
  `npm run test:e2e:macos`. The required checks are `check`, `e2e` and `e2e-macos`.
- Follow `SDLC.md` for the stages and `CODE_REVIEW.md` for what a review checks.

## Zero config

8cli must work with only `--url` and the keychain, or only the `N8N_URL` and `N8N_API_KEY`
environment variables. A change that requires a config file, a new environment variable or a
setup step breaks this and needs the owner's decision. This project keeps no `.env.example`;
the environment contract is the table in `CLAUDE.md` ("Config resolution priority").

## Changing a mechanism that already works

Name what the old mechanism was load-bearing **for**, not what it was for, and grep for
everything that reaches a terminal state _because_ of it. A replacement that ships off is not a
replacement – diff the **default path**, not the feature. Enumerate the transitions out of every
state you add or keep; "who fires this?" finds the missing ones in one pass. The failure this
describes is the one nobody catches: the new mechanism is correct, the tests are green, the spec
is thorough, and the default path quietly lost a guarantee nobody had written down.

## Get the skills

The xezar skills are installed per machine and never committed. Install them with:

```bash
DISABLE_TELEMETRY=1 npx -y skills add qodeca/xezar-skills --skill '*' --agent claude-code --agent codex --yes
```

Both `--agent` values matter: together they put the files in `.agents/skills/` with links in
`.claude/skills/`, which is the layout the engine keeps up to date.

## The leader

Start the project leader with `./scripts/xezar-leader.sh`, with the engine running in its own
terminal (`xezar --single-project --no-open`). Its guide is `.xezar/docs/leader-guide.md`.
