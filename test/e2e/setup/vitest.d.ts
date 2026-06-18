// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import 'vitest';

interface E2eMatchers<R = unknown> {
  /** Assert the CLI exited 1 with a structured {error,code} JSON and no raw stack trace. */
  toFailWithCode: (code: string) => R;
}

declare module 'vitest' {
  interface ProvidedContext {
    n8nUrl: string;
    n8nApiKey: string;
    n8nEmail: string;
    n8nPassword: string;
  }
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
  interface Assertion<T = any> extends E2eMatchers<T> {}
  interface AsymmetricMatchersContaining extends E2eMatchers {}
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
}
