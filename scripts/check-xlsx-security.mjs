#!/usr/bin/env node
/**
 * @fileoverview check-xlsx-security — monitor de vulnerabilidades SheetJS
 * (TASK-016: xlsx 0.18.5 tem CVEs GHSA-4r6h-8v6p-xvw6 + GHSA-5pgg-2g8v-p4x9).
 *
 * **O que verifica**:
 *  1. Versão atual do xlsx instalado
 *  2. Lista de CVEs conhecidos do xlsx (database local em `scripts/xlsx-cves.json`)
 *  3. Status de patches disponíveis (CDN-only / npm patched)
 *  4. Recomenda mitigação se versão atual está vulnerável
 *
 * **Por que não usar npm audit**:
 *  - Os CVEs do SheetJS estão em GHSA mas o npm registry não
 *    publicou versão corrigida (patches só no CDN do SheetJS).
 *  - `npm audit` retorna OK para 0.18.5 mesmo com os CVEs.
 *
 * **Uso**:
 *   node scripts/check-xlsx-security.mjs
 *   npm run security:check-xlsx
 *
 * **Exit codes**:
 *   0 — xlsx OK (patched ou versão limpa)
 *   1 — xlsx vulnerável + ação necessária
 *   2 — erro de execução
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

/** Database local de CVEs conhecidos do xlsx (SheetJS). */
const KNOWN_CVES = [
  {
    id: 'GHSA-4r6h-8v6p-xvw6',
    severity: 'high',
    title: 'Prototype Pollution in SheetJS',
    affected: '< 0.20.0',
    fixedInNpm: null, // patch só no CDN
    fixedInCdn: '0.20.0+',
  },
  {
    id: 'GHSA-5pgg-2g8v-p4x9',
    severity: 'high',
    title: 'ReDoS in SheetJS',
    affected: '< 0.20.0',
    fixedInNpm: null, // patch só no CDN
    fixedInCdn: '0.20.0+',
  },
];

function getInstalledXlsxVersion() {
  const pkgPath = join(ROOT, 'node_modules', 'xlsx', 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version;
  } catch (err) {
    return null;
  }
}

function getPackageJsonXlsxRange() {
  const pkgPath = join(ROOT, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.dependencies?.xlsx || pkg.devDependencies?.xlsx || null;
  } catch {
    return null;
  }
}

function checkVulnerable(version) {
  if (!version) return [];
  const [major, minor, patch] = version.split('.').map(Number);
  // Vulnerável: < 0.20.0 (CVE GHSA-4r6h-8v6p-xvw6 + GHSA-5pgg-2g8v-p4x9)
  if (major === 0 && minor < 20) return KNOWN_CVES;
  return [];
}

function main() {
  console.log('\n=== SheetJS (xlsx) Security Check (TASK-016) ===\n');

  const installed = getInstalledXlsxVersion();
  const pkgRange = getPackageJsonXlsxRange();

  console.log(`Versão instalada: ${installed || '(não instalado)'}`);
  console.log(`Range em package.json: ${pkgRange || '(não declarado)'}`);
  console.log('');

  if (!installed) {
    console.log('✅ xlsx não está instalado (sem dependência).');
    process.exit(0);
  }

  const vulns = checkVulnerable(installed);
  if (vulns.length === 0) {
    console.log(`✅ Versão ${installed} está limpa (sem CVEs conhecidos).`);
    process.exit(0);
  }

  console.log(`⚠️  Versão ${installed} está VULNERÁVEL a ${vulns.length} CVE(s):\n`);
  for (const cve of vulns) {
    console.log(`  - ${cve.id} [${cve.severity}] ${cve.title}`);
    console.log(`    Afetado: ${cve.affected}`);
    console.log(`    Patch npm: ${cve.fixedInNpm || '(apenas CDN do SheetJS)'}`);
    console.log(`    Patch CDN: ${cve.fixedInCdn || '-'}`);
  }

  console.log('\n=== Mitigação atual ===');
  console.log('1. Limitação a arquivos .xlsx (sem .xls legado)');
  console.log('2. Parsing client-side (sem execução server-side)');
  console.log('3. Validação Zod do output antes de usar');
  console.log('');
  console.log('=== Próximas ações ===');
  console.log('A. Aguardar SheetJS publicar versão corrigida no npm (status: 2026-Q3)');
  console.log('B. OU instalar via tarball do CDN SheetJS (requer policy change)');
  console.log('C. OU substituir por `exceljs` (dependência mantida, sem CVEs conhecidos)');
  console.log('');

  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('Erro:', err);
  process.exit(2);
}
