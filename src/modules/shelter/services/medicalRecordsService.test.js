/**
 * @fileoverview Testes do serviço de Prontuário Médico (Fase 8).
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
  listMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  countRecordsByType,
} = await import('./medicalRecordsService');
const {
  medicalRecordSchema,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  MEDICAL_RECORD_TYPES,
  MEDICAL_RECORD_LABELS,
  needsFollowUp,
  formatCost,
} = await import('@/modules/shelter/domain/clinical/medicalRecords');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function petSnap(data) {
  return { exists: () => true, data: () => data };
}
function recordSnap(data, id = 'rec-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validInput = {
  type: 'consultation',
  chief_complaint: 'Animal com diarréia há 2 dias',
  diagnosis: 'Gastroenterite leve',
  treatment: 'Dieta leve + hidratação',
  vet_name: 'Dra. Ana Silva',
  vet_crmv: 'CRMV-SP 12345',
  cost_cents: 15000,
  paid_by: 'shelter',
};

// ─── Enums / labels ──────────────────────────────────────────────────

describe('MEDICAL_RECORD_TYPES', () => {
  it('tem 13 tipos', () => {
    expect(MEDICAL_RECORD_TYPES.length).toBe(13);
  });
  it('inclui consultation, vaccine, surgery, hospitalization', () => {
    expect(MEDICAL_RECORD_TYPES).toContain('consultation');
    expect(MEDICAL_RECORD_TYPES).toContain('vaccine');
    expect(MEDICAL_RECORD_TYPES).toContain('surgery');
    expect(MEDICAL_RECORD_TYPES).toContain('hospitalization');
  });
});

describe('MEDICAL_RECORD_LABELS', () => {
  it('tem label pt-BR para cada tipo', () => {
    for (const t of MEDICAL_RECORD_TYPES) {
      expect(MEDICAL_RECORD_LABELS[t]).toBeTruthy();
    }
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────

describe('formatCost', () => {
  it('formata centavos em BRL', () => {
    expect(formatCost(15000)).toContain('150');
    expect(formatCost(15000)).toContain('R$');
  });
  it('retorna — se null', () => {
    expect(formatCost(null)).toBe('—');
  });
});

describe('needsFollowUp', () => {
  it('true se next_visit_date setado', () => {
    expect(needsFollowUp({ next_visit_date: '2026-08-01' })).toBe(true);
  });
  it('false sem next_visit_date', () => {
    expect(needsFollowUp({})).toBe(false);
  });
});

// ─── Schema validation ────────────────────────────────────────────────

describe('createMedicalRecordSchema', () => {
  it('aceita input válido', () => {
    expect(createMedicalRecordSchema.safeParse(validInput).success).toBe(true);
  });
  it('rejeita type inválido', () => {
    expect(createMedicalRecordSchema.safeParse({ ...validInput, type: 'foo' }).success).toBe(false);
  });
  it('rejeita cost negativo', () => {
    expect(createMedicalRecordSchema.safeParse({ ...validInput, cost_cents: -1 }).success).toBe(false);
  });
  it('rejeita paid_by fora do enum', () => {
    expect(createMedicalRecordSchema.safeParse({ ...validInput, paid_by: 'robado' }).success).toBe(false);
  });
  it('rejeita attachments > 20', () => {
    const many = Array(21).fill({ url: 'https://x.com/a' });
    expect(createMedicalRecordSchema.safeParse({ ...validInput, attachments: many }).success).toBe(false);
  });
  it('aceita exam_results com is_abnormal', () => {
    const r = createMedicalRecordSchema.safeParse({
      ...validInput,
      exam_results: [{ name: 'Hemograma', value: '8.5', unit: 'g/dL', is_abnormal: true }],
    });
    expect(r.success).toBe(true);
  });
});

describe('updateMedicalRecordSchema', () => {
  it('aceita parcial (só diagnosis)', () => {
    expect(updateMedicalRecordSchema.safeParse({ diagnosis: 'novo' }).success).toBe(true);
  });
  it('aceita vazio (noop)', () => {
    expect(updateMedicalRecordSchema.safeParse({}).success).toBe(true);
  });
});

// ─── list / get ───────────────────────────────────────────────────────

describe('listMedicalRecords', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listMedicalRecords('p1', 'c1')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });
  it('lança sem petId ou shelterClubId', async () => {
    await expect(listMedicalRecords('', 'c1')).rejects.toThrow();
    await expect(listMedicalRecords('p1', '')).rejects.toThrow();
  });
  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'r1', data: () => ({ type: 'consultation' }) }],
    });
    const r = await listMedicalRecords('p1', 'c1');
    expect(r[0].id).toBe('r1');
  });
});

describe('getMedicalRecord', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getMedicalRecord('p1', 'r1', 'c1')).toBeNull();
  });
  it('retorna null em cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(recordSnap({ shelter_club_id: 'c2' }, 'r1'));
    expect(await getMedicalRecord('p1', 'r1', 'c1')).toBeNull();
  });
  it('retorna doc se tenant bate', async () => {
    mockGetDoc.mockResolvedValue(recordSnap({ shelter_club_id: 'c1', diagnosis: 'X' }, 'r1'));
    const r = await getMedicalRecord('p1', 'r1', 'c1');
    expect(r.id).toBe('r1');
    expect(r.diagnosis).toBe('X');
  });
});

// ─── createMedicalRecord ────────────────────────────────────────────

describe('createMedicalRecord', () => {
  it('cria registro com audit', async () => {
    // Mock: getDoc do pet (existe, mesmo club)
    mockGetDoc.mockResolvedValueOnce(petSnap({ shelter_owner_club_id: 'c1' }));
    mockAddDoc.mockResolvedValue({ id: 'rec-new' });
    // input sem vet_name: usa actor.displayName
    const { vet_name: _, ...inputNoVetName } = validInput;
    const r = await createMedicalRecord('p1', 'c1', inputNoVetName, { uid: 'u-vet', displayName: 'Dra. Ana' });
    expect(r.id).toBe('rec-new');
    expect(r.vet_uid).toBe('u-vet');
    expect(r.vet_name).toBe('Dra. Ana');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'medical_record_created' }),
    );
  });

  it('rejeita pet de outro abrigo', async () => {
    mockGetDoc.mockResolvedValueOnce(petSnap({ shelter_owner_club_id: 'c2' }));
    await expect(
      createMedicalRecord('p1', 'c1', validInput, { uid: 'u1' }),
    ).rejects.toThrow(/outro abrigo/);
  });

  it('rejeita pet inexistente', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(
      createMedicalRecord('ghost', 'c1', validInput, { uid: 'u1' }),
    ).rejects.toThrow(/não encontrado/);
  });

  it('cria evento na timeline para consultation', async () => {
    const { addTimelineEvent } = await import('@/modules/shelter/services/timelineService');
    mockGetDoc.mockResolvedValueOnce(petSnap({ shelter_owner_club_id: 'c1' }));
    mockAddDoc.mockResolvedValue({ id: 'rec-new' });
    await createMedicalRecord('p1', 'c1', validInput, { uid: 'u-vet' });
    expect(addTimelineEvent).toHaveBeenCalled();
  });
});

// ─── updateMedicalRecord ────────────────────────────────────────────

describe('updateMedicalRecord', () => {
  it('atualiza campos + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(recordSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateMedicalRecord('p1', 'r1', 'c1', { diagnosis: 'novo' }, { uid: 'u1' });
    expect(r.changed_fields).toContain('diagnosis');
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('retorna noop se vazio', async () => {
    mockGetDoc.mockResolvedValueOnce(recordSnap({ shelter_club_id: 'c1' }));
    const r = await updateMedicalRecord('p1', 'r1', 'c1', {}, { uid: 'u1' });
    expect(r.noop).toBe(true);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(recordSnap({ shelter_club_id: 'c2' }));
    await expect(
      updateMedicalRecord('p1', 'r1', 'c1', { diagnosis: 'X' }, { uid: 'u1' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── deleteMedicalRecord ────────────────────────────────────────────

describe('deleteMedicalRecord', () => {
  it('soft delete: marca deleted_at', async () => {
    mockGetDoc.mockResolvedValueOnce(recordSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    await deleteMedicalRecord('p1', 'r1', 'c1', { uid: 'u1' });
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.deleted_at).toBeTruthy();
    expect(payload.deleted_by_uid).toBe('u1');
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(recordSnap({ shelter_club_id: 'c2' }));
    await expect(
      deleteMedicalRecord('p1', 'r1', 'c1', { uid: 'u1' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── countRecordsByType ────────────────────────────────────────────

describe('countRecordsByType', () => {
  it('retorna size do snapshot', async () => {
    mockGetDocs.mockResolvedValue({ size: 5 });
    expect(await countRecordsByType('p1', 'c1', 'consultation')).toBe(5);
  });
});
