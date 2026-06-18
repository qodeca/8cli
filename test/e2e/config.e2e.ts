// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import { apiEnv, json, run8cli } from './setup/helpers.js';

describe('config show', () => {
  it('reports the resolved url and masks the api key', async () => {
    const r = await run8cli(['config', 'show'], apiEnv());
    expect(r.exitCode).toBe(0);
    const cfg = json<{ url: string; apiKey: string }>(r);
    expect(cfg.url).toBe(apiEnv().N8N_URL);
    expect(cfg.apiKey).toContain('...'); // masked, never the raw key
    expect(cfg.apiKey).not.toBe(apiEnv().N8N_API_KEY);
  });

  it('applies precedence: a --url flag overrides the N8N_URL env var', async () => {
    const r = await run8cli(['--url', 'http://localhost:9999', 'config', 'show'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(json<{ url: string }>(r).url).toBe('http://localhost:9999');
  });
});

describe('global flags', () => {
  it('--verbose logs to stderr while keeping stdout clean JSON', async () => {
    const r = await run8cli(['wf', 'list', '--verbose'], apiEnv());
    expect(r.exitCode).toBe(0);
    expect(Array.isArray(r.json)).toBe(true);
    expect(r.stderr).toContain('[8cli]');
  });

  it('rejects a plaintext-HTTP url without --insecure', async () => {
    const r = await run8cli(['--url', 'http://example.com', 'config', 'show'], {});
    expect(r).toFailWithCode('ERR_CONFIG');
  });

  it('allows a plaintext-HTTP url with --insecure', async () => {
    const r = await run8cli(['--url', 'http://example.com', '--insecure', 'config', 'show'], {});
    expect(r.exitCode).toBe(0);
    expect(json<{ url: string }>(r).url).toBe('http://example.com');
  });
});

describe('missing configuration', () => {
  it('reports ERR_NO_URL when no url is resolvable', async () => {
    const r = await run8cli(['wf', 'get', 'x'], { N8N_URL: '', N8N_API_KEY: 'k' });
    expect(r).toFailWithCode('ERR_NO_URL');
  });
});
