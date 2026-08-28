import { describe, it, expect } from 'vitest';
import {
  getOps,
  planningChecklist,
  checklistProgress,
  logisticsItems,
  logisticsCostTotal,
  logisticsStatusCounts,
  healthTasks,
  healthStatusCounts,
  adoptionEntries,
  adoptionStageCounts,
  sortAdoptionEntries,
  computeExhibitionOpsSummary,
} from './exhibitionOpsView.js';

const exhibitionWithOps = {
  id: 'ex1',
  title: 'Feira de Adoção',
  status: 'scheduled',
  ops: {
    planning: {
      checklist: [
        { id: 'c1', label: 'Reservar praça', done: true, done_at: '2026-09-01T00:00:00.000Z' },
        { id: 'c2', label: 'Montar tendas', done: false, done_at: null },
        { id: 'c3', label: 'Divulgar', done: false, done_at: null },
      ],
      venue_notes: 'Praça central',
      structure_notes: '4 tendas',
      budget_total: 1000,
      budget_notes: 'estimado',
    },
    logistics: [
      { id: 'l1', category: 'transport', label: 'Van', cost: 300, status: 'arranged' },
      { id: 'l2', category: 'food', label: 'Ração', cost: 150, status: 'pending' },
      { id: 'l3', category: 'water', label: 'Galões', cost: 0, status: 'done' },
    ],
    health: [
      { id: 'h1', pet_id: 'p1', pet_name: 'Rex', type: 'vaccine', status: 'done' },
      { id: 'h2', pet_id: 'p2', pet_name: 'Mia', type: 'surgery', status: 'scheduled' },
      { id: 'h3', pet_id: 'p3', pet_name: 'Bob', type: 'consult', status: 'pending' },
    ],
    adoption: [
      { id: 'a1', applicant_name: 'João', stage: 'completed', created_at: '2026-09-02T00:00:00.000Z' },
      { id: 'a2', applicant_name: 'Maria', stage: 'interested', created_at: '2026-09-01T00:00:00.000Z' },
      { id: 'a3', applicant_name: 'Ana', stage: 'meeting', created_at: '2026-09-03T00:00:00.000Z' },
    ],
  },
};

describe('shelter/exhibitionOpsView derivations', () => {
  describe('getOps tolerates legacy docs', () => {
    it('returns empty ops for a doc without ops', () => {
      const ops = getOps({ id: 'legacy', title: 'x' });
      expect(ops.planning.checklist).toEqual([]);
      expect(ops.logistics).toEqual([]);
      expect(ops.health).toEqual([]);
      expect(ops.adoption).toEqual([]);
    });

    it('returns empty ops for null/undefined', () => {
      expect(getOps(null).logistics).toEqual([]);
      expect(getOps(undefined).adoption).toEqual([]);
    });

    it('coerces malformed ops fields', () => {
      const ops = getOps({ ops: { planning: 'nope', logistics: 'x', health: null } });
      expect(ops.planning.checklist).toEqual([]);
      expect(ops.logistics).toEqual([]);
      expect(ops.health).toEqual([]);
    });
  });

  describe('planning', () => {
    it('reads the checklist', () => {
      expect(planningChecklist(exhibitionWithOps)).toHaveLength(3);
    });

    it('computes progress percent', () => {
      expect(checklistProgress(exhibitionWithOps)).toEqual({ total: 3, done: 1, pct: 33 });
    });

    it('progress is 0 for empty checklist', () => {
      expect(checklistProgress({ ops: { planning: { checklist: [] } } })).toEqual({ total: 0, done: 0, pct: 0 });
    });
  });

  describe('logistics', () => {
    it('lists items', () => {
      expect(logisticsItems(exhibitionWithOps)).toHaveLength(3);
    });

    it('sums cost total', () => {
      expect(logisticsCostTotal(exhibitionWithOps)).toBe(450);
    });

    it('counts by status', () => {
      expect(logisticsStatusCounts(exhibitionWithOps)).toEqual({ pending: 1, arranged: 1, done: 1 });
    });
  });

  describe('health', () => {
    it('lists tasks', () => {
      expect(healthTasks(exhibitionWithOps)).toHaveLength(3);
    });

    it('counts by status', () => {
      expect(healthStatusCounts(exhibitionWithOps)).toEqual({ pending: 1, scheduled: 1, done: 1, cancelled: 0 });
    });
  });

  describe('adoption', () => {
    it('lists entries', () => {
      expect(adoptionEntries(exhibitionWithOps)).toHaveLength(3);
    });

    it('counts by stage with all stages present', () => {
      const counts = adoptionStageCounts(exhibitionWithOps);
      expect(counts.interested).toBe(1);
      expect(counts.meeting).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.declined).toBe(0);
    });

    it('sorts by canonical stage order then created_at', () => {
      const sorted = sortAdoptionEntries(exhibitionWithOps);
      expect(sorted.map((e) => e.id)).toEqual(['a2', 'a3', 'a1']); // interested < meeting < completed
    });
  });

  describe('computeExhibitionOpsSummary', () => {
    it('aggregates all modules', () => {
      const s = computeExhibitionOpsSummary(exhibitionWithOps);
      expect(s.checklist.pct).toBe(33);
      expect(s.logistics.count).toBe(3);
      expect(s.logistics.cost_total).toBe(450);
      expect(s.health.done).toBe(1);
      expect(s.adoption.completed).toBe(1);
      expect(s.adoption.active).toBe(2); // interested + meeting
    });

    it('is safe for legacy docs', () => {
      const s = computeExhibitionOpsSummary({ id: 'x' });
      expect(s.checklist.total).toBe(0);
      expect(s.logistics.count).toBe(0);
      expect(s.health.count).toBe(0);
      expect(s.adoption.count).toBe(0);
    });
  });
});
