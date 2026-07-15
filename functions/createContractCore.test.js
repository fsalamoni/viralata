/**
 * @fileoverview Tests para createContractCore.cjs (TASK-298).
 *
 * Testa a lógica pura (sem firebase-functions) — validação e helpers.
 * Cobertura: validateCreateContractInput, computeSha256, normalizePdfBlob,
 * buildPdfStoragePath, buildContractDocId.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const {
  validateCreateContractInput,
  computeSha256,
  normalizePdfBlob,
  buildPdfStoragePath,
  buildContractDocId,
} = require('./createContractCore.cjs');

const REAL_CALLER_UID = 'uid-adopter-123';
const VALID_INPUT = {
  clubId: 'club-abrigo-1',
  applicationId: 'app-abc-123',
  petId: 'pet-xyz-456',
  adopterUid: REAL_CALLER_UID,
  adopterSignatureText: 'Maria da Silva',
  documentVersion: 'adoption-terms-v1',
  pdfBlob: 'JVBERi0xLjQKJQ==', // "pdf" em base64 (mínimo válido)
};

describe('validateCreateContractInput', () => {
  it('input válido retorna ok=true', () => {
    const result = validateCreateContractInput(VALID_INPUT, REAL_CALLER_UID);
    expect(result.ok).toBe(true);
    expect(result.input.adopterIp).toBeUndefined(); // não passado no data
    expect(result.error).toBeUndefined();
  });

  it('callerUid diferente de adopterUid rejeita', () => {
    const result = validateCreateContractInput(VALID_INPUT, 'outro-uid');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('próprio adotante');
  });

  it('clubId ausente rejeita', () => {
    const input = { ...VALID_INPUT, clubId: undefined };
    const result = validateCreateContractInput(input, REAL_CALLER_UID);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('clubId');
  });

  it('applicationId ausente rejeita', () => {
    const input = { ...VALID_INPUT, applicationId: '' };
    const result = validateCreateContractInput(input, REAL_CALLER_UID);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('applicationId');
  });

  it('adopterSignatureText muito curto rejeita', () => {
    const input = { ...VALID_INPUT, adopterSignatureText: 'AB' };
    const result = validateCreateContractInput(input, REAL_CALLER_UID);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('adopterSignatureText');
  });

  it('pdfBlob ausente rejeita', () => {
    const input = { ...VALID_INPUT, pdfBlob: undefined };
    const result = validateCreateContractInput(input, REAL_CALLER_UID);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('pdfBlob');
  });

  it('payload null rejeita', () => {
    const result = validateCreateContractInput(null, REAL_CALLER_UID);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Payload inválido');
  });

  it('payload não-objeto rejeita', () => {
    const result = validateCreateContractInput('string', REAL_CALLER_UID);
    expect(result.ok).toBe(false);
  });

  it('pdfBlob array de números válido', () => {
    const input = { ...VALID_INPUT, pdfBlob: [37, 80, 68, 70] }; // "%PDF" em bytes
    const result = validateCreateContractInput(input, REAL_CALLER_UID);
    expect(result.ok).toBe(true);
  });

  it('pdfBlob Uint8Array válido', () => {
    const input = { ...VALID_INPUT, pdfBlob: new Uint8Array([37, 80, 68, 70]) };
    const result = validateCreateContractInput(input, REAL_CALLER_UID);
    expect(result.ok).toBe(true);
  });
});

describe('normalizePdfBlob', () => {
  it('Buffer retorna Buffer', () => {
    const buf = Buffer.from('test');
    expect(normalizePdfBlob(buf)).toBeInstanceOf(Buffer);
  });

  it('Uint8Array converte para Buffer', () => {
    const u8 = new Uint8Array([65, 66, 67]);
    const result = normalizePdfBlob(u8);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('ABC');
  });

  it('base64 string decodifica', () => {
    // "ABC" em base64
    const result = normalizePdfBlob('QUJDIg==');
    expect(result.toString()).toBe('ABC ');
  });

  it('array de números converte', () => {
    const result = normalizePdfBlob([65, 66, 67]);
    expect(result.toString()).toBe('ABC');
  });

  it('tipo inválido lança erro', () => {
    expect(() => normalizePdfBlob({})).toThrow();
    expect(() => normalizePdfBlob(123)).toThrow();
  });
});

describe('computeSha256', () => {
  it('computa SHA-256 de Buffer', async () => {
    const buf = Buffer.from('hello');
    const hash = await computeSha256(buf);
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('computa SHA-256 de Uint8Array', async () => {
    const u8 = new Uint8Array([65, 66, 67]);
    const hash = await computeSha256(u8);
    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it('mesmo input → mesmo hash (determinístico)', async () => {
    const data = Buffer.from('test');
    const [h1, h2] = await Promise.all([computeSha256(data), computeSha256(data)]);
    expect(h1).toBe(h2);
  });
});

describe('buildPdfStoragePath', () => {
  it('gera path correto', () => {
    const path = buildPdfStoragePath({ clubId: 'c1', contractId: 'app1_uid2' });
    expect(path).toBe('clubs/c1/contracts/app1_uid2.pdf');
  });
});

describe('buildContractDocId', () => {
  it('gera id determinístico', () => {
    const id1 = buildContractDocId({ applicationId: 'app-1', adopterUid: 'uid-a' });
    const id2 = buildContractDocId({ applicationId: 'app-1', adopterUid: 'uid-a' });
    expect(id1).toBe('app-1_uid-a');
    expect(id1).toBe(id2);
  });

  it('ids diferentes com input diferente', () => {
    const id1 = buildContractDocId({ applicationId: 'app-1', adopterUid: 'uid-a' });
    const id2 = buildContractDocId({ applicationId: 'app-1', adopterUid: 'uid-b' });
    expect(id1).not.toBe(id2);
  });
});
