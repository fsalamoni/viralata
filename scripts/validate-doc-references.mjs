#!/usr/bin/env node
/**
 * validate-doc-references.mjs
 *
 * Valida que todas as referências cruzadas em docs/AI_GUIDE/ apontam
 * para arquivos existentes. Detecta links quebrados.
 *
 * Uso:
 *   node scripts/validate-doc-references.mjs
 *
 * Exit code:
 *   0 — todas as referências OK
 *   1 — encontrou links quebrados
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const AI_GUIDE = path.join(ROOT, 'docs', 'AI_GUIDE');

const results = { ok: 0, broken: [], external: 0 };

function isExternalLink(href) {
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('//')
  );
}

function isAnchor(href) {
  return href.startsWith('#');
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileDir = path.dirname(filePath);
  const fileRel = path.relative(ROOT, filePath);

  // Regex para links markdown: [text](href)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];

    // Pular externos
    if (isExternalLink(href)) {
      results.external++;
      continue;
    }

    // Pular anchors puros
    if (isAnchor(href)) {
      continue;
    }

    // Separar href de fragment (#section)
    const [pathPart, fragment] = href.split('#');
    if (!pathPart) continue;

    // Resolver caminho absoluto
    let resolved;
    if (pathPart.startsWith('/')) {
      resolved = path.join(ROOT, pathPart);
    } else {
      resolved = path.resolve(fileDir, pathPart);
    }

    // Verificar se existe
    if (!fs.existsSync(resolved)) {
      results.broken.push({
        file: fileRel,
        href,
        resolved: path.relative(ROOT, resolved),
      });
    } else {
      results.ok++;
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.md')) {
      validateFile(filePath);
    }
  }
}

console.log('Validando referências cruzadas em docs/AI_GUIDE/...\n');
walkDir(AI_GUIDE);

console.log(`OK: ${results.ok} referências válidas`);
console.log(`Externas: ${results.external} (puladas)`);
console.log(`\nBroken: ${results.broken.length}`);

if (results.broken.length > 0) {
  console.log('\nLinks quebrados:');
  results.broken.forEach((b) => {
    console.log(`  ${b.file}: ${b.href}`);
    console.log(`    → ${b.resolved}`);
  });
  console.log(`\nEncontrados ${results.broken.length} links quebrados.`);
  process.exit(1);
}

console.log('\nValidação completa: OK');
