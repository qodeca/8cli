// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { resolveConfig } from '../config.js';
import {
  setSecret,
  deleteSecret,
  listAccounts,
  apiKeyAccount,
  emailAccount,
  passwordAccount,
  KEYCHAIN_SERVICE,
} from '../keychain/index.js';
import { PublicApiClient } from '../client/public-api.js';
import { ApiRequestError } from '../client/base.js';
import { output, outputError, outputJson } from '../formatters/index.js';

/**
 * Helper to get the n8n URL from global --url flag or N8N_URL env var.
 * Auth commands need a URL to know which instance credentials belong to.
 */
function getUrl(program: Command): string {
  const opts = program.opts();
  const url = (opts.url || process.env.N8N_URL || '').replace(/\/+$/, '');
  if (!url) {
    outputError(
      'No n8n URL specified. Use the global --url flag or N8N_URL env var.',
      'ERR_NO_URL',
    );
  }
  return url;
}

/**
 * Resolve a secret-bearing flag value. When the value is `-`, read the secret
 * from stdin instead, so callers can avoid exposing it in process arguments
 * (visible to other users via `ps`). Trailing newline is stripped.
 */
function resolveSecretValue(value: string): string {
  if (value === '-') {
    return readFileSync(0, 'utf-8').replace(/\r?\n$/, '');
  }
  return value;
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Manage n8n instance authentication');

  // ── auth login ──────────────────────────────────────────────────────────

  auth
    .command('login')
    .description('Store credentials for an n8n instance in the keychain')
    .option('--email <email>', 'Email for internal API auth')
    .option('--password <password>', 'Password for internal API auth (use "-" to read from stdin)')
    .action(async (opts) => {
      try {
        const url = getUrl(program);

        // The API key comes from the global --api-key flag (use "-" for stdin);
        // a subcommand --api-key would be shadowed by the global option.
        const apiKey = (program.opts() as { apiKey?: string }).apiKey;
        if (!apiKey) {
          outputError(
            'No API key provided. Pass the global --api-key flag (use "-" to read from stdin).',
            'ERR_NO_API_KEY',
          );
        }

        await setSecret(KEYCHAIN_SERVICE, apiKeyAccount(url), resolveSecretValue(apiKey));

        if (opts.email) {
          await setSecret(KEYCHAIN_SERVICE, emailAccount(url), opts.email);
        }
        if (opts.password) {
          await setSecret(
            KEYCHAIN_SERVICE,
            passwordAccount(url),
            resolveSecretValue(opts.password),
          );
        }

        outputJson({
          message: 'Credentials stored successfully',
          url,
          hasApiKey: true,
          hasEmail: !!opts.email,
          hasPassword: !!opts.password,
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUTH_LOGIN');
      }
    });

  // ── auth logout ─────────────────────────────────────────────────────────

  auth
    .command('logout')
    .description('Remove stored credentials for an n8n instance')
    .action(async () => {
      try {
        const url = getUrl(program);

        const deletedApiKey = await deleteSecret(KEYCHAIN_SERVICE, apiKeyAccount(url));
        const deletedEmail = await deleteSecret(KEYCHAIN_SERVICE, emailAccount(url));
        const deletedPassword = await deleteSecret(KEYCHAIN_SERVICE, passwordAccount(url));

        outputJson({
          message: 'Credentials removed',
          url,
          deletedApiKey,
          deletedEmail,
          deletedPassword,
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUTH_LOGOUT');
      }
    });

  // ── auth list ───────────────────────────────────────────────────────────

  auth
    .command('list')
    .description('List stored n8n instances')
    .action(async () => {
      try {
        const accounts = await listAccounts(KEYCHAIN_SERVICE);

        // Group accounts by URL
        const urlMap = new Map<
          string,
          { hasApiKey: boolean; hasEmail: boolean; hasPassword: boolean }
        >();

        for (const account of accounts) {
          // Account format: url/api-key, url/email, url/password
          let url: string;
          let type: string;

          if (account.endsWith('/api-key')) {
            url = account.slice(0, -'/api-key'.length);
            type = 'apiKey';
          } else if (account.endsWith('/email')) {
            url = account.slice(0, -'/email'.length);
            type = 'email';
          } else if (account.endsWith('/password')) {
            url = account.slice(0, -'/password'.length);
            type = 'password';
          } else {
            continue;
          }

          if (!urlMap.has(url)) {
            urlMap.set(url, { hasApiKey: false, hasEmail: false, hasPassword: false });
          }
          const entry = urlMap.get(url)!;
          if (type === 'apiKey') entry.hasApiKey = true;
          if (type === 'email') entry.hasEmail = true;
          if (type === 'password') entry.hasPassword = true;
        }

        const result = Array.from(urlMap.entries()).map(([url, info]) => ({
          url,
          ...info,
        }));

        const parentOpts = program.opts();
        output(result, { table: parentOpts.table });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUTH_LIST');
      }
    });

  // ── auth verify ─────────────────────────────────────────────────────────

  auth
    .command('verify')
    .description('Verify connection to the n8n instance')
    .action(async () => {
      try {
        const parentOpts = program.opts();
        const config = await resolveConfig(parentOpts);

        if (!config.url) {
          outputError('No n8n URL configured. Use --url flag or N8N_URL env var.', 'ERR_NO_URL');
        }
        if (!config.apiKey) {
          outputError(
            'No API key configured. Use --api-key flag, N8N_API_KEY env var, or `auth login`.',
            'ERR_NO_API_KEY',
          );
        }

        const client = new PublicApiClient(config.url, config.apiKey, config.verbose);

        // Test the connection by listing workflows with limit=1
        await client.get('/api/v1/workflows', { params: { limit: 1 } });

        outputJson({
          url: config.url,
          authenticated: true,
        });
      } catch (err) {
        if (err instanceof ApiRequestError) {
          outputJson({
            url: (program.opts() as Record<string, string>).url || process.env.N8N_URL || '',
            authenticated: false,
            error: err.message,
            statusCode: err.statusCode,
          });
          process.exit(1);
        }
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUTH_VERIFY');
      }
    });

  // ── auth set-api-key ────────────────────────────────────────────────────

  auth
    .command('set-api-key')
    .description('Store an API key for an n8n instance')
    .requiredOption('--value <key>', 'API key value (use "-" to read from stdin)')
    .action(async (opts) => {
      try {
        const url = getUrl(program);
        await setSecret(KEYCHAIN_SERVICE, apiKeyAccount(url), resolveSecretValue(opts.value));

        outputJson({
          message: 'API key stored',
          url,
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUTH_SET_API_KEY');
      }
    });

  // ── auth set-credentials ───────────────────────────────────────────────

  auth
    .command('set-credentials')
    .description('Store email/password credentials for an n8n instance')
    .requiredOption('--email <email>', 'Email address')
    .requiredOption('--password <password>', 'Password (use "-" to read from stdin)')
    .action(async (opts) => {
      try {
        const url = getUrl(program);
        await setSecret(KEYCHAIN_SERVICE, emailAccount(url), opts.email);
        await setSecret(KEYCHAIN_SERVICE, passwordAccount(url), resolveSecretValue(opts.password));

        outputJson({
          message: 'Credentials stored',
          url,
          email: opts.email,
        });
      } catch (err) {
        outputError(err instanceof Error ? err.message : String(err), 'ERR_AUTH_SET_CREDENTIALS');
      }
    });
}
