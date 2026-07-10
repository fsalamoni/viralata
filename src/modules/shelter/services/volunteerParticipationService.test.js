/**
 * @fileoverview Testes do serviço de Volunteer Participations (Fase 13).
 *
 * Cobre: list, get, create, update, checkInOut (check-in / check-out),
 * delete, calculateHours integration, validações cross-tenant.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
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
  deleteDoc: (...args) => mockDeleteDoc(...args),
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

const mockCreateAuditLog = vi.fn().mockResolvedValue(null);

const {
  listParticipations,
  getParticipation,
  createParticipation,
  updateParticipation,
  checkInOut,
  deleteParticipation,
} = await import('./volunteerParticipationService');

const {
  createVolunteerParticipationSchema,
  volunteerParticipationSchema,
  participationCheckSchema,
  isParticipationInProgress,
  isParticipationCompleted,
  VOLUNTEER_PARTICIPATION_ROLES,
  VOLUNTEER_PARTICIPATION_EVENT_TYPES,
} = await import('@/modules/shelter/domain/operational/volunteerProfile');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockDeleteDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function snap(data, id = 'p-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validInput = {
  shelter_club_id: 'c1',
  volunteer_uid: 'u-1',
  volunteer_name: 'Maria Silva',
  event_type: 'exhibition',
  exhibition_id: 'exh-abc',
  event_label: 'Vitrine da Praça XV',
  event_date: '2026-08-15T14:00:00.000Z',
  role: 'cuidador',
};

// ════════════════════════════════════════════════════════════════════
// ENUMS
// ════════════════════════════════════════════════════════════════════

describe('Enums', () => {
  it('VOLUNTEER_PARTICIPATION_ROLES tem 5 valores', () => {
    expect(VOLUNTEER_PARTICIPATION_ROLES.length).toBe(5);
    expect(VOLUNTEER_PARTICIPATION_ROLES).toContain('cuidador');
    expect(VOLUNTEER_PARTICIPATION_ROLES).toContain('transporte_ida');
  });
  it('VOLUNTEER_PARTICIPATION_EVENT_TYPES tem 4 valores', () => {
    expect(VOLUNTEER_PARTICIPATION_EVENT_TYPES.length).toBe(4);
  });
});

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

describe('isParticipationInProgress / isParticipationCompleted', () => {
  it('inProgress: true se check_in && !check_out', () => {
    expect(isParticipationInProgress({ check_in: '2026-08-15T14:00:00Z' })).toBe(true);
  });
  it('inProgress: false se sem check_in', () => {
    expect(isParticipationInProgress({})).toBe(false);
  });
  it('inProgress: false se check_out já feito', () => {
    expect(isParticipationInProgress({ check_in: 'a', check_out: 'b' })).toBe(false);
  });
  it('completed: true se ambos', () => {
    expect(isParticipationCompleted({ check_in: 'a', check_out: 'b' })).toBe(true);
  });
  it('completed: false se só check_in', () => {
    expect(isParticipationCompleted({ check_in: 'a' })).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════

describe('createVolunteerParticipationSchema', () => {
  it('aceita input válido', () => {
    expect(createVolunteerParticipationSchema.safeParse(validInput).success).toBe(true);
  });
  it('aceita sem exhibition_id (FK opcional)', () => {
    const { exhibition_id, ...rest } = validInput;
    expect(createVolunteerParticipationSchema.safeParse(rest).success).toBe(true);
  });
  it('rejeita event_type inválido', () => {
    expect(createVolunteerParticipationSchema.safeParse({ ...validInput, event_type: 'foo' }).success).toBe(false);
  });
  it('rejeita role inválido', () => {
    expect(createVolunteerParticipationSchema.safeParse({ ...validInput, role: 'foo' }).success).toBe(false);
  });
  it('rejeita volunteer_name curto', () => {
    expect(createVolunteerParticipationSchema.safeParse({ ...validInput, volunteer_name: 'A' }).success).toBe(false);
  });
  it('rejeita event_date mal-formado', () => {
    expect(createVolunteerParticipationSchema.safeParse({ ...validInput, event_date: 'amanhã' }).success).toBe(false);
  });
});

describe('participationCheckSchema', () => {
  it('aceita check_in', () => {
    expect(participationCheckSchema.safeParse({ action: 'check_in' }).success).toBe(true);
  });
  it('aceita check_out com at custom', () => {
    expect(participationCheckSchema.safeParse({
      action: 'check_out',
      at: '2026-08-15T18:00:00Z',
    }).success).toBe(true);
  });
  it('rejeita action inválida', () => {
    expect(participationCheckSchema.safeParse({ action: 'foo' }).success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: listParticipations
// ════════════════════════════════════════════════════════════════════

describe('listParticipations', () => {
  it('lista sem filtros', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [snap(validInput, 'p-1')] });
    const result = await listParticipations('c1');
    expect(result).toHaveLength(1);
    expect(result[0].event_label).toBe('Vitrine da Praça XV');
  });
  it('aplica filtro volunteerUid', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await listParticipations('c1', { volunteerUid: 'u-1' });
    expect(mockWhere).toHaveBeenCalledWith('volunteer_uid', '==', 'u-1');
  });
  it('aplica filtro exhibitionId', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await listParticipations('c1', { exhibitionId: 'exh-abc' });
    expect(mockWhere).toHaveBeenCalledWith('exhibition_id', '==', 'exh-abc');
  });
  it('aplica filtro since/until', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await listParticipations('c1', {
      since: '2026-08-01T00:00:00Z',
      until: '2026-08-31T23:59:59Z',
    });
    expect(mockWhere).toHaveBeenCalledWith('event_date', '>=', '2026-08-01T00:00:00Z');
    expect(mockWhere).toHaveBeenCalledWith('event_date', '<=', '2026-08-31T23:59:59Z');
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: createParticipation
// ════════════════════════════════════════════════════════════════════

describe('createParticipation', () => {
  it('cria doc com hours_logged=0', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'p-new' });
    const result = await createParticipation(validInput, { uid: 'shelter-admin' });
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      ...validInput,
      hours_logged: 0,
      created_by: 'shelter-admin',
    });
    expect(result.id).toBe('p-new');
  });
  it('rejeita event_date inválido', async () => {
    await expect(
      createParticipation({ ...validInput, event_date: 'amanhã' }, { uid: 'shelter-admin' }),
    ).rejects.toThrow();
  });
  it('rejeita sem actor.uid', async () => {
    await expect(createParticipation(validInput, {})).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: updateParticipation
// ════════════════════════════════════════════════════════════════════

describe('updateParticipation', () => {
  it('atualiza notes e event_label', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c1' }, 'p-1'));
    await updateParticipation('c1', 'p-1', {
      notes: 'Animal foi adotado',
      event_label: 'Vitrine alterada',
    }, { uid: 'shelter-admin' });
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      notes: 'Animal foi adotado',
      event_label: 'Vitrine alterada',
    }));
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c-OTHER' }, 'p-1'));
    await expect(
      updateParticipation('c1', 'p-1', { notes: 'x' }, { uid: 'shelter-admin' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
  it('rejeita se participation não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(
      updateParticipation('c1', 'p-1', { notes: 'x' }, { uid: 'shelter-admin' }),
    ).rejects.toThrow(/não encontrada/);
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: checkInOut
// ════════════════════════════════════════════════════════════════════

describe('checkInOut', () => {
  it('check_in grava timestamp', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1',
      volunteer_uid: 'u-1',
    }, 'p-1'));
    const result = await checkInOut('c1', 'p-1', { action: 'check_in' }, { uid: 'u-1' });
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      check_in: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    }));
    expect(result.check_in).toMatch(/^\d{4}/);
  });

  it('check_out calcula hours_logged', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1',
      volunteer_uid: 'u-1',
      check_in: '2026-08-15T14:00:00.000Z',
    }, 'p-1'));
    const result = await checkInOut('c1', 'p-1', {
      action: 'check_out',
      at: '2026-08-15T18:30:00.000Z',
    }, { uid: 'u-1' });
    expect(result.hours_logged).toBe(4.5);
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      hours_logged: 4.5,
    }));
  });

  it('rejeita check_in duplicado', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1',
      check_in: '2026-08-15T14:00:00Z',
    }, 'p-1'));
    await expect(
      checkInOut('c1', 'p-1', { action: 'check_in' }, { uid: 'u-1' }),
    ).rejects.toThrow(/Check-in já foi feito/);
  });

  it('rejeita check_out sem check_in', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1',
    }, 'p-1'));
    await expect(
      checkInOut('c1', 'p-1', { action: 'check_out' }, { uid: 'u-1' }),
    ).rejects.toThrow(/sem check-in/);
  });

  it('rejeita check-out duplicado', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1',
      check_in: '2026-08-15T14:00:00Z',
      check_out: '2026-08-15T18:00:00Z',
    }, 'p-1'));
    await expect(
      checkInOut('c1', 'p-1', { action: 'check_out' }, { uid: 'u-1' }),
    ).rejects.toThrow(/Check-out já foi feito/);
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: deleteParticipation
// ════════════════════════════════════════════════════════════════════

describe('deleteParticipation', () => {
  it('deleta doc se existe', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c1' }, 'p-1'));
    const result = await deleteParticipation('c1', 'p-1', { uid: 'admin' });
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(result.deleted).toBe(true);
  });
  it('retorna deleted=false se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const result = await deleteParticipation('c1', 'p-1', { uid: 'admin' });
    expect(result.deleted).toBe(false);
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c-OTHER' }, 'p-1'));
    await expect(
      deleteParticipation('c1', 'p-1', { uid: 'admin' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});
