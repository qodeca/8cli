# Designs

The design gate is **on** for this project. A change that alters a user-visible CLI surface – a
command name, a flag, help text, or an output shape – is designed here before it is implemented.

## What goes here

One folder per design, named after the issue: `designs/<issue-number>-<short-name>/`.

Each holds:

- `design.md` – the problem, the proposed surface, and what it replaces.
- The proposed help text and output, verbatim, as it will appear in a terminal.
- Any mockup image the design needs.

## What counts as a user-visible surface

Command and subcommand names, aliases, flags and their meanings, help text, the JSON shape on
stdout, the error shape on stderr, and exit codes. `BACKWARD_COMPATIBILITY.md` lists them.

## The gate

`needs-design` → design reviewed → `design-approved`, and only then implementation.
A change that clearly touches no surface skips it with `skip-design` and a one-line reason.

This project has no design system folder; a design is judged against the surfaces that already
exist.
