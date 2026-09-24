// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: 2026 Qodeca sp. z o.o.

// Checks the end-user documentation against the built CLI (`dist/bin/8cli.js`):
//   1. every command group has its own page, docs/reference/<group>.md;
//   2. every subcommand has its own `## <group> <subcommand>` section on that page (the group's
//      name or its alias), and every option of that subcommand appears inside that section;
//   3. every global option appears on docs/global-options.md;
//   4. every relative link on a user page (inline or reference-style) resolves, including its
//      `#anchor` when the target is a Markdown page, and stays inside the repository.
// Only user pages are scanned: docs/*.md, docs/reference/** and docs/guides/**. Contributor
// folders (designs, runbooks, validation, …) never count towards coverage.
// Prints one JSON object on success; lists every problem on stderr and exits 1 otherwise.
//
// The page text is contributor-controlled, so the check treats it as untrusted input: link
// targets are canonicalised with `realpath` (a symlink is followed) and refused when they leave
// the repository, every read is bounded by a per-file size limit, the run is bounded by page and
// link counts, and links are parsed in one linear pass instead of a regex that rescans a suffix
// from every candidate start.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = realpathSync(process.cwd());
const docsDir = join(root, 'docs');
const cli = join(root, 'dist', 'bin', '8cli.js');
const problems = [];

// ── Bounds ───────────────────────────────────────────────────────────────────
//
// Nothing below reads or parses an unbounded amount of contributor-controlled text: a page over
// the per-file limit fails with one clear problem, and the page and link counts stop the run
// rather than letting a large documentation tree occupy the checker.
const MAX_FILE_BYTES = 1024 * 1024; // 1 MiB per Markdown file
const MAX_PAGES = 500;
const MAX_LINKS = 5000;

const rel = (file) => relative(root, file);

function report(problem) {
  problems.push(problem);
}

function fail() {
  process.stderr.write(
    JSON.stringify({ error: 'Documentation check failed', code: 'ERR_DOCS', problems }, null, 2) +
      '\n',
  );
  process.exit(1);
}

/** Read a Markdown file, refusing one over the per-file limit instead of reading it. */
function readBounded(file) {
  let size;
  try {
    size = statSync(file).size;
  } catch {
    return undefined;
  }
  if (size > MAX_FILE_BYTES) {
    report(
      `size: ${rel(file)} is ${size} bytes, over the ${MAX_FILE_BYTES}-byte per-file limit`,
    );
    return undefined;
  }
  return readFileSync(file, 'utf8');
}

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

// Stop before reading anything when the tree itself is over the page limit, so the failure names
// the bound instead of the run being cut off mid-scan.
if (userPages.length > MAX_PAGES) {
  report(`limit: ${userPages.length} user pages, over the ${MAX_PAGES}-page limit`);
  fail();
}

const pageText = new Map();
for (const file of userPages) {
  const text = readBounded(file);
  if (text !== undefined) pageText.set(file, text);
}
if (problems.length) fail();

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
    const text = readBounded(file);
    if (text === undefined) {
      anchorCache.set(file, undefined); // over the size limit, or unreadable; the problem is recorded
    } else {
      const seen = new Map();
      const anchors = new Set();
      for (const { text: heading } of headingsOf(text)) {
        const base = slug(heading);
        const count = seen.get(base) ?? 0;
        anchors.add(count ? `${base}-${count}` : base);
        seen.set(base, count + 1);
      }
      anchorCache.set(file, anchors);
    }
  }
  return anchorCache.get(file);
}

// ── Links ────────────────────────────────────────────────────────────────────

// A label or target longer than this is not a link, and scanning stops instead of running on.
const MAX_LABEL_CHARS = 1000;
const MAX_TARGET_CHARS = 2000;

/** The target inside the parentheses of an inline link, or undefined. Bounded by the caller. */
function inlineTarget(inner) {
  const trimmed = inner.trim();
  if (!trimmed) return undefined;
  const match = /^<?([^)\s>]+)>?(?:\s+"[^"]*")?$/.exec(trimmed);
  return match ? match[1] : undefined;
}

/**
 * Inline link targets, in one linear pass over the text. The previous regex retried a suffix scan
 * from every `[`, which is quadratic on unmatched delimiters; this walks the text once, never
 * rescanning a character it has already passed.
 */
function inlineLinkTargets(text) {
  const targets = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '[') {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < text.length && text[j] !== ']' && text[j] !== '\n' && j - i <= MAX_LABEL_CHARS) j++;
    if (j >= text.length) break; // no closing bracket is left in the text at all
    if (text[j] !== ']' || text[j + 1] !== '(') {
      i = j + 1;
      continue;
    }
    let k = j + 2;
    while (k < text.length && text[k] !== ')' && text[k] !== '\n' && k - j <= MAX_TARGET_CHARS) k++;
    if (k < text.length && text[k] === ')') {
      const target = inlineTarget(text.slice(j + 2, k));
      if (target !== undefined) targets.push(target);
      i = k + 1;
      continue;
    }
    if (k >= text.length) break; // no `)` is left either
    i = k;
  }
  return targets;
}

/** The target of a `[label]: target` reference definition, or undefined. */
function referenceTarget(line) {
  let i = 0;
  while (i < 3 && (line[i] === ' ' || line[i] === '\t')) i++;
  if (line[i] !== '[') return undefined;
  const close = line.indexOf(']', i + 1);
  if (close <= i + 1) return undefined;
  if (line[close + 1] !== ':') return undefined;
  return inlineTarget(line.slice(close + 2));
}

const rootPrefix = root.endsWith(sep) ? root : root + sep;

/** Whether a canonical path really sits inside the repository. */
function insideRoot(candidate) {
  return candidate === root || candidate.startsWith(rootPrefix);
}

function checkLink(file, target) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return; // https:, mailto:, …
  const [path, anchor] = target.split('#');
  let resolved = file;
  if (path) {
    let decoded;
    try {
      decoded = decodeURI(path);
    } catch {
      report(`link: ${rel(file)} -> ${target} (invalid percent-encoding)`);
      return;
    }
    // Canonicalise before touching the target: `realpath` follows symlinks, so a target that
    // resolves outside the repository is refused here, and a target that does not exist is
    // reported without ever being stat-ed or read.
    try {
      resolved = realpathSync(resolve(dirname(file), decoded));
    } catch {
      report(`link: ${rel(file)} -> ${target} (no such file)`);
      return;
    }
    if (!insideRoot(resolved)) {
      report(`link: ${rel(file)} -> ${target} (target is outside the repository)`);
      return;
    }
  }
  if (anchor && statSync(resolved).isFile() && resolved.endsWith('.md')) {
    const anchors = anchorsOf(resolved);
    if (anchors !== undefined && !anchors.has(anchor)) {
      report(`link: ${rel(file)} -> ${target} (no heading #${anchor})`);
    }
  }
}

let linksChecked = 0;
for (const [file, text] of pageText) {
  const prose = withoutCode(text).replace(/`[^`\n]*`/g, '');
  const targets = [
    ...inlineLinkTargets(prose),
    ...prose.split('\n').map(referenceTarget).filter((target) => target !== undefined),
  ];
  for (const target of targets) {
    linksChecked++;
    if (linksChecked > MAX_LINKS) {
      report(`limit: more than ${MAX_LINKS} links across the user pages, stopped scanning`);
      break;
    }
    checkLink(file, target);
  }
  if (linksChecked > MAX_LINKS) break;
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
    report(`page: ${rel(page)} is missing for command group "${group}"`);
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
      report(`section: ${rel(page)} has no "## ${names.at(-1)} ${sub}" heading`);
      continue;
    }
    for (const flag of optionsFrom(help(names[0], sub))) {
      optionCount++;
      if (!mentions(body, flag)) {
        report(`option: ${flag} of "${names[0]} ${sub}" is not in its section of ${rel(page)}`);
      }
    }
  }
}

const globalPage = join(docsDir, 'global-options.md');
const globalText = pageText.get(globalPage) ?? '';
if (!pageText.has(globalPage)) report(`page: ${rel(globalPage)} is missing`);
for (const flag of [...optionsFrom(rootHelp), '--help']) {
  optionCount++;
  if (!mentions(globalText, flag)) report(`global option: ${flag} is not in ${rel(globalPage)}`);
}

if (problems.length) fail();

process.stdout.write(
  JSON.stringify({
    pages: userPages.length,
    subcommands: subcommandCount,
    options: optionCount,
    checked: ['per-command sections', 'per-section options', 'global options', 'links', 'anchors'],
  }) + '\n',
);
