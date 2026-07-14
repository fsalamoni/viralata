/**
 * @fileoverview Tests do computeMedicationAdherenceReport (TASK-141).
 */
import { describe, it, expect } from 'vitest';
import { computeMedicationAdherenceReport, medicationAdherenceReportSchema } from './reports.js';

const NOW = new Date('2026-07-14T12:00:00.000Z').getTime();
const ON_TIME_THRESHOLD = 30 * 60 * 1000; // 30 min

function makeDose({ scheduledAt, administeredAt = null, skipped = false, medicationId = 'med-1', petId = 'pet-1' }) {
  return {
    medication_id: medicationId,
    pet_id: petId,
    scheduled_at: { toMillis: () => new Date(scheduledAt).getTime() },
    administered_at: administeredAt ? { toMillis: () => new Date(administeredAt).getTime() } : null,
    skipped,
  };
}

function makeMedication({ id = 'med-1', petId = 'pet-1' } = {}) {
  return { id, pet_id: petId, status: 'active' };
}

describe('computeMedicationAdherenceReport (TASK-141)', () => {
  it('retorna zero para lista vazia', () => {
    const r = computeMedicationAdherenceReport({ medications: [], doses: [], pets: [] });
    expect(r.totalDoses).toBe(0);
    expect(r.adherencePct).toBe(0);
    expect(r.perPet).toEqual([]);
  });

  it('on-time: dose administrada em 5 min após scheduled → 100%', () => {
    const scheduled = new Date(NOW - 60 * 60 * 1000).toISOString();
    const administered = new Date(NOW - 60 * 60 * 1000 + 5 * 60 * 1000).toISOString();
    const r = computeMedicationAdherenceReport({
      medications: [makeMedication()],
      doses: [makeDose({ scheduledAt: scheduled, administeredAt: administered })],
      pets: [{ id: 'pet-1', name: 'Rex' }],
    });
    expect(r.totalDoses).toBe(1);
    expect(r.onTime).toBe(1);
    expect(r.adherencePct).toBe(100);
    expect(r.perPet[0].pet_name).toBe('Rex');
  });

  it('late: dose administrada 2h após scheduled → 50% compliance', () => {
    const scheduled = new Date(NOW - 5 * 60 * 60 * 1000).toISOString();
    const administered = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    const r = computeMedicationAdherenceReport({
      medications: [makeMedication()],
      doses: [makeDose({ scheduledAt: scheduled, administeredAt: administered })],
      pets: [],
    });
    expect(r.totalDoses).toBe(1);
    expect(r.late).toBe(1);
    expect(r.onTime).toBe(0);
    expect(r.adherencePct).toBe(50);
  });

  it('missed: dose vencida há +24h sem administração → 0%', () => {
    const scheduled = new Date(NOW - 48 * 60 * 60 * 1000).toISOString(); // 48h atrás
    const r = computeMedicationAdherenceReport({
      medications: [makeMedication()],
      doses: [makeDose({ scheduledAt: scheduled, administeredAt: null })],
      pets: [],
    });
    expect(r.missed).toBe(1);
    expect(r.adherencePct).toBe(0);
  });

  it('skipped: dose pulada → 0% (não conta como missed)', () => {
    const scheduled = new Date(NOW - 60 * 60 * 1000).toISOString();
    const r = computeMedicationAdherenceReport({
      medications: [makeMedication()],
      doses: [makeDose({ scheduledAt: scheduled, skipped: true })],
      pets: [],
    });
    expect(r.skipped).toBe(1);
    expect(r.missed).toBe(0);
    // skipped não conta no total
    expect(r.adherencePct).toBe(0);
  });

  it('mistura: 2 on-time + 1 late + 1 missed → 62%', () => {
    const yesterday = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(NOW - 48 * 60 * 60 * 1000).toISOString();
    const doses = [
      makeDose({ scheduledAt: yesterday, administeredAt: yesterday }), // on-time
      makeDose({ scheduledAt: yesterday, administeredAt: new Date(new Date(yesterday).getTime() + 2*60*60*1000).toISOString() }), // late
      makeDose({ scheduledAt: yesterday, administeredAt: yesterday }), // on-time
      makeDose({ scheduledAt: twoDaysAgo, administeredAt: null }), // missed
    ];
    const r = computeMedicationAdherenceReport({
      medications: [makeMedication()],
      doses,
      pets: [],
    });
    expect(r.totalDoses).toBe(4);
    expect(r.onTime).toBe(2);
    expect(r.late).toBe(1);
    expect(r.missed).toBe(1);
    // (2 + 1*0.5) / 4 = 0.625 → 63%
    expect(r.adherencePct).toBe(63);
  });

  it('perPet: cada animal tem seu próprio breakdown', () => {
    const yesterday = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();
    const doses = [
      makeDose({ scheduledAt: yesterday, administeredAt: yesterday, medicationId: 'med-1', petId: 'pet-1' }),
      makeDose({ scheduledAt: yesterday, administeredAt: yesterday, medicationId: 'med-2', petId: 'pet-2' }),
      makeDose({ scheduledAt: yesterday, administeredAt: yesterday, medicationId: 'med-2', petId: 'pet-2' }),
    ];
    const meds = [
      makeMedication({ id: 'med-1', petId: 'pet-1' }),
      makeMedication({ id: 'med-2', petId: 'pet-2' }),
    ];
    const r = computeMedicationAdherenceReport({
      medications: meds,
      doses,
      pets: [{ id: 'pet-1', name: 'Rex' }, { id: 'pet-2', name: 'Mia' }],
    });
    expect(r.perPet).toHaveLength(2);
    const rex = r.perPet.find((p) => p.pet_id === 'pet-1');
    const mia = r.perPet.find((p) => p.pet_id === 'pet-2');
    expect(rex.totalDoses).toBe(1);
    expect(mia.totalDoses).toBe(2);
  });

  it('schema Zod valida estrutura', () => {
    const r = computeMedicationAdherenceReport({ medications: [], doses: [], pets: [] });
    expect(() => medicationAdherenceReportSchema.parse(r)).not.toThrow();
  });
});
