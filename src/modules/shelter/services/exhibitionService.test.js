/**
 * @fileoverview Testes do serviço de Vitrines / Eventos (Fase 11).
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
  listExhibitions,
  getExhibition,
  createExhibition,
  updateExhibition,
  startExhibition,
  completeExhibition,
  cancelExhibition,
  addInternalPet,
  removeInternalPet,
  addExternalPet,
  removeExternalPet,
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  listPostEventLogs,
  logPostEvent,
} = await import('./exhibitionService');
const {
  EXHIBITION_STATUS,
  SHIFT_ROLES,
  POST_EVENT_DESTINATIONS,
  assertValidExhibitionTransition,
  isExhibitionTerminal,
  totalExhibitionAnimals,
  formatExhibitionDateTime,
  exhibitionDurationHours,
} = await import('@/modules/shelter/domain/operational/exhibition');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
  // Default: db disponível
  mockGetDocs.mockResolvedValue({ docs: [], empty: true });
  mockAddDoc.mockResolvedValue({ id: 'new-doc-id' });
});

function snap(data, id = 'e-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}
function querySnap(docs) {
  return { docs, empty: docs.length === 0 };
}

const validCreateInput = {
  title: 'Vitrine da Praça',
  organizer_uid: 'u-org',
  venue: { address: 'Praça XV, 100', lat: -22.9, lng: -43.2 },
  datetime_start: '2026-08-01T14:00:00.000Z',
  datetime_end: '2026-08-01T18:00:00.000Z',
  requires_volunteers: true,
};

const actor = { uid: 'u-1', displayName: 'Maria' };

// ─── Enums re-exports ──────────────────────────────────────────────────

describe('enums (re-exported)', () => {
  it('EXHIBITION_STATUS tem 4 estados', () => {
    expect(EXHIBITION_STATUS.length).toBe(4);
  });
  it('SHIFT_ROLES tem 5 roles', () => {
    expect(SHIFT_ROLES.length).toBe(5);
  });
  it('POST_EVENT_DESTINATIONS tem 4 destinos', () => {
    expect(POST_EVENT_DESTINATIONS.length).toBe(4);
  });
});

// ─── listExhibitions ───────────────────────────────────────────────────

describe('listExhibitions', () => {
  it('retorna [] se db indisponível', async () => {
    const origDb = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    const r = await listExhibitions('c-1');
    expect(r).toEqual([]);
    (await import('@/core/config/firebase')).db = origDb;
  });
  it('lança se shelterClubId ausente', async () => {
    await expect(listExhibitions(null)).rejects.toThrow(/shelterClubId/);
    await expect(listExhibitions('')).rejects.toThrow(/shelterClubId/);
  });
  it('lista com filtro de status', async () => {
    mockGetDocs.mockResolvedValue(querySnap([
      snap({ title: 'A', status: 'scheduled' }, 'e-1'),
    ]));
    const r = await listExhibitions('c-1', { status: 'scheduled' });
    expect(r.length).toBe(1);
    expect(mockQuery).toHaveBeenCalled();
  });
  it('lista sem filtro', async () => {
    mockGetDocs.mockResolvedValue(querySnap([snap({}, 'e-1')]));
    const r = await listExhibitions('c-1');
    expect(Array.isArray(r)).toBe(true);
  });
});

// ─── getExhibition ─────────────────────────────────────────────────────

describe('getExhibition', () => {
  it('retorna null se exhibitionId inexistente', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    const r = await getExhibition('c-1', 'e-x');
    expect(r).toBeNull();
  });
  it('retorna null se cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-other' }));
    const r = await getExhibition('c-1', 'e-1');
    expect(r).toBeNull();
  });
  it('retorna doc se tenant bate', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', title: 'A' }));
    const r = await getExhibition('c-1', 'e-1');
    expect(r).toMatchObject({ id: 'e-1', title: 'A' });
  });
  it('retorna null se shelterClubId ausente', async () => {
    const r = await getExhibition(null, 'e-1');
    expect(r).toBeNull();
  });
});

// ─── createExhibition ──────────────────────────────────────────────────

describe('createExhibition', () => {
  it('cria com status=scheduled e audit log', async () => {
    const r = await createExhibition('c-1', validCreateInput, actor);
    expect(r.status).toBe('scheduled');
    expect(r.id).toBe('new-doc-id');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_created', actor }),
    );
  });
  it('rejeita payload inválido (title curto)', async () => {
    await expect(createExhibition('c-1', { ...validCreateInput, title: 'ab' }, actor))
      .rejects.toThrow();
  });
  it('rejeita sem actor.uid', async () => {
    await expect(createExhibition('c-1', validCreateInput, {})).rejects.toThrow(/actor.uid/);
  });
  it('rejeita datetimes invertidos', async () => {
    await expect(createExhibition('c-1', {
      ...validCreateInput,
      datetime_start: '2026-08-01T18:00:00.000Z',
      datetime_end: '2026-08-01T14:00:00.000Z',
    }, actor)).rejects.toThrow();
  });
  it('audit failure é não-bloqueante', async () => {
    mockCreateAuditLog.mockRejectedValueOnce(new Error('audit fail'));
    const r = await createExhibition('c-1', validCreateInput, actor);
    expect(r.id).toBe('new-doc-id');
  });
});

// ─── updateExhibition ──────────────────────────────────────────────────

describe('updateExhibition', () => {
  it('atualiza title e dispara audit', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', datetime_start: 'x', datetime_end: 'y',
    }));
    const r = await updateExhibition('c-1', 'e-1', { title: 'Novo' }, actor);
    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_updated' }),
    );
  });
  it('rejeita patch com campo imutável (organizer_uid)', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'scheduled' }));
    await expect(updateExhibition('c-1', 'e-1', { organizer_uid: 'u-2' }, actor))
      .rejects.toThrow();
  });
  it('rejeita patch com campo imutável (shelter_club_id)', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'scheduled' }));
    await expect(updateExhibition('c-1', 'e-1', { shelter_club_id: 'c-2' }, actor))
      .rejects.toThrow();
  });
  it('rejeita update se status terminal (completed)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'completed', datetime_start: 'x', datetime_end: 'y',
    }));
    await expect(updateExhibition('c-1', 'e-1', { title: 'Novo título' }, actor))
      .rejects.toThrow(/terminal/);
  });
  it('rejeita update se status terminal (cancelled)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'cancelled', datetime_start: 'x', datetime_end: 'y',
    }));
    await expect(updateExhibition('c-1', 'e-1', { notes: 'X' }, actor))
      .rejects.toThrow(/terminal/);
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-other' }));
    await expect(updateExhibition('c-1', 'e-1', { title: 'Novo título' }, actor))
      .rejects.toThrow(/Cross-tenant/);
  });
  it('rejeita novo end_at <= start_at', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled',
      datetime_start: '2026-08-01T14:00:00.000Z',
      datetime_end: '2026-08-01T18:00:00.000Z',
    }));
    await expect(updateExhibition('c-1', 'e-1', {
      datetime_start: '2026-08-01T20:00:00.000Z',
      datetime_end: '2026-08-01T18:00:00.000Z',
    }, actor)).rejects.toThrow(/datetime_end/);
  });
});

// ─── startExhibition ───────────────────────────────────────────────────

describe('startExhibition', () => {
  it('scheduled → active', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'scheduled' }));
    const r = await startExhibition('c-1', 'e-1', actor);
    expect(r.status).toBe('active');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'active' }),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_started' }),
    );
  });
  it('rejeita active → active', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'active' }));
    await expect(startExhibition('c-1', 'e-1', actor)).rejects.toThrow(/já está/);
  });
  it('rejeita completed → active (terminal)', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'completed' }));
    await expect(startExhibition('c-1', 'e-1', actor)).rejects.toThrow(/terminal/);
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-other' }));
    await expect(startExhibition('c-1', 'e-1', actor)).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── completeExhibition ────────────────────────────────────────────────

describe('completeExhibition', () => {
  it('active → completed', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'active' }));
    const r = await completeExhibition('c-1', 'e-1', actor);
    expect(r.status).toBe('completed');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_completed' }),
    );
  });
  it('rejeita scheduled → completed (pula active)', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'scheduled' }));
    await expect(completeExhibition('c-1', 'e-1', actor)).rejects.toThrow(/não permitida/);
  });
});

// ─── cancelExhibition ──────────────────────────────────────────────────

describe('cancelExhibition', () => {
  it('scheduled → cancelled com reason', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', title: 'X',
    }));
    const r = await cancelExhibition('c-1', 'e-1', { reason: 'Chuva forte' }, actor);
    expect(r.status).toBe('cancelled');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_cancelled' }),
    );
  });
  it('active → cancelled', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'active' }));
    const r = await cancelExhibition('c-1', 'e-1', { reason: 'Sem público' }, actor);
    expect(r.status).toBe('cancelled');
  });
  it('rejeita reason curto', async () => {
    await expect(cancelExhibition('c-1', 'e-1', { reason: 'ab' }, actor))
      .rejects.toThrow();
  });
  it('rejeita completed → cancelled (terminal)', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1', status: 'completed' }));
    await expect(cancelExhibition('c-1', 'e-1', { reason: 'foo bar' }, actor))
      .rejects.toThrow(/terminal/);
  });
});

// ─── Pets internos ─────────────────────────────────────────────────────

describe('addInternalPet', () => {
  it('adiciona pet novo', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', pet_ids: ['p-1'], title: 'X',
    }));
    const r = await addInternalPet('c-1', 'e-1', { pet_id: 'p-2' }, actor);
    expect(r.idempotent).toBeUndefined();
    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_pet_added' }),
    );
  });
  it('idempotente se pet já está na lista', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', pet_ids: ['p-1'],
    }));
    const r = await addInternalPet('c-1', 'e-1', { pet_id: 'p-1' }, actor);
    expect(r.idempotent).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
  it('rejeita se status terminal', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'completed', pet_ids: [],
    }));
    await expect(addInternalPet('c-1', 'e-1', { pet_id: 'p-1' }, actor))
      .rejects.toThrow(/terminal/);
  });
  it('rejeita sem pet_id', async () => {
    await expect(addInternalPet('c-1', 'e-1', {}, actor)).rejects.toThrow();
  });
});

describe('removeInternalPet', () => {
  it('remove pet existente', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', pet_ids: ['p-1', 'p-2'],
    }));
    const r = await removeInternalPet('c-1', 'e-1', { pet_id: 'p-1' }, actor);
    expect(r.idempotent).toBeUndefined();
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
  it('idempotente se pet não está', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', pet_ids: ['p-1'],
    }));
    const r = await removeInternalPet('c-1', 'e-1', { pet_id: 'p-99' }, actor);
    expect(r.idempotent).toBe(true);
  });
});

// ─── Pets externos ─────────────────────────────────────────────────────

describe('addExternalPet', () => {
  it('adiciona pet externo', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', external_pets: [], title: 'X',
    }));
    const r = await addExternalPet('c-1', 'e-1', {
      pet_id: 'p-ext', owner_shelter_id: 'c-2', name: 'Buddy',
    }, actor);
    expect(r.idempotent).toBeUndefined();
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
  it('idempotente (mesmo pet_id+owner_shelter_id)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled',
      external_pets: [{ pet_id: 'p-ext', owner_shelter_id: 'c-2', name: 'Buddy' }],
    }));
    const r = await addExternalPet('c-1', 'e-1', {
      pet_id: 'p-ext', owner_shelter_id: 'c-2', name: 'Buddy',
    }, actor);
    expect(r.idempotent).toBe(true);
  });
  it('rejeita se status terminal', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'completed', external_pets: [],
    }));
    await expect(addExternalPet('c-1', 'e-1', {
      pet_id: 'p-ext', owner_shelter_id: 'c-2', name: 'X',
    }, actor)).rejects.toThrow(/terminal/);
  });
});

describe('removeExternalPet', () => {
  it('remove pet externo', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled',
      external_pets: [{ pet_id: 'p-ext', owner_shelter_id: 'c-2', name: 'B' }],
    }));
    const r = await removeExternalPet('c-1', 'e-1', { pet_id: 'p-ext' }, actor);
    expect(r.idempotent).toBeUndefined();
  });
});

// ─── Shifts ────────────────────────────────────────────────────────────

describe('listShifts', () => {
  it('retorna [] se sem shelter/exhibition', async () => {
    // Para listShifts, a verificação de tenant falha e joga erro
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(listShifts('c-1', 'e-1')).rejects.toThrow(/não encontrada/);
  });
  it('lista shifts ordenado por start_at', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1' }));
    mockGetDocs.mockResolvedValue(querySnap([snap({ role: 'carregamento' }, 's-1')]));
    const r = await listShifts('c-1', 'e-1');
    expect(r.length).toBe(1);
    expect(mockOrderBy).toHaveBeenCalled();
  });
});

describe('createShift', () => {
  it('cria shift com slots_filled=0', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'scheduled', title: 'X',
    }));
    const r = await createShift('c-1', 'e-1', {
      start_at: '2026-08-01T13:00:00.000Z',
      end_at: '2026-08-01T15:00:00.000Z',
      role: 'carregamento',
      slots_total: 3,
    }, actor);
    expect(r.slots_filled).toBe(0);
    expect(r.id).toBe('new-doc-id');
  });
  it('rejeita se status terminal', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', status: 'completed',
    }));
    await expect(createShift('c-1', 'e-1', {
      start_at: '2026-08-01T13:00:00.000Z',
      end_at: '2026-08-01T15:00:00.000Z',
      role: 'carregamento',
      slots_total: 1,
    }, actor)).rejects.toThrow(/terminal/);
  });
  it('rejeita slots_total < 1', async () => {
    await expect(createShift('c-1', 'e-1', {
      start_at: '2026-08-01T13:00:00.000Z',
      end_at: '2026-08-01T15:00:00.000Z',
      role: 'carregamento',
      slots_total: 0,
    }, actor)).rejects.toThrow();
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-other' }));
    await expect(createShift('c-1', 'e-1', {
      start_at: '2026-08-01T13:00:00.000Z',
      end_at: '2026-08-01T15:00:00.000Z',
      role: 'carregamento',
      slots_total: 1,
    }, actor)).rejects.toThrow(/Cross-tenant/);
  });
});

describe('updateShift', () => {
  it('atualiza slots_filled e audit', async () => {
    // 1º getDoc: exhibition tenant check
    // 2º getDoc: shift
    mockGetDoc
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1' }))
      .mockResolvedValueOnce(snap({
        shelter_club_id: 'c-1', slots_total: 5, slots_filled: 0,
      }));
    await updateShift('c-1', 'e-1', 's-1', { slots_filled: 3 }, actor);
    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_shift_updated' }),
    );
  });
  it('rejeita slots_filled > slots_total', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1' }))
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1', slots_total: 2, slots_filled: 0 }));
    await expect(updateShift('c-1', 'e-1', 's-1', { slots_filled: 10 }, actor))
      .rejects.toThrow(/slots_filled/);
  });
  it('rejeita cross-tenant no shift', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1' }))
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-other', slots_total: 1 }));
    await expect(updateShift('c-1', 'e-1', 's-1', { slots_filled: 0 }, actor))
      .rejects.toThrow(/Cross-tenant/);
  });
  it('lança se shift não existe', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1' }))
      .mockResolvedValueOnce(missingSnap());
    await expect(updateShift('c-1', 'e-1', 's-x', { slots_filled: 0 }, actor))
      .rejects.toThrow(/não encontrada/);
  });
});

describe('deleteShift', () => {
  it('soft delete (zera slots_total e marca deleted_at)', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1' }))
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1', slots_total: 3 }));
    const r = await deleteShift('c-1', 'e-1', 's-1', actor);
    expect(r.deleted).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-1' }))
      .mockResolvedValueOnce(snap({ shelter_club_id: 'c-other' }));
    await expect(deleteShift('c-1', 'e-1', 's-1', actor)).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── Post-event log ────────────────────────────────────────────────────

describe('listPostEventLogs', () => {
  it('lista ordenado por logged_at desc', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c-1' }));
    mockGetDocs.mockResolvedValue(querySnap([
      snap({ pet_id: 'p-1', destination: 'returned_to_shelter' }, 'log-1'),
    ]));
    const r = await listPostEventLogs('c-1', 'e-1');
    expect(r.length).toBe(1);
  });
  it('lança se exhibition não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(listPostEventLogs('c-1', 'e-x')).rejects.toThrow(/não encontrada/);
  });
});

describe('logPostEvent', () => {
  it('loga destino para pet interno', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1',
      pet_ids: ['p-1'],
      external_pets: [],
      title: 'X',
    }));
    // Idempotência check: getDocs retorna vazio
    mockGetDocs.mockResolvedValue(querySnap([]));
    const r = await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'internal', destination: 'returned_to_shelter',
    }, actor);
    expect(r.id).toBe('new-doc-id');
    expect(r.idempotent).toBeUndefined();
  });
  it('idempotente se já existe log para o pet', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: ['p-1'], external_pets: [], title: 'X',
    }));
    mockGetDocs.mockResolvedValue(querySnap([
      snap({ pet_id: 'p-1', destination: 'adopted' }, 'log-existing'),
    ]));
    const r = await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'internal', destination: 'adopted',
    }, actor);
    expect(r.idempotent).toBe(true);
    expect(r.id).toBe('log-existing');
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
  it('rejeita se pet interno não está em pet_ids', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: ['p-other'], external_pets: [],
    }));
    await expect(logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'internal', destination: 'adopted',
    }, actor)).rejects.toThrow(/não está na lista/);
  });
  it('rejeita se pet externo não está em external_pets', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: [], external_pets: [
        { pet_id: 'p-other', owner_shelter_id: 'c-2', name: 'X' },
      ],
    }));
    await expect(logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'external', destination: 'adopted',
    }, actor)).rejects.toThrow(/não está na lista/);
  });
  it('loga destino para pet externo', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: [],
      external_pets: [{ pet_id: 'p-1', owner_shelter_id: 'c-2', name: 'Buddy' }],
      title: 'X',
    }));
    mockGetDocs.mockResolvedValue(querySnap([]));
    const r = await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'external', destination: 'transferred',
    }, actor);
    expect(r.id).toBe('new-doc-id');
  });
  it('rejeita destination inválido', async () => {
    await expect(logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'internal', destination: 'fugiu',
    }, actor)).rejects.toThrow();
  });

  // ─── TASK-148: timeline events semânticos + audit log ──────────────

  it('TASK-148: adopted cria timeline event tipo "adoption" + audit', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: ['p-1'], external_pets: [], title: 'Feira ADOP',
    }));
    mockGetDocs.mockResolvedValue(querySnap([]));
    const mockAddTimelineEvent = (await import('@/modules/shelter/services/timelineService')).addTimelineEvent;
    mockAddTimelineEvent.mockClear();
    const r = await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-1', pet_origin: 'internal', destination: 'adopted', adopter_uid: 'u-77',
    }, actor);
    expect(r.id).toBe('new-doc-id');
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({
        type: 'adoption',
        data: expect.objectContaining({ adopter_uid: 'u-77' }),
      }),
      expect.anything(),
      expect.anything(),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'exhibition_post_event_logged',
        details: expect.objectContaining({
          pet_id: 'p-1', destination: 'adopted', adopter_uid: 'u-77',
        }),
      }),
    );
  });

  it('TASK-148: transferred cria timeline event tipo "foster_start" + audit', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: ['p-2'], external_pets: [], title: 'Feira X',
    }));
    mockGetDocs.mockResolvedValue(querySnap([]));
    const mockAddTimelineEvent = (await import('@/modules/shelter/services/timelineService')).addTimelineEvent;
    mockAddTimelineEvent.mockClear();
    await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-2', pet_origin: 'internal', destination: 'transferred',
      transferred_to_shelter_id: 'c-99', transferred_to_shelter_name: 'Outro Abrigo',
    }, actor);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(
      'p-2',
      expect.objectContaining({
        type: 'foster_start',
        data: expect.objectContaining({ shelter_club_id: 'c-99' }),
      }),
      expect.anything(),
      expect.anything(),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_post_event_logged' }),
    );
  });

  it('TASK-148: died cria timeline event tipo "deceased"', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: ['p-3'], external_pets: [], title: 'Feira Y',
    }));
    mockGetDocs.mockResolvedValue(querySnap([]));
    const mockAddTimelineEvent = (await import('@/modules/shelter/services/timelineService')).addTimelineEvent;
    mockAddTimelineEvent.mockClear();
    await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-3', pet_origin: 'internal', destination: 'died',
      notes: 'Insuficiência cardíaca durante o evento',
    }, actor);
    expect(mockAddTimelineEvent).toHaveBeenCalledWith(
      'p-3',
      expect.objectContaining({
        type: 'deceased',
        data: expect.objectContaining({ cause: expect.stringContaining('Insuficiência') }),
      }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('TASK-148: pet externo NÃO cria timeline event (escopo internal-only)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c-1', pet_ids: [],
      external_pets: [{ pet_id: 'p-4', owner_shelter_id: 'c-2', name: 'Buddy' }],
      title: 'Feira Z',
    }));
    mockGetDocs.mockResolvedValue(querySnap([]));
    const mockAddTimelineEvent = (await import('@/modules/shelter/services/timelineService')).addTimelineEvent;
    mockAddTimelineEvent.mockClear();
    await logPostEvent('c-1', 'e-1', {
      pet_id: 'p-4', pet_origin: 'external', destination: 'adopted', adopter_uid: 'u-1',
    }, actor);
    expect(mockAddTimelineEvent).not.toHaveBeenCalled();
    // Mas audit log é criado independente de origem
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_post_event_logged' }),
    );
  });
});

// ─── Helpers do domain ─────────────────────────────────────────────────

describe('assertValidExhibitionTransition (via service imports)', () => {
  it('scheduled → active OK', () => {
    expect(() => assertValidExhibitionTransition('scheduled', 'active')).not.toThrow();
  });
  it('completed → active bloqueado', () => {
    expect(() => assertValidExhibitionTransition('completed', 'active')).toThrow();
  });
});

describe('isExhibitionTerminal', () => {
  it('completed e cancelled são terminais', () => {
    expect(isExhibitionTerminal('completed')).toBe(true);
    expect(isExhibitionTerminal('cancelled')).toBe(true);
  });
  it('scheduled e active não', () => {
    expect(isExhibitionTerminal('scheduled')).toBe(false);
    expect(isExhibitionTerminal('active')).toBe(false);
  });
});

describe('totalExhibitionAnimals (helper)', () => {
  it('conta internos + externos', () => {
    expect(totalExhibitionAnimals({
      pet_ids: ['p-1', 'p-2'],
      external_pets: [{ pet_id: 'p-3' }],
    })).toBe(3);
  });
  it('0 para null', () => {
    expect(totalExhibitionAnimals(null)).toBe(0);
  });
});

describe('formatExhibitionDateTime (helper)', () => {
  it('formata ISO em pt-BR', () => {
    expect(formatExhibitionDateTime('2026-08-01T14:30:00.000Z')).toBe('01/08/2026 14:30');
  });
});

describe('exhibitionDurationHours (helper)', () => {
  it('calcula 4h30', () => {
    expect(exhibitionDurationHours({
      datetime_start: '2026-08-01T14:00:00.000Z',
      datetime_end: '2026-08-01T18:30:00.000Z',
    })).toBe(4.5);
  });
});
