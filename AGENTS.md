# Agent guide

Instructions for any coding agent working in 8cli. Project facts – architecture, commands,
config resolution, the n8n API gotchas – are in `CLAUDE.md`; process is in `SDLC.md`; review is
in `CODE_REVIEW.md`. Read all three before you work.

## Working rules

- Work on a branch and open a pull request against `develop`. Never push to `develop` or `main`.
- Run `.xezar/checks/repo-gates.sh` before you hand work off. The six gate commands are listed in
  `SDLC.md` § The gate.
- Every new `.ts` file under `bin/` and `src/` starts with the SPDX header from `CLAUDE.md`.
- Output stays AI-first: JSON to stdout, structured errors to stderr, no prompts.
- Pull request titles follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`): the
  pipeline squash-merges, so the title becomes the commit on `develop`.
- Local scratch, runtime state and QA artifacts go under `.local/xezar/` in its named subfolders,
  never at the repository root.

## Zero config

8cli works with only `--url` and the keychain, or `N8N_URL` and `N8N_API_KEY`. A change must keep
that true. If a change needs a new environment variable, document it in `README.md` and in
`CLAUDE.md` § Config resolution priority in the same pull request; if the project ever gains an
`.env.example`, it is the environment contract and is changed with the variable.

## Changing a mechanism that already works

Name what the old mechanism was load-bearing **for**, not what it was for, and grep for everything
that reaches a terminal state _because_ of it. A replacement that ships off is not a replacement –
diff the **default path**, not the feature. Enumerate the transitions out of every state you add
or keep; "who fires this?" finds the missing ones in one pass. The failure this describes is the
one nobody catches: the new mechanism is correct, the tests are green, the spec is thorough, and
the default path quietly lost a guarantee nobody had written down.

## Get the skills

The `xez-*` skills are installed per machine and are never committed. Install them in a fresh
clone with:

```bash
DISABLE_TELEMETRY=1 npx -y skills add qodeca/xezar-skills --skill '*' --agent claude-code --agent codex --yes
```

Both `--agent` values matter: together they put the files in `.agents/skills/` with links in
`.claude/skills/`, the layout the engine keeps up to date.

## The leader

Start the engine in its own terminal and leave it open: `xezar --single-project --no-open`. Then
start the leader with `./scripts/xezar-leader.sh`. Only a session started that way (it sets
`XEZAR_LEADER=1`) loads `.xezar/docs/leader-guide.md`; every other session in this checkout is an
ordinary one.
