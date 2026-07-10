/**
 * @fileoverview Testes do serviço de Vitrines / Eventos (Fase 11).
 *
 * Cobre CRUD multi-tenant, transições de estado, validações
 * defensivas (cross-tenant, organizer imutável, status terminal),
 * outcomes pós-evento e idempotência de add/remove animal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockArrayUnion = vi.fn((...args) => ({ _arrayUnion: args }));
const mockArrayRemove = vi.fn((...args) => ({ _arrayRemove: args }));
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
  arrayUnion: (...args) => mockArrayUnion(...args),
  arrayRemove: (...args) => mockArrayRemove(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const {
  listExhibitions,
  getExhibition,
  createExhibition,
  updateExhibition,
  activateExhibition,
  completeExhibition,
  cancelExhibition,
  addExhibitionAnimal,
  removeExhibitionAnimal,
  addExhibitionOutcome,
  countExhibitions,
} = await import('./exhibitionService');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function snap(data, id = 'exh-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validCreateInput = {
  title: 'Vitrine da Praça XV',
  organizer_shelter_id: 'shelter-abc',
  co_organizers: ['shelter-xyz'],
  location: {
    address: 'Praça XV, s/n',
    city: 'Florianópolis',
    state: 'SC',
  },
  date: { seconds: 1720740000, nanoseconds: 0 },
  time_start: '14:00',
  time_end: '18:00',
  responsible_uids: ['user-1'],
  animals: ['pet-1', 'pet-2'],
  external_pets: [
    { owner_uid: 'user-x', pet_id: 'pet-y', shelter_id: 'shelter-z' },
  ],
  notes: 'Trazer coleiras extras',
};

// ─── listExhibitions ──────────────────────────────────────────────

describe('listExhibitions', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listExhibitions('shelter-abc')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });

  it('lança sem shelterClubId', async () => {
    await expect(listExhibitions('')).rejects.toThrow(/shelterClubId/);
  });

  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ title: 'A', status: 'planned' }) },
        { id: 'e2', data: () => ({ title: 'B', status: 'done' }) },
      ],
    });
    const r = await listExhibitions('shelter-abc');
    expect(r.length).toBe(2);
    expect(r[0].id).toBe('e1');
    expect(r[1].id).toBe('e2');
  });

  it('filtra por upcoming (data futura)', async () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const past = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ title: 'Futura', date: future, time_start: '14:00' }) },
        { id: 'e2', data: () => ({ title: 'Passada', date: past, time_start: '14:00' }) },
      ],
    });
    const r = await listExhibitions('shelter-abc', { upcoming: true });
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('e1');
  });

  it('filtra por past (data passada)', async () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const past = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ title: 'Futura', date: future, time_start: '14:00' }) },
        { id: 'e2', data: () => ({ title: 'Passada', date: past, time_end: '18:00' }) },
      ],
    });
    const r = await listExhibitions('shelter-abc', { past: true });
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('e2');
  });
});

// ─── getExhibition ────────────────────────────────────────────────

describe('getExhibition', () => {
  it('retorna null se cross-tenant (organizer diverge)', async () => {
    mockGetDoc.mockResolvedValue(snap({ organizer_shelter_id: 'shelter-outro' }));
    expect(await getExhibition('shelter-abc', 'e1')).toBeNull();
  });

  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getExhibition('shelter-abc', 'e1')).toBeNull();
  });

  it('retorna doc se tenant bate', async () => {
    mockGetDoc.mockResolvedValue(snap({ organizer_shelter_id: 'shelter-abc', title: 'X' }, 'e1'));
    const r = await getExhibition('shelter-abc', 'e1');
    expect(r.id).toBe('e1');
    expect(r.title).toBe('X');
  });
});

// ─── createExhibition ────────────────────────────────────────────

describe('createExhibition', () => {
  it('cria vitrine planned + audit', async () => {
    mockAddDoc.mockResolvedValue({ id: 'e-new' });
    const r = await createExhibition(validCreateInput, { uid: 'u-1', displayName: 'Ana' });
    expect(r.id).toBe('e-new');
    expect(r.status).toBe('planned');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'shelter_exhibition_created' }),
    );
  });

  it('rejeita sem actor.uid', async () => {
    await expect(createExhibition(validCreateInput, { displayName: 'Ana' })).rejects.toThrow(/actor/);
  });

  it('rejeita input com organizer_shelter_id ausente', async () => {
    const { organizer_shelter_id, ...input } = validCreateInput;
    await expect(createExhibition(input, { uid: 'u-1' })).rejects.toThrow();
  });

  it('rejeita input com responsible_uids vazio', async () => {
    await expect(
      createExhibition({ ...validCreateInput, responsible_uids: [] }, { uid: 'u-1' }),
    ).rejects.toThrow();
  });

  it('rejeita time_start fora do formato HH:MM', async () => {
    await expect(
      createExhibition({ ...validCreateInput, time_start: '25:00' }, { uid: 'u-1' }),
    ).rejects.toThrow();
  });
});

// ─── updateExhibition ────────────────────────────────────────────

describe('updateExhibition', () => {
  it('atualiza title + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'planned' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateExhibition('shelter-abc', 'e1', { title: 'Novo título' }, { uid: 'u-1' });
    expect(r.changed_fields).toContain('title');
  });

  it('retorna noop se patch vazio', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'planned' }));
    const r = await updateExhibition('shelter-abc', 'e1', {}, { uid: 'u-1' });
    expect(r.noop).toBe(true);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-outro', status: 'planned' }));
    await expect(
      updateExhibition('shelter-abc', 'e1', { title: 'Novo título' }, { uid: 'u-1' }),
    ).rejects.toThrow(/tenant/);
  });

  it('rejeita update em status terminal (done)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'done' }));
    await expect(
      updateExhibition('shelter-abc', 'e1', { title: 'Novo título' }, { uid: 'u-1' }),
    ).rejects.toThrow(/terminal/);
  });

  it('rejeita update em status terminal (cancelled)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'cancelled' }));
    await expect(
      updateExhibition('shelter-abc', 'e1', { notes: 'X' }, { uid: 'u-1' }),
    ).rejects.toThrow(/terminal/);
  });
});

// ─── activateExhibition ──────────────────────────────────────────

describe('activateExhibition', () => {
  it('planned → active', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'planned' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await activateExhibition('shelter-abc', 'e1', { uid: 'u-1' });
    expect(r.status).toBe('active');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.status).toBe('active');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'shelter_exhibition_activated' }),
    );
  });

  it('rejeita active → active (já ativa)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'active' }));
    await expect(
      activateExhibition('shelter-abc', 'e1', { uid: 'u-1' }),
    ).rejects.toThrow(/Transição inválida/);
  });

  it('rejeita done → active (terminal)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'done' }));
    await expect(
      activateExhibition('shelter-abc', 'e1', { uid: 'u-1' }),
    ).rejects.toThrow(/terminal/);
  });
});

// ─── completeExhibition ──────────────────────────────────────────

describe('completeExhibition', () => {
  it('active → done com outcomes', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'active' }));
    mockUpdateDoc.mockResolvedValue(null);
    const outcomes = [
      { pet_id: 'p1', outcome: 'adopted', adopter_uid: 'u-a' },
      { pet_id: 'p2', outcome: 'returned' },
    ];
    const r = await completeExhibition('shelter-abc', 'e1', outcomes, { uid: 'u-1' });
    expect(r.status).toBe('done');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.status).toBe('done');
    expect(payload.post_event_log.length).toBe(2);
    expect(payload.completed_at).toBeTruthy();
  });

  it('active → done sem outcomes (log vazio)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'active' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await completeExhibition('shelter-abc', 'e1', [], { uid: 'u-1' });
    expect(r.status).toBe('done');
    expect(r.post_event_log.length).toBe(0);
  });

  it('rejeita planned → done (precisa ativar antes)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'planned' }));
    await expect(
      completeExhibition('shelter-abc', 'e1', [], { uid: 'u-1' }),
    ).rejects.toThrow(/Transição inválida/);
  });

  it('rejeita outcome inválido', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'active' }));
    await expect(
      completeExhibition('shelter-abc', 'e1', [{ pet_id: 'p1', outcome: 'fugiu' }], { uid: 'u-1' }),
    ).rejects.toThrow();
  });
});

// ─── cancelExhibition ────────────────────────────────────────────

describe('cancelExhibition', () => {
  it('planned → cancelled com reason', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'planned' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await cancelExhibition('shelter-abc', 'e1', 'Chuva forte', { uid: 'u-1' });
    expect(r.status).toBe('cancelled');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.cancellation_reason).toBe('Chuva forte');
    expect(payload.cancelled_by).toBe('u-1');
  });

  it('active → cancelled (sem reason)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'active' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await cancelExhibition('shelter-abc', 'e1', undefined, { uid: 'u-1' });
    expect(r.status).toBe('cancelled');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.cancellation_reason).toBeNull();
  });

  it('rejeita done → cancelled (terminal)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ organizer_shelter_id: 'shelter-abc', status: 'done' }));
    await expect(
      cancelExhibition('shelter-abc', 'e1', '...', { uid: 'u-1' }),
    ).rejects.toThrow(/terminal/);
  });
});

// ─── addExhibitionAnimal / removeExhibitionAnimal ─────────────────

describe('addExhibitionAnimal', () => {
  it('adiciona pet + audit (idempotente)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'planned', animals: ['p1'],
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await addExhibitionAnimal('shelter-abc', 'e1', 'p2', { uid: 'u-1' });
    expect(r.ok).toBe(true);
    expect(r.animals).toContain('p2');
    expect(mockArrayUnion).toHaveBeenCalledWith('p2');
  });

  it('retorna noop se pet já está na lista', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'planned', animals: ['p1'],
    }));
    const r = await addExhibitionAnimal('shelter-abc', 'e1', 'p1', { uid: 'u-1' });
    expect(r.noop).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejeita em status terminal', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'done', animals: [],
    }));
    await expect(
      addExhibitionAnimal('shelter-abc', 'e1', 'p1', { uid: 'u-1' }),
    ).rejects.toThrow(/terminal/);
  });
});

describe('removeExhibitionAnimal', () => {
  it('remove pet (idempotente)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'planned', animals: ['p1', 'p2'],
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await removeExhibitionAnimal('shelter-abc', 'e1', 'p1', { uid: 'u-1' });
    expect(r.ok).toBe(true);
    expect(r.animals).not.toContain('p1');
    expect(mockArrayRemove).toHaveBeenCalledWith('p1');
  });

  it('retorna noop se pet não está na lista', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'planned', animals: ['p1'],
    }));
    const r = await removeExhibitionAnimal('shelter-abc', 'e1', 'p99', { uid: 'u-1' });
    expect(r.noop).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─── addExhibitionOutcome ───────────────────────────────────────

describe('addExhibitionOutcome', () => {
  it('adiciona outcome em status done', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'done', post_event_log: [],
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await addExhibitionOutcome('shelter-abc', 'e1', {
      pet_id: 'p1', outcome: 'adopted', adopter_uid: 'u-a', notes: 'Família Silva',
    }, { uid: 'u-1' });
    expect(r.ok).toBe(true);
    expect(r.entry.outcome).toBe('adopted');
    expect(r.entry.recorded_at).toBeTruthy();
    expect(mockArrayUnion).toHaveBeenCalled();
  });

  it('adiciona outcome em status active (registro parcial)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'active', post_event_log: [],
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await addExhibitionOutcome('shelter-abc', 'e1', {
      pet_id: 'p1', outcome: 'returned',
    }, { uid: 'u-1' });
    expect(r.ok).toBe(true);
  });

  it('rejeita outcome em status cancelled', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      organizer_shelter_id: 'shelter-abc', status: 'cancelled', post_event_log: [],
    }));
    await expect(
      addExhibitionOutcome('shelter-abc', 'e1', {
        pet_id: 'p1', outcome: 'returned',
      }, { uid: 'u-1' }),
    ).rejects.toThrow(/cancelada/);
  });

  it('rejeita outcome inválido', async () => {
    await expect(
      addExhibitionOutcome('shelter-abc', 'e1', {
        pet_id: 'p1', outcome: 'fugiu',
      }, { uid: 'u-1' }),
    ).rejects.toThrow();
  });
});

// ─── countExhibitions ───────────────────────────────────────────

describe('countExhibitions', () => {
  it('retorna size do snapshot', async () => {
    mockGetDocs.mockResolvedValue({ size: 5 });
    expect(await countExhibitions('shelter-abc')).toBe(5);
  });

  it('passa filtro de status', async () => {
    mockGetDocs.mockResolvedValue({ size: 2 });
    const r = await countExhibitions('shelter-abc', 'done');
    expect(r).toBe(2);
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'done');
  });
});
