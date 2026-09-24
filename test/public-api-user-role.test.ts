// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApiClient } from '../src/client/public-api.js';

// n8n returns `role` on GET /api/v1/users and GET /api/v1/users/{id} only when
// the request carries `includeRole=true` (issue #40). Without it the commands
// print users with no role at all. These tests pin the query the two client
// methods build, so a regression that drops `includeRole` fails here rather than
// silently shipping role-less output.
//
// The `urls[0]` assertions are the bug-catchers (red before the fix). The
// `role` assertions are controls: the stubbed fetch returns role regardless of
// the query, so they pass both ways and only prove the response passes through.

function page(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PublicApiClient user role (#40)', () => {
  it('listUsers requests includeRole=true', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(url.toString());
        return page({ data: [{ id: 'u1', email: 'owner@example.com', role: 'global:owner' }] });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const users = await client.listUsers();

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('includeRole=true'); // bug-catcher
    expect(users[0]?.role).toBe('global:owner'); // control
  });

  it('getUser requests includeRole=true', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(url.toString());
        return page({ id: 'u1', email: 'owner@example.com', role: 'global:owner' });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const user = await client.getUser('u1');

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('includeRole=true'); // bug-catcher
    expect(user.role).toBe('global:owner'); // control
  });
});
