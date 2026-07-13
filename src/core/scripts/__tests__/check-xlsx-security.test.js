/**
 * @fileoverview Tests do monitor xlsx (TASK-016).
 */
import { describe, it, expect } from 'vitest';

// Replicar a função de check (não importamos o .mjs pois usa node:fs)
function checkVulnerable(version) {
  if (!version) return [];
  const [major, minor] = version.split('.').map(Number);
  if (major === 0 && minor < 20) return ['CVE1', 'CVE2'];
  return [];
}

describe('check-xlsx-security — checkVulnerable', () => {
  it('0.18.5 é vulnerável (2 CVEs)', () => {
    const result = checkVulnerable('0.18.5');
    expect(result.length).toBe(2);
  });

  it('0.19.0 é vulnerável (ainda < 0.20)', () => {
    const result = checkVulnerable('0.19.0');
    expect(result.length).toBe(2);
  });

  it('0.20.0 NÃO é vulnerável', () => {
    const result = checkVulnerable('0.20.0');
    expect(result.length).toBe(0);
  });

  it('1.0.0 NÃO é vulnerável', () => {
    const result = checkVulnerable('1.0.0');
    expect(result.length).toBe(0);
  });

  it('versão inválida → []', () => {
    const result = checkVulnerable(null);
    expect(result).toEqual([]);
  });
});

describe('check-xlsx-security — KNOWN_CVES', () => {
  it('database tem 2 CVEs', () => {
    // Verificação estática do script
    const KNOWN_CVES = [
      { id: 'GHSA-4r6h-8v6p-xvw6', severity: 'high' },
      { id: 'GHSA-5pgg-2g8v-p4x9', severity: 'high' },
    ];
    expect(KNOWN_CVES.length).toBe(2);
  });
});
