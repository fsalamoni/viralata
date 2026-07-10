/**
 * @fileoverview Testes do serviço de Lares Temporários (Fase 7).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockWhere = vi.fn((...args) => ({ _w: true, _args: args }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: mockOrderBy,
  limit: mockLimit,
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

vi.mock('@/modules/shelter/services/timelineService', () => ({
  addTimelineEvent: vi.fn().mockResolvedValue({ id: 'tl-1' }),
}));

const {
  proposeFosterPlacement,
  acceptFosterPlacement,
  extendFosterPlacement,
  endFosterPlacement,
  cancelFosterPlacement,
  listFosterPlacements,
  getFosterPlacement,
} = await import('./fosterService');
const {
  fosterPlacementSchema,
  createFosterPlacementSchema,
  acceptFosterPlacementSchema,
  FOSTER_STATUS,
  FOSTER_ENVIRONMENTS,
  FOSTER_EXPERIENCE,
  assertValidFosterTransition,
  fosterDurationDays,
  isFosterNearEnd,
  isFosterOverdue,
} = await import('@/modules/shelter/domain/operational/foster');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function snap(data, id = 'f-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validInput = {
  shelter_club_id: 'c1',
  pet_id: 'p1',
  foster_uid: 'u-foster',
  full_name: 'Maria Silva',
  email: 'maria@example.com',
  phone: '+5511999999999',
  cpf: '123.456.789-00',
  address: 'Rua A, 100',
  environment: 'house_yard',
  has_yard: true,
  has_fence: true,
  experience: 'experienced',
  years_experience: 5,
  start_date: '2026-07-15T00:00:00.000Z',
  end_date: '2026-08-15T00:00:00.000Z',
};

// ─── Enums ──────────────────────────────────────────────────────────────

describe('FOSTER_STATUS', () => {
  it('tem 6 estados', () => {
    expect(FOSTER_STATUS.length).toBe(6);
  });
  it('inclui pending, active, extended, ended, cancelled, interrupted', () => {
    expect(FOSTER_STATUS).toContain('pending');
    expect(FOSTER_STATUS).toContain('active');
    expect(FOSTER_STATUS).toContain('extended');
    expect(FOSTER_STATUS).toContain('ended');
    expect(FOSTER_STATUS).toContain('cancelled');
    expect(FOSTER_STATUS).toContain('interrupted');
  });
});

describe('FOSTER_ENVIRONMENTS', () => {
  it('tem 5 ambientes', () => {
    expect(FOSTER_ENVIRONMENTS.length).toBe(5);
  });
});

describe('FOSTER_EXPERIENCE', () => {
  it('tem 5 níveis', () => {
    expect(FOSTER_EXPERIENCE).toEqual(['none', 'beginner', 'intermediate', 'experienced', 'professional']);
  });
});

// ─── Transições ────────────────────────────────────────────────────────

describe('assertValidFosterTransition', () => {
  it('permite pending → active', () => {
    expect(() => assertValidFosterTransition('pending', 'active')).not.toThrow();
  });
  it('permite pending → cancelled', () => {
    expect(() => assertValidFosterTransition('pending', 'cancelled')).not.toThrow();
  });
  it('permite active → extended, ended, interrupted', () => {
    expect(() => assertValidFosterTransition('active', 'extended')).not.toThrow();
    expect(() => assertValidFosterTransition('active', 'ended')).not.toThrow();
    expect(() => assertValidFosterTransition('active', 'interrupted')).not.toThrow();
  });
  it('rejeita ended → qualquer (terminal)', () => {
    expect(() => assertValidFosterTransition('ended', 'active')).toThrow(/terminal/);
  });
  it('rejeita pending → extended (precisa ativar antes)', () => {
    expect(() => assertValidFosterTransition('pending', 'extended')).toThrow();
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────

describe('fosterDurationDays', () => {
  it('calcula dias corretamente', () => {
    const r = fosterDurationDays('2026-07-10', '2026-08-09');
    expect(r).toBe(30);
  });
});

describe('isFosterNearEnd / isFosterOverdue', () => {
  it('isFosterNearEnd: true se faltar < 7 dias', () => {
    expect(isFosterNearEnd('2026-07-15T00:00:00.000Z', new Date('2026-07-10T00:00:00.000Z'))).toBe(true);
  });
  it('isFosterNearEnd: false se faltar muito', () => {
    expect(isFosterNearEnd('2027-01-01T00:00:00.000Z', new Date('2026-07-10T00:00:00.000Z'))).toBe(false);
  });
  it('isFosterOverdue: true se já passou', () => {
    expect(isFosterOverdue('2020-01-01T00:00:00.000Z', new Date('2026-07-10T00:00:00.000Z'))).toBe(true);
  });
});

// ─── Schema ────────────────────────────────────────────────────────────

describe('createFosterPlacementSchema', () => {
  it('aceita input válido', () => {
    expect(createFosterPlacementSchema.safeParse(validInput).success).toBe(true);
  });
  it('rejeita full_name curto', () => {
    expect(createFosterPlacementSchema.safeParse({ ...validInput, full_name: 'A' }).success).toBe(false);
  });
  it('rejeita cpf mal-formado', () => {
    expect(createFosterPlacementSchema.safeParse({ ...validInput, cpf: '123' }).success).toBe(false);
  });
  it('rejeita environment fora do enum', () => {
    expect(createFosterPlacementSchema.safeParse({ ...validInput, environment: 'farm' }).success).toBe(false);
  });
  it('rejeita other_pets > 20', () => {
    const many = Array(21).fill({ species: 'dog', name: 'X' });
    expect(createFosterPlacementSchema.safeParse({ ...validInput, other_pets: many }).success).toBe(false);
  });
});

describe('acceptFosterPlacementSchema', () => {
  it('aceita com terms_version + signature_text', () => {
    expect(acceptFosterPlacementSchema.safeParse({
      terms_version: '2026-07-10',
      signature_text: 'Maria Silva',
    }).success).toBe(true);
  });
  it('rejeita sem terms_version', () => {
    expect(acceptFosterPlacementSchema.safeParse({ signature_text: 'X' }).success).toBe(false);
  });
});

// ─── list / get ───────────────────────────────────────────────────────

describe('listFosterPlacements', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listFosterPlacements('c1')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });
  it('lança sem shelterClubId', async () => {
    await expect(listFosterPlacements('')).rejects.toThrow(/shelterClubId/);
  });
  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'f1', data: () => ({ status: 'active' }) },
      ],
    });
    const r = await listFosterPlacements('c1');
    expect(r[0].id).toBe('f1');
  });
});

describe('getFosterPlacement', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getFosterPlacement('c1', 'f1')).toBeNull();
  });
});

// ─── proposeFosterPlacement ──────────────────────────────────────────

describe('proposeFosterPlacement', () => {
  it('cria placement pending + audit', async () => {
    mockAddDoc.mockResolvedValue({ id: 'f-new' });
    const r = await proposeFosterPlacement(validInput, { uid: 'u-abrigo' });
    expect(r.id).toBe('f-new');
    expect(r.status).toBe('pending');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'foster_placement_proposed' }),
    );
  });

  it('rejeita end_date <= start_date', async () => {
    await expect(
      proposeFosterPlacement(
        { ...validInput, start_date: '2026-08-15T00:00:00.000Z', end_date: '2026-07-15T00:00:00.000Z' },
        { uid: 'u1' },
      ),
    ).rejects.toThrow(/end_date/);
  });
});

// ─── acceptFosterPlacement ───────────────────────────────────────────

describe('acceptFosterPlacement', () => {
  it('LT aceita: pending → active', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'pending', shelter_club_id: 'c1', foster_uid: 'u-foster', pet_id: 'p1',
    }, 'f-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await acceptFosterPlacement('c1', 'f-1', {
      terms_version: '2026-07-10', signature_text: 'Maria Silva',
    }, { uid: 'u-foster' });
    expect(r.status).toBe('active');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.foster_profile_snapshot.terms_accepted_at).toBeTruthy();
    expect(payload.foster_profile_snapshot.terms_version).toBe('2026-07-10');
  });

  it('rejeita se actor não é o foster_uid', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'pending', shelter_club_id: 'c1', foster_uid: 'u-foster', pet_id: 'p1',
    }));
    await expect(
      acceptFosterPlacement('c1', 'f-1', {
        terms_version: '2026-07-10', signature_text: 'Maria Silva',
      }, { uid: 'u-outro' }),
    ).rejects.toThrow(/foster_uid/);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'pending', shelter_club_id: 'c2', foster_uid: 'u-foster',
    }));
    await expect(
      acceptFosterPlacement('c1', 'f-1', {
        terms_version: '2026-07-10', signature_text: 'Maria Silva',
      }, { uid: 'u-foster' }),
    ).rejects.toThrow(/tenant/);
  });

  it('rejeita transição inválida (already active)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'active', shelter_club_id: 'c1', foster_uid: 'u-foster',
    }));
    await expect(
      acceptFosterPlacement('c1', 'f-1', {
        terms_version: '2026-07-10', signature_text: 'Maria Silva',
      }, { uid: 'u-foster' }),
    ).rejects.toThrow(/Transição inválida/);
  });
});

// ─── extendFosterPlacement ──────────────────────────────────────────

describe('extendFosterPlacement', () => {
  it('prorroga active → extended, salva original_end_date', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'active', shelter_club_id: 'c1', end_date: '2026-08-15T00:00:00.000Z',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await extendFosterPlacement('c1', 'f-1', {
      new_end_date: '2026-09-15T00:00:00.000Z',
      reason: 'animal se adaptou bem, precisa de mais tempo',
    }, { uid: 'u-abrigo' });
    expect(r.status).toBe('extended');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.original_end_date).toBe('2026-08-15T00:00:00.000Z');
  });

  it('rejeita se new_end_date <= end_date', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'active', shelter_club_id: 'c1', end_date: '2026-08-15T00:00:00.000Z',
    }));
    await expect(
      extendFosterPlacement('c1', 'f-1', {
        new_end_date: '2026-08-10T00:00:00.000Z',
        reason: '...',
      }, { uid: 'u-abrigo' }),
    ).rejects.toThrow(/new_end_date/);
  });
});

// ─── endFosterPlacement ──────────────────────────────────────────────

describe('endFosterPlacement', () => {
  it('finaliza com sucesso + rating', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'active', shelter_club_id: 'c1', pet_id: 'p1',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await endFosterPlacement('c1', 'f-1', {
      reason: 'Animal adotado por terceiro',
      pet_returned_healthy: true,
      foster_rating: 5,
      foster_feedback: 'Excelente LT!',
    }, { uid: 'u-abrigo' });
    expect(r.status).toBe('ended');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.pet_returned_healthy).toBe(true);
    expect(payload.foster_rating).toBe(5);
  });

  it('rejeita reason curto', async () => {
    await expect(
      endFosterPlacement('c1', 'f-1', { reason: 'x' }, { uid: 'u1' }),
    ).rejects.toThrow();
  });

  it('rejeita foster_rating fora de [1, 5]', async () => {
    await expect(
      endFosterPlacement('c1', 'f-1', { reason: '...', foster_rating: 10 }, { uid: 'u1' }),
    ).rejects.toThrow();
  });
});

// ─── cancelFosterPlacement ──────────────────────────────────────────

describe('cancelFosterPlacement', () => {
  it('cancela pending', async () => {
    mockGetDoc.mockResolvedValue(snap({
      status: 'pending', shelter_club_id: 'c1',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await cancelFosterPlacement('c1', 'f-1', 'mudou de ideia', { uid: 'u1' });
    expect(r.status).toBe('cancelled');
  });
});
