/**
 * @fileoverview Testes do serviço de pós-adoção (Fase 6).
 *
 * Cobre:
 * - Validação Zod
 * - Geração de milestones padrão
 * - Cálculo de scheduled_for
 * - shouldMaterialize: devidos, futuros, no buffer
 * - Idempotência da materialização
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
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));
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
  limit: (n) => mockLimit(n),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: vi.fn(),
  Timestamp: vi.fn(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const {
  createPostAdoption,
  materializeForAdoption,
  markAsReturned,
  pausePostAdoption,
  getPostAdoption,
  listActivePostAdoptions,
} = await import('./postAdoptionService');
const {
  postAdoptionSchema,
  postAdoptionTaskSchema,
  POST_ADOPTION_MILESTONE_TYPES,
  DEFAULT_MILESTONES,
  calculateMilestoneDate,
  shouldMaterialize,
  generateDefaultMilestones,
} = await import('@/modules/shelter/domain/operational/postAdoption');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function postAdoptionSnap(data) {
  return { id: 'pa-1', exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

// ─── Enums / constants ──────────────────────────────────────────────────

describe('POST_ADOPTION_MILESTONE_TYPES', () => {
  it('tem 11 tipos', () => {
    expect(POST_ADOPTION_MILESTONE_TYPES.length).toBe(11);
  });
  it('inclui check_in, vaccine_reminder, vet_followup, birthday', () => {
    expect(POST_ADOPTION_MILESTONE_TYPES).toContain('check_in');
    expect(POST_ADOPTION_MILESTONE_TYPES).toContain('vaccine_reminder');
    expect(POST_ADOPTION_MILESTONE_TYPES).toContain('vet_followup');
    expect(POST_ADOPTION_MILESTONE_TYPES).toContain('birthday');
  });
});

describe('DEFAULT_MILESTONES', () => {
  it('tem 10 milestones padrão', () => {
    expect(DEFAULT_MILESTONES.length).toBe(10);
  });
  it('cobre até 3 anos (1095 dias)', () => {
    const max = Math.max(...DEFAULT_MILESTONES.map((m) => m.days_after));
    expect(max).toBeGreaterThanOrEqual(1095);
  });
});

// ─── calculateMilestoneDate ───────────────────────────────────────────

describe('calculateMilestoneDate', () => {
  it('adiciona dias corretamente', () => {
    const base = '2026-07-10T00:00:00.000Z';
    const r = calculateMilestoneDate(base, 7);
    expect(new Date(r).toISOString()).toBe('2026-07-17T00:00:00.000Z');
  });
  it('funciona com 365 dias', () => {
    const base = '2026-01-01T00:00:00.000Z';
    const r = calculateMilestoneDate(base, 365);
    expect(new Date(r).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

// ─── shouldMaterialize ────────────────────────────────────────────────

describe('shouldMaterialize', () => {
  it('true se scheduled_for <= now (passou)', () => {
    expect(shouldMaterialize({
      scheduled_for: '2020-01-01T00:00:00.000Z',
    }, new Date('2026-07-10T00:00:00.000Z'))).toBe(true);
  });
  it('false se scheduled_for é 53 dias no futuro (> now)', () => {
    // scheduled (Set 1) > now (Jul 10) → return false (no buffer para futuro)
    expect(shouldMaterialize({
      scheduled_for: '2026-09-01T00:00:00.000Z',
    }, new Date('2026-07-10T00:00:00.000Z'))).toBe(false);
  });
  it('true se scheduled_for é 53 dias no PASSADO', () => {
    // scheduled (Mai 1) < now (Jul 10) → return true
    expect(shouldMaterialize({
      scheduled_for: '2026-05-01T00:00:00.000Z',
    }, new Date('2026-07-10T00:00:00.000Z'))).toBe(true);
  });
  it('false se scheduled_for é 200 dias no futuro', () => {
    expect(shouldMaterialize({
      scheduled_for: '2027-01-01T00:00:00.000Z',
    }, new Date('2026-07-10T00:00:00.000Z'))).toBe(false);
  });
});

// ─── generateDefaultMilestones ────────────────────────────────────────

describe('generateDefaultMilestones', () => {
  it('gera milestones com scheduled_for calculado', () => {
    const list = generateDefaultMilestones('2026-07-10T00:00:00.000Z');
    expect(list).toHaveLength(10);
    expect(list[0].scheduled_for).toBe('2026-07-17T00:00:00.000Z'); // +7 dias
    expect(list[0].materialized).toBe(false);
  });
});

// ─── postAdoptionSchema ───────────────────────────────────────────────

describe('postAdoptionSchema', () => {
  it('rejeita sem application_id', () => {
    const r = postAdoptionSchema.safeParse({
      shelter_club_id: 'c1', pet_id: 'p1', adopter_uid: 'u1',
      adoption_date: '2026-07-10T00:00:00.000Z', milestones: [],
    });
    expect(r.success).toBe(false);
  });
  it('aceita completo', () => {
    const r = postAdoptionSchema.safeParse({
      application_id: 'a1', shelter_club_id: 'c1', pet_id: 'p1', adopter_uid: 'u1',
      adoption_date: '2026-07-10T00:00:00.000Z', milestones: [],
    });
    expect(r.success).toBe(true);
  });
});

// ─── createPostAdoption ───────────────────────────────────────────────

describe('createPostAdoption', () => {
  it('cria doc com milestones padrão se vazio', async () => {
    mockAddDoc.mockResolvedValue({ id: 'pa-new' });
    const r = await createPostAdoption(
      {
        application_id: 'a1',
        shelter_club_id: 'c1',
        pet_id: 'p1',
        adopter_uid: 'u1',
        adoption_date: '2026-07-10T00:00:00.000Z',
        milestones: [],
      },
      { uid: 'u-admin' },
    );
    expect(r.total_milestones).toBe(10);
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'post_adoption_created' }),
    );
  });

  it('preserva milestones custom', async () => {
    mockAddDoc.mockResolvedValue({ id: 'pa-new' });
    const r = await createPostAdoption(
      {
        application_id: 'a1', shelter_club_id: 'c1', pet_id: 'p1', adopter_uid: 'u1',
        adoption_date: '2026-07-10T00:00:00.000Z',
        milestones: [
          { type: 'check_in', days_after: 1, title: 'Amanhã' },
          { type: 'check_in', days_after: 2, title: 'Depois de amanhã' },
        ],
      },
      { uid: 'u-admin' },
    );
    expect(r.total_milestones).toBe(2);
  });
});

// ─── materializeForAdoption (CRON) ────────────────────────────────────

describe('materializeForAdoption', () => {
  it('retorna 0 se status não é active', async () => {
    mockGetDoc.mockResolvedValue(postAdoptionSnap({ status: 'returned' }));
    const r = await materializeForAdoption('c1', 'pa-1');
    expect(r.materialized).toBe(0);
    expect(r.reason).toContain('returned');
  });

  it('não cria tasks se nada é devido (dryRun=false)', async () => {
    const future = '2099-01-01T00:00:00.000Z';
    mockGetDoc.mockResolvedValue(postAdoptionSnap({
      status: 'active', milestones: [
        { type: 'check_in', days_after: 99999, title: 'Nunca',
          source_milestone_index: 0, scheduled_for: future, materialized: false },
      ],
    }));
    const r = await materializeForAdoption('c1', 'pa-1');
    expect(r.materialized).toBe(0);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('materializa milestones devidos (idempotente)', async () => {
    const past = '2020-01-01T00:00:00.000Z';
    mockGetDoc.mockResolvedValue(postAdoptionSnap({
      status: 'active', milestones: [
        { type: 'check_in', days_after: 7, title: '1ª semana',
          source_milestone_index: 0, scheduled_for: past, materialized: false },
        { type: 'vet_followup', days_after: 30, title: '1 mês',
          source_milestone_index: 1, scheduled_for: past, materialized: true,
          materialized_task_id: 'task-1' },
      ],
      materialized_count: 1,
    }));
    mockAddDoc.mockResolvedValue({ id: 'task-new' });
    const r = await materializeForAdoption('c1', 'pa-1');
    expect(r.materialized).toBe(1); // só o 1º
    expect(r.alreadyDone).toBe(1);
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('dryRun não cria nem atualiza', async () => {
    const past = '2020-01-01T00:00:00.000Z';
    mockGetDoc.mockResolvedValue(postAdoptionSnap({
      status: 'active', milestones: [
        { type: 'check_in', days_after: 7, title: 'X',
          source_milestone_index: 0, scheduled_for: past, materialized: false },
      ],
    }));
    const r = await materializeForAdoption('c1', 'pa-1', { dryRun: true });
    expect(r.dryRun).toBe(true);
    expect(r.skipped).toBe(1);
    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─── markAsReturned ───────────────────────────────────────────────────

describe('markAsReturned', () => {
  it('falha sem reason', async () => {
    await expect(
      markAsReturned('c1', 'pa-1', '', { uid: 'u1' }),
    ).rejects.toThrow(/reason/);
  });

  it('marca como returned', async () => {
    mockGetDoc.mockResolvedValue(postAdoptionSnap({ status: 'active' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await markAsReturned('c1', 'pa-1', 'animal voltou', { uid: 'u1' });
    expect(r.ok).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
});

// ─── pausePostAdoption ────────────────────────────────────────────────

describe('pausePostAdoption', () => {
  it('pausa sem exigir reason', async () => {
    mockUpdateDoc.mockResolvedValue(null);
    const r = await pausePostAdoption('c1', 'pa-1', { uid: 'u1' });
    expect(r.ok).toBe(true);
  });
});

// ─── getPostAdoption ───────────────────────────────────────────────────

describe('getPostAdoption', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getPostAdoption('c1', 'pa-1')).toBeNull();
  });
  it('retorna doc se existe', async () => {
    mockGetDoc.mockResolvedValue(postAdoptionSnap({ status: 'active' }));
    const r = await getPostAdoption('c1', 'pa-1');
    expect(r.id).toBe('pa-1');
  });
});
