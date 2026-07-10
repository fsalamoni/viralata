/**
 * @fileoverview Testes do serviço RSVP / Escalas de Vitrines (Fase 12).
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
const mockArrayUnion = vi.fn((...args) => ({ _arrayUnion: true, _args: args }));
const mockArrayRemove = vi.fn((...args) => ({ _arrayRemove: true, _args: args }));
const mockCollectionGroup = vi.fn((db, ...path) => ({ _path: path.join('/'), _group: true }));
const mockCreateAuditLog = vi.fn();
const mockCreateNotification = vi.fn();
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
  arrayUnion: (...args) => mockArrayUnion(...args),
  arrayRemove: (...args) => mockArrayRemove(...args),
  collectionGroup: (...args) => mockCollectionGroup(...args),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));
vi.mock('@/core/services/notificationService', () => ({
  createNotification: (...args) => mockCreateNotification(...args),
}));

const svc = await import('./exhibitionRsvpService');
const domain = await import('@/modules/shelter/domain/operational/exhibitionRsvp');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockDeleteDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
  mockCreateNotification.mockReset().mockResolvedValue(null);
  // lazy import reset
  vi.resetModules();
});

function docSnap(data, id = 'doc-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const ACTOR_ADMIN = { uid: 'admin-1', displayName: 'Admin' };
const ACTOR_VOLUNTEER = { uid: 'vol-1', displayName: 'Maria' };

const EXHIBITION_PATH = 'clubs/c1/exhibitions/exh-1';
const EXHIBITION_DATA = {
  id: 'exh-1',
  organizer_shelter_id: 'c1',
  title: 'Vitrine de adoção 2026-07-15',
};

// ─── listInvites ──────────────────────────────────────────────────────

describe('listInvites', () => {
  it('retorna [] se db indisponível', async () => {
    vi.resetModules();
    vi.doMock('@/core/config/firebase', () => ({ db: null }));
    const m = await import('./exhibitionRsvpService');
    expect(await m.listInvites('c1', 'exh-1')).toEqual([]);
  });

  it('lança sem shelterClubId/exhibitionId', async () => {
    await expect(svc.listInvites('', 'exh-1')).rejects.toThrow();
    await expect(svc.listInvites('c1', '')).rejects.toThrow();
  });

  it('lista convites com filtros', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'inv-1', data: () => ({ status: 'yes', volunteer_name: 'Maria' }) },
        { id: 'inv-2', data: () => ({ status: 'pending', volunteer_name: 'João' }) },
      ],
    });
    const r = await svc.listInvites('c1', 'exh-1', { status: 'yes' });
    expect(r.length).toBe(2);
    expect(r[0].id).toBe('inv-1');
  });
});

// ─── getUserInvites (collectionGroup) ─────────────────────────────────

describe('getUserInvites', () => {
  it('lança sem volunteerUid', async () => {
    await expect(svc.getUserInvites('')).rejects.toThrow();
  });

  it('lista convites do voluntário via collectionGroup', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'inv-1', data: () => ({ status: 'yes', volunteer_uid: 'vol-1' }) },
      ],
    });
    const r = await svc.getUserInvites('vol-1');
    expect(r.length).toBe(1);
    expect(mockCollectionGroup).toHaveBeenCalledWith(mockDb, 'invites');
  });

  it('filtra por status', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await svc.getUserInvites('vol-1', { status: 'pending' });
    expect(mockWhere).toHaveBeenCalledWith('volunteer_uid', '==', 'vol-1');
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');
  });
});

// ─── getInvite ────────────────────────────────────────────────────────

describe('getInvite', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await svc.getInvite('c1', 'exh-1', 'inv-x')).toBeNull();
  });

  it('retorna doc com id', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ status: 'yes' }, 'inv-1'));
    const r = await svc.getInvite('c1', 'exh-1', 'inv-1');
    expect(r.id).toBe('inv-1');
    expect(r.status).toBe('yes');
  });
});

// ─── createInvite ─────────────────────────────────────────────────────

describe('createInvite', () => {
  it('cria invite com status pending + audit + notif', async () => {
    // _verifyExhibitionMultiTenant -> getDoc
    mockGetDoc.mockResolvedValueOnce(docSnap(EXHIBITION_DATA, 'exh-1'));
    // addDoc
    mockAddDoc.mockResolvedValue({ id: 'inv-new' });

    const r = await svc.createInvite('c1', 'exh-1', {
      volunteer_uid: 'vol-1',
      volunteer_name: 'Maria Silva',
    }, ACTOR_ADMIN);

    expect(r.id).toBe('inv-new');
    expect(r.status).toBe('pending');
    expect(mockAddDoc).toHaveBeenCalled();
    const payload = mockAddDoc.mock.calls[0][1];
    expect(payload.status).toBe('pending');
    expect(payload.volunteer_uid).toBe('vol-1');
    expect(payload.created_by).toBe('admin-1');
    expect(payload.shelter_club_id).toBe('c1');
    expect(payload.exhibition_id).toBe('exh-1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_rsvp_invited' }),
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'vol-1' }),
    );
  });

  it('lança se exhibition não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(
      svc.createInvite('c1', 'exh-x', { volunteer_uid: 'vol-1', volunteer_name: 'X' }, ACTOR_ADMIN),
    ).rejects.toThrow(/não encontrada/);
  });

  it('lança se cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ organizer_shelter_id: 'c2' }, 'exh-1'));
    await expect(
      svc.createInvite('c1', 'exh-1', { volunteer_uid: 'vol-1', volunteer_name: 'X' }, ACTOR_ADMIN),
    ).rejects.toThrow(/Cross-tenant/);
  });

  it('lança se input inválido (sem volunteer_name)', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap(EXHIBITION_DATA, 'exh-1'));
    await expect(
      svc.createInvite('c1', 'exh-1', { volunteer_uid: 'vol-1' }, ACTOR_ADMIN),
    ).rejects.toThrow();
  });
});

// ─── respondToInvite ──────────────────────────────────────────────────

describe('respondToInvite', () => {
  it('voluntário responde pending → yes', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      volunteer_uid: 'vol-1',
      status: 'pending',
    }, 'inv-1'));
    mockUpdateDoc.mockResolvedValue(null);

    const r = await svc.respondToInvite('c1', 'exh-1', 'inv-1', { status: 'yes' }, ACTOR_VOLUNTEER);
    expect(r.status).toBe('yes');
    expect(r.from).toBe('pending');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.status).toBe('yes');
    expect(payload.response_notes).toBeNull();
    expect(payload.responded_at).toBeTruthy();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_rsvp_responded' }),
    );
  });

  it('voluntário pode mudar de ideia (yes → no)', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      volunteer_uid: 'vol-1',
      status: 'yes',
    }, 'inv-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await svc.respondToInvite('c1', 'exh-1', 'inv-1', { status: 'no' }, ACTOR_VOLUNTEER);
    expect(r.status).toBe('no');
  });

  it('noop se status é o mesmo', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      volunteer_uid: 'vol-1',
      status: 'yes',
    }, 'inv-1'));
    const r = await svc.respondToInvite('c1', 'exh-1', 'inv-1', { status: 'yes' }, ACTOR_VOLUNTEER);
    expect(r.noop).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('lança em transição inválida (yes → pending)', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      volunteer_uid: 'vol-1',
      status: 'yes',
    }, 'inv-1'));
    await expect(
      svc.respondToInvite('c1', 'exh-1', 'inv-1', { status: 'pending' }, ACTOR_VOLUNTEER),
    ).rejects.toThrow();
  });

  it('lança em cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c2',
      volunteer_uid: 'vol-1',
      status: 'pending',
    }, 'inv-1'));
    await expect(
      svc.respondToInvite('c1', 'exh-1', 'inv-1', { status: 'yes' }, ACTOR_VOLUNTEER),
    ).rejects.toThrow(/Cross-tenant/);
  });

  it('lança se invite não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(
      svc.respondToInvite('c1', 'exh-1', 'inv-x', { status: 'yes' }, ACTOR_VOLUNTEER),
    ).rejects.toThrow(/não encontrado/);
  });

  it('lança com response_notes junto', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      volunteer_uid: 'vol-1',
      status: 'pending',
    }, 'inv-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await svc.respondToInvite('c1', 'exh-1', 'inv-1', {
      status: 'yes',
      response_notes: 'Confirmo!',
    }, ACTOR_VOLUNTEER);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.response_notes).toBe('Confirmo!');
  });
});

// ─── cancelInvite ─────────────────────────────────────────────────────

describe('cancelInvite', () => {
  it('deleta invite existente', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      volunteer_uid: 'vol-1',
    }, 'inv-1'));
    mockDeleteDoc.mockResolvedValue(null);
    const r = await svc.cancelInvite('c1', 'exh-1', 'inv-1', ACTOR_ADMIN);
    expect(r.ok).toBe(true);
    expect(r.cancelled).toBe(true);
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_rsvp_invite_cancelled' }),
    );
  });

  it('noop se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const r = await svc.cancelInvite('c1', 'exh-1', 'inv-x', ACTOR_ADMIN);
    expect(r.noop).toBe(true);
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it('lança em cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'c2' }, 'inv-1'));
    await expect(
      svc.cancelInvite('c1', 'exh-1', 'inv-1', ACTOR_ADMIN),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── listShifts ───────────────────────────────────────────────────────

describe('listShifts', () => {
  it('retorna [] se db indisponível', async () => {
    vi.resetModules();
    vi.doMock('@/core/config/firebase', () => ({ db: null }));
    const m = await import('./exhibitionRsvpService');
    expect(await m.listShifts('c1', 'exh-1')).toEqual([]);
  });

  it('lista shifts ordenado por date', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 's1', data: () => ({ date: '2026-07-15', role: 'cuidador' }) },
      ],
    });
    const r = await svc.listShifts('c1', 'exh-1');
    expect(r.length).toBe(1);
  });
});

// ─── getShift ─────────────────────────────────────────────────────────

describe('getShift', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await svc.getShift('c1', 'exh-1', 's-x')).toBeNull();
  });

  it('retorna doc com id', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ role: 'cuidador' }, 's-1'));
    const r = await svc.getShift('c1', 'exh-1', 's-1');
    expect(r.id).toBe('s-1');
  });
});

// ─── createShift ──────────────────────────────────────────────────────

describe('createShift', () => {
  const validInput = {
    date: '2026-07-15',
    time_start: '14:00',
    time_end: '18:00',
    role: 'cuidador',
    role_label: 'Cuidador dos cães',
    needed_count: 3,
  };

  it('cria shift com assigned_uids=[] + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap(EXHIBITION_DATA, 'exh-1'));
    mockAddDoc.mockResolvedValue({ id: 's-new' });
    const r = await svc.createShift('c1', 'exh-1', validInput, ACTOR_ADMIN);
    expect(r.id).toBe('s-new');
    expect(r.assigned_uids).toEqual([]);
    const payload = mockAddDoc.mock.calls[0][1];
    expect(payload.assigned_uids).toEqual([]);
    expect(payload.shelter_club_id).toBe('c1');
    expect(payload.exhibition_id).toBe('exh-1');
    expect(payload.created_by).toBe('admin-1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_shift_created' }),
    );
  });

  it('lança se exhibition cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ organizer_shelter_id: 'c2' }, 'exh-1'));
    await expect(
      svc.createShift('c1', 'exh-1', validInput, ACTOR_ADMIN),
    ).rejects.toThrow(/Cross-tenant/);
  });

  it('lança se time_end <= time_start', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap(EXHIBITION_DATA, 'exh-1'));
    await expect(
      svc.createShift('c1', 'exh-1', { ...validInput, time_end: '13:00' }, ACTOR_ADMIN),
    ).rejects.toThrow(/time_end/);
  });

  it('lança se input inválido (role inválido)', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap(EXHIBITION_DATA, 'exh-1'));
    await expect(
      svc.createShift('c1', 'exh-1', { ...validInput, role: 'admin' }, ACTOR_ADMIN),
    ).rejects.toThrow();
  });
});

// ─── updateShift ──────────────────────────────────────────────────────

describe('updateShift', () => {
  it('atualiza campos permitidos + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      time_start: '14:00',
      time_end: '18:00',
    }, 's-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await svc.updateShift('c1', 'exh-1', 's-1', {
      needed_count: 5,
      notes: 'Mais gente',
    }, ACTOR_ADMIN);
    expect(r.changed_fields).toContain('needed_count');
    expect(r.changed_fields).toContain('notes');
  });

  it('noop se patch vazio', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'c1' }, 's-1'));
    const r = await svc.updateShift('c1', 'exh-1', 's-1', {}, ACTOR_ADMIN);
    expect(r.noop).toBe(true);
  });

  it('lança em cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'c2' }, 's-1'));
    await expect(
      svc.updateShift('c1', 'exh-1', 's-1', { needed_count: 5 }, ACTOR_ADMIN),
    ).rejects.toThrow(/Cross-tenant/);
  });

  it('lança se time_end <= time_start', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      time_start: '14:00',
      time_end: '18:00',
    }, 's-1'));
    await expect(
      svc.updateShift('c1', 'exh-1', 's-1', { time_end: '10:00' }, ACTOR_ADMIN),
    ).rejects.toThrow(/time_end/);
  });
});

// ─── deleteShift ──────────────────────────────────────────────────────

describe('deleteShift', () => {
  it('criador pode deletar', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      created_by: 'admin-1',
    }, 's-1'));
    mockDeleteDoc.mockResolvedValue(null);
    const r = await svc.deleteShift('c1', 'exh-1', 's-1', ACTOR_ADMIN);
    expect(r.ok).toBe(true);
    expect(r.deleted).toBe(true);
  });

  it('platform_admin pode deletar', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      created_by: 'outro-admin',
    }, 's-1'));
    mockDeleteDoc.mockResolvedValue(null);
    const r = await svc.deleteShift('c1', 'exh-1', 's-1', {
      uid: 'pa-1', isPlatformAdmin: true,
    });
    expect(r.ok).toBe(true);
  });

  it('outro usuário NÃO pode deletar', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      created_by: 'outro-admin',
    }, 's-1'));
    await expect(
      svc.deleteShift('c1', 'exh-1', 's-1', { uid: 'intruso' }),
    ).rejects.toThrow(/criador/);
  });

  it('noop se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const r = await svc.deleteShift('c1', 'exh-1', 's-x', ACTOR_ADMIN);
    expect(r.noop).toBe(true);
  });
});

// ─── assignVolunteerToShift ──────────────────────────────────────────

describe('assignVolunteerToShift', () => {
  it('usa arrayUnion + notifica voluntário + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'c1',
      role_label: 'Cuidador',
      date: '2026-07-15',
      time_start: '14:00',
      time_end: '18:00',
    }, 's-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await svc.assignVolunteerToShift('c1', 'exh-1', 's-1', 'vol-1', ACTOR_ADMIN);
    expect(r.ok).toBe(true);
    expect(mockArrayUnion).toHaveBeenCalledWith('vol-1');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.assigned_uids).toEqual({ _arrayUnion: true, _args: ['vol-1'] });
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'vol-1' }),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_shift_volunteer_assigned' }),
    );
  });

  it('lança em cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'c2' }, 's-1'));
    await expect(
      svc.assignVolunteerToShift('c1', 'exh-1', 's-1', 'vol-1', ACTOR_ADMIN),
    ).rejects.toThrow(/Cross-tenant/);
  });

  it('lança se shift não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(
      svc.assignVolunteerToShift('c1', 'exh-1', 's-x', 'vol-1', ACTOR_ADMIN),
    ).rejects.toThrow(/não encontrado/);
  });
});

// ─── unassignVolunteerFromShift ─────────────────────────────────────

describe('unassignVolunteerFromShift', () => {
  it('usa arrayRemove + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'c1' }, 's-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await svc.unassignVolunteerFromShift('c1', 'exh-1', 's-1', 'vol-1', ACTOR_ADMIN);
    expect(r.ok).toBe(true);
    expect(mockArrayRemove).toHaveBeenCalledWith('vol-1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'exhibition_shift_volunteer_unassigned' }),
    );
  });

  it('lança em cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'c2' }, 's-1'));
    await expect(
      svc.unassignVolunteerFromShift('c1', 'exh-1', 's-1', 'vol-1', ACTOR_ADMIN),
    ).rejects.toThrow(/Cross-tenant/);
  });
});
