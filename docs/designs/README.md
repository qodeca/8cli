<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Designs

One folder per designed feature under this directory. For 8cli the designed surface is the
CLI itself: command names, flags, help text, JSON output shapes, error codes and exit codes.
Each feature folder has a `README.md` with these headings:

## Purpose

What the user is trying to do, and why the current surface does not serve it.

## Screens

For a CLI: each command invocation and its exact output, as examples.

## States

Success, empty result, each error with its code and exit status, `--dry`, `--table`.

## Open decisions

What is not settled yet, with the options.

## Developer handoff

What to build, which files own it, and how each state is tested.

## Design review

The review verdict, the reviewer, and the commit it judged.
