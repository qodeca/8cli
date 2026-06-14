// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca

/**
 * Normalize n8n API output for snapshotting. `toMatchFileSnapshot` does not
 * support property matchers, and a real backend returns many run-varying
 * fields, so we deep-replace volatile values by key name with stable tokens
 * before snapshotting. Volatile keys are matched by family (`*Id`/`*At`) plus a
 * small exact set, and a post-pass guard fails loudly if any volatile-looking
 * value (UUID / ISO timestamp) still slipped through — so a new n8n field
 * surfaces as an actionable error rather than a silent snapshot diff.
 */

/** Exact volatile keys that don't fit the *Id / *At families. */
const VOLATILE_EXACT = new Set<string>(['id', 'triggerCount', 'lastUpdated']);

function isVolatileKey(key: string): boolean {
  return VOLATILE_EXACT.has(key) || /Id$/.test(key) || /At$/.test(key);
}

function tokenFor(key: string): string {
  if (/At$/.test(key) || key === 'lastUpdated') return '<timestamp>';
  if (key === 'triggerCount') return '<number>';
  return `<${key}>`;
}

/** Recursively redact volatile fields. Pure: returns a new value. */
export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isVolatileKey(key) && val !== null ? tokenFor(key) : normalize(val);
    }
    return out;
  }
  return value;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Throw if a normalized value still contains a UUID or ISO timestamp. */
function assertNoVolatileLeak(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoVolatileLeak(v, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      assertNoVolatileLeak(val, `${path}.${key}`);
    }
  } else if (typeof value === 'string' && (UUID_RE.test(value) || ISO_RE.test(value))) {
    throw new Error(
      `Snapshot redaction missed a volatile value at ${path}: "${value}". ` +
        'Add its key to redact.ts (likely a new n8n field).',
    );
  }
}

/** Stable, pretty-printed JSON of the normalized value, for file snapshots. */
export function snapshotJson(value: unknown): string {
  const normalized = normalize(value);
  assertNoVolatileLeak(normalized);
  return JSON.stringify(normalized, null, 2);
}
