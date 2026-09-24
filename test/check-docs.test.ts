// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../scripts/check-docs.mjs', import.meta.url));

// A stub CLI keeps the fixture independent of the built package: the checker only needs a `--help`
// that lists no command group, so only the link rules are exercised here.
const STUB_CLI =
  "process.stdout.write('Usage: 8cli [options]\\n\\nOptions:\\n  --url <url>  n8n instance URL\\n  --help       display help\\n\\n');\n";
const GLOBAL_OPTIONS =
  '# Global options\n\n| Option | Purpose |\n| ------ | ------- |\n| `--url <url>` | n8n instance URL |\n| `--help` | Show help |\n';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

/**
 * A throwaway repository (`base/repo`) with one harmless file outside it (`base/outside.md`), so
 * an escaping link has a real target that must still be refused.
 */
function fixture(page: string): { base: string; root: string } {
  const base = mkdtempSync(join(tmpdir(), 'check-docs-'));
  tempDirs.push(base);
  const root = join(base, 'repo');
  mkdirSync(join(root, 'dist', 'bin'), { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'dist', 'bin', '8cli.js'), STUB_CLI);
  writeFileSync(join(root, 'SECURITY.md'), '# Security\n\n## Reporting\n');
  writeFileSync(join(root, 'docs', 'global-options.md'), GLOBAL_OPTIONS);
  writeFileSync(join(root, 'docs', 'page.md'), page);
  writeFileSync(join(base, 'outside.md'), '# Outside\n');
  return { base, root };
}

function run(root: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('check-docs link containment', () => {
  // Guard test: passes before and after the fix. It pins the legitimate in-repository link the
  // containment rule must keep working.
  it('accepts a link that leaves docs/ but stays in the repository', () => {
    const { root } = fixture('# Page\n\nSee [the policy](../SECURITY.md#reporting).\n');
    const { status, stderr } = run(root);
    expect(stderr).toBe('');
    expect(status).toBe(0);
  });

  // Regression: the old checker resolved the target without canonicalising it, found the file and
  // reported nothing, so this failed on 013ae9e.
  it('rejects a link to an absolute path outside the repository', () => {
    const { base, root } = fixture('# Page\n\n');
    writeFileSync(
      join(root, 'docs', 'page.md'),
      `# Page\n\nSee [x](${join(base, 'outside.md')}).\n`,
    );
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('does not resolve to a file inside the repository');
  });

  // Regression: `../../` reached `base/outside.md` through the old unchecked `resolve`.
  it('rejects a link that climbs out of the repository', () => {
    const { root } = fixture('# Page\n\nSee [x](../../outside.md).\n');
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('does not resolve to a file inside the repository');
  });

  // Regression: `existsSync` followed the symlink and accepted it; `realpath` refuses it.
  it('rejects a symlink pointing outside the repository', () => {
    const { base, root } = fixture('# Page\n\nSee [x](escape.md).\n');
    symlinkSync(join(base, 'outside.md'), join(root, 'docs', 'escape.md'));
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('does not resolve to a file inside the repository');
  });

  // Regression: the reference-style form went through the same unchecked `resolve`.
  it('rejects a reference-style link that climbs out of the repository', () => {
    const { root } = fixture('# Page\n\nSee [x][out].\n\n[out]: ../../outside.md\n');
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('does not resolve to a file inside the repository');
  });

  // Regression: discovery followed a symlinked docs directory out of the repository and read
  // every Markdown file it found there.
  it('refuses a docs directory that is a symlink outside the repository', () => {
    const { base, root } = fixture('# Page\n\n');
    const outside = join(base, 'outside-docs');
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, 'secret-name.md'), '# Secret\n\n[x](../nowhere.md)\n');
    symlinkSync(outside, join(root, 'docs', 'guides'));
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('does not resolve to a directory inside the repository');
    expect(stderr).not.toContain('secret-name');
  });

  // Guard test: a target that does not exist is still reported, and never read.
  it('still reports a missing target', () => {
    const { root } = fixture('# Page\n\nSee [x](../nope.md).\n');
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('does not resolve to a file inside the repository');
  });
});

describe('check-docs bounds', () => {
  // Guard test: bounded malformed input must not make the checker retry a suffix scan from every
  // candidate start. 20k unmatched "[" characters finish in milliseconds.
  it('finishes quickly on 20k unmatched opening brackets', () => {
    const { root } = fixture(`# Page\n\n${'['.repeat(20000)}\n`);
    const started = Date.now();
    const { status, stderr } = run(root);
    const elapsed = Date.now() - started;
    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(elapsed).toBeLessThan(5000);
  });

  it('refuses a page over the per-file size limit', () => {
    const { root } = fixture(`# Page\n\n${'x'.repeat(1024 * 1024 + 1)}\n`);
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('over the 1048576-byte per-file limit');
  });

  it('refuses more links than the limit allows', () => {
    const links = Array.from({ length: 5001 }, (_, i) => `[${i}](../SECURITY.md)`).join(' ');
    const { root } = fixture(`# Page\n\n${links}\n`);
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('more than 5000 links');
  });

  it('refuses more pages than the limit allows', () => {
    const { root } = fixture('# Page\n\n');
    for (let i = 0; i < 501; i++) writeFileSync(join(root, 'docs', `p${i}.md`), '# Page\n');
    const { status, stderr } = run(root);
    expect(status).toBe(1);
    expect(stderr).toContain('over the 500-page limit');
  });

  // Regression: the heading regex backtracked over a long run of spaces followed by a non-space.
  it('finishes quickly on a heading with a few thousand spaces', () => {
    const { root } = fixture(`# a${' '.repeat(3000)}a\n\n# ok\n\n[x](#ok)\n`);
    const started = Date.now();
    const { status, stderr } = run(root);
    const elapsed = Date.now() - started;
    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(elapsed).toBeLessThan(5000);
  });

  // Regression: the slug regex rescanned from every `<` when the heading had no `>`.
  it('finishes quickly on a heading with a few hundred thousand "<"', () => {
    const { root } = fixture(`# ${'<'.repeat(200000)}\n\n# ok\n\n[x](#ok)\n`);
    const started = Date.now();
    const { status, stderr } = run(root);
    const elapsed = Date.now() - started;
    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(elapsed).toBeLessThan(5000);
  });
});
