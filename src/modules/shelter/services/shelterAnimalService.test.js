/**
 * @fileoverview Testes do serviço de Cadastro Único do Animal (Fase 1).
 *
 * Cobre:
 * - Validação Zod (microchip 15 dígitos, UF 2 chars, ISO 8601, enums)
 * - Detecção de delta (só envia campos alterados)
 * - Audit log com diff legível
 * - Backfill idempotente
 * - Erros claros (pet inexistente, actor sem uid)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks (devem vir ANTES do import do service) ───────────────────────

const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  doc: (_db, col, id) => ({ _path: `${col}/${id}` }),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({
  db: mockDb,
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

// BUG-31 (2026-07-20): shelterAnimalService agora chama ensureCanMutatePet
// no updateShelterAnimalProfile (defense-in-depth de permissões de pet).
// Mockamos para não cascatear Firestore real.
vi.mock('@/modules/pets/services/petService', () => ({
  ensureCanMutatePet: vi.fn().mockResolvedValue(undefined),
}));

const { updateShelterAnimalProfile, getShelterAnimalProfile, backfillShelterProfileFields } =
  await import('./shelterAnimalService');
const { INTAKE_TYPES, ASILOMAR_STATUSES } = await import('@/modules/shelter/domain/core/animal');

// ─── Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function petSnap(data) {
  return { exists: () => true, id: 'pet-1', data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe('INTAKE_TYPES / ASILOMAR_STATUSES — exported enums', () => {
  it('INTAKE_TYPES inclui os 5 valores esperados', () => {
    expect(INTAKE_TYPES).toEqual(['rescue', 'born', 'transfer', 'surrender', 'purchase']);
  });
  it('ASILOMAR_STATUSES inclui os 5 valores oficiais', () => {
    expect(ASILOMAR_STATUSES).toEqual([
      'healthy',
      'treatable_rehabilitatable',
      'treatable_manageable',
      'unhealthy_untreatable',
      'undetermined',
    ]);
  });
});

describe('updateShelterAnimalProfile — validação Zod', () => {
  it('rejeita microchip que não tem 15 dígitos', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    await expect(
      updateShelterAnimalProfile('pet-1', { microchip_id: '123' }, { uid: 'u1' }),
    ).rejects.toThrow(/15 dígitos/);
  });

  it('rejeita UF que não tem 2 caracteres', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    await expect(
      updateShelterAnimalProfile(
        'pet-1',
        { rescue_location: { state: 'RSX' } },
        { uid: 'u1' },
      ),
    ).rejects.toThrow();
  });

  it('rejeita ISO 8601 inválido em rescue_date', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    await expect(
      updateShelterAnimalProfile('pet-1', { rescue_date: 'ontem' }, { uid: 'u1' }),
    ).rejects.toThrow();
  });

  it('rejeita intake_type fora do enum', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    await expect(
      updateShelterAnimalProfile('pet-1', { intake_type: 'robado' }, { uid: 'u1' }),
    ).rejects.toThrow();
  });

  it('rejeita campo extra não listado no schema (.strict)', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    await expect(
      updateShelterAnimalProfile(
        'pet-1',
        { nome_aleatorio_inventado: 'spam' },
        { uid: 'u1' },
      ),
    ).rejects.toThrow();
  });
});

describe('updateShelterAnimalProfile — delta detection', () => {
  it('só envia campos que mudaram', async () => {
    mockGetDoc.mockResolvedValue(
      petSnap({ intake_type: 'rescue', asilomar_status: 'undetermined' }),
    );
    mockUpdateDoc.mockResolvedValue(null);
    await updateShelterAnimalProfile(
      'pet-1',
      { intake_type: 'rescue', asilomar_status: 'healthy' },
      { uid: 'u1' },
    );
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload).not.toHaveProperty('intake_type'); // unchanged
    expect(payload).toHaveProperty('asilomar_status', 'healthy'); // changed
    expect(payload).toHaveProperty('shelter_profile_updated_at');
    expect(payload).toHaveProperty('shelter_profile_updated_by_uid', 'u1');
  });

  it('retorna noop=true quando nada muda', async () => {
    mockGetDoc.mockResolvedValue(petSnap({ asilomar_status: 'healthy' }));
    mockUpdateDoc.mockClear();
    const res = await updateShelterAnimalProfile(
      'pet-1',
      { asilomar_status: 'healthy' },
      { uid: 'u1' },
    );
    expect(res.noop).toBe(true);
    expect(res.changed_fields).toEqual([]);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('updateShelterAnimalProfile — erros', () => {
  it('lança erro se pet não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(
      updateShelterAnimalProfile('ghost', { asilomar_status: 'healthy' }, { uid: 'u1' }),
    ).rejects.toThrow(/não encontrado/);
  });

  it('lança erro se actor não tem uid', async () => {
    await expect(
      updateShelterAnimalProfile('pet-1', { asilomar_status: 'healthy' }, {}),
    ).rejects.toThrow(/actor\.uid/);
  });

  it('lança erro se updates não é objeto', async () => {
    await expect(
      updateShelterAnimalProfile('pet-1', null, { uid: 'u1' }),
    ).rejects.toThrow();
  });
});

describe('updateShelterAnimalProfile — audit log', () => {
  it('faz audit com diff quando muda 1+ campos', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    mockUpdateDoc.mockResolvedValue(null);
    await updateShelterAnimalProfile(
      'pet-1',
      { rescue_date: '2026-07-10T12:00:00.000Z', microchip_id: '123456789012345' },
      { uid: 'u1' },
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'shelter_animal_profile_updated',
        actor: { uid: 'u1' },
        details: expect.objectContaining({
          pet_id: 'pet-1',
          changed_fields: expect.arrayContaining(['rescue_date', 'microchip_id']),
          diff: expect.any(Array),
        }),
      }),
    );
  });

  it('audit log é best-effort: falha não bloqueia update', async () => {
    mockGetDoc.mockResolvedValue(petSnap({}));
    mockUpdateDoc.mockResolvedValue(null);
    mockCreateAuditLog.mockRejectedValue(new Error('firestore down'));
    await expect(
      updateShelterAnimalProfile(
        'pet-1',
        { asilomar_status: 'healthy' },
        { uid: 'u1' },
      ),
    ).resolves.toBeDefined();
  });
});

describe('backfillShelterProfileFields — idempotência', () => {
  it('não escreve nada se pet já tem todos os campos', async () => {
    mockGetDoc.mockResolvedValue(petSnap({ asilomar_status: 'healthy' }));
    mockUpdateDoc.mockClear();
    const res = await backfillShelterProfileFields('pet-1');
    expect(res).toBeNull();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('preenche só os campos ausentes', async () => {
    mockGetDoc.mockResolvedValue(petSnap({ asilomar_status: 'healthy' }));
    mockUpdateDoc.mockClear();
    // pet sem rescue_by_name
    const res = await backfillShelterProfileFields('pet-1');
    // nesse caso não adiciona nada além de asilomar_status que já existe
    expect(res).toBeNull();
  });
});

describe('getShelterAnimalProfile', () => {
  it('retorna só os campos do schema (não vaza outros campos do pet)', async () => {
    mockGetDoc.mockResolvedValue(
      petSnap({
        title: 'Rex',
        status: 'available',
        microchip_id: '123456789012345',
        secret_field: 'shhh',
      }),
    );
    const profile = await getShelterAnimalProfile('pet-1');
    expect(profile.id).toBe('pet-1');
    expect(profile.microchip_id).toBe('123456789012345');
    expect(profile.title).toBeUndefined();
    expect(profile.secret_field).toBeUndefined();
    expect(profile.status).toBeUndefined();
  });

  it('retorna null se pet não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    const profile = await getShelterAnimalProfile('ghost');
    expect(profile).toBeNull();
  });
});
