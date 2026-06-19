// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

/** Minimal shape of the vitest global-setup context we rely on. */
interface GlobalSetupContext {
  provide: (key: string, value: unknown) => void;
}

/**
 * E2E global setup: boot a real n8n in Docker, provision an owner + public API
 * key, and `provide()` the connection details to every spec. Teardown stops the
 * container (with a try/catch so a failed bootstrap never leaks it).
 *
 * The bootstrap sequence was verified empirically against n8n 2.25.7:
 *   1. POST /rest/owner/setup (plaintext password)  -> session cookie
 *   2. GET  /rest/api-keys/scopes                    -> valid scope list
 *   3. POST /rest/api-keys {label,expiresAt:null,scopes} -> rawApiKey
 *   4. smoke GET /api/v1/workflows?limit=1 with the key
 *
 * Pinned by tag + digest (reproducible AND Renovate-trackable); the digest is
 * authoritative. `/healthz/readiness` (not `/healthz`) gates the DB-migrated
 * state, and the first bootstrap call is retried to absorb any post-ready race.
 */

// Tag keeps update tooling able to propose bumps; the digest pins the bytes.
const N8N_IMAGE =
  'n8nio/n8n:2.25.7@sha256:761374d4eb841b0a22771d6bd68f0e8d827b4979ae4e490045517b13fc1259dd';

const OWNER = {
  email: 'e2e@example.com',
  firstName: 'E2E',
  lastName: 'Tester',
  password: 'InsecureE2eOnly1', // test-only; valid n8n password policy
} as const;

interface Json {
  [k: string]: unknown;
}

async function postJson(
  url: string,
  body: unknown,
  cookie?: string,
): Promise<{ status: number; json: Json; setCookie: string[] }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  let json: Json = {};
  try {
    json = (await res.json()) as Json;
  } catch {
    /* empty / non-JSON body */
  }
  return { status: res.status, json, setCookie };
}

function cookieHeader(setCookie: string[]): string {
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

/** Retry a bootstrap step a few times with linear backoff (absorbs post-ready races). */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts`, { cause: lastErr });
}

async function bootstrap(baseUrl: string): Promise<{ apiKey: string }> {
  // 1. Claim the instance (fresh container) -> owner session cookie.
  const setup = await withRetry('owner-setup', async () => {
    const res = await postJson(`${baseUrl}/rest/owner/setup`, OWNER);
    if (res.status >= 500 || res.status === 0) throw new Error(`owner-setup status ${res.status}`);
    return res;
  });
  let cookie = cookieHeader(setup.setCookie);
  if (setup.status !== 200 || !cookie) {
    // Already set up (shouldn't happen on a fresh container) -> log in instead.
    const login = await postJson(`${baseUrl}/rest/login`, {
      emailOrLdapLoginId: OWNER.email,
      password: OWNER.password,
    });
    cookie = cookieHeader(login.setCookie);
    if (login.status !== 200 || !cookie) {
      throw new Error(`n8n owner bootstrap failed (setup=${setup.status}, login=${login.status})`);
    }
  }

  // 2. Ask n8n which scopes a public-API key may hold (version-resilient).
  const scopesRes = await fetch(`${baseUrl}/rest/api-keys/scopes`, { headers: { cookie } });
  const scopesJson = (await scopesRes.json()) as { data?: string[] };
  const scopes = scopesJson.data ?? [];
  if (scopes.length === 0) {
    throw new Error('n8n returned no API-key scopes');
  }

  // 3. Mint a full-scope public API key.
  const keyRes = await postJson(
    `${baseUrl}/rest/api-keys`,
    { label: 'e2e', expiresAt: null, scopes },
    cookie,
  );
  const apiKey = (keyRes.json.data as Json | undefined)?.rawApiKey as string | undefined;
  if (!apiKey) {
    throw new Error(`n8n API-key creation failed (status=${keyRes.status})`);
  }

  // 4. Smoke-check the key against the public API before any spec runs.
  const smoke = await fetch(`${baseUrl}/api/v1/workflows?limit=1`, {
    headers: { 'X-N8N-API-KEY': apiKey },
  });
  if (!smoke.ok) {
    throw new Error(`n8n API-key smoke check failed (status=${smoke.status})`);
  }

  return { apiKey };
}

export default async function setup({ provide }: GlobalSetupContext): Promise<() => Promise<void>> {
  // The suite spawns the built binary; fail fast if it hasn't been built.
  const binPath = resolve(import.meta.dirname, '../../../dist/bin/8cli.js');
  if (!existsSync(binPath)) {
    throw new Error(`Built CLI not found at ${binPath}. Run \`npm run build\` first.`);
  }

  let container: StartedTestContainer;
  try {
    container = await new GenericContainer(N8N_IMAGE)
      .withExposedPorts(5678)
      .withEnvironment({
        N8N_ENCRYPTION_KEY: 'e2e-fixed-encryption-key-0123456789',
        N8N_DIAGNOSTICS_ENABLED: 'false',
        N8N_PUBLIC_API_DISABLED: 'false',
        N8N_USER_MANAGEMENT_DISABLED: 'false',
        DB_TYPE: 'sqlite',
      })
      .withWaitStrategy(Wait.forHttp('/healthz/readiness', 5678).forStatusCode(200))
      .withStartupTimeout(120_000)
      .start();
  } catch (err) {
    throw new Error(`Failed to start n8n container: ${err instanceof Error ? err.message : err}`, {
      cause: err,
    });
  }

  try {
    const baseUrl = `http://${container.getHost()}:${container.getMappedPort(5678)}`;
    const { apiKey } = await bootstrap(baseUrl);

    provide('n8nUrl', baseUrl);
    provide('n8nApiKey', apiKey);
    provide('n8nEmail', OWNER.email);
    provide('n8nPassword', OWNER.password);
  } catch (err) {
    // Never leak the container if bootstrap throws after a successful start.
    await container.stop().catch(() => undefined);
    throw err;
  }

  return async () => {
    await container.stop().catch((err) => {
      console.warn(
        `[e2e teardown] container.stop failed: ${err instanceof Error ? err.message : err}`,
      );
    });
  };
}
