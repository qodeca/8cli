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

<!-- "UI in scope" here means the CLI surface: command names, flags, help text, the shape of the
     JSON printed, exit codes - or anything under docs/designs/. SDLC.md § The design gate. -->

- [ ] Not UI in scope
- [ ] UI in scope – `needs-design` applied (outside contributors: a maintainer applies it). Design: `docs/designs/<feature>/` or "fix-sized"
- [ ] `skip-design`, because: <command surface unchanged – say why>

Design review evidence: <link to the "## Design review" comment or the design README section>

## Risk

<!-- SDLC.md defines one risk flag, `risk-high`: the change touches src/keychain/, src/client/,
     .github/workflows/, .xezar/config.json, .xezar/pipeline/config.json, the SessionStart hook or
     its loader, a contract in BACKWARD_COMPATIBILITY.md, or edits broadly across the tree. Say
     which, or "ordinary". A maintainer applies the label. -->

- [ ] This change is `risk-high`
