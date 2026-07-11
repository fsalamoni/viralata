/**
 * @fileoverview Testes do catálogo RLS e do gerador de relatório.
 * Não executa Firestore real — verifica a configuração do
 * catálogo (shape + presença de motivos nas exceções) e a
 * integridade do gerador de relatório.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RLS_TEST_UID,
  EXPECTED_DENY_COLLECTIONS,
  EXPECTED_OPEN_COLLECTIONS,
  SELF_WRITE_COLLECTIONS,
  generateRlsReport,
  runRlsTests,
} from './rlsTest';

describe('rlsTest — constantes', () => {
  it('expose um UID de teste fixo', () => {
    expect(typeof RLS_TEST_UID).toBe('string');
    expect(RLS_TEST_UID.length).toBeGreaterThan(0);
  });
});

describe('rlsTest — catálogo EXPECTED_DENY_COLLECTIONS', () => {
  it('cada item tem collection + op + expected:deny', () => {
    for (const c of EXPECTED_DENY_COLLECTIONS) {
      expect(typeof c.collection).toBe('string');
      expect(typeof c.op).toBe('string');
      expect(c.expected).toBe('deny');
    }
  });

  it('cobre platform_security_alerts (Fase 20)', () => {
    const reads = EXPECTED_DENY_COLLECTIONS.filter((c) => c.collection === 'platform_security_alerts' && c.op === 'read');
    const writes = EXPECTED_DENY_COLLECTIONS.filter((c) => c.collection === 'platform_security_alerts' && c.op === 'write');
    expect(reads.length).toBeGreaterThan(0);
    expect(writes.length).toBeGreaterThan(0);
  });

  it('cobre audit_logs e platform_settings como admin-only', () => {
    expect(EXPECTED_DENY_COLLECTIONS.some((c) => c.collection === 'audit_logs' && c.op === 'read')).toBe(true);
    expect(EXPECTED_DENY_COLLECTIONS.some((c) => c.collection === 'audit_logs' && c.op === 'write')).toBe(true);
    expect(EXPECTED_DENY_COLLECTIONS.some((c) => c.collection === 'platform_settings' && c.op === 'read')).toBe(true);
    expect(EXPECTED_DENY_COLLECTIONS.some((c) => c.collection === 'platform_settings' && c.op === 'write')).toBe(true);
  });

  it('cobre cross-user (outros UIDs)', () => {
    expect(EXPECTED_DENY_COLLECTIONS.some((c) => c.collection === 'users/{otherUid}')).toBe(true);
    expect(EXPECTED_DENY_COLLECTIONS.some((c) => c.collection === 'pets/{otherPetId}')).toBe(true);
  });
});

describe('rlsTest — catálogo EXPECTED_OPEN_COLLECTIONS', () => {
  it('toda exceção allow tem reason justificando', () => {
    for (const c of EXPECTED_OPEN_COLLECTIONS) {
      expect(c.expected).toBe('allow');
      expect(c.reason, `${c.collection}/${c.op} precisa de reason`).toBeTruthy();
    }
  });

  it('inclui as coleções públicas principais', () => {
    expect(EXPECTED_OPEN_COLLECTIONS.some((c) => c.collection === 'pets' && c.op === 'read')).toBe(true);
    expect(EXPECTED_OPEN_COLLECTIONS.some((c) => c.collection === 'clubs' && c.op === 'read')).toBe(true);
  });
});

describe('rlsTest — catálogo SELF_WRITE_COLLECTIONS', () => {
  it('toda exceção self-write tem reason', () => {
    for (const c of SELF_WRITE_COLLECTIONS) {
      expect(c.reason, `${c.collection} precisa de reason`).toBeTruthy();
    }
  });
});

describe('rlsTest — generateRlsReport', () => {
  it('gera um relatório markdown com todas as seções', () => {
    const out = generateRlsReport();
    expect(out).toMatch(/RLS Test/);
    expect(out).toMatch(/DENY esperado/);
    expect(out).toMatch(/ALLOW esperado/);
    expect(out).toMatch(/Self-write/);
    expect(out).toContain(RLS_TEST_UID);
  });

  it('lista platform_security_alerts no relatório', () => {
    const out = generateRlsReport();
    expect(out).toMatch(/platform_security_alerts/);
  });
});

describe('rlsTest — runRlsTests (sem emulador)', () => {
  beforeEach(() => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  });

  it('retorna array vazio se emulador não está rodando (modo catálogo)', async () => {
    const out = await runRlsTests();
    expect(Array.isArray(out)).toBe(true);
    expect(out).toEqual([]);
  });
});
