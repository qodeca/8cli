// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from './types.js';
import { outputError } from './formatters/index.js';
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

/** Error code for a key and a URL that came from incompatible sources. */
export const ERR_CONFIG_SOURCE_MISMATCH = 'ERR_CONFIG_SOURCE_MISMATCH';

/** Where the resolved n8n URL came from. */
export type UrlSource = 'flag' | 'env' | 'config' | 'none';

/** Where the resolved API key came from. */
export type ApiKeySource = 'flag' | 'env' | 'keychain' | 'none';

/**
 * The refusal message for an API key that came from a flag or the environment
 * while the URL came from a config file, or undefined when the pair is allowed.
 *
 * A key the user handed 8cli directly was never bound to a host, while an
 * `8cli.json` found in the current directory can name any host – so the two
 * must not be combined (#60). A keychain key is looked up per URL and is
 * unaffected. Exported for testing.
 */
export function configSourceMismatch(
  urlSource: UrlSource,
  apiKeySource: ApiKeySource,
  url: string,
): string | undefined {
  if (urlSource !== 'config' || (apiKeySource !== 'flag' && apiKeySource !== 'env')) {
    return undefined;
  }
  const key = apiKeySource === 'flag' ? '--api-key' : 'N8N_API_KEY';
  return (
    `Refusing to use the API key from ${key} with the URL "${url}" from the config file: ` +
    'that key was not given for that host. Set N8N_URL too (or pass --url), or store the key ' +
    'in the keychain for that URL.'
  );
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
  const urlSource: UrlSource = flags.url
    ? 'flag'
    : process.env.N8N_URL
      ? 'env'
      : configFile?.url
        ? 'config'
        : 'none';

  // Reject plaintext-HTTP URLs before any credential is sent over the wire.
  assertSecureUrl(url, flags.insecure);

  // Refuse an API key that was given for no particular host when the URL comes
  // from a file that names one, before any request can carry the key there.
  // Emitted here rather than thrown: every command's catch re-labels a thrown
  // error with its own code, and callers branch on ERR_CONFIG_SOURCE_MISMATCH.
  const apiKeySource: ApiKeySource = flags.apiKey
    ? 'flag'
    : process.env.N8N_API_KEY
      ? 'env'
      : 'none';
  const mismatch = configSourceMismatch(urlSource, apiKeySource, url);
  if (mismatch) outputError(mismatch, ERR_CONFIG_SOURCE_MISMATCH);

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
