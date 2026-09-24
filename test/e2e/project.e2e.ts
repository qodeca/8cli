// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { describe, expect, it } from 'vitest';
import { apiEnv, errorMessage, LICENSE_GATED, run8cli, uniqueName } from './setup/helpers.js';

// Projects are an Enterprise feature; on a free Community container the public
// API rejects them. These specs lock the gated-error contract for each command.

describe('project (Enterprise-gated on free n8n)', () => {
  it('list returns a structured error', async () => {
    const r = await run8cli(['proj', 'list'], apiEnv());
    expect(r).toFailWithCode('ERR_PROJECT_LIST');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  it('create returns a structured error', async () => {
    const r = await run8cli(['proj', 'create', uniqueName('proj')], apiEnv());
    expect(r).toFailWithCode('ERR_PROJECT_CREATE');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  it('update returns a structured error', async () => {
    const r = await run8cli(['proj', 'update', 'x', '--name', uniqueName('proj')], apiEnv());
    expect(r).toFailWithCode('ERR_PROJECT_UPDATE');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });

  it('delete (with --transfer-to) returns a structured error', async () => {
    const r = await run8cli(['proj', 'delete', 'x', '--transfer-to', 'y'], apiEnv());
    expect(r).toFailWithCode('ERR_PROJECT_DELETE');
    expect(errorMessage(r)).toMatch(LICENSE_GATED);
  });
});
