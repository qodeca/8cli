// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, it, expect } from 'vitest';
import { assertSecureUrl, maskApiKey } from '../src/config.js';

describe('assertSecureUrl', () => {
  it('accepts https URLs', () => {
    expect(() => assertSecureUrl('https://n8n.example.com')).not.toThrow();
  });

  it('accepts http on loopback hosts', () => {
    expect(() => assertSecureUrl('http://localhost:5678')).not.toThrow();
    expect(() => assertSecureUrl('http://127.0.0.1:5678')).not.toThrow();
  });

  it('accepts http on the IPv6 loopback address', () => {
    // The WHATWG URL parser returns IPv6 hosts in bracketed form (`[::1]`), and
    // normalises every spelling of the address to that same form.
    expect(() => assertSecureUrl('http://[::1]:5678')).not.toThrow();
    expect(() => assertSecureUrl('http://[0:0:0:0:0:0:0:1]:5678')).not.toThrow();
  });

  it('rejects http on remote hosts', () => {
    expect(() => assertSecureUrl('http://n8n.example.com')).toThrow(/insecure/i);
  });

  it('rejects http on non-loopback IPv6 hosts', () => {
    expect(() => assertSecureUrl('http://[::2]:5678')).toThrow(/insecure/i);
    // The loopback exemption stays narrow: IPv4-mapped forms are not accepted.
    expect(() => assertSecureUrl('http://[::ffff:127.0.0.1]:5678')).toThrow(/insecure/i);
  });

  it('accepts https regardless of the host family', () => {
    expect(() => assertSecureUrl('https://n8n.example.com')).not.toThrow();
    expect(() => assertSecureUrl('https://[::2]:5678')).not.toThrow();
    expect(() => assertSecureUrl('https://[::1]:5678')).not.toThrow();
  });

  it('allows http on remote hosts when insecure override is set', () => {
    expect(() => assertSecureUrl('http://n8n.example.com', true)).not.toThrow();
  });

  it('ignores an empty URL', () => {
    expect(() => assertSecureUrl('')).not.toThrow();
  });
});

describe('maskApiKey', () => {
  it('reports a placeholder when no key is set', () => {
    expect(maskApiKey('')).toBe('(not set)');
  });

  it('fully masks short keys', () => {
    expect(maskApiKey('abc123')).toBe('****');
  });

  it('shows first and last four characters of long keys', () => {
    expect(maskApiKey('abcdefghijklmnop')).toBe('abcd...mnop');
  });
});
