/**
 * @fileoverview Testes do serviço de Timeline (Fase 2).
 *
 * Cobre:
 * - Validação por tipo (discriminated union): cada tipo exige seu payload
 * - Multi-tenant: shelter_club_id é obrigatório, cross-tenant bloqueado
 * - Soft delete (audit trail preservado)
 * - Idempotência do backfill
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks (antes do import) ────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockWhere = vi.fn((...args) => ({ _w: true, _args: args }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockCollection = vi.fn((db, path, sub) => ({ _path: sub ? `${path}/${sub}` : path }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
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
  orderBy: (...args) => mockOrderBy(...args),
  limit: (n) => mockLimit(n),
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
  listTimelineEvents,
  getTimelineEvent,
  addTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
  backfillIntakeEvent,
  countEventsByType,
} = await import('./timelineService');
const { TIMELINE_EVENT_TYPES, TIMELINE_EVENT_LABELS, validateTimelinePayload } =
  await import('@/modules/shelter/domain/core/timeline');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

// ─── Enums / Labels ────────────────────────────────────────────────────

describe('TIMELINE_EVENT_TYPES', () => {
  it('tem 16 tipos oficiais (TASK-148: +adoption +foster_start)', () => {
    expect(TIMELINE_EVENT_TYPES.length).toBe(16);
  });
  it('inclui os principais tipos esperados', () => {
    expect(TIMELINE_EVENT_TYPES).toContain('intake');
    expect(TIMELINE_EVENT_TYPES).toContain('weight_measurement');
    expect(TIMELINE_EVENT_TYPES).toContain('vaccine');
    expect(TIMELINE_EVENT_TYPES).toContain('vet_visit');
    expect(TIMELINE_EVENT_TYPES).toContain('status_change');
    expect(TIMELINE_EVENT_TYPES).toContain('transfer');
    expect(TIMELINE_EVENT_TYPES).toContain('deceased');
    // TASK-148: novos tipos
    expect(TIMELINE_EVENT_TYPES).toContain('adoption');
    expect(TIMELINE_EVENT_TYPES).toContain('foster_start');
  });
});

describe('TIMELINE_EVENT_LABELS', () => {
  it('tem label pt-BR para cada tipo', () => {
    for (const t of TIMELINE_EVENT_TYPES) {
      expect(TIMELINE_EVENT_LABELS[t]).toBeTruthy();
    }
  });
});

// ─── validateTimelinePayload ───────────────────────────────────────────

describe('validateTimelinePayload', () => {
  it('valida payload de vaccine corretamente', () => {
    const data = validateTimelinePayload('vaccine', { vaccine_name: 'V10' });
    expect(data.vaccine_name).toBe('V10');
  });

  it('rejeita microchip_id com formato errado', () => {
    expect(() => validateTimelinePayload('microchip_registered', { microchip_id: '123' }))
      .toThrow(/15 dígitos/);
  });

  it('valida weight_measurement com kg positivo', () => {
    const data = validateTimelinePayload('weight_measurement', { weight_kg: 12.5 });
    expect(data.weight_kg).toBe(12.5);
  });

  it('rejeita weight_measurement negativo', () => {
    expect(() => validateTimelinePayload('weight_measurement', { weight_kg: -1 }))
      .toThrow();
  });

  it('valida note com visibility internal (default)', () => {
    const data = validateTimelinePayload('note', { text: 'oi' });
    expect(data.visibility).toBe('internal');
  });

  it('rejeita note sem texto', () => {
    expect(() => validateTimelinePayload('note', { text: '' })).toThrow();
  });

  it('rejeita status_change sem from/to', () => {
    expect(() => validateTimelinePayload('status_change', {})).toThrow();
  });

  it('lança erro para tipo desconhecido', () => {
    expect(() => validateTimelinePayload('invalido', {})).toThrow(/inválido/);
  });
});

// ─── listTimelineEvents ────────────────────────────────────────────────

describe('listTimelineEvents', () => {
  it('retorna [] se db indisponível', async () => {
    const origDb = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    const r = await listTimelineEvents('p1', 'c1');
    expect(r).toEqual([]);
    (await import('@/core/config/firebase')).db = origDb;
  });

  it('lança se faltar petId', async () => {
    await expect(listTimelineEvents('', 'c1')).rejects.toThrow(/petId/);
  });

  it('lança se faltar shelterClubId (multi-tenant)', async () => {
    await expect(listTimelineEvents('p1', '')).rejects.toThrow(/shelterClubId/);
  });

  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ type: 'vaccine', event_date: '2026-07-10' }) },
        { id: 'e2', data: () => ({ type: 'vet_visit', event_date: '2026-07-09' }) },
      ],
    });
    const r = await listTimelineEvents('p1', 'c1');
    expect(r).toHaveLength(2);
    expect(r[0].id).toBe('e1');
    expect(r[1].id).toBe('e2');
  });
});

// ─── getTimelineEvent ──────────────────────────────────────────────────

describe('getTimelineEvent', () => {
  it('retorna null se não existir', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await getTimelineEvent('p1', 'e1', 'c1')).toBeNull();
  });

  it('retorna null se shelter_club_id não bate (multi-tenant)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'vaccine' }),
    });
    const r = await getTimelineEvent('p1', 'e1', 'c2');
    expect(r).toBeNull();
  });

  it('retorna o doc se shelter_club_id bate', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'e1',
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'vaccine' }),
    });
    const r = await getTimelineEvent('p1', 'e1', 'c1');
    expect(r.id).toBe('e1');
    expect(r.type).toBe('vaccine');
  });
});

// ─── addTimelineEvent ──────────────────────────────────────────────────

describe('addTimelineEvent', () => {
  it('lança se faltar shelterClubId nas options', async () => {
    await expect(
      addTimelineEvent('p1', { type: 'note', data: { text: 'oi' } }, { uid: 'u1' }),
    ).rejects.toThrow(/shelterClubId/);
  });

  it('lança se faltar actor.uid', async () => {
    await expect(
      addTimelineEvent(
        'p1', { type: 'note', data: { text: 'oi' } }, {},
        { shelterClubId: 'c1' },
      ),
    ).rejects.toThrow(/actor\.uid/);
  });

  it('rejeita payload de tipo errado', async () => {
    await expect(
      addTimelineEvent(
        'p1', { type: 'vaccine', data: {} }, { uid: 'u1' },
        { shelterClubId: 'c1' },
      ),
    ).rejects.toThrow();
  });

  it('cria evento com payload validado + audit', async () => {
    mockAddDoc.mockResolvedValue({ id: 'e-new' });
    const r = await addTimelineEvent(
      'p1',
      { type: 'vaccine', data: { vaccine_name: 'V10' } },
      { uid: 'u1', displayName: 'Dra Ana' },
      { shelterClubId: 'c1' },
    );
    expect(r.id).toBe('e-new');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'timeline_event_added',
        actor: { uid: 'u1', displayName: 'Dra Ana' },
      }),
    );
  });
});

// ─── updateTimelineEvent ───────────────────────────────────────────────

describe('updateTimelineEvent', () => {
  it('retorna noop se updates vazio', async () => {
    // Mesmo com updates vazio, validamos existência+tenant — então mockamos
    // um evento válido.
    mockGetDoc.mockResolvedValue({
      id: 'e1',
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'note' }),
    });
    const r = await updateTimelineEvent(
      'p1', 'e1', {}, { uid: 'u1' }, { shelterClubId: 'c1' },
    );
    expect(r.noop).toBe(true);
  });

  it('rejeita se event não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await expect(
      updateTimelineEvent(
        'p1', 'e1', { event_date: '2026-07-10T00:00:00.000Z' },
        { uid: 'u1' }, { shelterClubId: 'c1' },
      ),
    ).rejects.toThrow(/não encontrado/);
  });

  it('busca o evento pra validar cross-tenant', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'e1',
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'vaccine' }),
    });
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateTimelineEvent(
      'p1', 'e1', { event_date: '2026-07-10T00:00:00.000Z' },
      { uid: 'u1' }, { shelterClubId: 'c1' },
    );
    expect(r.changed_fields).toContain('event_date');
  });

  it('rejeita cross-tenant update', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'note' }),
    });
    await expect(
      updateTimelineEvent(
        'p1', 'e1', { data: { text: 'novo' } },
        { uid: 'u1' }, { shelterClubId: 'c2' },
      ),
    ).rejects.toThrow(/não pertence/);
  });

  it('atualiza event_date sem exigir payload', async () => {
    mockGetDoc.mockResolvedValue({
      id: 'e1',
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'note' }),
    });
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateTimelineEvent(
      'p1', 'e1', { event_date: '2026-07-10T00:00:00.000Z' },
      { uid: 'u1' }, { shelterClubId: 'c1' },
    );
    expect(r.changed_fields).toContain('event_date');
  });
});

// ─── deleteTimelineEvent ───────────────────────────────────────────────

describe('deleteTimelineEvent', () => {
  it('soft delete: marca deleted_at em vez de remover', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1', type: 'note' }),
    });
    mockUpdateDoc.mockResolvedValue(null);
    await deleteTimelineEvent(
      'p1', 'e1', { uid: 'u1' }, { shelterClubId: 'c1' },
    );
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.deleted_at).toBeTruthy();
    expect(payload.deleted_by_uid).toBe('u1');
  });

  it('rejeita cross-tenant delete', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ shelter_club_id: 'c1' }),
    });
    await expect(
      deleteTimelineEvent(
        'p1', 'e1', { uid: 'u1' }, { shelterClubId: 'c2' },
      ),
    ).rejects.toThrow(/não pertence/);
  });
});

// ─── backfillIntakeEvent ───────────────────────────────────────────────

describe('backfillIntakeEvent', () => {
  it('retorna skipped se já existe intake', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'e-existing' }],
    });
    const r = await backfillIntakeEvent(
      'p1', 'c1', { uid: 'u1' }, { intake_type: 'rescue' },
    );
    expect(r.skipped).toBe(true);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('cria intake se não existir', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'e-new' });
    const r = await backfillIntakeEvent(
      'p1', 'c1', { uid: 'u1' },
      { intake_type: 'rescue', event_date: '2026-07-10T00:00:00.000Z' },
    );
    expect(r.id).toBe('e-new');
  });
});

// ─── countEventsByType ─────────────────────────────────────────────────

describe('countEventsByType', () => {
  it('retorna size do snapshot', async () => {
    mockGetDocs.mockResolvedValue({ size: 7 });
    expect(await countEventsByType('p1', 'c1', 'vaccine')).toBe(7);
  });

  it('rejeita tipo inválido', async () => {
    await expect(countEventsByType('p1', 'c1', 'inexistente')).rejects.toThrow();
  });
});
