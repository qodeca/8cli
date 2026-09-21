# .xezar — what lives here

This folder is the project's agent pipeline. It is committed, and it is read by every task.

| Path | What it is |
|---|---|
| `workflows/` | one YAML per kind of work; the leader picks one by matching a trigger in `docs/model-routing.md` |
| `checks/` | the gate scripts. `checks/repo-gates.sh` is the one command that decides pass or fail |
| `skills/` | the role skills a workflow step runs under |
| `docs/` | the leader guide, the routing table, and the kit's own reference pages |
| `pipeline/config.json` | base branch, validation commands, CI check names, `paths.*`, and the four wake-up lists |
| `pipeline/labels.json` | the label taxonomy this project enforces |
| `pipeline/trackers/github.md` | the tracker contract: every tracker operation the kit calls |
| `pipeline/toolchains/npm.md` | how this stack builds and tests |
| `pipeline/security/osv-scanner.md` | the security descriptor. `security.provider` is deliberately unset — choosing a scanner is the owner's act |
| `campaigns/` | the campaign record. `future-campaign/` is reserved and is never elected as live |
| `config.json` | the engine's per-project config: base branch and system prompt |
| `loops.json` | the leader's three standing loops, as data |

## Rules for anything in here

- **Never edit a file under `checks/` or `workflows/` to make a gate pass.** A gate that could not
  run is a failure, never a pass. Fix the change, not the check.
- **`config.json`, `pipeline/config.json` and the hook's loader are trust boundaries.** A diff that
  touches them is routed to security review by machine — see `CODE_REVIEW.md`.
- **Nothing here is generated at run time.** Installed files do not update themselves; the drift
  check reports a difference and never repairs it.
- **Local working state never lands here.** It belongs in `.local/xezar/`, which is gitignored.
