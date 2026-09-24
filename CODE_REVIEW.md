# Code review

The checklist every review of an 8cli pull request applies, on top of the reviewer's built-in
one. `.xezar/pipeline/config.json` points `reviewChecklist` here.

## What to check

- **The AI-first contract** (`CLAUDE.md` § AI-first design principles): JSON to stdout by
  default, structured errors `{ "error", "code" }` to stderr with exit code 1, no interactive
  prompt, list commands output arrays, get commands output objects, `--dry` previews write
  commands.
- **Secrets**: no secret written to a config file, printed, logged or placed in an error message.
  Keychain access goes through `src/keychain/`.
- **The n8n API gotchas** in `CLAUDE.md`: the PUT payload keeps only its allowed fields.
- **Tests**: a behaviour change comes with a test that was watched failing (`SDLC.md` § Review
  loop).
- **Headers**: every new `.ts` file under `bin/` and `src/` carries the SPDX header.
- **Compatibility**: nothing in `BACKWARD_COMPATIBILITY.md` breaks without a recorded decision.

## Severity guidance

| Severity | Meaning                                                               | Blocks merge                           |
| -------- | --------------------------------------------------------------------- | -------------------------------------- |
| blocker  | wrong output, data loss, a leaked secret, a broken public surface     | yes                                    |
| major    | a real defect with a workaround, a missing test for changed behaviour | yes                                    |
| minor    | a clarity or maintainability issue                                    | no – fix now or defer to a named issue |
| nit      | style the linters do not catch                                        | no                                     |

## Security

A security finding is always at least major. These paths are **trust boundaries**, and a diff
touching any of them sets `reviewerRequired` by machine and is routed to the security-review row
by `.xezar/routing.json`:

- `.xezar/pipeline/config.json` and `.xezar/config.json` – a change to `deploy.*` or to the base
  branch lives here;
- `.github/workflows/` and `.xezar/workflows/`;
- `.xezar/checks/` (with `documented-output.allowlist.json`), `.xezar/docs/`, `.xezar/skills/`;
- `.xezar/routing.json`, `.xezar/routing.schema.json`, `.xezar/loops.json`;
- `.claude/settings.json`, `.claude/settings.local.json`, `.codex/`, `.env.example`.

**The `SessionStart` hook in `.claude/settings.json` and its loader
`.xezar/checks/leader-context.sh` are a trust boundary.** The hook runs the loader at every start,
resume, clear and compaction of a leader session, and whatever the loader prints becomes the
leader's standing instructions. A change to either is reviewed as a change to the leader itself.
The risk is not removed; it is made visible and routed.
