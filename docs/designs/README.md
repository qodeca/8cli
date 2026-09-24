# Designs

One folder per designed feature, `docs/designs/<feature>/README.md`. For 8cli a design covers the
command surface: command and flag names, help text, JSON output shape, errors and exit codes.
Every feature README uses the headings below, in this order.

## Purpose

What the user is trying to do, and why this command or flag is the way to do it.

## Screens

For a CLI: each invocation, its `--help` text, and its output – JSON by default, and the
`--table` form where one exists.

## States

Success, empty result, `--dry` preview, each error with its `ERR_*` code, and missing
configuration.

## Open decisions

What is not settled yet, and who settles it.

## Developer handoff

The flags, output fields and error codes to implement, and the tests that prove them.

## Design review

The review verdict, linked to its pull request comment.

## Index

No feature has been designed yet. The `design-system` workflow maintains this list.
