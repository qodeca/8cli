// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

// Bridges the ambient vitest augmentations (ProvidedContext + custom matcher);
// test/ is outside tsconfig's include, so a reference is the way to load them.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./vitest.d.ts" />

import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { execa, type Result } from 'execa';
import { inject, onTestFinished } from 'vitest';

const BIN = resolve(import.meta.dirname, '../../../dist/bin/8cli.js');

// Host env vars the spawned CLI legitimately needs (PATH for `node`, HOME/USER
// for the macOS `security` keychain). Everything else — notably any host
// N8N_* — is excluded so it cannot leak into a black-box run.
const SAFE_HOST_ENV = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'LANG',
  'LC_ALL',
  'SHELL',
  'SystemRoot',
] as const;

function safeHostEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SAFE_HOST_ENV) {
    const value = process.env[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Parsed stdout JSON, or undefined if stdout was not JSON. */
  json: unknown;
}

/**
 * Spawn the built CLI with the given args. Never throws on a non-zero exit
 * (`reject:false`) so error paths are assertable. Colour is disabled for stable
 * output. The child env is built from an allowlist (`extendEnv:false`) so host
 * N8N_* cannot bleed in; the explicit `env` arg is merged last.
 */
export async function run8cli(
  args: string[],
  env: Record<string, string> = {},
  opts: { input?: string } = {},
): Promise<CliResult> {
  const result: Result = await execa('node', [BIN, ...args], {
    reject: false,
    extendEnv: false,
    input: opts.input,
    env: {
      ...safeHostEnv(),
      FORCE_COLOR: '0',
      NO_COLOR: '1',
      ...env,
    },
  });
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    json = undefined;
  }
  return { exitCode: result.exitCode ?? 0, stdout, stderr, json };
}

/** Typed accessor for a CLI result's parsed stdout JSON (centralizes the cast). */
export function json<T>(r: CliResult): T {
  return r.json as T;
}

/** Base env that points the CLI at the test n8n via the public API key. */
export function apiEnv(extra: Record<string, string> = {}): Record<string, string> {
  return { N8N_URL: inject('n8nUrl'), N8N_API_KEY: inject('n8nApiKey'), ...extra };
}

/** Base env that also carries email/password for internal-API (folder) commands. */
export function internalEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    N8N_URL: inject('n8nUrl'),
    N8N_API_KEY: inject('n8nApiKey'),
    N8N_EMAIL: inject('n8nEmail'),
    N8N_PASSWORD: inject('n8nPassword'),
    ...extra,
  };
}

/** Authenticated fetch against the n8n public API (for fixture setup/teardown). */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${inject('n8nUrl')}${path}`, {
    ...init,
    headers: {
      'X-N8N-API-KEY': inject('n8nApiKey'),
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export interface WorkflowFixture {
  id: string;
  name: string;
}

/**
 * Create a workflow directly via the API for use as a test fixture, and
 * register its deletion for cleanup. `withTrigger` adds a schedule trigger so
 * the workflow can be activated.
 */
export async function createWorkflowFixture(
  opts: { name?: string; withTrigger?: boolean } = {},
): Promise<WorkflowFixture> {
  const name = opts.name ?? uniqueName('wf');
  const nodes = opts.withTrigger
    ? [
        {
          id: 'sched1',
          name: 'Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1.2,
          position: [0, 0],
          parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
        },
      ]
    : [];
  const res = await apiFetch('/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify({ name, nodes, connections: {}, settings: { executionOrder: 'v1' } }),
  });
  if (!res.ok) throw new Error(`workflow fixture create failed: ${res.status}`);
  const wf = (await res.json()) as { id: string; name: string };
  track(async () => {
    await apiFetch(`/api/v1/workflows/${wf.id}`, { method: 'DELETE' });
  });
  return { id: wf.id, name: wf.name };
}

/** A unique, prefixed, collision-resistant resource name. */
export function uniqueName(prefix: string): string {
  return `e2e-${prefix}-${randomBytes(4).toString('hex')}`;
}

/**
 * Register a per-test cleanup thunk via `onTestFinished` (retry-aware, runs in
 * reverse order after the test, even on failure). Cleanup errors are logged, not
 * thrown, so one stuck resource can't break the rest of teardown — but they are
 * visible rather than silently swallowed.
 */
export function track(fn: () => Promise<void>): void {
  onTestFinished(async () => {
    try {
      await fn();
    } catch (err) {
      console.warn(`[e2e cleanup] ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
