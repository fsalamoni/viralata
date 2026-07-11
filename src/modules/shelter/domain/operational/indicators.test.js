/**
 * @fileoverview Testes: indicators domain helpers (Fase 17).
 */

import { describe, it, expect } from 'vitest';
import {
  periodRangeInd,
  lastNMonths,
  formatMonthLabel,
  daysBetween,
  computeExhibitionSummary,
  computeExhibitionDetail,
  computeVolunteerSummary,
  computeVolunteerDetail,
  filterByPeriod,
  INDICATOR_TYPES,
  INDICATOR_TYPE_LABELS,
  PERIOD_TYPES_IND,
  PERIOD_LABELS_IND,
} from './indicators';

describe('indicators domain', () => {
  describe('periodRangeInd', () => {
    it('month: retorna primeiro e último dia', () => {
      const ref = new Date('2025-06-15');
      const { start, end } = periodRangeInd('month', ref);
      expect(start.getUTCMonth()).toBe(5);
      expect(end.getUTCMonth()).toBe(5);
      expect(start.getUTCDate()).toBe(1);
    });

    it('year: retorna 1º jan e 31 dez', () => {
      const ref = new Date('2025-06-15');
      const { start, end } = periodRangeInd('year', ref);
      expect(start.getUTCMonth()).toBe(0);
      expect(end.getUTCMonth()).toBe(11);
    });

    it('all: retorna nulls', () => {
      const { start, end } = periodRangeInd('all');
      expect(start).toBeNull();
      expect(end).toBeNull();
    });
  });

  describe('lastNMonths', () => {
    it('retorna N meses', () => {
      const ref = new Date('2025-06-15');
      const months = lastNMonths(3, ref);
      expect(months).toHaveLength(3);
      expect(months[0].month).toBe(3);
      expect(months[2].month).toBe(5);
    });
  });

  describe('formatMonthLabel', () => {
    it('formata corretamente', () => {
      expect(formatMonthLabel(new Date('2025-01-15'))).toBe('Jan 2025');
      expect(formatMonthLabel(new Date('2025-12-01'))).toBe('Dez 2025');
    });
  });

  describe('daysBetween', () => {
    it('calcula diferença em dias', () => {
      expect(daysBetween(new Date('2025-01-01'), new Date('2025-01-10'))).toBe(9);
      expect(daysBetween(new Date('2025-01-10'), new Date('2025-01-01'))).toBe(9);
    });
  });

  describe('filterByPeriod', () => {
    it('filtra por período', () => {
      const items = [
        { id: 'a', date: new Date('2025-06-15') },
        { id: 'b', date: new Date('2025-07-01') },
        { id: 'c', date: new Date('2025-05-01') },
      ];
      const start = new Date('2025-06-01');
      const end = new Date('2025-06-30');
      const result = filterByPeriod(items, 'date', start, end);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('ignora items sem data', () => {
      const items = [{ id: 'a', date: new Date('2025-06-15') }, { id: 'b' }];
      const result = filterByPeriod(items, 'date', null, null);
      expect(result).toHaveLength(1);
    });
  });

  describe('computeExhibitionSummary', () => {
    it('computa corretamente', () => {
      const exhibitions = [
        {
          id: 'ex1',
          status: 'completed',
          datetime_start: '2025-06-10T14:00:00Z',
          pet_ids: ['p1', 'p2'],
          external_pets: [],
          post_event_log: [{ outcome: 'adopted' }, { outcome: 'returned_to_shelter' }],
        },
        {
          id: 'ex2',
          status: 'scheduled',
          datetime_start: '2025-07-01T10:00:00Z',
          pet_ids: [],
          external_pets: [{ pet_id: 'p3' }],
          post_event_log: [],
        },
      ];
      const participations = [
        { exhibition_id: 'ex1', volunteer_uid: 'v1' },
        { exhibition_id: 'ex1', volunteer_uid: 'v2' },
        { exhibition_id: 'ex1', volunteer_uid: 'v3' },
      ];
      const start = new Date('2025-06-01');
      const end = new Date('2025-06-30');

      const result = computeExhibitionSummary(exhibitions, participations, start, end, 12);

      expect(result.type).toBe('exhibition_summary');
      expect(result.totalExhibitions).toBe(1); // só ex1 está no período
      expect(result.completed).toBe(1);
      expect(result.totalParticipants).toBe(3);
      expect(result.totalAnimals).toBe(2);
    });

    it('lança em input inválido', () => {
      expect(() => computeExhibitionSummary(null, [])).toThrow();
    });
  });

  describe('computeExhibitionDetail', () => {
    it('computa por vitrine', () => {
      const exhibitions = [
        {
          id: 'ex1',
          title: 'Vitrine da Praça',
          status: 'completed',
          datetime_start: '2025-06-10T14:00:00Z',
          pet_ids: ['p1'],
          external_pets: [],
          post_event_log: [{ outcome: 'adopted' }],
          shifts: [],
        },
      ];
      const participations = [
        { exhibition_id: 'ex1', volunteer_uid: 'v1' },
        { exhibition_id: 'ex1', volunteer_uid: 'v2' },
      ];
      const result = computeExhibitionDetail(exhibitions, participations);

      expect(result.type).toBe('exhibition_detail');
      expect(result.exhibitions).toHaveLength(1);
      expect(result.exhibitions[0].participants).toBe(2);
      expect(result.exhibitions[0].animals).toBe(1);
      expect(result.exhibitions[0].adoptionRate).toBe(1);
    });
  });

  describe('computeVolunteerSummary', () => {
    it('computa corretamente', () => {
      const participations = [
        {
          id: 'p1',
          volunteer_uid: 'v1',
          role: 'carregamento',
          check_in: { toDate: () => new Date('2025-06-10T08:00:00Z') },
          check_out: { toDate: () => new Date('2025-06-10T14:00:00Z') },
          created_at: { toDate: () => new Date('2025-06-10T08:00:00Z') },
        },
        {
          id: 'p2',
          volunteer_uid: 'v2',
          role: 'transporte_ida',
          check_in: { toDate: () => new Date('2025-06-10T09:00:00Z') },
          check_out: { toDate: () => new Date('2025-06-10T12:00:00Z') },
          created_at: { toDate: () => new Date('2025-06-10T09:00:00Z') },
        },
      ];

      const result = computeVolunteerSummary(participations, null, null);

      expect(result.type).toBe('volunteer_summary');
      expect(result.totalParticipations).toBe(2);
      expect(result.totalVolunteers).toBe(2);
      expect(result.totalTransportsIda).toBe(1);
      expect(result.totalHours).toBeGreaterThan(0); // 6h + 3h = 9h
    });
  });

  describe('computeVolunteerDetail', () => {
    it('computa por voluntário', () => {
      const participations = [
        {
          id: 'p1',
          volunteer_uid: 'v1',
          role: 'carregamento',
          check_in: { toDate: () => new Date('2025-06-10T08:00:00Z') },
          check_out: { toDate: () => new Date('2025-06-10T14:00:00Z') },
          created_at: { toDate: () => new Date('2025-06-10T08:00:00Z') },
        },
        {
          id: 'p2',
          volunteer_uid: 'v1',
          role: 'transporte_ida',
          check_in: { toDate: () => new Date('2025-06-11T09:00:00Z') },
          check_out: { toDate: () => new Date('2025-06-11T12:00:00Z') },
          created_at: { toDate: () => new Date('2025-06-11T09:00:00Z') },
        },
      ];
      const volunteerProfiles = [{ uid: 'v1', display_name: 'João Silva' }];

      const result = computeVolunteerDetail(participations, volunteerProfiles);

      expect(result.type).toBe('volunteer_detail');
      expect(result.volunteers).toHaveLength(1);
      expect(result.volunteers[0].name).toBe('João Silva');
      expect(result.volunteers[0].totalParticipations).toBe(2);
      expect(result.volunteers[0].totalHours).toBeGreaterThan(0);
    });
  });

  describe('INDICATOR_TYPES', () => {
    it('todos têm labels', () => {
      for (const type of INDICATOR_TYPES) {
        expect(INDICATOR_TYPE_LABELS[type]).toBeTruthy();
      }
    });

    it('PERIOD_TYPES_IND tem labels', () => {
      for (const p of PERIOD_TYPES_IND) {
        expect(PERIOD_LABELS_IND[p]).toBeTruthy();
      }
    });
  });
});
