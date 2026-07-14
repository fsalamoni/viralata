/**
 * @fileoverview Runtime monitor do SheetJS/xlsx (TASK-016).
 *
 * Detecta em tempo de build/runtime se a versão do xlsx mudou
 * (de 0.18.5 vulnerável para 0.20+ patched). Loga warning se
 * ainda vulnerável, success se patched.
 *
 * **Por que runtime check?**
 * O `npm audit` não detecta os CVEs do SheetJS (eles só foram
 * publicados no GHSA, não no npm audit). O check explícito aqui
 * + o script `check-xlsx-security.mjs` (CI/scheduled) garantem
 * visibilidade.
 *
 * **Uso**:
 *   import { checkXlsxSecurity } from '@/core/services/security/xlsxMonitor';
 *   checkXlsxSecurity();  // loga warning se vulnerável
 *
 * @see docs/security/XLSX_SECURITY.md
 */

const VULNERABLE_BELOW = '0.20.0';
const KNOWN_CVES = [
  'GHSA-4r6h-8v6p-xvw6', // Prototype Pollution
  'GHSA-5pgg-2g8v-p4x9', // ReDoS
];

/**
 * Compara versões semânticas (major.minor.patch).
 * Retorna -1 se a < b, 0 se iguais, 1 se a > b.
 */
function compareVersions(a, b) {
  const [aMaj, aMin, aPat] = a.split('.').map(Number);
  const [bMaj, bMin, bPat] = b.split('.').map(Number);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}

/**
 * Detecta se a versão instalada é vulnerável.
 *
 * @param {string} version - versão do xlsx (semver)
 * @returns {{ vulnerable: boolean, cves: string[] }}
 */
export function isXlsxVulnerable(version) {
  if (!version || typeof version !== 'string') {
    return { vulnerable: false, cves: [] };
  }
  if (compareVersions(version, VULNERABLE_BELOW) < 0) {
    return { vulnerable: true, cves: KNOWN_CVES };
  }
  return { vulnerable: false, cves: [] };
}

/**
 * Loga warning se o xlsx instalado for vulnerável.
 * Use uma vez no startup do app (main.jsx) ou em build script.
 */
export function checkXlsxSecurity() {
  try {
    // Só funciona se o xlsx estiver instalado
    const xlsx = (typeof require !== 'undefined' ? require : null);
    let version = null;
    if (xlsx) {
      // Server-side (Node)
      try {
        const pkg = xlsx('xlsx/package.json');
        version = pkg.version;
      } catch {
        // ignore
      }
    }
    if (!version && typeof process !== 'undefined' && process.versions?.node) {
      // Tenta resolver via dynamic import
      version = process.env.PKG_XLSX_VERSION || null;
    }

    if (!version) {
      return { checked: false, reason: 'version-not-detected' };
    }

    const { vulnerable, cves } = isXlsxVulnerable(version);
    if (vulnerable) {
       
      console.warn(
        `[xlsxMonitor] ⚠️  xlsx@${version} está vulnerável a ${cves.length} CVE(s):`,
        cves.join(', '),
        '— ver docs/security/XLSX_SECURITY.md',
      );
    } else {
       
      console.info(`[xlsxMonitor] ✅ xlsx@${version} está patched`);
    }
    return { checked: true, version, vulnerable, cves };
  } catch (err) {
    return { checked: false, reason: 'check-failed', error: String(err) };
  }
}

export { VULNERABLE_BELOW, KNOWN_CVES, compareVersions };
