<!--
SPDX-License-Identifier: GPL-3.0-only
SPDX-FileCopyrightText: 2026 Qodeca
-->

# Security policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

8cli brokers n8n API keys and stores credentials in the operating-system keychain, so we
take security reports seriously and ask that they be disclosed privately.

Report a vulnerability using **GitHub's private vulnerability reporting**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Provide a description, reproduction steps, affected version, and impact.

Alternatively, email **security@qodeca.com** *(confirm/replace with the real reporting
address before publishing)*.

Please include, where possible:

- The 8cli version (`8cli --version`) and Node.js version.
- A description of the issue and its potential impact.
- Steps to reproduce or a proof of concept.

## What to expect

- We aim to acknowledge a report within a few business days.
- We will work with you to understand and validate the issue.
- We will credit reporters in the release notes unless you prefer to remain anonymous.

## Supported versions

This project is at an early stage (0.x). Only the latest released version receives security
fixes.
