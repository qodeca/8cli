<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

## Summary

<!-- What does this change do, and why? -->

## Related issue

<!-- e.g. Closes #123 -->

## Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` and `npm run format:check` pass
- [ ] `npm test` passes
- [ ] `npm run check:headers` passes (new files carry the SPDX header)
- [ ] Docs updated (README / CLAUDE.md) if behavior changed
- [ ] CHANGELOG.md updated under "Unreleased" if user-facing

## Design

<!-- UI in scope for 8cli = command and subcommand names, aliases, flags and their meanings,
     help text, the JSON shape on stdout, the error shape on stderr, exit codes. Anything under
     designs/ is also in scope. SDLC.md § The design gate. -->

- [ ] Not UI in scope
- [ ] UI in scope – `needs-design` applied (outside contributors: a maintainer applies it). Design: `designs/<issue>-<name>/` or "fix-sized"
- [ ] `skip-design`, because: <rendered output unchanged – say why>

Design review evidence: <link to the "## Design review" comment or the design README section>

## Risk

<!-- SDLC.md defines one risk flag, `risk-high`: the change touches the keychain and credential
     handling, the two API clients and their auth headers, the config resolution order, or the
     agent trust boundary (.claude/settings.json, .xezar/checks/leader-context.sh,
     scripts/xezar-leader.sh) – or a contract in BACKWARD_COMPATIBILITY.md, or it edits broadly
     across the tree. Say which, or "ordinary". A maintainer applies the label. -->

- [ ] This change is `risk-high`
