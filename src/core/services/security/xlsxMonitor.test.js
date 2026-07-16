/**
 * @fileoverview Testes do xlsxMonitor (TASK-016).
 */
import { describe, it, expect } from 'vitest';
import {
  isXlsxVulnerable,
  compareVersions,
  VULNERABLE_BELOW,
  KNOWN_CVES,
} from './xlsxMonitor.js';

describe('xlsxMonitor — compareVersions', () => {
  it('0.18.5 < 0.20.0', () => {
    expect(compareVersions('0.18.5', VULNERABLE_BELOW)).toBeLessThan(0);
  });

  it('0.20.0 = 0.20.0', () => {
    expect(compareVersions('0.20.0', VULNERABLE_BELOW)).toBe(0);
  });

  it('0.20.1 > 0.20.0', () => {
    expect(compareVersions('0.20.1', VULNERABLE_BELOW)).toBeGreaterThan(0);
  });

  it('1.0.0 > 0.20.0', () => {
    expect(compareVersions('1.0.0', VULNERABLE_BELOW)).toBeGreaterThan(0);
  });

  it('0.19.99 < 0.20.0', () => {
    expect(compareVersions('0.19.99', VULNERABLE_BELOW)).toBeLessThan(0);
  });
});

describe('xlsxMonitor — isXlsxVulnerable', () => {
  it('0.18.5 é vulnerável', () => {
    const r = isXlsxVulnerable('0.18.5');
    expect(r.vulnerable).toBe(true);
    expect(r.cves).toEqual(KNOWN_CVES);
  });

  it('0.20.0 NÃO é vulnerável', () => {
    const r = isXlsxVulnerable('0.20.0');
    expect(r.vulnerable).toBe(false);
    expect(r.cves).toEqual([]);
  });

  it('0.20.3 NÃO é vulnerável', () => {
    const r = isXlsxVulnerable('0.20.3');
    expect(r.vulnerable).toBe(false);
  });

  it('1.0.0 NÃO é vulnerável', () => {
    const r = isXlsxVulnerable('1.0.0');
    expect(r.vulnerable).toBe(false);
  });

  it('null/empty → não vulnerável', () => {
    expect(isXlsxVulnerable(null).vulnerable).toBe(false);
    expect(isXlsxVulnerable('').vulnerable).toBe(false);
    expect(isXlsxVulnerable(undefined).vulnerable).toBe(false);
  });

  it('KNOWN_CVES tem 2 CVEs registrados', () => {
    expect(KNOWN_CVES.length).toBe(2);
    expect(KNOWN_CVES).toContain('GHSA-4r6h-8v6p-xvw6');
    expect(KNOWN_CVES).toContain('GHSA-5pgg-2g8v-p4x9');
  });
});
