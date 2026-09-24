// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { InternalApiClient } from '../src/client/internal-api.js';

// The internal `PATCH /rest/workflows/{id}` is n8n's own request schema, and on
// 2.40.5 it types `parentFolderId` as a string (`baseWorkflowShape` in
// `@n8n/api-types`): `null` is rejected with "Expected string, received null",
// and an omitted field leaves the workflow in its current folder. The root is
// the sentinel `PROJECT_ROOT = "0"` from `n8n-workflow`, so that is what a root
// move must put on the wire (#53).

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InternalApiClient.moveWorkflow parent folder', () => {
  it('sends n8n root sentinel "0" for the root, not null', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: 'wf1' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new InternalApiClient('https://n8n.example.com');
    await client.moveWorkflow('wf1', null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://n8n.example.com/rest/workflows/wf1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ parentFolderId: '0' });
  });

  it('sends a named folder id unchanged', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: 'wf1' }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new InternalApiClient('https://n8n.example.com');
    await client.moveWorkflow('wf1', 'folder-123');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ parentFolderId: 'folder-123' });
  });
});
