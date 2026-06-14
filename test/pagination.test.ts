// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicApiClient } from '../src/client/public-api.js';

// The cursor-following loop in BaseClient.paginateAll backs every `list` command
// but is never exercised e2e (the test container holds <=2 records, so one page).
// This unit test drives a real two-page response so a regression that drops the
// cursor follow (returning only page 1) fails here.

function page(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BaseClient.paginateAll', () => {
  it('follows nextCursor across pages and concatenates the results', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        const href = url.toString();
        urls.push(href);
        return href.includes('cursor=c1')
          ? page({ data: [{ id: '3' }], nextCursor: null })
          : page({ data: [{ id: '1' }, { id: '2' }], nextCursor: 'c1' });
      }),
    );

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const all = await client.paginateAll<{ id: string }>('/api/v1/workflows', { limit: 2 });

    expect(all).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(urls).toHaveLength(2); // two requests: page 1 + cursor-followed page 2
    expect(urls[0]).not.toContain('cursor=');
    expect(urls[1]).toContain('cursor=c1');
    expect(urls[1]).toContain('limit=2'); // base params are preserved across pages
  });

  it('stops after a single page when nextCursor is absent', async () => {
    const fetchMock = vi.fn(async () => page({ data: [{ id: '1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new PublicApiClient('https://n8n.example.com', 'key');
    const all = await client.paginateAll<{ id: string }>('/api/v1/tags');

    expect(all).toEqual([{ id: '1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
