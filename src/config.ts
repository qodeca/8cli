// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from './types.js';
import {
  getSecret,
  apiKeyAccount,
  emailAccount,
  passwordAccount,
  KEYCHAIN_SERVICE,
} from './keychain/index.js';

interface CliFlags {
  url?: string;
  apiKey?: string;
  config?: string;
  table?: boolean;
  dry?: boolean;
  verbose?: boolean;
  insecure?: boolean;
}

/**
 * Reject plaintext-HTTP n8n URLs so the API key is never sent in clear text.
 * Loopback hosts (localhost / 127.0.0.1 / ::1) are allowed for local dev, and
 * the `--insecure` flag is an explicit opt-out. Exported for testing.
 */
export function assertSecureUrl(url: string, insecure = false): void {
  if (!url || insecure) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return; // malformed URLs are handled downstream by the API client
  }
  if (parsed.protocol === 'https:') return;
  const host = parsed.hostname;
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (parsed.protocol === 'http:' && isLoopback) return;
  throw new Error(
    `Refusing to use an insecure (${parsed.protocol}//) URL "${url}" – the API key would be sent in plaintext. ` +
      'Use an https:// URL, or pass --insecure to override (not recommended).',
  );
}

interface ConfigFile {
  url?: string;
  workflowDir?: string;
}

/**
 * Resolve configuration with priority:
 * CLI flags → env vars → config file → keychain → defaults
 */
export async function resolveConfig(flags: CliFlags): Promise<Config> {
  // Load config file (optional)
  const configFile = loadConfigFile(flags.config);

  // Resolve URL: flags → env → config file → default
  const url = (flags.url || process.env.N8N_URL || configFile?.url || '').replace(/\/+$/, '');

  // Reject plaintext-HTTP URLs before any credential is sent over the wire.
  assertSecureUrl(url, flags.insecure);

  // Resolve API key: flags → env → keychain
  let apiKey = flags.apiKey || process.env.N8N_API_KEY || '';
  if (!apiKey && url) {
    try {
      const keychainKey = await getSecret(KEYCHAIN_SERVICE, apiKeyAccount(url));
      if (keychainKey) apiKey = keychainKey;
    } catch {
      // Keychain unavailable – continue without
    }
  }

  // Resolve email/password from env → keychain
  let email: string | undefined = process.env.N8N_EMAIL;
  let password: string | undefined = process.env.N8N_PASSWORD;
  if (!email && url) {
    try {
      email = (await getSecret(KEYCHAIN_SERVICE, emailAccount(url))) || undefined;
    } catch {
      /* ignore */
    }
  }
  if (!password && url) {
    try {
      password = (await getSecret(KEYCHAIN_SERVICE, passwordAccount(url))) || undefined;
    } catch {
      /* ignore */
    }
  }

  // Resolve workflow directory
  const workflowDir = configFile?.workflowDir || 'workflow-files';

  return {
    url,
    apiKey,
    email,
    password,
    workflowDir,
    table: flags.table ?? false,
    dry: flags.dry ?? false,
    verbose: flags.verbose ?? false,
  };
}

/**
 * Load config file from explicit path, or auto-detect in cwd/configs/
 */
function loadConfigFile(explicitPath?: string): ConfigFile | undefined {
  const candidates: string[] = [];

  if (explicitPath) {
    candidates.push(resolve(explicitPath));
  } else {
    candidates.push(
      resolve(process.cwd(), '8cli.json'),
      resolve(process.cwd(), 'configs', '8cli.json'),
    );
  }

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as ConfigFile;
      } catch {
        // Invalid JSON – skip
      }
    }
  }

  return undefined;
}

/**
 * Mask an API key for display: show first 4 and last 4 chars
 */
export function maskApiKey(key: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
