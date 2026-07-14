#!/usr/bin/env node
/**
 * @fileoverview Auditoria de dependências (TASK-032).
 *
 * Roda `npm audit --json` e gera relatório de saída.
 *
 * Saída:
 * - tabela com severidades
 * - lista de vulnerabilidades critical/high
 * - exit code 1 se há critical
 */
const { execSync } = require('child_process');

function runAudit() {
  try {
    return execSync('npm audit --json', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // npm audit exit code != 0 quando há vulnerabilidades
    if (e.stdout) return e.stdout;
    throw e;
  }
}

const auditRaw = runAudit();
let audit;
try {
  audit = JSON.parse(auditRaw);
} catch (e) {
  console.error('Falha ao parsear npm audit');
  process.exit(1);
}

const meta = audit.metadata?.vulnerabilities || {};
const total = meta.total || 0;
const critical = meta.critical || 0;
const high = meta.high || 0;
const moderate = meta.moderate || 0;
const low = meta.low || 0;

console.log('='.repeat(70));
console.log('Dependency Audit (TASK-032)');
console.log('='.repeat(70));
console.log(`Total: ${total}`);
console.log(`  Critical: ${critical}`);
console.log(`  High:     ${high}`);
console.log(`  Moderate: ${moderate}`);
console.log(`  Low:      ${low}`);
console.log('='.repeat(70));

if (critical > 0 || high > 0) {
  console.log('\nVulnerabilidades bloqueantes:');
  for (const [name, info] of Object.entries(audit.vulnerabilities || {})) {
    if (!['critical', 'high'].includes(info.severity)) continue;
    const via = info.via || [];
    for (const v of via) {
      if (typeof v === 'object' && v) {
        console.log(`  [${info.severity.toUpperCase()}] ${name} → ${v.title} (${v.range})`);
      }
    }
  }
}

if (critical > 0) {
  console.log('\n❌ CRITICAL: build blocked. Atualize deps antes de merge.');
  process.exit(1);
}
process.exit(0);
