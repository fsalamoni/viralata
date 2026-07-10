/**
 * @fileoverview Testes do serviço de Perfil do Adotante (Fase 4).
 *
 * Cobre:
 * - Validação Zod (CPF, CEP, UF, enums)
 * - createAdopterProfile falha se já existe
 * - updateAdopterProfile calcula completude
 * - recordConsent cria/atualiza consent array
 * - Limpar campo com null (deleteField)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockDeleteField = vi.fn(() => ({ _isDeleteField: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  deleteField: () => mockDeleteField(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const {
  getAdopterProfile,
  createAdopterProfile,
  updateAdopterProfile,
  recordConsent,
} = await import('./adopterProfileService');
const {
  adopterProfileSchema,
  computeProfileCompleteness,
  getMissingFields,
  LIVING_ARRANGEMENTS,
  PET_EXPERIENCE_LEVELS,
  HOME_TYPES,
} = await import('@/modules/shelter/domain/operational/adopterProfile');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function existingSnap(data) {
  return { id: 'main', exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

// ─── Enums ──────────────────────────────────────────────────────────────

describe('enums do adotante', () => {
  it('LIVING_ARRANGEMENTS tem 6 valores', () => {
    expect(LIVING_ARRANGEMENTS.length).toBe(6);
  });
  it('PET_EXPERIENCE_LEVELS tem 5 valores (none → professional)', () => {
    expect(PET_EXPERIENCE_LEVELS).toEqual(['none', 'beginner', 'intermediate', 'experienced', 'professional']);
  });
  it('HOME_TYPES tem 5 valores', () => {
    expect(HOME_TYPES).toContain('house');
    expect(HOME_TYPES).toContain('apartment');
  });
});

// ─── Schema Zod ────────────────────────────────────────────────────────

describe('adopterProfileSchema — validação', () => {
  it('rejeita user_uid vazio', () => {
    const r = adopterProfileSchema.safeParse({ user_uid: '', full_name: 'X' });
    expect(r.success).toBe(false);
  });
  it('rejeita full_name curto', () => {
    const r = adopterProfileSchema.safeParse({ user_uid: 'u1', full_name: 'A' });
    expect(r.success).toBe(false);
  });
  it('rejeita CPF mal-formado', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria', cpf: '123',
    });
    expect(r.success).toBe(false);
  });
  it('aceita CPF formatado', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria', cpf: '123.456.789-00',
    });
    expect(r.success).toBe(true);
  });
  it('rejeita UF minúscula', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria',
      address: { state: 'sp' },
    });
    expect(r.success).toBe(false);
  });
  it('aceita UF maiúscula', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria',
      address: { state: 'SP' },
    });
    expect(r.success).toBe(true);
  });
  it('rejeita CEP mal-formado', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria',
      address: { cep: 'abc' },
    });
    expect(r.success).toBe(false);
  });
  it('rejeita pet_experience_level fora do enum', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria', pet_experience_level: 'expert',
    });
    expect(r.success).toBe(false);
  });
  it('aceita current_pets como array', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria',
      current_pets: [{ species: 'dog', name: 'Rex', castrated: true }],
    });
    expect(r.success).toBe(true);
  });
  it('rejeita children_ages com idade absurda', () => {
    const r = adopterProfileSchema.safeParse({
      user_uid: 'u1', full_name: 'Maria',
      children_ages: [25],
    });
    expect(r.success).toBe(false);
  });
});

// ─── computeProfileCompleteness ─────────────────────────────────────────

describe('computeProfileCompleteness', () => {
  it('retorna 0 para perfil vazio', () => {
    expect(computeProfileCompleteness(null)).toBe(0);
  });
  it('retorna 100 para perfil completo', () => {
    const full = {
      full_name: 'Maria', phone: '+5511999999999', email: 'm@m.com',
      address: { city: 'SP' }, household_size: 2,
      home_type: 'house', has_yard: true, landlord_allows_pets: true,
      pet_experience_level: 'experienced', current_pets: [{ species: 'dog', name: 'Rex' }],
      monthly_income_range: '5k_10k', willing_to_spend_vet: true,
      adoption_reason: 'Quero um amigo',
      household_all_agree: true, hours_alone_per_day: 4,
    };
    expect(computeProfileCompleteness(full)).toBe(100);
  });
  it('retorna ~50 para perfil parcial', () => {
    const partial = {
      full_name: 'Maria', phone: '+5511999999999', email: 'm@m.com',
    };
    const c = computeProfileCompleteness(partial);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(50);
  });
});

// ─── getAdopterProfile ──────────────────────────────────────────────────

describe('getAdopterProfile', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getAdopterProfile('u1')).toBeNull();
  });
  it('retorna perfil com user_uid injetado', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({ full_name: 'Maria' }));
    const r = await getAdopterProfile('u1');
    expect(r.user_uid).toBe('u1');
    expect(r.full_name).toBe('Maria');
  });
});

// ─── createAdopterProfile ───────────────────────────────────────────────

describe('createAdopterProfile', () => {
  it('falha se perfil já existe', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({}));
    await expect(
      createAdopterProfile({ full_name: 'Maria' }, { uid: 'u1' }),
    ).rejects.toThrow(/já existe/);
  });

  it('cria perfil com audit', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    mockSetDoc.mockResolvedValue(null);
    const r = await createAdopterProfile(
      { full_name: 'Maria Silva' },
      { uid: 'u1', displayName: 'Maria' },
    );
    expect(r.user_uid).toBe('u1');
    expect(mockSetDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'adopter_profile_created' }),
    );
  });

  it('rejeita user_uid diferente do actor', async () => {
    await expect(
      createAdopterProfile(
        { user_uid: 'outro', full_name: 'Maria' },
        { uid: 'u1' },
      ),
    ).rejects.toThrow(/user_uid/);
  });
});

// ─── updateAdopterProfile ───────────────────────────────────────────────

describe('updateAdopterProfile', () => {
  it('retorna noop se updates vazio', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({}));
    const r = await updateAdopterProfile({}, { uid: 'u1' });
    expect(r.noop).toBe(true);
  });

  it('falha se perfil não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(
      updateAdopterProfile({ phone: '+5511999999999' }, { uid: 'u1' }),
    ).rejects.toThrow(/não existe/);
  });

  it('aplica delta e recalcula completude', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({
      full_name: 'Maria', pet_experience_level: 'none',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateAdopterProfile(
      { pet_experience_level: 'experienced', phone: '+5511999999999' },
      { uid: 'u1' },
    );
    expect(r.changed_fields).toContain('pet_experience_level');
    expect(r.changed_fields).toContain('phone');
    expect(r.completeness).toBeGreaterThan(0);
  });

  it('null = limpar campo (deleteField)', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({
      full_name: 'Maria', phone: '+5511999999999',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateAdopterProfile(
      { phone: null },
      { uid: 'u1' },
    );
    expect(r.changed_fields).toContain('phone');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.phone).toEqual({ _isDeleteField: true });
  });

  it('retorna noop se nada mudou', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({
      full_name: 'Maria', phone: '+5511999999999',
    }));
    const r = await updateAdopterProfile(
      { phone: '+5511999999999' },
      { uid: 'u1' },
    );
    expect(r.noop).toBe(true);
  });
});

// ─── recordConsent ──────────────────────────────────────────────────────

describe('recordConsent', () => {
  it('falha se perfil não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(
      recordConsent('home_visit', true, { uid: 'u1' }),
    ).rejects.toThrow(/não existe/);
  });

  it('cria consent novo', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({}));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await recordConsent('home_visit', true, { uid: 'u1' });
    expect(r.type).toBe('home_visit');
    expect(r.granted).toBe(true);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.consents).toHaveLength(1);
    expect(payload.consents[0].type).toBe('home_visit');
  });

  it('atualiza consent existente (não duplica)', async () => {
    mockGetDoc.mockResolvedValue(existingSnap({
      consents: [
        { type: 'home_visit', granted: false, granted_at: '2025-01-01T00:00:00.000Z' },
      ],
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await recordConsent('home_visit', true, { uid: 'u1' });
    expect(r.granted).toBe(true);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.consents).toHaveLength(1); // não duplica
    expect(payload.consents[0].granted).toBe(true);
  });
});

// ─── getMissingFields ───────────────────────────────────────────────────

describe('getMissingFields', () => {
  it('lista campos críticos faltando', () => {
    const m = getMissingFields({ full_name: 'Maria' });
    expect(m).toContain('phone');
    expect(m).toContain('email');
    expect(m).toContain('address');
    expect(m).toContain('home_type');
  });
  it('retorna [] se tudo preenchido', () => {
    const m = getMissingFields({
      full_name: 'Maria', phone: '+5511999999999', email: 'm@m.com',
      address: { city: 'SP' }, household_size: 1,
      home_type: 'house', pet_experience_level: 'experienced',
      monthly_income_range: '5k_10k', adoption_reason: 'Quero um amigo',
    });
    expect(m).toEqual([]);
  });
});
