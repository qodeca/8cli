<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.
-->

# Security policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

8cli brokers n8n API keys and stores credentials in the operating-system keychain, so we
take security reports seriously and ask that they be disclosed privately.

Report a vulnerability using **GitHub's private vulnerability reporting**:

1. Open the repository's **Security** tab: <https://github.com/qodeca/8cli/security>
2. Click **Report a vulnerability**.
3. Provide a description, reproduction steps, the affected version (`8cli --version`), and
   the impact.

Please include, where possible:

- The 8cli version (`8cli --version`) and your Node.js version.
- A description of the issue and its potential impact.
- Steps to reproduce or a proof of concept.

## What to expect

- We aim to acknowledge a report within a few business days.
- We will work with you to understand and validate the issue.
- We will credit reporters in the release notes unless you prefer to remain anonymous.

## Supported versions

This project is at an early stage (0.x). Only the latest released version receives security
fixes.

## What is not a vulnerability

8cli runs with the caller's own n8n API key. Anything it does, the caller can already do against
the n8n API with that key. `--insecure` is an explicit opt-in to plain HTTP. Traffic sent that
way can be read on the network, by design.

## If nobody answers

If a private report gets no answer within one week, contact the owners of the `qodeca` GitHub
organisation. This is a last resort. It is not a second place to report.

## What this project promises

Secrets are never written to config files. They live only in the OS keychain. The CLI never
prompts, and errors go to stderr as JSON. HTTPS is the default.
