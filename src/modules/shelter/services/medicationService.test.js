/**
 * @fileoverview Testes do serviço de Medicação (Fase 9).
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
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
  pauseMedication,
  resumeMedication,
  cancelMedication,
  completeMedication,
  recordDose,
  listDoses,
  countActiveMedications,
} = await import('./medicationService');
const {
  medicationSchema,
  createMedicationSchema,
  updateMedicationSchema,
  recordDoseSchema,
  MEDICATION_FREQUENCIES,
  MEDICATION_FREQUENCY_LABELS,
  MEDICATION_STATUS,
  MEDICATION_STATUS_LABELS,
  frequencyHours,
  nextDoseAt,
  isDoseDue,
  isDoseOverdue,
  describeMedication,
} = await import('@/modules/shelter/domain/clinical/medication');

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
function medSnap(data, id = 'med-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validInput = {
  medication: 'Dipirona 500mg',
  dosage: '1 comprimido',
  frequency: 'every_8h',
  times: ['08:00', '16:00', '00:00'],
  duration_days: 7,
  notes: 'Após refeições',
};

// ─── Enums / labels ──────────────────────────────────────────────────

describe('MEDICATION_FREQUENCIES', () => {
  it('tem 11 frequências', () => {
    expect(MEDICATION_FREQUENCIES.length).toBe(11);
  });
  it('inclui every_8h, twice_daily, as_needed, custom', () => {
    expect(MEDICATION_FREQUENCIES).toContain('every_8h');
    expect(MEDICATION_FREQUENCIES).toContain('twice_daily');
    expect(MEDICATION_FREQUENCIES).toContain('as_needed');
    expect(MEDICATION_FREQUENCIES).toContain('custom');
  });
});

describe('MEDICATION_FREQUENCY_LABELS', () => {
  it('tem label pt-BR para cada frequência', () => {
    for (const f of MEDICATION_FREQUENCIES) {
      expect(MEDICATION_FREQUENCY_LABELS[f]).toBeTruthy();
    }
  });
});

describe('MEDICATION_STATUS', () => {
  it('tem 4 status', () => {
    expect(MEDICATION_STATUS.length).toBe(4);
  });
  it('inclui active, paused, completed, cancelled', () => {
    expect(MEDICATION_STATUS).toEqual(
      expect.arrayContaining(['active', 'paused', 'completed', 'cancelled']),
    );
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────

describe('frequencyHours', () => {
  it('retorna horas para frequência fixa', () => {
    expect(frequencyHours('every_8h')).toBe(8);
    expect(frequencyHours('every_12h')).toBe(12);
    expect(frequencyHours('weekly')).toBe(168);
  });
  it('retorna null para as_needed', () => {
    expect(frequencyHours('as_needed')).toBeNull();
  });
  it('usa custom_frequency_hours', () => {
    expect(frequencyHours('custom', 6)).toBe(6);
  });
  it('rejeita custom inválido', () => {
    expect(() => frequencyHours('custom', 0)).toThrow();
    expect(() => frequencyHours('custom', 200)).toThrow();
  });
  it('rejeita custom sem valor', () => {
    expect(() => frequencyHours('custom')).toThrow();
  });
});

describe('nextDoseAt', () => {
  it('calcula próxima dose em intervalo fixo', () => {
    const med = { frequency: 'every_8h' };
    const from = '2026-07-10T08:00:00.000Z';
    const next = nextDoseAt(med, from);
    expect(next).toBe('2026-07-10T16:00:00.000Z');
  });
  it('retorna null para as_needed', () => {
    expect(nextDoseAt({ frequency: 'as_needed' }, '2026-07-10T00:00:00.000Z')).toBeNull();
  });
  it('usa custom_frequency_hours', () => {
    const med = { frequency: 'custom', custom_frequency_hours: 4 };
    const next = nextDoseAt(med, '2026-07-10T00:00:00.000Z');
    expect(next).toBe('2026-07-10T04:00:00.000Z');
  });
});

describe('isDoseDue', () => {
  it('true dentro da janela [-15min, +1h]', () => {
    const sched = '2026-07-10T12:00:00.000Z';
    const nowMs = new Date('2026-07-10T12:30:00.000Z').getTime();
    expect(isDoseDue(sched, nowMs)).toBe(true);
  });
  it('true 15min antes', () => {
    const sched = '2026-07-10T12:00:00.000Z';
    const nowMs = new Date('2026-07-10T11:50:00.000Z').getTime();
    expect(isDoseDue(sched, nowMs)).toBe(true);
  });
  it('false antes da janela', () => {
    const sched = '2026-07-10T12:00:00.000Z';
    const nowMs = new Date('2026-07-10T11:30:00.000Z').getTime();
    expect(isDoseDue(sched, nowMs)).toBe(false);
  });
  it('false depois da janela', () => {
    const sched = '2026-07-10T12:00:00.000Z';
    const nowMs = new Date('2026-07-10T14:00:00.000Z').getTime();
    expect(isDoseDue(sched, nowMs)).toBe(false);
  });
});

describe('isDoseOverdue', () => {
  it('true após 1h do horário', () => {
    const sched = '2026-07-10T12:00:00.000Z';
    const nowMs = new Date('2026-07-10T13:30:00.000Z').getTime();
    expect(isDoseOverdue(sched, nowMs)).toBe(true);
  });
  it('false dentro da janela', () => {
    const sched = '2026-07-10T12:00:00.000Z';
    const nowMs = new Date('2026-07-10T12:30:00.000Z').getTime();
    expect(isDoseOverdue(sched, nowMs)).toBe(false);
  });
});

describe('describeMedication', () => {
  it('formata com nome, dosage, freq e times', () => {
    const desc = describeMedication({
      medication: 'Dipirona 500mg',
      dosage: '1 comp',
      frequency: 'every_8h',
      times: ['08:00', '16:00'],
    });
    expect(desc).toContain('Dipirona 500mg');
    expect(desc).toContain('1 comp');
    expect(desc).toContain('A cada 8h');
    expect(desc).toContain('08:00');
  });
});

// ─── Schema validation ───────────────────────────────────────────────

describe('createMedicationSchema', () => {
  it('aceita input válido', () => {
    expect(createMedicationSchema.safeParse(validInput).success).toBe(true);
  });
  it('rejeita frequency inválida', () => {
    expect(createMedicationSchema.safeParse({ ...validInput, frequency: 'foo' }).success).toBe(false);
  });
  it('rejeita time em formato errado', () => {
    expect(createMedicationSchema.safeParse({ ...validInput, times: ['25:00'] }).success).toBe(false);
  });
  it('aceita custom_frequency_hours válido', () => {
    expect(createMedicationSchema.safeParse({ ...validInput, frequency: 'custom', custom_frequency_hours: 6 }).success).toBe(true);
  });
  it('rejeita custom_frequency_hours inválido', () => {
    expect(createMedicationSchema.safeParse({ ...validInput, frequency: 'custom', custom_frequency_hours: 0 }).success).toBe(false);
  });
  it('rejeita mais de 20 times', () => {
    const tooMany = Array(21).fill('08:00');
    expect(createMedicationSchema.safeParse({ ...validInput, times: tooMany }).success).toBe(false);
  });
});

describe('updateMedicationSchema', () => {
  it('aceita parcial', () => {
    expect(updateMedicationSchema.safeParse({ notes: 'ajuste' }).success).toBe(true);
  });
  it('aceita mudança de status', () => {
    expect(updateMedicationSchema.safeParse({ status: 'paused' }).success).toBe(true);
  });
  it('rejeita status inválido', () => {
    expect(updateMedicationSchema.safeParse({ status: 'wrong' }).success).toBe(false);
  });
});

describe('recordDoseSchema', () => {
  it('aceita dose completa', () => {
    const r = recordDoseSchema.safeParse({
      scheduled_at: '2026-07-10T08:00:00.000Z',
      by_uid: 'u1',
    });
    expect(r.success).toBe(true);
    expect(r.data.skipped).toBe(false);
  });
  it('aceita dose pulada', () => {
    expect(recordDoseSchema.safeParse({
      scheduled_at: '2026-07-10T08:00:00.000Z',
      by_uid: 'u1',
      skipped: true,
      notes: 'animal dormindo',
    }).success).toBe(true);
  });
  it('rejeita sem by_uid', () => {
    expect(recordDoseSchema.safeParse({
      scheduled_at: '2026-07-10T08:00:00.000Z',
    }).success).toBe(false);
  });
});

// ─── list / get ───────────────────────────────────────────────────────

describe('listMedications', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listMedications('p1', 'c1')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });
  it('lança sem petId ou shelterClubId', async () => {
    await expect(listMedications('', 'c1')).rejects.toThrow();
    await expect(listMedications('p1', '')).rejects.toThrow();
  });
  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'm1', data: () => ({ medication: 'Dipirona' }) }],
    });
    const r = await listMedications('p1', 'c1');
    expect(r[0].id).toBe('m1');
  });
});

describe('getMedication', () => {
  it('retorna null se cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(medSnap({ shelter_club_id: 'c2' }, 'm1'));
    expect(await getMedication('p1', 'm1', 'c1')).toBeNull();
  });
  it('retorna doc se tenant bate', async () => {
    mockGetDoc.mockResolvedValue(medSnap({ shelter_club_id: 'c1', medication: 'X' }, 'm1'));
    const r = await getMedication('p1', 'm1', 'c1');
    expect(r.id).toBe('m1');
    expect(r.medication).toBe('X');
  });
});

// ─── createMedication ──────────────────────────────────────────────

describe('createMedication', () => {
  it('cria medicação com audit', async () => {
    mockGetDoc.mockResolvedValueOnce(petSnap({ shelter_owner_club_id: 'c1' }));
    mockAddDoc.mockResolvedValue({ id: 'med-new' });
    const r = await createMedication('p1', 'c1', validInput, { uid: 'u-vet', displayName: 'Dra. Ana' });
    expect(r.id).toBe('med-new');
    expect(r.medication).toBe('Dipirona 500mg');
    expect(r.status).toBe('active');
    expect(r.responsible_uid).toBe('u-vet');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'medication_created' }),
    );
  });

  it('calcula end_date a partir de duration_days', async () => {
    mockGetDoc.mockResolvedValueOnce(petSnap({ shelter_owner_club_id: 'c1' }));
    mockAddDoc.mockResolvedValue({ id: 'med-new' });
    const r = await createMedication('p1', 'c1', {
      ...validInput,
      start_date: '2026-07-10T00:00:00.000Z',
      duration_days: 5,
    }, { uid: 'u1' });
    expect(r.end_date).toContain('2026-07-15');
  });

  it('rejeita pet de outro abrigo', async () => {
    mockGetDoc.mockResolvedValueOnce(petSnap({ shelter_owner_club_id: 'c2' }));
    await expect(
      createMedication('p1', 'c1', validInput, { uid: 'u1' }),
    ).rejects.toThrow(/outro abrigo/);
  });

  it('rejeita pet inexistente', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(
      createMedication('ghost', 'c1', validInput, { uid: 'u1' }),
    ).rejects.toThrow(/não encontrado/);
  });
});

// ─── updateMedication ──────────────────────────────────────────────

describe('updateMedication', () => {
  it('atualiza + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updateMedication('p1', 'm1', 'c1', { notes: 'ajuste' }, { uid: 'u1' });
    expect(r.changed_fields).toContain('notes');
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('retorna noop se vazio', async () => {
    mockGetDoc.mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1' }));
    const r = await updateMedication('p1', 'm1', 'c1', {}, { uid: 'u1' });
    expect(r.noop).toBe(true);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(medSnap({ shelter_club_id: 'c2' }));
    await expect(
      updateMedication('p1', 'm1', 'c1', { notes: 'X' }, { uid: 'u1' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── pause / resume / cancel / complete ───────────────────────────

describe('pauseMedication', () => {
  it('muda status para paused', async () => {
    mockGetDoc.mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    await pauseMedication('p1', 'm1', 'c1', 'viagem', { uid: 'u1' });
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.status).toBe('paused');
    expect(payload.notes).toContain('PAUSADA');
  });
});

describe('cancelMedication', () => {
  it('cancela + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    await cancelMedication('p1', 'm1', 'c1', 'veterinário suspendeu', { uid: 'u1' });
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.status).toBe('cancelled');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'medication_cancelled' }),
    );
  });
});

describe('completeMedication', () => {
  it('marca como completed + end_date', async () => {
    mockGetDoc.mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    await completeMedication('p1', 'm1', 'c1', { uid: 'u1' });
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.status).toBe('completed');
    expect(payload.end_date).toBeTruthy();
  });
});

// ─── recordDose ───────────────────────────────────────────────────

describe('recordDose', () => {
  it('cria nova dose', async () => {
    mockGetDoc
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5 }))   // verify
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5 }));  // re-read
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'dose-new' });
    const r = await recordDose('p1', 'm1', 'c1', {
      scheduled_at: '2026-07-10T08:00:00.000Z',
      by_uid: 'u-vet',
    }, { uid: 'u-vet' });
    expect(r.id).toBe('dose-new');
    expect(r.administered_at).toBeTruthy();
  });

  it('atualiza dose existente (idempotência)', async () => {
    mockGetDoc
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5 }))   // verify
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5 }));  // re-read
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'dose-existing', ref: { id: 'dose-existing' } }],
    });
    mockUpdateDoc.mockResolvedValue(null);
    await recordDose('p1', 'm1', 'c1', {
      scheduled_at: '2026-07-10T08:00:00.000Z',
      by_uid: 'u-vet',
    }, { uid: 'u-vet' });
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('incrementa administered_count', async () => {
    mockGetDoc
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5 }))  // verify
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5 })); // re-read
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'dose-new' });
    await recordDose('p1', 'm1', 'c1', {
      scheduled_at: '2026-07-10T08:00:00.000Z',
      by_uid: 'u1',
    }, { uid: 'u1' });
    // NEW dose: addDoc para dose + updateDoc para contador = 1 updateDoc
    const counterCall = mockUpdateDoc.mock.calls[0][1];
    expect(counterCall.administered_count).toBe(6);
  });

  it('não incrementa administered se skipped', async () => {
    mockGetDoc
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5, skipped_count: 2 }))
      .mockResolvedValueOnce(medSnap({ shelter_club_id: 'c1', administered_count: 5, skipped_count: 2 }));
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: 'dose-new' });
    await recordDose('p1', 'm1', 'c1', {
      scheduled_at: '2026-07-10T08:00:00.000Z',
      by_uid: 'u1',
      skipped: true,
    }, { uid: 'u1' });
    const counterCall = mockUpdateDoc.mock.calls[0][1];
    expect(counterCall.administered_count).toBe(5);
    expect(counterCall.skipped_count).toBe(3);
  });
});

// ─── countActiveMedications ──────────────────────────────────────

describe('countActiveMedications', () => {
  it('retorna size do snapshot', async () => {
    mockGetDocs.mockResolvedValue({ size: 3 });
    expect(await countActiveMedications('p1', 'c1')).toBe(3);
  });
});
