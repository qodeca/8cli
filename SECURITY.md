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

- 8cli acts with the n8n API key (and, for folder commands, the email and password) that you
  give it. Anything that key can do on your n8n instance is your own access, not a flaw in 8cli.
- `--insecure` allows plain-HTTP URLs. It is off by default and works only when you pass it.
- Plain HTTP to a loopback address (`localhost` or `127.0.0.1`) is allowed without
  `--insecure`, because that traffic never leaves your machine.

## If nobody answers

If a private report gets no answer within a week, contact the repository owner, Qodeca
(<https://github.com/qodeca>). This is a last resort, not a second way to report: please still
file the report through the Security tab above.

## What 8cli promises

- Input from outside reaches 8cli through command-line arguments, environment variables, the
  `8cli.json` config file, and responses from the n8n server.
- Secrets are never written to config files. They live only in the operating-system keychain.
- Plain-HTTP URLs are refused unless `--insecure` is passed. The one exception is a loopback
  address (`localhost` or `127.0.0.1`), which never leaves your machine.
- Changes to `.xezar/config.json`, `.xezar/pipeline/config.json` and `.github/workflows/`
  always get a security review.
