## What changed

<!-- One or two sentences. -->

## Why

<!-- The problem this solves. Link the issue: "Closes #123". -->

## How it was verified

<!-- The commands you ran and what they showed, e.g. `npm run typecheck` and `npm test`.
     For a change to a command, say what you ran against the built CLI and what it printed. -->

## Design

<!-- UI in scope = a change that adds or reshapes what a user sees in the terminal: command names, flags, --help text, --table layouts, the shape of JSON output or errors, or anything under designs/. SDLC.md § The design gate. -->

- [ ] Not UI in scope
- [ ] UI in scope – `needs-design` applied (outside contributors: a maintainer applies it). Design: `designs/<feature>/` or "fix-sized"
- [ ] `skip-design`, because: <rendered output unchanged – say why>

Design review evidence: <link to the "## Design review" comment or the design README section>

## Risk

<!-- SDLC.md defines one risk flag, `risk-high`: the change touches config resolution, the keychain code,
     the API clients, a contract in BACKWARD_COMPATIBILITY.md, or edits broadly across the tree. Say which, or "ordinary". A maintainer applies the label. -->

- [ ] This change is `risk-high`
