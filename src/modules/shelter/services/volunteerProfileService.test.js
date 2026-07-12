/**
 * @fileoverview Testes do serviço de Gestão de Voluntários — Perfil + Roster (Fase 13).
 *
 * Cobre: enums, transições, schemas, get/upsert/accept/join/update/leave/delete.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
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
  setDoc: (...args) => mockSetDoc(...args),
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

const mockRecordAcceptance = vi.fn().mockResolvedValue({ id: 'acc-1' });
vi.mock('@/modules/shelter/services/termsAcceptanceService', () => ({
  recordAcceptance: (...args) => mockRecordAcceptance(...args),
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(null);

const {
  getVolunteerProfile,
  upsertVolunteerProfile,
  acceptVolunteerTerms,
  joinShelterAsVolunteer,
  listShelterVolunteers,
  getShelterVolunteer,
  updateShelterVolunteer,
  leaveShelter,
  deleteShelterVolunteer,
} = await import('./volunteerProfileService');

const {
  volunteerProfileSchema,
  upsertVolunteerProfileSchema,
  acceptVolunteerTermsSchema,
  shelterVolunteerRosterSchema,
  joinShelterAsVolunteerSchema,
  updateShelterVolunteerSchema,
  VOLUNTEER_SKILLS,
  VOLUNTEER_DAYS_OF_WEEK,
  VOLUNTEER_SHELTER_STATUS,
  VOLUNTEER_BG_CHECK_STATUS,
  VOLUNTEER_PARTICIPATION_ROLES,
  assertValidVolunteerStatusTransition,
  assertValidBgCheckTransition,
  calculateParticipationHours,
  canVolunteerParticipate,
  formatAvailability,
} = await import('@/modules/shelter/domain/operational/volunteerProfile');

const { VOLUNTEER_TERMS_VERSION } = await import('@/modules/shelter/domain/legal/volunteerTerms');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockSetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockDeleteDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
  mockRecordAcceptance.mockReset().mockResolvedValue({ id: 'acc-1' });
});

function snap(data, id = 'main') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

// ════════════════════════════════════════════════════════════════════
// ENUMS
// ════════════════════════════════════════════════════════════════════

describe('Enums', () => {
  it('VOLUNTEER_SKILLS tem 6 valores', () => {
    expect(VOLUNTEER_SKILLS.length).toBe(6);
    expect(VOLUNTEER_SKILLS).toEqual([
      'dog_walking', 'cat_socialization', 'transport', 'grooming', 'photography', 'events',
    ]);
  });

  it('VOLUNTEER_DAYS_OF_WEEK tem 7 valores ISO', () => {
    expect(VOLUNTEER_DAYS_OF_WEEK).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  });

  it('VOLUNTEER_SHELTER_STATUS tem 4 valores (active, paused, blocked, left)', () => {
    expect(VOLUNTEER_SHELTER_STATUS).toContain('active');
    expect(VOLUNTEER_SHELTER_STATUS).toContain('paused');
    expect(VOLUNTEER_SHELTER_STATUS).toContain('blocked');
    expect(VOLUNTEER_SHELTER_STATUS).toContain('left');
  });

  it('VOLUNTEER_BG_CHECK_STATUS tem 4 valores', () => {
    expect(VOLUNTEER_BG_CHECK_STATUS).toEqual([
      'not_required', 'pending', 'approved', 'rejected',
    ]);
  });

  it('VOLUNTEER_PARTICIPATION_ROLES tem 5 valores', () => {
    expect(VOLUNTEER_PARTICIPATION_ROLES.length).toBe(5);
  });
});

// ════════════════════════════════════════════════════════════════════
// TRANSIÇÕES
// ════════════════════════════════════════════════════════════════════

describe('assertValidVolunteerStatusTransition', () => {
  it('permite active → paused/left/blocked', () => {
    expect(() => assertValidVolunteerStatusTransition('active', 'paused')).not.toThrow();
    expect(() => assertValidVolunteerStatusTransition('active', 'left')).not.toThrow();
    expect(() => assertValidVolunteerStatusTransition('active', 'blocked')).not.toThrow();
  });
  it('permite paused → active/left/blocked', () => {
    expect(() => assertValidVolunteerStatusTransition('paused', 'active')).not.toThrow();
  });
  it('rejeita left → qualquer (terminal)', () => {
    expect(() => assertValidVolunteerStatusTransition('left', 'active')).toThrow(/terminal/);
  });
  it('rejeita status inválido', () => {
    expect(() => assertValidVolunteerStatusTransition('foo', 'active')).toThrow(/inválido/);
    expect(() => assertValidVolunteerStatusTransition('active', 'foo')).toThrow(/inválido/);
  });
});

describe('assertValidBgCheckTransition', () => {
  it('permite pending → approved/rejected', () => {
    expect(() => assertValidBgCheckTransition('pending', 'approved')).not.toThrow();
    expect(() => assertValidBgCheckTransition('pending', 'rejected')).not.toThrow();
  });
  it('permite not_required → qualquer', () => {
    expect(() => assertValidBgCheckTransition('not_required', 'pending')).not.toThrow();
    expect(() => assertValidBgCheckTransition('not_required', 'approved')).not.toThrow();
  });
  it('rejeita approved → rejected (reabertura precisa ir via pending)', () => {
    expect(() => assertValidBgCheckTransition('approved', 'rejected')).toThrow();
  });
  it('permite approved → pending (reabertura)', () => {
    expect(() => assertValidBgCheckTransition('approved', 'pending')).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

describe('calculateParticipationHours', () => {
  it('retorna 0 se incompleto', () => {
    expect(calculateParticipationHours(null, '2026-07-10T18:00:00Z')).toBe(0);
    expect(calculateParticipationHours('2026-07-10T08:00:00Z', null)).toBe(0);
  });
  it('retorna 0 se check_out <= check_in', () => {
    expect(calculateParticipationHours('2026-07-10T18:00:00Z', '2026-07-10T18:00:00Z')).toBe(0);
    expect(calculateParticipationHours('2026-07-10T18:00:00Z', '2026-07-10T17:00:00Z')).toBe(0);
  });
  it('calcula horas e arredonda para 2 casas', () => {
    expect(calculateParticipationHours('2026-07-10T08:00:00Z', '2026-07-10T13:30:00Z')).toBe(5.5);
    expect(calculateParticipationHours('2026-07-10T08:00:00Z', '2026-07-10T08:15:00Z')).toBe(0.25);
  });
});

describe('canVolunteerParticipate', () => {
  it('false se status != active', () => {
    expect(canVolunteerParticipate({ status: 'paused', background_check_status: 'approved' })).toBe(false);
  });
  it('false se BG check pending', () => {
    expect(canVolunteerParticipate({ status: 'active', background_check_status: 'pending' })).toBe(false);
  });
  it('false se BG check rejected', () => {
    expect(canVolunteerParticipate({ status: 'active', background_check_status: 'rejected' })).toBe(false);
  });
  it('true se active + approved', () => {
    expect(canVolunteerParticipate({ status: 'active', background_check_status: 'approved' })).toBe(true);
  });
  it('true se active + not_required', () => {
    expect(canVolunteerParticipate({ status: 'active', background_check_status: 'not_required' })).toBe(true);
  });
  it('false para null', () => {
    expect(canVolunteerParticipate(null)).toBe(false);
  });
});

describe('formatAvailability', () => {
  it('formata slots com label pt-BR', () => {
    const slots = [
      { day_of_week: 'mon', start_time: '08:00', end_time: '12:00' },
      { day_of_week: 'wed', start_time: '14:00', end_time: '18:00' },
    ];
    expect(formatAvailability(slots)).toBe('Segunda 08:00-12:00, Quarta 14:00-18:00');
  });
  it('retorna string vazia para input inválido', () => {
    expect(formatAvailability(null)).toBe('');
    expect(formatAvailability([])).toBe('');
  });
});

// ════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════

describe('upsertVolunteerProfileSchema', () => {
  it('aceita input mínimo', () => {
    expect(upsertVolunteerProfileSchema.safeParse({}).success).toBe(true);
  });
  it('aceita skills válidas', () => {
    expect(upsertVolunteerProfileSchema.safeParse({
      skills: ['dog_walking', 'transport'],
    }).success).toBe(true);
  });
  it('rejeita skill inválida', () => {
    expect(upsertVolunteerProfileSchema.safeParse({
      skills: ['fly_to_moon'],
    }).success).toBe(false);
  });
  it('rejeita availability com end_time < start_time', () => {
    expect(upsertVolunteerProfileSchema.safeParse({
      availability: [{ day_of_week: 'mon', start_time: '14:00', end_time: '08:00' }],
    }).success).toBe(false);
  });
  it('rejeita availability com time mal-formado', () => {
    expect(upsertVolunteerProfileSchema.safeParse({
      availability: [{ day_of_week: 'mon', start_time: '8:00', end_time: '12:00' }],
    }).success).toBe(false);
  });
  it('rejeita radius_km > 500', () => {
    expect(upsertVolunteerProfileSchema.safeParse({ radius_km: 501 }).success).toBe(false);
  });
});

describe('acceptVolunteerTermsSchema', () => {
  it('aceita com versão atual + signature', () => {
    expect(acceptVolunteerTermsSchema.safeParse({
      terms_version: VOLUNTEER_TERMS_VERSION,
      signature_text: 'Maria Silva',
    }).success).toBe(true);
  });
  it('rejeita versão diferente da atual', () => {
    expect(acceptVolunteerTermsSchema.safeParse({
      terms_version: '1900-01-01',
      signature_text: 'Maria Silva',
    }).success).toBe(false);
  });
  it('rejeita signature curta', () => {
    expect(acceptVolunteerTermsSchema.safeParse({
      terms_version: VOLUNTEER_TERMS_VERSION,
      signature_text: 'A',
    }).success).toBe(false);
  });
});

describe('joinShelterAsVolunteerSchema', () => {
  const valid = {
    shelter_club_id: 'c1',
    volunteer_uid: 'u-1',
    volunteer_name: 'Maria Silva',
    volunteer_email: 'maria@example.com',
    terms_version: VOLUNTEER_TERMS_VERSION,
    signature_text: 'Maria Silva',
  };
  it('aceita input válido', () => {
    expect(joinShelterAsVolunteerSchema.safeParse(valid).success).toBe(true);
  });
  it('rejeita volunteer_name curto', () => {
    expect(joinShelterAsVolunteerSchema.safeParse({ ...valid, volunteer_name: 'A' }).success).toBe(false);
  });
  it('rejeita sem shelter_club_id', () => {
    expect(joinShelterAsVolunteerSchema.safeParse({ ...valid, shelter_club_id: '' }).success).toBe(false);
  });
  it('rejeita versão errada do termo', () => {
    expect(joinShelterAsVolunteerSchema.safeParse({ ...valid, terms_version: '1900-01-01' }).success).toBe(false);
  });
});

describe('updateShelterVolunteerSchema', () => {
  it('aceita status', () => {
    expect(updateShelterVolunteerSchema.safeParse({ status: 'paused' }).success).toBe(true);
  });
  it('aceita background_check_status + notes', () => {
    expect(updateShelterVolunteerSchema.safeParse({
      background_check_status: 'approved',
      background_check_notes: 'Documentos verificados',
    }).success).toBe(true);
  });
  it('rejeita status inválido', () => {
    expect(updateShelterVolunteerSchema.safeParse({ status: 'foo' }).success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: getVolunteerProfile
// ════════════════════════════════════════════════════════════════════

describe('getVolunteerProfile', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    expect(await getVolunteerProfile('u-1')).toBeNull();
  });
  it('retorna doc se existe', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ skills: ['dog_walking'] }, 'main'));
    const result = await getVolunteerProfile('u-1');
    expect(result.id).toBe('main');
    expect(result.skills).toEqual(['dog_walking']);
  });
  it('retorna null se !uid', async () => {
    expect(await getVolunteerProfile(null)).toBeNull();
    expect(await getVolunteerProfile('')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: upsertVolunteerProfile
// ════════════════════════════════════════════════════════════════════

describe('upsertVolunteerProfile', () => {
  it('cria doc se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const result = await upsertVolunteerProfile(
      'u-1',
      { skills: ['dog_walking'] },
      { uid: 'u-1' },
    );
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ skills: ['dog_walking'] });
    expect(result.id).toBe('main');
  });
  it('atualiza doc se existe (sem sobrescrever created_at)', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ skills: [] }));
    await upsertVolunteerProfile('u-1', { skills: ['transport'] }, { uid: 'u-1' });
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skills: ['transport'] }), { merge: true });
  });
  it('rejeita se actor.uid != uid', async () => {
    await expect(
      upsertVolunteerProfile('u-1', {}, { uid: 'u-2' }),
    ).rejects.toThrow(/próprio voluntário/);
  });
  it('rejeita input com skill inválida', async () => {
    await expect(
      upsertVolunteerProfile('u-1', { skills: ['invalid'] }, { uid: 'u-1' }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: acceptVolunteerTerms
// ════════════════════════════════════════════════════════════════════

describe('acceptVolunteerTerms', () => {
  it('grava terms_accepted_at + version + document_hash (sha256)', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const result = await acceptVolunteerTerms(
      'u-1',
      { terms_version: VOLUNTEER_TERMS_VERSION, signature_text: 'Maria Silva' },
      { uid: 'u-1' },
    );
    expect(mockSetDoc).toHaveBeenCalled();
    expect(result.terms_version).toBe(VOLUNTEER_TERMS_VERSION);
    expect(result.terms_accepted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // SHA-256 hex = 64 chars; prefixado com "sha256:" (Lei 14.063/2020).
    expect(result.document_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('usa SHA-256 (não djb2) para o document_hash', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const result = await acceptVolunteerTerms(
      'u-1',
      { terms_version: VOLUNTEER_TERMS_VERSION, signature_text: 'Maria Silva' },
      { uid: 'u-1' },
    );
    // djb2 antigo produzia "sig_<hex_curto>". SHA-256 produz "sha256:<64 hex>".
    expect(result.document_hash.startsWith('sig_')).toBe(false);
    expect(result.document_hash.startsWith('sha256:')).toBe(true);
  });

  it('registra aceite canônico via termsAcceptanceService.recordAcceptance', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const result = await acceptVolunteerTerms(
      'u-1',
      {
        terms_version: VOLUNTEER_TERMS_VERSION,
        signature_text: 'Maria Silva',
        ip_address: '127.0.0.1',
        user_agent: 'vitest',
        liveness_verified: true,
      },
      { uid: 'u-1' },
    );
    expect(mockRecordAcceptance).toHaveBeenCalledTimes(1);
    const [calledUid, calledInput] = mockRecordAcceptance.mock.calls[0];
    expect(calledUid).toBe('u-1');
    expect(calledInput.terms_type).toBe('volunteer');
    expect(calledInput.terms_version).toBe(VOLUNTEER_TERMS_VERSION);
    expect(calledInput.signature_text).toBe('Maria Silva');
    expect(calledInput.document_hash).toBe(result.document_hash);
    expect(calledInput.document_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(calledInput.ip_address).toBe('127.0.0.1');
    expect(calledInput.user_agent).toBe('vitest');
    expect(calledInput.liveness_verified).toBe(true);
    expect(calledInput.legal_basis).toMatch(/LGPD/);
  });

  it('rejeita versão errada do termo', async () => {
    await expect(
      acceptVolunteerTerms(
        'u-1',
        { terms_version: '1900-01-01', signature_text: 'Maria Silva' },
        { uid: 'u-1' },
      ),
    ).rejects.toThrow();
  });
  it('rejeita se actor.uid != uid', async () => {
    await expect(
      acceptVolunteerTerms(
        'u-1',
        { terms_version: VOLUNTEER_TERMS_VERSION, signature_text: 'X' },
        { uid: 'u-2' },
      ),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: joinShelterAsVolunteer
// ════════════════════════════════════════════════════════════════════

describe('joinShelterAsVolunteer', () => {
  const valid = {
    shelter_club_id: 'c1',
    volunteer_uid: 'u-1',
    volunteer_name: 'Maria Silva',
    volunteer_email: 'maria@example.com',
    terms_version: VOLUNTEER_TERMS_VERSION,
    signature_text: 'Maria Silva',
  };

  it('cria roster entry com snapshot do aceite', async () => {
    // getVolunteerProfile (perfil global) — precisa ter aceitado
    mockGetDoc.mockResolvedValueOnce(snap({
      terms_accepted_at: new Date().toISOString(),
      terms_version: VOLUNTEER_TERMS_VERSION,
    }, 'main'));
    // getDoc do roster (já existe?)
    mockGetDoc.mockResolvedValueOnce(missingSnap());

    const result = await joinShelterAsVolunteer(valid, { uid: 'u-1' });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      shelter_club_id: 'c1',
      volunteer_uid: 'u-1',
      status: 'active',
      background_check_status: 'not_required',
    });
    expect(result.id).toBe('u-1');
  });

  it('rejeita se voluntário não aceitou o termo global', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap()); // sem perfil
    await expect(
      joinShelterAsVolunteer(valid, { uid: 'u-1' }),
    ).rejects.toThrow(/aceitar o termo globalmente/);
  });

  it('rejeita se voluntário já está no roster', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      terms_accepted_at: new Date().toISOString(),
      terms_version: VOLUNTEER_TERMS_VERSION,
    }, 'main'));
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c1' }, 'u-1'));
    await expect(
      joinShelterAsVolunteer(valid, { uid: 'u-1' }),
    ).rejects.toThrow(/já está na rostagem/);
  });

  it('rejeita versão errada do termo', async () => {
    await expect(
      joinShelterAsVolunteer({ ...valid, terms_version: '1900-01-01' }, { uid: 'u-1' }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: updateShelterVolunteer
// ════════════════════════════════════════════════════════════════════

describe('updateShelterVolunteer', () => {
  it('atualiza status', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1', status: 'active',
    }, 'u-1'));
    await updateShelterVolunteer('c1', 'u-1', { status: 'paused' }, { uid: 'shelter-admin' });
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'paused' }));
  });

  it('atualiza background_check_status', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1', status: 'active', background_check_status: 'pending',
    }, 'u-1'));
    await updateShelterVolunteer('c1', 'u-1', { background_check_status: 'approved' }, { uid: 'shelter-admin' });
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ background_check_status: 'approved' }));
  });

  it('rejeita transição de status inválida', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1', status: 'left',
    }, 'u-1'));
    await expect(
      updateShelterVolunteer('c1', 'u-1', { status: 'active' }, { uid: 'shelter-admin' }),
    ).rejects.toThrow(/terminal/);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c-OTHER', status: 'active',
    }, 'u-1'));
    await expect(
      updateShelterVolunteer('c1', 'u-1', { status: 'paused' }, { uid: 'shelter-admin' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: leaveShelter
// ════════════════════════════════════════════════════════════════════

describe('leaveShelter', () => {
  it('marca status como left', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      shelter_club_id: 'c1', status: 'active',
    }, 'u-1'));
    await leaveShelter('c1', 'u-1', { uid: 'u-1' });
    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'left' }));
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: deleteShelterVolunteer
// ════════════════════════════════════════════════════════════════════

describe('deleteShelterVolunteer', () => {
  it('deleta doc se existe', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c1' }, 'u-1'));
    const result = await deleteShelterVolunteer('c1', 'u-1', { uid: 'admin' });
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(result.deleted).toBe(true);
  });
  it('retorna deleted=false se não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    const result = await deleteShelterVolunteer('c1', 'u-1', { uid: 'admin' });
    expect(result.deleted).toBe(false);
  });
  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ shelter_club_id: 'c-OTHER' }, 'u-1'));
    await expect(
      deleteShelterVolunteer('c1', 'u-1', { uid: 'admin' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ════════════════════════════════════════════════════════════════════
// SERVICE: listShelterVolunteers
// ════════════════════════════════════════════════════════════════════

describe('listShelterVolunteers', () => {
  it('lista sem filtros', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        snap({ volunteer_name: 'Alice' }, 'u-1'),
        snap({ volunteer_name: 'Bob' }, 'u-2'),
      ],
    });
    const result = await listShelterVolunteers('c1');
    expect(result).toHaveLength(2);
    expect(result[0].volunteer_name).toBe('Alice');
  });
  it('aplica filtro status', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await listShelterVolunteers('c1', { status: 'active' });
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'active');
  });
});
