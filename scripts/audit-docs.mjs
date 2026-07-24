#!/usr/bin/env node
/**
 * audit-docs.mjs
 *
 * Roda TODAS as auditorias relacionadas a docs em sequência:
 * 1. Validação de imports lucide
 * 2. Auditoria de aria-current
 * 3. Validação de referências cruzadas em docs
 *
 * Uso:
 *   node scripts/audit-docs.mjs
 *
 * Exit code:
 *   0 — todas as auditorias OK
 *   1 — encontrou problemas
 */
import { execSync } from 'child_process';

const scripts = [
  { name: 'Lucide imports', cmd: 'node scripts/validate-lucide-imports.mjs' },
  { name: 'Aria-current', cmd: 'node scripts/audit-aria-current.mjs' },
  { name: 'Doc references', cmd: 'node scripts/validate-doc-references.mjs' },
];

console.log('=== AUDITORIA COMPLETA DE DOCS ===\n');

let failed = 0;

for (const script of scripts) {
  console.log(`\n--- ${script.name} ---`);
  try {
    execSync(script.cmd, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✓ ${script.name}: OK`);
  } catch (err) {
    console.log(`✗ ${script.name}: FALHOU`);
    failed++;
  }
}

console.log('\n=== RESUMO ===');
if (failed === 0) {
  console.log('✓ Todas as auditorias passaram.');
  process.exit(0);
} else {
  console.log(`✗ ${failed} auditoria(s) falharam.`);
  process.exit(1);
}
