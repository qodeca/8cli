import { execFileSync } from 'node:child_process';
import { error, log } from 'node:console';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const docs = [];
function readDocs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) readDocs(file);
    else if (entry.name.endsWith('.md')) docs.push({ file, content: readFileSync(file, 'utf8') });
  }
}
readDocs(join(root, 'docs'));
const text = docs.map(({ content }) => content).join('\n');
const missing = [];
for (const { file, content } of docs) {
  for (const target of content.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
    const path = target[1];
    if (!/^(https?:|mailto:)/.test(path) && !existsSync(normalize(join(dirname(file), path)))) {
      missing.push(`link: ${file} -> ${path}`);
    }
  }
}
const help = execFileSync('node', ['dist/bin/8cli.js', '--help'], { encoding: 'utf8' });
function commandsFrom(helpText) {
  const section = helpText.split('\nCommands:\n')[1] ?? '';
  return [...section.matchAll(/^\s{2}([a-z][\w-]*(?:\|[a-z][\w-]*)?)(?:\s|\[)/gm)]
    .map((match) => match[1])
    .filter((name) => name !== 'help');
}
const groups = commandsFrom(help);
for (const group of groups) {
  const names = group.split('|');
  const groupHelp = execFileSync('node', ['dist/bin/8cli.js', names[0], '--help'], {
    encoding: 'utf8',
  });
  for (const command of commandsFrom(groupHelp)) {
    if (!names.some((name) => text.includes(`${name} ${command}`))) {
      missing.push(`command: ${group} ${command}`);
    }
    const commandHelp = execFileSync('node', ['dist/bin/8cli.js', names[0], command, '--help'], {
      encoding: 'utf8',
    });
    for (const flag of commandHelp.matchAll(/--[a-z][a-z-]*/g)) {
      if (!text.includes(flag[0])) missing.push(`flag: ${group} ${command} ${flag[0]}`);
    }
  }
}
for (const flag of help.matchAll(/--[a-z][a-z-]*/g)) {
  if (!text.includes(flag[0])) missing.push(`global flag: ${flag[0]}`);
}
if (missing.length) {
  error(`Documentation is missing ${[...new Set(missing)].join(', ')}`);
  process.exit(1);
}
log(JSON.stringify({ checked: 'commands, flags, internal links' }));
