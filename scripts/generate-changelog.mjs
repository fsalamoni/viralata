#!/usr/bin/env node
/**
 * generate-changelog.mjs
 *
 * Gera CHANGELOG.md automaticamente a partir de commits do git.
 * Filtra por conventional commits (feat, fix, docs, etc).
 *
 * Uso:
 *   node scripts/generate-changelog.mjs           # últimos 30 commits
 *   node scripts/generate-changelog.mjs --limit 50  # últimos 50 commits
 *   node scripts/generate-changelog.mjs --since 7d # últimos 7 dias
 */
import { execSync } from 'child_process';

const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1]) || 30;
const since = process.argv.find((a) => a.startsWith('--since='))?.split('=')[1] || '';

const sinceArg = since ? `--since="${since}"` : '';
const format = '%h|%s|%an|%ad';
const date = '--date=short';

const cmd = `git log ${sinceArg} -${limit} --pretty=format:"${format}" ${date}`;

let output;
try {
  output = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
} catch (err) {
  console.error('Erro ao ler git log:', err.message);
  process.exit(1);
}

const lines = output.split('\n').filter(Boolean);

const groups = {
  feat: [],
  fix: [],
  docs: [],
  chore: [],
  refactor: [],
  test: [],
  style: [],
  perf: [],
  build: [],
  ci: [],
  other: [],
};

for (const line of lines) {
  const [hash, subject, author, date] = line.split('|');
  const match = subject.match(/^(feat|fix|docs|chore|refactor|test|style|perf|build|ci)(?:\([^)]+\))?!?:\s*(.+)$/);
  
  if (match) {
    const type = match[1];
    const desc = match[2];
    groups[type].push({ hash, desc, author, date });
  } else {
    groups.other.push({ hash, subject, author, date });
  }
}

console.log('# Changelog (Auto-generated)\n');
console.log(`Últimos ${limit} commits${since ? ` desde ${since}` : ''}.\n`);

for (const [type, items] of Object.entries(groups)) {
  if (items.length === 0) continue;
  
  const titles = {
    feat: 'Features',
    fix: 'Bug Fixes',
    docs: 'Documentation',
    chore: 'Chores',
    refactor: 'Refactors',
    test: 'Tests',
    style: 'Styles',
    perf: 'Performance',
    build: 'Build',
    ci: 'CI',
    other: 'Other',
  };
  
  console.log(`## ${titles[type]}\n`);
  for (const item of items) {
    const desc = item.desc || item.subject;
    console.log(`- \`${item.hash}\` ${desc} _(${item.author}, ${item.date})_`);
  }
  console.log();
}

console.log('---');
console.log('Gerado por `node scripts/generate-changelog.mjs`');
