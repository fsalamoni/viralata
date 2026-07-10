/**
 * @fileoverview Testes do serviço de Voluntários (Fase 13).
 *
 * Cobre:
 *  - Profile (GLOBAL): create / update / delete soft / listByIds
 *  - Participation (multi-tenant): create / update / check-in / check-out
 *  - cross-tenant guard
 *  - permission guard (somente o próprio user cria/edita o profile)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
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
const mockDeleteField = vi.fn(() => ({ _isDeleteField: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: (...args) => mockSetDoc(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: mockOrderBy,
  limit: mockLimit,
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
  getVolunteerProfile,
  getMyVolunteerProfile,
  listVolunteerProfilesByIds,
  createVolunteerProfile,
  updateVolunteerProfile,
  deleteVolunteerProfile,
  listParticipations,
  getParticipation,
  createParticipation,
  updateParticipation,
  deleteParticipation,
  checkInVolunteer,
  checkOutVolunteer,
  getUserParticipations,
} = await import('./volunteerService');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockSetDoc.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function snap(data, id = 'doc-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validProfileInput = {
  user_id: 'u-vol',
  display_name: 'Maria Silva',
  skills: ['transporte', 'cuidador_caes'],
  certifications: [{ name: 'Curso X', issuer: 'ONG Y', year: 2024 }],
  availability: [{ day_of_week: 'saturday', from: '08:00', to: '18:00' }],
  notes: 'Disponível para turnos longos',
};

const validParticipationInput = {
  volunteer_uid: 'u-vol',
  volunteer_name: 'Maria Silva',
  exhibition_id: 'exh-1',
  role: 'cuidador',
  role_label: 'Cuidador dos cães',
  transport_provided: false,
  notes: 'Trouxe ração especial',
};

// ═══════════════════════════════════════════════════════════════════════
// VOLUNTEER PROFILE
// ═══════════════════════════════════════════════════════════════════════

describe('getVolunteerProfile / getMyVolunteerProfile', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getVolunteerProfile('u-1', 'main')).toBeNull();
  });

  it('retorna doc mapeado com id', async () => {
    mockGetDoc.mockResolvedValue(snap({ user_id: 'u-1', display_name: 'Maria' }, 'main'));
    const r = await getVolunteerProfile('u-1', 'main');
    expect(r.id).toBe('main');
    expect(r.display_name).toBe('Maria');
  });

  it('getMyVolunteerProfile é alias de getVolunteerProfile(main)', async () => {
    mockGetDoc.mockResolvedValue(snap({ user_id: 'u-1' }, 'main'));
    const r = await getMyVolunteerProfile('u-1');
    expect(r.id).toBe('main');
  });
});

describe('listVolunteerProfilesByIds', () => {
  it('retorna [] para input vazio', async () => {
    expect(await listVolunteerProfilesByIds([])).toEqual([]);
  });

  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listVolunteerProfilesByIds(['u-1'])).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });

  it('mapeia perfis encontrados e filtra nulls', async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap({ user_id: 'u-1' }, 'main'))
      .mockResolvedValueOnce(missingSnap())
      .mockResolvedValueOnce(snap({ user_id: 'u-3' }, 'main'));
    const r = await listVolunteerProfilesByIds(['u-1', 'u-2', 'u-3']);
    expect(r.length).toBe(2);
    expect(r.map((p) => p.user_id)).toEqual(['u-1', 'u-3']);
  });
});

describe('createVolunteerProfile', () => {
  it('cria profile, defaults ok e audit log', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());      // não existe
    mockSetDoc.mockResolvedValue(null);
    const r = await createVolunteerProfile('u-vol', validProfileInput, { uid: 'u-vol' });
    expect(r.id).toBe('main');
    expect(r.user_id).toBe('u-vol');
    expect(r.active).toBe(true);
    expect(r.hours_logged_total).toBe(0);
    expect(mockSetDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'volunteer_profile_created' }),
    );
  });

  it('rejeita se já existe', async () => {
    mockGetDoc.mockResolvedValue(snap({ user_id: 'u-vol' }, 'main'));
    await expect(
      createVolunteerProfile('u-vol', validProfileInput, { uid: 'u-vol' }),
    ).rejects.toThrow(/já existe/);
  });

  it('rejeita se actor não é o user', async () => {
    await expect(
      createVolunteerProfile('u-vol', validProfileInput, { uid: 'u-outro' }),
    ).rejects.toThrow(/próprio usuário/);
  });

  it('permite platform_admin criar para outro user', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    mockSetDoc.mockResolvedValue(null);
    const r = await createVolunteerProfile(
      'u-vol', validProfileInput, { uid: 'admin-1', role: 'platform_admin' },
    );
    expect(r.user_id).toBe('u-vol');
  });
});

describe('updateVolunteerProfile', () => {
  it('rejeita se actor não é o user', async () => {
    await expect(
      updateVolunteerProfile('u-vol', 'main', { display_name: 'X' }, { uid: 'u-outro' }),
    ).rejects.toThrow(/próprio usuário/);
  });

  it('atualiza campos com delta', async () => {
    mockGetDoc.mockResolvedValue(snap({
      user_id: 'u-vol',
      display_name: 'Maria Antiga',
      skills: ['transporte'],
    }, 'main'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateVolunteerProfile(
      'u-vol', 'main', { display_name: 'Maria Nova' }, { uid: 'u-vol' },
    );
    expect(r.changed_fields).toContain('display_name');
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.display_name).toBe('Maria Nova');
  });

  it('trata null como deleteField', async () => {
    mockGetDoc.mockResolvedValue(snap({
      user_id: 'u-vol',
      display_name: 'Maria',
      notes: 'antigas',
    }, 'main'));
    mockUpdateDoc.mockResolvedValue(null);
    await updateVolunteerProfile(
      'u-vol', 'main', { notes: null }, { uid: 'u-vol' },
    );
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.notes).toEqual({ _isDeleteField: true });
  });

  it('noop quando nada mudou', async () => {
    mockGetDoc.mockResolvedValue(snap({
      user_id: 'u-vol', display_name: 'Maria',
    }, 'main'));
    const r = await updateVolunteerProfile(
      'u-vol', 'main', { display_name: 'Maria' }, { uid: 'u-vol' },
    );
    expect(r.noop).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejeita se profile não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(
      updateVolunteerProfile('u-vol', 'main', { display_name: 'Maria' }, { uid: 'u-vol' }),
    ).rejects.toThrow(/não existe/);
  });
});

describe('deleteVolunteerProfile', () => {
  it('rejeita se actor não é o user', async () => {
    await expect(
      deleteVolunteerProfile('u-vol', 'main', { uid: 'u-outro' }),
    ).rejects.toThrow(/próprio usuário/);
  });

  it('marca active: false (soft delete)', async () => {
    mockGetDoc.mockResolvedValue(snap({ user_id: 'u-vol', active: true }, 'main'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await deleteVolunteerProfile('u-vol', 'main', { uid: 'u-vol' });
    expect(r.active).toBe(false);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.active).toBe(false);
  });

  it('idempotente: noop se profile não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    const r = await deleteVolunteerProfile('u-vol', 'main', { uid: 'u-vol' });
    expect(r.noop).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// VOLUNTEER PARTICIPATION
// ═══════════════════════════════════════════════════════════════════════

describe('listParticipations', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listParticipations('c1')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });

  it('lança sem shelterClubId', async () => {
    await expect(listParticipations('')).rejects.toThrow(/shelterClubId/);
  });

  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'vp-1', data: () => ({ volunteer_uid: 'u-1' }) }],
    });
    const r = await listParticipations('c1');
    expect(r[0].id).toBe('vp-1');
  });

  it('aceita filtros volunteerUid/exhibitionId/role', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await listParticipations('c1', {
      volunteerUid: 'u-1', exhibitionId: 'exh-1', role: 'cuidador',
    });
    // Verifica que where foi chamado 3 vezes
    expect(mockWhere).toHaveBeenCalledTimes(3);
  });
});

describe('getParticipation', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getParticipation('c1', 'vp-1')).toBeNull();
  });
});

describe('createParticipation', () => {
  it('cria participation + audit', async () => {
    mockAddDoc.mockResolvedValue({ id: 'vp-new' });
    const r = await createParticipation('c1', validParticipationInput, { uid: 'u-admin' });
    expect(r.id).toBe('vp-new');
    expect(r.shelter_club_id).toBe('c1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'volunteer_participation_created' }),
    );
  });

  it('rejeita role inválido', async () => {
    await expect(
      createParticipation('c1', { ...validParticipationInput, role: 'invalido' }, { uid: 'u1' }),
    ).rejects.toThrow();
  });

  it('aceita exhibition_id null', async () => {
    mockAddDoc.mockResolvedValue({ id: 'vp-new' });
    const r = await createParticipation('c1', {
      ...validParticipationInput,
      exhibition_id: null,
    }, { uid: 'u-admin' });
    expect(r.id).toBe('vp-new');
  });
});

describe('updateParticipation', () => {
  it('atualiza notes com sucesso', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      notes: 'antigo',
    }, 'vp-1'));
    mockUpdateDoc.mockResolvedValue(null);
    await updateParticipation('c1', 'vp-1', { notes: 'novo' }, { uid: 'u-admin' });
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.notes).toBe('novo');
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c2' }, 'vp-1'));
    await expect(
      updateParticipation('c1', 'vp-1', { notes: 'x' }, { uid: 'u-admin' }),
    ).rejects.toThrow(/tenant/);
  });

  it('trata null como deleteField', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      notes: 'antigo',
    }, 'vp-1'));
    mockUpdateDoc.mockResolvedValue(null);
    await updateParticipation('c1', 'vp-1', { notes: null }, { uid: 'u-admin' });
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.notes).toEqual({ _isDeleteField: true });
  });
});

describe('deleteParticipation', () => {
  it('rejeita se não é platform_admin', async () => {
    await expect(
      deleteParticipation('c1', 'vp-1', { uid: 'u-admin-clube' }),
    ).rejects.toThrow(/platform_admin/);
  });

  it('platform_admin deleta (marca deleted_at)', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c1' }, 'vp-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await deleteParticipation('c1', 'vp-1', {
      uid: 'admin-1', role: 'platform_admin',
    });
    expect(r.deleted).toBe(true);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.deleted_at).toEqual({ _isServerTimestamp: true });
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({ shelter_club_id: 'c2' }, 'vp-1'));
    await expect(
      deleteParticipation('c1', 'vp-1', { uid: 'admin-1', role: 'platform_admin' }),
    ).rejects.toThrow(/tenant/);
  });
});

describe('checkInVolunteer', () => {
  it('marca check_in com sucesso', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1', check_in: null, check_out: null,
    }, 'vp-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await checkInVolunteer('c1', 'vp-1', { uid: 'u-admin' });
    expect(r.check_in).toBeTruthy();
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.check_in).toBeTruthy();
  });

  it('rejeita se já fez check-in (sem override)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      check_in: '2026-07-10T08:00:00Z',
      check_out: null,
    }, 'vp-1'));
    await expect(
      checkInVolunteer('c1', 'vp-1', { uid: 'u-admin' }),
    ).rejects.toThrow(/check-in/);
  });

  it('rejeita se já finalizou (check_out preenchido, sem check-in normal)', async () => {
    // Caso edge: check_out preenchido mas check_in ausente. Rejeita como finalizada.
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      check_in: null,
      check_out: '2026-07-10T18:00:00Z',
    }, 'vp-1'));
    await expect(
      checkInVolunteer('c1', 'vp-1', { uid: 'u-admin' }),
    ).rejects.toThrow(/finalizada/);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c2', check_in: null, check_out: null,
    }, 'vp-1'));
    await expect(
      checkInVolunteer('c1', 'vp-1', { uid: 'u-admin' }),
    ).rejects.toThrow(/tenant/);
  });
});

describe('checkOutVolunteer', () => {
  it('marca check_out e calcula hours_logged', async () => {
    // check-in foi 2h atrás
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      check_in: twoHoursAgo,
      check_out: null,
    }, 'vp-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await checkOutVolunteer('c1', 'vp-1', { uid: 'u-admin' });
    expect(r.check_out).toBeTruthy();
    expect(r.hours_logged).toBeGreaterThanOrEqual(1.9);
    expect(r.hours_logged).toBeLessThanOrEqual(2.1);
  });

  it('rejeita sem check-in', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1', check_in: null, check_out: null,
    }, 'vp-1'));
    await expect(
      checkOutVolunteer('c1', 'vp-1', { uid: 'u-admin' }),
    ).rejects.toThrow(/check-in/);
  });

  it('rejeita se já tem check-out (sem override)', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      check_in: '2026-07-10T08:00:00Z',
      check_out: '2026-07-10T18:00:00Z',
    }, 'vp-1'));
    await expect(
      checkOutVolunteer('c1', 'vp-1', { uid: 'u-admin' }),
    ).rejects.toThrow(/check-out/);
  });

  it('recalcula hours_logged com allowOverride', async () => {
    mockGetDoc.mockResolvedValue(snap({
      shelter_club_id: 'c1',
      check_in: '2026-07-10T08:00:00Z',
      check_out: '2026-07-10T18:00:00Z',
      hours_logged: 10,
    }, 'vp-1'));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await checkOutVolunteer('c1', 'vp-1', { uid: 'u-admin' }, { allowOverride: true });
    expect(r.hours_logged).toBeGreaterThanOrEqual(0);
  });
});

describe('getUserParticipations', () => {
  it('retorna [] para shelterClubIds vazio', async () => {
    expect(await getUserParticipations('u-1', [])).toEqual([]);
  });

  it('lança sem volunteerUid', async () => {
    await expect(getUserParticipations('', ['c1'])).rejects.toThrow(/volunteerUid/);
  });

  it('agrega participações de múltiplos abrigos', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          { id: 'vp-1', data: () => ({ volunteer_uid: 'u-1', shelter_club_id: 'c1' }) },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          { id: 'vp-2', data: () => ({ volunteer_uid: 'u-1', shelter_club_id: 'c2' }) },
          { id: 'vp-3', data: () => ({ volunteer_uid: 'u-1', shelter_club_id: 'c2' }) },
        ],
      });
    const r = await getUserParticipations('u-1', ['c1', 'c2']);
    expect(r.length).toBe(3);
  });

  it('tolera falhas em um dos abrigos (não derruba tudo)', async () => {
    mockGetDocs
      .mockRejectedValueOnce(new Error('forbidden'))
      .mockResolvedValueOnce({
        docs: [{ id: 'vp-1', data: () => ({ volunteer_uid: 'u-1' }) }],
      });
    const r = await getUserParticipations('u-1', ['c1', 'c2']);
    expect(r.length).toBe(1);
  });
});
