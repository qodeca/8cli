// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// Checks the end-user documentation against the built CLI (`dist/bin/8cli.js`):
//   1. every command group has its own page, docs/reference/<group>.md;
//   2. every subcommand has its own `## <group> <subcommand>` section on that page (the group's
//      name or its alias), and every option of that subcommand appears inside that section;
//   3. every global option appears on docs/global-options.md;
//   4. every relative link on a user page (inline or reference-style) resolves, including its
//      `#anchor` when the target is a Markdown page.
// Only user pages are scanned: docs/*.md, docs/reference/** and docs/guides/**. Contributor
// folders (designs, runbooks, validation, …) never count towards coverage.
// Prints one JSON object on success; lists every problem on stderr and exits 1 otherwise.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const docsDir = join(root, 'docs');
const cli = join(root, 'dist', 'bin', '8cli.js');
const problems = [];

// ── User pages ───────────────────────────────────────────────────────────────

function markdownIn(dir, recursive) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory() && recursive) files.push(...markdownIn(file, true));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
  return files;
}

const userPages = [
  ...markdownIn(docsDir, false),
  ...markdownIn(join(docsDir, 'reference'), true),
  ...markdownIn(join(docsDir, 'guides'), true),
];
const pageText = new Map(userPages.map((file) => [file, readFileSync(file, 'utf8')]));
const rel = (file) => relative(root, file);

/** Remove fenced code blocks so their content is not read as links or headings. */
function withoutCode(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
}

// ── Headings and anchors (GitHub's slug rules) ───────────────────────────────

function slug(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function headingsOf(text) {
  return [...withoutCode(text).matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)].map((m) => ({
    level: m[1].length,
    text: m[2],
  }));
}

const anchorCache = new Map();
function anchorsOf(file) {
  if (!anchorCache.has(file)) {
    const seen = new Map();
    const anchors = new Set();
    for (const { text } of headingsOf(readFileSync(file, 'utf8'))) {
      const base = slug(text);
      const count = seen.get(base) ?? 0;
      anchors.add(count ? `${base}-${count}` : base);
      seen.set(base, count + 1);
    }
    anchorCache.set(file, anchors);
  }
  return anchorCache.get(file);
}

// ── Links ────────────────────────────────────────────────────────────────────

function checkLink(file, target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return; // https:, mailto:, …
  const [path, anchor] = target.split('#');
  const resolved = path ? resolve(dirname(file), decodeURI(path)) : file;
  if (!existsSync(resolved)) {
    problems.push(`link: ${rel(file)} -> ${target} (no such file)`);
    return;
  }
  if (anchor && statSync(resolved).isFile() && resolved.endsWith('.md')) {
    if (!anchorsOf(resolved).has(anchor)) {
      problems.push(`link: ${rel(file)} -> ${target} (no heading #${anchor})`);
    }
  }
}

for (const [file, text] of pageText) {
  const prose = withoutCode(text).replace(/`[^`\n]*`/g, '');
  for (const m of prose.matchAll(/\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
    checkLink(file, m[1]);
  }
  for (const m of prose.matchAll(/^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+.*)?$/gm)) {
    checkLink(file, m[1]);
  }
}

// ── Commands and options ─────────────────────────────────────────────────────

function help(...args) {
  return execFileSync('node', [cli, ...args, '--help'], { encoding: 'utf8' });
}

function section(helpText, name) {
  const match = helpText.match(new RegExp(`\\n${name}:\\n([\\s\\S]*?)(?:\\n\\n|$)`));
  return match ? match[1] : '';
}

function commandsFrom(helpText) {
  return [...section(helpText, 'Commands').matchAll(/^\s{2}([a-z][\w-]*(?:\|[a-z][\w-]*)?)/gm)]
    .map((m) => m[1])
    .filter((name) => name !== 'help');
}

function optionsFrom(helpText) {
  const flags = new Set();
  for (const line of section(helpText, 'Options').split('\n')) {
    const spec = line.trim().split(/\s{2,}/)[0] ?? '';
    for (const m of spec.matchAll(/--[a-z][a-z-]*/g)) flags.add(m[0]);
  }
  flags.delete('--help');
  return [...flags];
}

function mentions(text, flag) {
  return new RegExp(`${flag}(?![a-z-])`).test(text);
}

/** The text of a page's `## <heading>` section, up to the next heading of level 1 or 2. */
function sectionText(text, headingPattern) {
  const lines = text.split('\n');
  let inCode = false;
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^(```|~~~)/.test(lines[i])) inCode = !inCode;
    if (inCode) continue;
    if (start === -1 && headingPattern.test(lines[i])) start = i;
    else if (start !== -1 && /^#{1,2}\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return start === -1 ? undefined : lines.slice(start, end).join('\n');
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rootHelp = help();
let subcommandCount = 0;
let optionCount = 0;

for (const group of commandsFrom(rootHelp)) {
  const names = group.split('|');
  const page = join(docsDir, 'reference', `${names[0]}.md`);
  const text = pageText.get(page);
  if (text === undefined) {
    problems.push(`page: ${rel(page)} is missing for command group "${group}"`);
    continue;
  }
  const groupHelp = help(names[0]);
  for (const sub of commandsFrom(groupHelp)) {
    subcommandCount++;
    const heading = new RegExp(
      `^##\\s+\`?(?:${names.map(escape).join('|')})\\s+${escape(sub)}\`?\\s*$`,
    );
    const body = sectionText(text, heading);
    if (body === undefined) {
      problems.push(`section: ${rel(page)} has no "## ${names.at(-1)} ${sub}" heading`);
      continue;
    }
    for (const flag of optionsFrom(help(names[0], sub))) {
      optionCount++;
      if (!mentions(body, flag)) {
        problems.push(
          `option: ${flag} of "${names[0]} ${sub}" is not in its section of ${rel(page)}`,
        );
      }
    }
  }
}

const globalPage = join(docsDir, 'global-options.md');
const globalText = pageText.get(globalPage) ?? '';
if (!pageText.has(globalPage)) problems.push(`page: ${rel(globalPage)} is missing`);
for (const flag of [...optionsFrom(rootHelp), '--help']) {
  optionCount++;
  if (!mentions(globalText, flag))
    problems.push(`global option: ${flag} is not in ${rel(globalPage)}`);
}

if (problems.length) {
  process.stderr.write(
    JSON.stringify({ error: 'Documentation check failed', code: 'ERR_DOCS', problems }, null, 2) +
      '\n',
  );
  process.exit(1);
}

process.stdout.write(
  JSON.stringify({
    pages: userPages.length,
    subcommands: subcommandCount,
    options: optionCount,
    checked: ['per-command sections', 'per-section options', 'global options', 'links', 'anchors'],
  }) + '\n',
);
