<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Designs

One folder per designed feature, named after the feature. Each folder holds a `README.md` with the
headings below, in this order. The design skill takes every feature README's headings from this
file, so this is the list, not an example.

8cli has no screens. Its designed surface is the command line: command names, flags, help text, the
shape of the JSON it prints, and its exit codes. "Screens" below means those surfaces.

## Purpose

What this feature is for, in the user's words, and what it is not for. One paragraph.

## Screens

Each surface the feature adds or changes: the command and its flags, the help text a user sees, and
the exact JSON it prints on success. Show real output, not a description of it.

## States

Every state the surface can be in: empty result, single result, many results, `--table` output,
`--dry` preview, and each error with its `code` and its exit code. A state nobody wrote down is a
state nobody tested.

## Open decisions

What is still undecided, who decides it, and what is blocked until then. An empty list is a real
answer; a missing list is not.

## Developer handoff

What an implementer needs that is not obvious from the screens: which client the command uses
(public API or internal API), which n8n endpoint, what must be stripped from a payload, and which
tests must exist before it is done.

## Design review

The verdict, who gave it, and against what. Note here when a review could not look at a rendered
surface, and why — on a machine with no browser tool, a design review that needs one reports "not
verifiable here" rather than passing.

---

The `design-system` workflow owns this list from here on.
