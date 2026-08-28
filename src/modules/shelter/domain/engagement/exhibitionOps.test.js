import { describe, it, expect } from 'vitest';
import {
  LOGISTICS_CATEGORY,
  LOGISTICS_STATUS,
  HEALTH_TASK_TYPE,
  HEALTH_TASK_STATUS,
  ADOPTION_STAGE,
  OPS_LIMITS,
  isValidLogisticsCategory,
  isValidLogisticsStatus,
  isValidHealthType,
  isValidHealthStatus,
  isValidAdoptionStage,
  clampStr,
  clampNonNegative,
  normalizeIsoOrNull,
  hasId,
  normalizeChecklistItem,
  normalizeLogisticsItem,
  normalizeHealthTask,
  normalizeAdoptionEntry,
  normalizePlanning,
  upsertById,
  removeById,
  emptyOps,
} from './exhibitionOps.js';

describe('shelter/exhibitionOps domain', () => {
  describe('enum predicates', () => {
    it('validates known enum values', () => {
      expect(isValidLogisticsCategory(LOGISTICS_CATEGORY.TRANSPORT)).toBe(true);
      expect(isValidLogisticsCategory('nope')).toBe(false);
      expect(isValidLogisticsStatus(LOGISTICS_STATUS.DONE)).toBe(true);
      expect(isValidHealthType(HEALTH_TASK_TYPE.SURGERY)).toBe(true);
      expect(isValidHealthStatus(HEALTH_TASK_STATUS.SCHEDULED)).toBe(true);
      expect(isValidAdoptionStage(ADOPTION_STAGE.MEETING)).toBe(true);
      expect(isValidAdoptionStage('married')).toBe(false);
    });
  });

  describe('clampStr / clampNonNegative / normalizeIsoOrNull / hasId', () => {
    it('trims and caps strings, coerces nullish to empty', () => {
      expect(clampStr('  hi  ', 10)).toBe('hi');
      expect(clampStr(null, 10)).toBe('');
      expect(clampStr('abcdef', 3)).toBe('abc');
    });

    it('clamps numbers to non-negative and accepts comma decimals', () => {
      expect(clampNonNegative(-5)).toBe(0);
      expect(clampNonNegative('12,50')).toBe(12.5);
      expect(clampNonNegative('abc')).toBe(0);
      expect(clampNonNegative(10, 5)).toBe(5);
    });

    it('normalizes ISO or returns null', () => {
      expect(normalizeIsoOrNull('')).toBeNull();
      expect(normalizeIsoOrNull('not-a-date')).toBeNull();
      expect(normalizeIsoOrNull('2026-09-01T10:00:00.000Z')).toBe('2026-09-01T10:00:00.000Z');
      expect(normalizeIsoOrNull(new Date('2026-09-01T10:00:00.000Z'))).toBe('2026-09-01T10:00:00.000Z');
    });

    it('hasId requires a non-empty string id', () => {
      expect(hasId({ id: 'x' })).toBe(true);
      expect(hasId({ id: '' })).toBe(false);
      expect(hasId({})).toBe(false);
      expect(hasId(null)).toBe(false);
    });
  });

  describe('normalizeChecklistItem', () => {
    it('sets done_at only when done', () => {
      const undone = normalizeChecklistItem({ id: 'a', label: 'Reservar van', done: false });
      expect(undone).toMatchObject({ id: 'a', label: 'Reservar van', done: false, done_at: null });

      const done = normalizeChecklistItem({ id: 'b', label: 'ok', done: true, done_at: '2026-09-01T10:00:00.000Z' });
      expect(done.done).toBe(true);
      expect(done.done_at).toBe('2026-09-01T10:00:00.000Z');
    });

    it('fills done_at when done but none provided', () => {
      const done = normalizeChecklistItem({ id: 'b', label: 'ok', done: true });
      expect(typeof done.done_at).toBe('string');
      expect(Number.isNaN(new Date(done.done_at).getTime())).toBe(false);
    });
  });

  describe('normalizeLogisticsItem', () => {
    it('defaults invalid category/status and clamps cost', () => {
      const item = normalizeLogisticsItem({
        id: 'l1', category: 'bogus', label: 'Gasolina', cost: '150,00', status: 'weird', notes: 'x',
      });
      expect(item.category).toBe(LOGISTICS_CATEGORY.OTHER);
      expect(item.status).toBe(LOGISTICS_STATUS.PENDING);
      expect(item.cost).toBe(150);
      expect(item.label).toBe('Gasolina');
    });

    it('keeps valid values', () => {
      const item = normalizeLogisticsItem({
        id: 'l2', category: 'transport', label: 'Van', cost: 300, status: 'arranged',
        responsible_uid: 'u1', responsible_name: 'Ana',
      });
      expect(item).toMatchObject({
        category: 'transport', status: 'arranged', cost: 300, responsible_name: 'Ana',
      });
    });
  });

  describe('normalizeHealthTask', () => {
    it('defaults type/status and normalizes schedule', () => {
      const t = normalizeHealthTask({ id: 'h1', pet_id: 'p1', pet_name: 'Rex', type: 'x', status: 'y', scheduled_for: 'bad' });
      expect(t.type).toBe(HEALTH_TASK_TYPE.OTHER);
      expect(t.status).toBe(HEALTH_TASK_STATUS.PENDING);
      expect(t.scheduled_for).toBeNull();
    });

    it('keeps valid vaccine task', () => {
      const t = normalizeHealthTask({
        id: 'h2', pet_id: 'p2', pet_name: 'Mia', type: 'vaccine', status: 'scheduled',
        scheduled_for: '2026-09-10T09:00:00.000Z',
      });
      expect(t).toMatchObject({ type: 'vaccine', status: 'scheduled', pet_name: 'Mia' });
      expect(t.scheduled_for).toBe('2026-09-10T09:00:00.000Z');
    });
  });

  describe('normalizeAdoptionEntry', () => {
    it('defaults stage and always sets created_at', () => {
      const e = normalizeAdoptionEntry({ id: 'a1', applicant_name: 'João', stage: 'nope' });
      expect(e.stage).toBe(ADOPTION_STAGE.INTERESTED);
      expect(typeof e.created_at).toBe('string');
    });

    it('preserves provided created_at and valid stage', () => {
      const e = normalizeAdoptionEntry({
        id: 'a2', applicant_name: 'Maria', stage: 'approved', created_at: '2026-09-01T00:00:00.000Z',
      });
      expect(e.stage).toBe('approved');
      expect(e.created_at).toBe('2026-09-01T00:00:00.000Z');
    });
  });

  describe('normalizePlanning', () => {
    it('returns the 4 canonical keys with clamped budget', () => {
      const p = normalizePlanning({ venue_notes: ' hall ', budget_total: '2000,5', budget_notes: 'x', structure_notes: 's' });
      expect(p).toEqual({ venue_notes: 'hall', structure_notes: 's', budget_total: 2000.5, budget_notes: 'x' });
    });

    it('is deterministic for empty input', () => {
      expect(normalizePlanning()).toEqual({ venue_notes: '', structure_notes: '', budget_total: 0, budget_notes: '' });
    });
  });

  describe('upsertById / removeById', () => {
    it('appends new items and does not mutate the original', () => {
      const list = [{ id: 'a', label: 'A' }];
      const out = upsertById(list, { id: 'b', label: 'B' });
      expect(out).toHaveLength(2);
      expect(list).toHaveLength(1); // original untouched
    });

    it('replaces existing item by id', () => {
      const list = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
      const out = upsertById(list, { id: 'a', label: 'A2' });
      expect(out.find((x) => x.id === 'a').label).toBe('A2');
      expect(out).toHaveLength(2);
    });

    it('ignores items without id', () => {
      const list = [{ id: 'a' }];
      expect(upsertById(list, { label: 'no id' })).toEqual(list);
    });

    it('respects max on append but allows replace at capacity', () => {
      const list = [{ id: 'a' }, { id: 'b' }];
      expect(upsertById(list, { id: 'c' }, 2)).toHaveLength(2); // append blocked
      expect(upsertById(list, { id: 'a', v: 1 }, 2)).toHaveLength(2); // replace allowed
    });

    it('removes by id without mutating', () => {
      const list = [{ id: 'a' }, { id: 'b' }];
      const out = removeById(list, 'a');
      expect(out).toEqual([{ id: 'b' }]);
      expect(list).toHaveLength(2);
    });
  });

  describe('emptyOps', () => {
    it('returns the default ops shape', () => {
      const ops = emptyOps();
      expect(ops.planning.checklist).toEqual([]);
      expect(ops.logistics).toEqual([]);
      expect(ops.health).toEqual([]);
      expect(ops.adoption).toEqual([]);
      expect(ops.planning.budget_total).toBe(0);
    });
  });

  describe('OPS_LIMITS', () => {
    it('exposes sane caps', () => {
      expect(OPS_LIMITS.CHECKLIST_MAX).toBeGreaterThan(0);
      expect(OPS_LIMITS.NOTES_MAX).toBeGreaterThanOrEqual(500);
    });
  });
});
