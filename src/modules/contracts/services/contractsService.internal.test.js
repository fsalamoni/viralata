/**
 * @fileoverview Tests para contractsService.internal.js (TASK-288).
 * Helpers puros — testáveis sem mock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeSha256,
  buildPdfStoragePath,
  buildContractDocId,
  buildStorageUrl,
} from './contractsService.internal';

// Node 22+ tem Web Crypto nativo. Testes que precisam mockar devem usar vi.spyOn.
const realDigest = globalThis.crypto?.subtle?.digest;
function mockDigest(input) {
  // Retorna 32 bytes determinísticos baseados no input (não usado em produção)
  const seed = typeof input === 'string' ? input : JSON.stringify(input);
  const buf = new ArrayBuffer(32);
  const view = new Uint8Array(buf);
  for (let i = 0; i < 32; i++) {
    view[i] = (seed.charCodeAt(i % seed.length) + i) & 0xff;
  }
  return Promise.resolve(buf);
}

describe('contractsService.internal — buildPdfStoragePath', () => {
  it('constrói path clubs/{clubId}/contracts/{contractId}.pdf', () => {
    expect(buildPdfStoragePath({ clubId: 'c1', contractId: 'c2' })).toBe(
      'clubs/c1/contracts/c2.pdf',
    );
  });

  it('lança se faltar clubId', () => {
    expect(() => buildPdfStoragePath({ contractId: 'c2' })).toThrow();
  });

  it('lança se faltar contractId', () => {
    expect(() => buildPdfStoragePath({ clubId: 'c1' })).toThrow();
  });
});

describe('contractsService.internal — buildContractDocId', () => {
  it('id é determinístico (mesmo input = mesmo output)', () => {
    const a = buildContractDocId({ applicationId: 'app-123', adopterUid: 'uid-456' });
    const b = buildContractDocId({ applicationId: 'app-123', adopterUid: 'uid-456' });
    expect(a).toBe(b);
  });

  it('id inclui prefixo do applicationId', () => {
    const id = buildContractDocId({ applicationId: 'my-application-xyz', adopterUid: 'uid' });
    expect(id).toContain('my-application-xyz'.slice(0, 32));
  });

  it('id inclui prefixo do adopterUid', () => {
    const id = buildContractDocId({ applicationId: 'app', adopterUid: 'unique-adopter' });
    expect(id).toContain('unique-adopter'.slice(0, 12));
  });

  it('lança se faltar applicationId', () => {
    expect(() => buildContractDocId({ adopterUid: 'uid' })).toThrow();
  });

  it('lança se faltar adopterUid', () => {
    expect(() => buildContractDocId({ applicationId: 'app' })).toThrow();
  });
});

describe('contractsService.internal — buildStorageUrl', () => {
  it('URL inclui path', () => {
    expect(buildStorageUrl('clubs/c1/contracts/c2.pdf')).toBe(
      'https://storage.googleapis.com/clubs/c1/contracts/c2.pdf',
    );
  });

  it('lança se path vazio', () => {
    expect(() => buildStorageUrl('')).toThrow();
  });
});

describe('contractsService.internal — computeSha256', () => {
  let spy;
  beforeEach(() => {
    if (realDigest) {
      spy = vi.spyOn(globalThis.crypto.subtle, 'digest').mockImplementation(mockDigest);
    }
  });
  afterEach(() => {
    if (spy) spy.mockRestore();
  });

  it('retorna 64 chars hex', async () => {
    const buf = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const hash = await computeSha256(buf);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });

  it('lança se blob é inválido', async () => {
    await expect(computeSha256(null)).rejects.toThrow();
  });

  it('hash é determinístico para mesmo input', async () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5]);
    const h1 = await computeSha256(buf);
    const h2 = await computeSha256(buf);
    expect(h1).toBe(h2);
  });
});

describe('contractsService.internal — schema contractSchema', () => {
  it('CONTRACT_STATUS exporta 3 valores', async () => {
    const { CONTRACT_STATUS } = await import('../schemas/contractSchema');
    expect(Object.values(CONTRACT_STATUS)).toEqual([
      'pending_shelter_signature',
      'fully_signed',
      'cancelled',
    ]);
  });

  it('createContractSchema rejeita shelter_signed_at', async () => {
    const { createContractSchema } = await import('../schemas/contractSchema');
    const data = {
      application_id: 'app-1',
      pet_id: 'pet-1',
      adopter_uid: 'uid-1',
      adopter_signature_text: 'Maria da Silva',
      adopter_signed_at: new Date().toISOString(),
      shelter_club_id: 'c1',
      document_hash: 'a'.repeat(64),
      document_version: 'v1',
      pdf_storage_path: 'clubs/c1/contracts/c1.pdf',
      pdf_size_bytes: 1000,
      status: 'pending_shelter_signature',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Sem shelter_signed_at → OK
    expect(() => createContractSchema.parse(data)).not.toThrow();

    // Com shelter_signed_at → falha (rejeitado pelo .strict())
    const withShelter = { ...data, shelter_signed_at: new Date().toISOString() };
    expect(() => createContractSchema.parse(withShelter)).toThrow(); // strict() recusa campo extra
  });

  it('document_hash deve ser SHA-256 hex (64 chars)', async () => {
    const { createContractSchema } = await import('../schemas/contractSchema');
    const baseData = {
      application_id: 'app-1',
      pet_id: 'pet-1',
      adopter_uid: 'uid-1',
      adopter_signature_text: 'Maria da Silva',
      adopter_signed_at: new Date().toISOString(),
      shelter_club_id: 'c1',
      document_version: 'v1',
      pdf_storage_path: 'clubs/c1/contracts/c1.pdf',
      pdf_size_bytes: 1000,
      status: 'pending_shelter_signature',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Hash inválido (curto demais)
    expect(() => createContractSchema.parse({ ...baseData, document_hash: 'abc' })).toThrow();
    // Hash válido
    expect(() => createContractSchema.parse({ ...baseData, document_hash: 'a'.repeat(64) })).not.toThrow();
  });

  it('parseContractOrThrow lança erro com issues', async () => {
    const { parseContractOrThrow } = await import('../schemas/contractSchema');
    expect(() => parseContractOrThrow({})).toThrow();
    try {
      parseContractOrThrow({});
    } catch (err) {
      expect(err.code).toBe('contract/validation');
      expect(Array.isArray(err.issues)).toBe(true);
    }
  });
});
