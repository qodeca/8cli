// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { describe, it, expect } from 'vitest';
import {
  apiKeyAccount,
  emailAccount,
  passwordAccount,
  KEYCHAIN_SERVICE,
} from '../src/keychain/index.js';

describe('keychain account helpers', () => {
  it('builds per-instance account names', () => {
    expect(apiKeyAccount('https://n8n.example.com')).toBe('https://n8n.example.com/api-key');
    expect(emailAccount('https://n8n.example.com')).toBe('https://n8n.example.com/email');
    expect(passwordAccount('https://n8n.example.com')).toBe('https://n8n.example.com/password');
  });

  it('strips trailing slashes so accounts are stable', () => {
    expect(apiKeyAccount('https://n8n.example.com/')).toBe('https://n8n.example.com/api-key');
    expect(apiKeyAccount('https://n8n.example.com///')).toBe('https://n8n.example.com/api-key');
  });

  it('uses a fixed keychain service name', () => {
    expect(KEYCHAIN_SERVICE).toBe('8cli');
  });
});
