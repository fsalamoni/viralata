/**
 * @fileoverview Testes do serviço de aceite do Termo de Adesão
 * (Fase 19 / Bloco 5).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: vi.fn().mockResolvedValue(null),
}));

const {
  getShelterOnboardingAcceptance,
  acceptShelterOnboardingTerms,
} = await import('./shelterOnboardingService');

const { SHELTER_ONBOARDING_TERMS_VERSION } = await import(
  '@/modules/shelter/domain/legal/shelterOnboardingTerms'
);

beforeEach(() => {
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
});

function snap(data, id = 'terms_accepted') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

describe('getShelterOnboardingAcceptance', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    expect(await getShelterOnboardingAcceptance('c1')).toBeNull();
  });
  it('retorna doc se existe', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      terms_version: SHELTER_ONBOARDING_TERMS_VERSION,
      terms_accepted_at: '2026-07-10T15:00:00Z',
    }));
    const r = await getShelterOnboardingAcceptance('c1');
    expect(r.id).toBe('terms_accepted');
    expect(r.terms_version).toBe(SHELTER_ONBOARDING_TERMS_VERSION);
  });
  it('retorna null se shelterClubId vazio', async () => {
    expect(await getShelterOnboardingAcceptance(null)).toBeNull();
    expect(await getShelterOnboardingAcceptance('')).toBeNull();
  });
});

describe('acceptShelterOnboardingTerms', () => {
  const valid = {
    legal_rep_name: 'João da Silva',
    legal_rep_cpf: '123.456.789-00',
    legal_rep_role: 'Presidente',
    cnpj: '12.345.678/0001-90',
  };

  it('cria doc com snapshot do aceite', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const r = await acceptShelterOnboardingTerms('c1', valid, {
      uid: 'admin-uid',
      displayName: 'João',
    });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      shelter_club_id: 'c1',
      terms_version: SHELTER_ONBOARDING_TERMS_VERSION,
      signature_text: 'João da Silva',
      signature_cpf: '12345678900',
      signature_role: 'Presidente',
      cnpj: '12345678000190',
    });
    expect(r.id).toBe('terms_accepted');
  });

  it('rejeita re-aceite (doc já existe)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      terms_version: SHELTER_ONBOARDING_TERMS_VERSION,
    }));
    await expect(
      acceptShelterOnboardingTerms('c1', valid, { uid: 'admin' }),
    ).rejects.toThrow(/já foi aceito/);
  });

  it('rejeita se shelterClubId vazio', async () => {
    await expect(
      acceptShelterOnboardingTerms('', valid, { uid: 'admin' }),
    ).rejects.toThrow(/shelterClubId/);
  });

  it('rejeita se actor.uid vazio', async () => {
    await expect(
      acceptShelterOnboardingTerms('c1', valid, {}),
    ).rejects.toThrow(/actor\.uid/);
  });

  it('rejeita se signature_role vazia', async () => {
    await expect(
      acceptShelterOnboardingTerms('c1', { ...valid, legal_rep_role: '' }, { uid: 'admin' }),
    ).rejects.toThrow(/Cargo/);
  });

  it('rejeita se CPF inválido', async () => {
    await expect(
      acceptShelterOnboardingTerms('c1', { ...valid, legal_rep_cpf: '123' }, { uid: 'admin' }),
    ).rejects.toThrow(/CPF/);
  });

  it('aceita sem CNPJ', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const { cnpj, ...noCnpj } = valid;
    const r = await acceptShelterOnboardingTerms('c1', noCnpj, { uid: 'admin' });
    expect(mockSetDoc.mock.calls[0][1].cnpj).toBeNull();
    expect(r.signature_cpf).toBe('12345678900');
  });
});
