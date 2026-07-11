/**
 * @fileoverview Testes do serviço de Termos & Aceites (Fase 19).
 *
 * Cobre:
 *  - getAcceptances (com mock de Firestore)
 *  - getCurrentAcceptances (filtra versões antigas)
 *  - hasAccepted (gating booleano)
 *  - recordAcceptance (Zod + audit + versão desatualizada)
 *  - recordBulkAcceptances (múltiplos aceites)
 *  - getPendingTypes (lista de pendentes)
 *  - deleteAcceptance (apenas platform_admin)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockGetDocs = vi.fn();
const mockQuery = vi.fn((ref, ...rest) => ({ _ref: ref, _rest: rest }));
const mockOrderBy = vi.fn((field, dir) => ({ _field: field, _dir: dir }));
const mockWhere = vi.fn((field, op, val) => ({ _field: field, _op: op, _val: val }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockGetDoc = vi.fn();
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => mockAddDoc(...args),
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  orderBy: (...args) => mockOrderBy(...args),
  query: (...args) => mockQuery(...args),
  serverTimestamp: () => mockServerTimestamp(),
  where: (...args) => mockWhere(...args),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: vi.fn().mockResolvedValue({ ok: true }),
}));

const {
  getAcceptances,
  getCurrentAcceptances,
  hasAccepted,
  getPendingTypes,
  recordAcceptance,
  recordBulkAcceptances,
  deleteAcceptance,
} = await import('./termsAcceptanceService');
const {
  TERMS_TYPE,
  getCurrentTermsVersion,
  computeDocumentHashSync,
} = await import('@/modules/shelter/domain/legal/terms');

const ACTOR = { uid: 'u1', displayName: 'Maria Silva' };
const VALID_HASH = computeDocumentHashSync('doc');

function makeAcceptanceSnap(docs) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d,
    })),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('getAcceptances', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it('retorna [] se não há userId', async () => {
    expect(await getAcceptances(null)).toEqual([]);
    expect(await getAcceptances('')).toEqual([]);
  });

  it('retorna [] se db não está disponível', async () => {
    const { db } = await import('@/core/config/firebase');
    const original = db;
    // re-mock para null temporariamente
    vi.doMock('@/core/config/firebase', () => ({ db: null }));
    const mod = await import('./termsAcceptanceService?null');
    expect(await mod.getAcceptances('u1')).toEqual([]);
    vi.doMock('@/core/config/firebase', () => ({ db: original }));
  });

  it('mapeia docs para {id, ...data}', async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeAcceptanceSnap([
        { id: 'a1', terms_type: 'general', terms_version: '2026-07-10' },
        { id: 'a2', terms_type: 'privacy', terms_version: '2026-07-10' },
      ]),
    );
    const all = await getAcceptances('u1');
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ id: 'a1', terms_type: 'general' });
  });
});

describe('getCurrentAcceptances', () => {
  it('filtra aceites com versão desatualizada', async () => {
    const current = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    mockGetDocs.mockResolvedValueOnce(
      makeAcceptanceSnap([
        { id: 'a1', terms_type: 'general', terms_version: current },
        { id: 'a2', terms_type: 'general', terms_version: '2020-01-01' },
      ]),
    );
    const current_only = await getCurrentAcceptances('u1');
    expect(current_only).toHaveLength(1);
    expect(current_only[0].id).toBe('a1');
  });
});

describe('hasAccepted', () => {
  it('retorna true se existe aceite do tipo na versão atual', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.PRIVACY);
    mockGetDocs.mockResolvedValueOnce(
      makeAcceptanceSnap([
        { id: 'a1', terms_type: 'privacy', terms_version: v },
      ]),
    );
    expect(await hasAccepted('u1', 'privacy')).toBe(true);
  });

  it('retorna false se não existe aceite do tipo', async () => {
    mockGetDocs.mockResolvedValueOnce(makeAcceptanceSnap([]));
    expect(await hasAccepted('u1', 'adopter')).toBe(false);
  });

  it('retorna false se a versão é antiga', async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeAcceptanceSnap([
        { id: 'a1', terms_type: 'adopter', terms_version: '2020-01-01' },
      ]),
    );
    expect(await hasAccepted('u1', 'adopter')).toBe(false);
  });

  it('aceita versão custom (não usa a canônica)', async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeAcceptanceSnap([
        { id: 'a1', terms_type: 'donor', terms_version: '2020-01-01' },
      ]),
    );
    expect(await hasAccepted('u1', 'donor', '2020-01-01')).toBe(true);
  });
});

describe('getPendingTypes', () => {
  it('retorna tipos sem aceite válido', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    mockGetDocs.mockResolvedValueOnce(
      makeAcceptanceSnap([
        { id: 'a1', terms_type: 'general', terms_version: v },
      ]),
    );
    const pending = await getPendingTypes('u1', ['general', 'privacy', 'conduct']);
    expect(pending).toEqual(['privacy', 'conduct']);
  });
});

describe('recordAcceptance', () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: 'new-acceptance-id' });
  });

  it('cria aceite com addDoc + serverTimestamp + audit', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    const result = await recordAcceptance(
      'u1',
      {
        terms_type: 'general',
        terms_version: v,
        document_hash: VALID_HASH,
        signature_text: 'Maria Silva',
        user_agent: 'Mozilla/5.0',
        ip_address: '203.0.113.1',
      },
      ACTOR,
    );
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockAddDoc.mock.calls[0];
    expect(ref._path).toContain('terms_acceptances');
    expect(payload.terms_type).toBe('general');
    expect(payload.signature_text).toBe('Maria Silva');
    expect(payload.user_uid).toBe('u1');
    expect(payload.legal_basis).toContain('LGPD');
    expect(payload.accepted_at).toEqual({ _isServerTimestamp: true });
    expect(result.id).toBe('new-acceptance-id');
  });

  it('rejeita userId diferente de actor.uid', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    await expect(
      recordAcceptance(
        'outro-user',
        { terms_type: 'general', terms_version: v, document_hash: VALID_HASH, signature_text: 'Maria' },
        ACTOR,
      ),
    ).rejects.toThrow(/userId deve bater/);
  });

  it('rejeita actor sem uid', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    await expect(
      recordAcceptance(
        'u1',
        { terms_type: 'general', terms_version: v, document_hash: VALID_HASH, signature_text: 'Maria' },
        {},
      ),
    ).rejects.toThrow(/actor/);
  });

  it('rejeita versão desatualizada', async () => {
    await expect(
      recordAcceptance(
        'u1',
        { terms_type: 'general', terms_version: '2020-01-01', document_hash: VALID_HASH, signature_text: 'Maria' },
        ACTOR,
      ),
    ).rejects.toThrow(/desatualizada/i);
  });

  it('rejeita hash inválido', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    await expect(
      recordAcceptance(
        'u1',
        { terms_type: 'general', terms_version: v, document_hash: 'nao-e-hash', signature_text: 'Maria' },
        ACTOR,
      ),
    ).rejects.toThrow();
  });

  it('rejeita assinatura muito curta', async () => {
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    await expect(
      recordAcceptance(
        'u1',
        { terms_type: 'general', terms_version: v, document_hash: VALID_HASH, signature_text: 'ab' },
        ACTOR,
      ),
    ).rejects.toThrow();
  });

  it('falha de audit é não-bloqueante (warn log)', async () => {
    const auditMod = await import('@/core/services/auditService');
    auditMod.createAuditLog.mockRejectedValueOnce(new Error('audit offline'));
    const loggerMod = await import('@/core/lib/logger');
    const v = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    const res = await recordAcceptance(
      'u1',
      { terms_type: 'general', terms_version: v, document_hash: VALID_HASH, signature_text: 'Maria' },
      ACTOR,
    );
    expect(res.id).toBe('new-acceptance-id');
    expect(loggerMod.logger.warn).toHaveBeenCalled();
  });
});

describe('recordBulkAcceptances', () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
  });

  it('registra múltiplos aceites em sequência', async () => {
    mockAddDoc
      .mockResolvedValueOnce({ id: 'id-1' })
      .mockResolvedValueOnce({ id: 'id-2' })
      .mockResolvedValueOnce({ id: 'id-3' });
    const v1 = getCurrentTermsVersion(TERMS_TYPE.GENERAL);
    const v2 = getCurrentTermsVersion(TERMS_TYPE.PRIVACY);
    const v3 = getCurrentTermsVersion(TERMS_TYPE.CONDUCT);
    const res = await recordBulkAcceptances(
      'u1',
      [
        { terms_type: 'general', terms_version: v1, document_hash: VALID_HASH, signature_text: 'Maria' },
        { terms_type: 'privacy', terms_version: v2, document_hash: VALID_HASH, signature_text: 'Maria' },
        { terms_type: 'conduct', terms_version: v3, document_hash: VALID_HASH, signature_text: 'Maria' },
      ],
      ACTOR,
      { user_agent: 'UA', ip_address: '203.0.113.1' },
    );
    expect(res).toHaveLength(3);
    expect(res.map((r) => r.id)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(mockAddDoc).toHaveBeenCalledTimes(3);
  });

  it('retorna [] se items é vazio', async () => {
    const res = await recordBulkAcceptances('u1', [], ACTOR);
    expect(res).toEqual([]);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});

describe('deleteAcceptance', () => {
  it('rejeita actor que não é platform_admin', async () => {
    await expect(
      deleteAcceptance('u1', 'a1', { uid: 'u1' }),
    ).rejects.toThrow(/platform_admin/);
  });

  it('retorna ref + warning para platform_admin (operação é via Admin SDK)', async () => {
    const res = await deleteAcceptance('u1', 'a1', { uid: 'admin', role: 'platform_admin' });
    expect(res.ref).toBeDefined();
    expect(res.warning).toContain('imutável');
  });
});
