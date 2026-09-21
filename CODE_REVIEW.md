# Code review

What a reviewer checks in 8cli, and what must never be waved through.

## Before any verdict

The gate must have run: `.xezar/checks/repo-gates.sh`. A verdict given without the gate is not a
verdict. The security scan resolves before the quality verdict, not after.

## The checklist

**Correctness**

- Does the change do what the issue asked, and nothing else?
- Is there a test that fails without the change?
- Are error paths structured JSON on stderr with a `code`, and exit 1?

**The n8n API contract**

- `PUT /workflows/{id}` gets only `name`, `nodes`, `connections`, `settings`, `staticData`.
- `active` is stripped from every publish payload – it is read-only on PUT.
- `settings` carries `executionOrder` and nothing else.
- Folder work goes through the internal cookie client, never the public one.

**Output shape**

- JSON on stdout by default. Lists are arrays, gets are objects.
- `--table` is opt-in and never changes what the JSON form returns.
- No interactive prompts. Ever. No readline, no inquirer.

**Secrets**

- No secret in a config file, a log line, an error message or a test fixture.
- Keychain account names keep the `{url}/api-key` shape.

**Licence**

- Every new `.ts` file under `bin/` or `src/` carries the SPDX header.

**Style**

- Sentence case, not Title Case. En dashes, not em dashes.
- One file per command group.

## Trust boundary

Three files decide what runs inside an agent session before anyone reads a diff:

- `.claude/settings.json` – the `SessionStart` hook.
- `.xezar/checks/leader-context.sh` – the script that hook runs, which injects the leader guide
  and the campaign record into the session.
- `scripts/xezar-leader.sh` – the launcher, which carries
  `--dangerously-load-development-channels`.

**Any diff touching these three is a security-sensitive review** (row 24 of
`.xezar/docs/model-routing.md`). It goes to the strongest lane, and never to the lane that wrote
it. The risk is not removed by this rule; it is made visible and routed.

## Verdicts

- **Approve** – the checklist passes and the gate is green.
- **Request changes** – name the file, the line and what is wrong. One finding per point.
- Never approve your own work. Never review with the model that authored the change.
