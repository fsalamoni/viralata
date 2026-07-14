#!/usr/bin/env node
/**
 * @fileoverview Auditoria de feature flags (TASK-088).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const flagFiles = [
  'src/core/featureFlags.js',
  'src/modules/shelter/domain/constants.js',
];
const docsPath = path.join(root, 'docs/FEATURE_FLAGS.md');

if (!fs.existsSync(docsPath)) {
  console.error('[audit-flags] ❌ docs/FEATURE_FLAGS.md não encontrado');
  process.exit(1);
}
const docs = fs.readFileSync(docsPath, 'utf-8');

function extractFlags() {
  const flags = new Map();
  // 1. Nomes e keys
  for (const rel of flagFiles) {
    const fp = path.join(root, rel);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    // Match: NOME: 'chave',  (top-level, sem indent nas chaves dos SHELTER_FEATURE_FLAG)
    const reKey = /(?:^|\n)\s*([A-Z][A-Z0-9_]+):\s*'([a-z][a-z0-9_]+)'/g;
    let m;
    while ((m = reKey.exec(content)) !== null) {
      flags.set(m[1], { name: m[1], key: m[2] });
    }
  }
  // 2. Defaults
  for (const rel of flagFiles) {
    const fp = path.join(root, rel);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    let m;
    const re1 = /\[FEATURE_FLAG\.([A-Z][A-Z0-9_]+)\]:\s*(true|false)/g;
    while ((m = re1.exec(content)) !== null) {
      const f = flags.get(m[1]);
      if (f) f.defaultValue = m[2] === 'true';
    }
    const re2 = /\[SHELTER_FEATURE_FLAG\.([A-Z][A-Z0-9_]+)\]:\s*(true|false)/g;
    while ((m = re2.exec(content)) !== null) {
      const f = flags.get(m[1]);
      if (f) f.defaultValue = m[2] === 'true';
    }
  }
  // 3. Labels e descriptions: split por `,\n  }` ou `\n};`
  for (const rel of flagFiles) {
    const fp = path.join(root, rel);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    // Find blocks: [FEATURE_FLAG.X]: { ... } ou [SHELTER_FEATURE_FLAG.X]: { ... }
    // O body pode ter {} aninhados (raro) — usamos match guloso limitado
    const reBlock = /\[(FEATURE_FLAG|SHELTER_FEATURE_FLAG)\.([A-Z][A-Z0-9_]+)\]:\s*\{([\s\S]+?)\n\s*\},?/g;
    let m;
    while ((m = reBlock.exec(content)) !== null) {
      const flagName = m[2];
      const body = m[3];
      const f = flags.get(flagName);
      if (!f) continue;
      // label: 'xxx',
      const lbl = body.match(/^\s*label:\s*['"]([^'"]+)['"]/m);
      if (lbl) f.label = lbl[1];
      // description: ... (pode ser string multi-linha com `+`)
      // Tenta match simples: description: 'string' OU description:\n  'string1' + 'string2'
      let descFound = '';
      const descSimple = body.match(/description:\s*'([^']*)'/);
      if (descSimple) {
        descFound = descSimple[1];
      } else {
        // Multi-line com +
        const descParts = [];
        const descRe = /'([^']*)'/g;
        const descIdx = body.indexOf('description:');
        if (descIdx >= 0) {
          const descBody = body.substring(descIdx, descIdx + 1000);
          let sm;
          while ((sm = descRe.exec(descBody)) !== null) {
            descParts.push(sm[1]);
            if (descParts.length >= 5) break; // limite de segurança
          }
        }
        descFound = descParts.join(' ').trim();
      }
      if (descFound) f.description = descFound;
    }
  }
  return Array.from(flags.values());
}

function findReferences(key) {
  const refs = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(p);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const c = fs.readFileSync(p, 'utf-8');
        if (c.includes(key)) refs.push(path.relative(root, p));
      }
    }
  }
  walk(path.join(root, 'src'));
  return refs;
}

const flags = extractFlags();
console.log('='.repeat(110));
console.log('Feature Flag Audit (TASK-088)');
console.log('='.repeat(110));
const header = ['Flag', 'Key', 'Def', 'Lbl', 'Desc', 'Docs', 'Used']
  .map((s, i) => s.padEnd([35, 35, 5, 5, 5, 5, 8][i])).join(' ');
console.log(header);
console.log('-'.repeat(110));

let issues = 0;
let totalChecked = 0;
let totalOk = 0;
const violations = [];

for (const f of flags) {
  totalChecked++;
  // SAFE default: false ou undefined
  const hasDefault = f.defaultValue === false
    || f.defaultValue === undefined
    // Aceitar default=true se está documentado como legado
    || (f.defaultValue === true && docs.match(new RegExp('\`' + f.key + '\`\\s*\\|\\s*\\*\\*ON\\*\\*\\s*\\(legado\\)')))
  const hasLabel = !!f.label;
  const hasDesc = !!f.description;
  const inDocs = docs.includes(f.key);
  const refs = findReferences(f.key);
  const used = refs.length > 0;
  const ok = hasDefault && hasLabel && hasDesc && inDocs && used;
  if (ok) totalOk++;
  else { issues++; violations.push(f); }

  console.log([
    f.name.padEnd(35),
    f.key.padEnd(35),
    (hasDefault ? '✅' : '❌').padEnd(5),
    (hasLabel ? '✅' : '❌').padEnd(5),
    (hasDesc ? '✅' : '❌').padEnd(5),
    (inDocs ? '✅' : '❌').padEnd(5),
    used ? `✅(${refs.length})` : '❌(0)',
  ].join(' '));
}
console.log('-'.repeat(110));
console.log(`Total: ${totalChecked} flags, ${totalOk} OK, ${issues} issues`);
console.log('='.repeat(110));

if (violations.length > 0) {
  console.log('\nIssues detalhados:');
  for (const f of violations) {
    const issuesF = [];
    if (f.defaultValue !== false && f.defaultValue !== undefined) issuesF.push('default≠false');
    if (!f.label) issuesF.push('sem label');
    if (!f.description) issuesF.push('sem description');
    if (!docs.includes(f.key)) issuesF.push('não em docs/FEATURE_FLAGS.md');
    if (findReferences(f.key).length === 0) issuesF.push('não usada em código');
    console.log(`  ${f.name} (${f.key}): ${issuesF.join(', ') || 'verificar manualmente'}`);
  }
}

process.exit(issues > 0 ? 1 : 0);
