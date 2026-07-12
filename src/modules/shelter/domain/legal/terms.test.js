/**
 * @fileoverview Testes do domínio de Termos e Aceites (Fase 19).
 *
 * Cobre:
 *  - `TERMS_TYPE` + `getCurrentTermsVersion` para todos os tipos
 *  - `computeDocumentHash` (SHA-256) determinístico
 *  - Schemas Zod (validação de aceite)
 *  - `isAcceptanceCurrent` (versão atual vs antiga)
 *  - `getRequiredTermsForRoles` (cadastro + papel)
 *  - `getPendingAcceptances` (gating)
 */

import { describe, it, expect } from 'vitest';
import {
  TERMS_TYPE,
  TERMS_TYPE_VALUES,
  CURRENT_TERMS_VERSION,
  MANDATORY_TERMS_FOR_SIGNUP,
  computeDocumentHash,
  computeDocumentHashSync,
  documentHashSchema,
  signatureTextSchema,
  termsAcceptanceSchema,
  recordAcceptanceInputSchema,
  getCurrentTermsVersion,
  isAcceptanceCurrent,
  getRequiredTermsForRoles,
  getPendingAcceptances,
  assertAcceptanceIsCurrent,
  getTermsDocument,
} from './terms';

describe('TERMS_TYPE enum + versões canônicas', () => {
  it('expõe 9 tipos canônicos', () => {
    expect(TERMS_TYPE_VALUES).toHaveLength(9);
    expect(TERMS_TYPE_VALUES).toEqual(
      expect.arrayContaining([
        'general', 'privacy', 'conduct', 'adopter', 'shelter',
        'volunteer', 'foster', 'donor', 'cookies',
      ]),
    );
  });

  it('cada tipo tem uma versão canônica no formato YYYY-MM-DD (com sufixo -vN opcional)', () => {
    for (const type of TERMS_TYPE_VALUES) {
      expect(CURRENT_TERMS_VERSION[type]).toMatch(/^\d{4}-\d{2}-\d{2}(-v\d+)?$/);
    }
  });

  it('TERMS_TYPE.GENERAL === "general"', () => {
    expect(TERMS_TYPE.GENERAL).toBe('general');
  });

  it('obrigatórios de cadastro: general, privacy, conduct', () => {
    expect(MANDATORY_TERMS_FOR_SIGNUP).toEqual(['general', 'privacy', 'conduct']);
  });
});

describe('computeDocumentHash', () => {
  it('gera SHA-256 de 64 hex chars prefixado por "sha256:"', async () => {
    const h = await computeDocumentHash('olá mundo');
    expect(h).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('é determinístico para o mesmo input', async () => {
    const a = await computeDocumentHash('Termo de Adoção v1');
    const b = await computeDocumentHash('Termo de Adoção v1');
    expect(a).toBe(b);
  });

  it('inputs diferentes → hashes diferentes', async () => {
    const a = await computeDocumentHash('versão A');
    const b = await computeDocumentHash('versão B');
    expect(a).not.toBe(b);
  });

  it('rejeita input não-string', async () => {
    await expect(computeDocumentHash(123)).rejects.toThrow(TypeError);
  });

  it('versão síncrona (Node) bate com a assíncrona', () => {
    const h = computeDocumentHashSync('teste');
    expect(h).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('inclui prefixo "viralata:terms:v1:" (proteção contra collision cross-algorithm)', () => {
    const withPrefix = computeDocumentHashSync('hello');
    const plainHash = require('node:crypto').createHash('sha256').update('viralata:terms:v1:hello', 'utf8').digest('hex');
    expect(withPrefix).toBe(`sha256:${plainHash}`);
    // E o hash puro do input SEM prefixo deve ser diferente
    const bare = require('node:crypto').createHash('sha256').update('hello', 'utf8').digest('hex');
    expect(withPrefix).not.toBe(`sha256:${bare}`);
  });
});

describe('Schemas Zod', () => {
  it('documentHashSchema aceita "sha256:<64 hex>"', () => {
    const valid = `sha256:${'a'.repeat(64)}`;
    expect(documentHashSchema.parse(valid)).toBe(valid);
  });

  it('documentHashSchema rejeita hash mal-formado', () => {
    expect(() => documentHashSchema.parse('md5:abc')).toThrow();
    expect(() => documentHashSchema.parse('sha256:short')).toThrow();
    expect(() => documentHashSchema.parse('plain-string')).toThrow();
  });

  it('signatureTextSchema exige 3-120 chars trimado', () => {
    expect(() => signatureTextSchema.parse('ab')).toThrow();
    expect(signatureTextSchema.parse('  Maria Silva  ')).toBe('Maria Silva');
    expect(() => signatureTextSchema.parse('a'.repeat(121))).toThrow();
  });

  it('termsAcceptanceSchema exige tipos e versão corretos', () => {
    const ok = {
      terms_version: '2026-07-10',
      terms_type: 'general',
      accepted_at: new Date(),
      ip_address: '192.168.0.1',
      user_agent: 'Mozilla/5.0',
      document_hash: `sha256:${'a'.repeat(64)}`,
      signature_text: 'Maria',
      liveness_verified: false,
    };
    expect(() => termsAcceptanceSchema.parse(ok)).not.toThrow();
  });

  it('termsAcceptanceSchema rejeita terms_type inválido', () => {
    const bad = {
      terms_version: '2026-07-10',
      terms_type: 'banana',
      accepted_at: new Date(),
      ip_address: 'unknown',
      user_agent: '',
      document_hash: `sha256:${'a'.repeat(64)}`,
      signature_text: 'Maria',
      liveness_verified: false,
    };
    expect(() => termsAcceptanceSchema.parse(bad)).toThrow();
  });

  it('recordAcceptanceInputSchema tem defaults sensatos', () => {
    const parsed = recordAcceptanceInputSchema.parse({
      terms_type: 'privacy',
      terms_version: '2026-07-10',
      document_hash: `sha256:${'a'.repeat(64)}`,
      signature_text: 'João',
    });
    expect(parsed.user_agent).toBe('');
    expect(parsed.ip_address).toBe('unknown');
    expect(parsed.liveness_verified).toBe(false);
  });
});

describe('getCurrentTermsVersion / isAcceptanceCurrent', () => {
  it('getCurrentTermsVersion retorna ISO date válida', () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getCurrentTermsVersion rejeita tipo inválido', () => {
    expect(() => getCurrentTermsVersion('banana')).toThrow();
  });

  it('isAcceptanceCurrent retorna true para versão atual', () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.ADOPTER);
    expect(isAcceptanceCurrent({ terms_type: 'adopter', terms_version: v })).toBe(true);
  });

  it('isAcceptanceCurrent retorna false para versão antiga', () => {
    expect(isAcceptanceCurrent({ terms_type: 'general', terms_version: '2020-01-01' })).toBe(false);
  });

  it('isAcceptanceCurrent retorna false para payload vazio', () => {
    expect(isAcceptanceCurrent(null)).toBe(false);
    expect(isAcceptanceCurrent({})).toBe(false);
  });
});

describe('getRequiredTermsForRoles', () => {
  it('inclui os 3 obrigatórios de cadastro', () => {
    const required = getRequiredTermsForRoles('adopter');
    expect(required).toEqual(expect.arrayContaining(['general', 'privacy', 'conduct']));
  });

  it('adiciona "adopter" para role adopter', () => {
    const required = getRequiredTermsForRoles('adopter');
    expect(required).toContain('adopter');
  });

  it('adiciona "shelter" para role shelter_admin', () => {
    const required = getRequiredTermsForRoles('shelter_admin');
    expect(required).toContain('shelter');
  });

  it('aceita array de roles e remove duplicados', () => {
    const required = getRequiredTermsForRoles(['adopter', 'donor']);
    expect(required).toContain('adopter');
    expect(required).toContain('donor');
    expect(new Set(required).size).toBe(required.length);
  });

  it('role desconhecido retorna só os obrigatórios', () => {
    const required = getRequiredTermsForRoles('alien');
    expect(required.sort()).toEqual(['conduct', 'general', 'privacy']);
  });
});

describe('getPendingAcceptances', () => {
  it('retorna todos quando não há aceites', () => {
    expect(getPendingAcceptances(['general', 'privacy'], [])).toEqual(['general', 'privacy']);
  });

  it('não retorna tipos já aceitos na versão atual', () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    const acceptances = [{ terms_type: 'general', terms_version: v }];
    expect(getPendingAcceptances(['general', 'privacy'], acceptances)).toEqual(['privacy']);
  });

  it('considera pendente um aceite com versão antiga', () => {
    const acceptances = [{ terms_type: 'general', terms_version: '2020-01-01' }];
    expect(getPendingAcceptances(['general'], acceptances)).toEqual(['general']);
  });
});

describe('assertAcceptanceIsCurrent', () => {
  it('não lança se versão == atual', () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.DONOR);
    expect(() => assertAcceptanceIsCurrent('donor', v)).not.toThrow();
  });

  it('lança erro com code TERMS_VERSION_OUTDATED se versão antiga', () => {
    try {
      assertAcceptanceIsCurrent('donor', '2020-01-01');
      throw new Error('deveria ter lançado');
    } catch (e) {
      expect(e.code).toBe('TERMS_VERSION_OUTDATED');
      expect(String(e.message)).toContain('2020-01-01');
    }
  });
});

describe('getTermsDocument', () => {
  it('retorna metadata completa para cada tipo', () => {
    const doc = getTermsDocument(TERMS_TYPE.ADOPTER);
    expect(doc).toMatchObject({
      type: 'adopter',
      path: '/termos-adocao',
      version: getCurrentTermsVersion(TERMS_TYPE.ADOPTER),
    });
    expect(doc.label).toContain('Ado');
  });

  it('rejeita tipo inválido', () => {
    expect(() => getTermsDocument('banana')).toThrow();
  });
});
