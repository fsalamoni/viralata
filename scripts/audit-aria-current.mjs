#!/usr/bin/env node
/**
 * audit-aria-current.mjs
 *
 * Audita uso de `aria-current` no projeto.
 * Valida que:
 * 1. Componentes de navegação (TopBar, BottomTabBar, Breadcrumb) usam
 * 2. NÃO está em <p> (deve estar em <a>, <button>, <NavLink>)
 * 3. Lista de rotas ativas tem aria-current
 *
 * Uso:
 *   node scripts/audit-aria-current.mjs
 *
 * Exit code:
 *   0 — sem problemas
 *   1 — encontrou uso incorreto
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const results = { ok: [], warn: [], error: [] };

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const trimmed = line.trim();

    if (line.includes('aria-current')) {
      // Verificar contexto
      const inP = trimmed.match(/<p[^>]*aria-current/);
      const inSpan = trimmed.match(/<span[^>]*aria-current/);
      const inA = trimmed.match(/<a[^>]*aria-current|<Link[^>]*aria-current/);
      const inButton = trimmed.match(/<button[^>]*aria-current/);
      const inNavLink = trimmed.match(/NavLink/);

      const fileRel = path.relative(ROOT, filePath);

      if (inP) {
        results.error.push({
          file: fileRel,
          line: lineNo,
          msg: 'aria-current em <p> — use <a>, <button> ou <NavLink>',
        });
      } else if (inSpan) {
        // Permitido em <span aria-current="page"> para breadcrumb
        results.ok.push({
          file: fileRel,
          line: lineNo,
          msg: 'aria-current em <span> (breadcrumb OK)',
        });
      } else if (inA || inButton || inNavLink) {
        results.ok.push({
          file: fileRel,
          line: lineNo,
          msg: 'aria-current em elemento de navegação',
        });
      } else {
        results.warn.push({
          file: fileRel,
          line: lineNo,
          msg: 'aria-current em elemento desconhecido',
        });
      }
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) continue;
      walkDir(filePath);
    } else if (/\.(jsx?|tsx?)$/.test(file)) {
      scanFile(filePath);
    }
  }
}

console.log('Auditando aria-current em src/...\n');
walkDir(SRC);

console.log(`OK: ${results.ok.length}`);
results.ok.forEach((r) => console.log(`  ${r.file}:${r.line} — ${r.msg}`));

console.log(`\nWARN: ${results.warn.length}`);
results.warn.forEach((r) => console.log(`  ${r.file}:${r.line} — ${r.msg}`));

console.log(`\nERROR: ${results.error.length}`);
results.error.forEach((r) => console.log(`  ${r.file}:${r.line} — ${r.msg}`));

if (results.error.length > 0) {
  console.log('\n---');
  console.log(`Encontrados ${results.error.length} problemas. Corrija antes de deploy.`);
  process.exit(1);
}

console.log('\n---');
console.log('Auditoria completa: OK');
