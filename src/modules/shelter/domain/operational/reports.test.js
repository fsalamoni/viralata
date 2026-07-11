/**
 * @fileoverview Testes: reports domain helpers (Fase 16).
 */

import { describe, it, expect } from 'vitest';
import {
  periodRange,
  lastNMonths,
  formatMonthLabel,
  daysBetween,
  median,
  groupBySpecies,
  countPetsInPeriod,
  countAdoptionsInPeriod,
  countReturnsInPeriod,
  computeRescuesReport,
  computeAdoptionsReport,
  computeFostersReport,
  computeSpayNeuterReport,
  computeComparativeReport,
  computeBalanceReport,
  computeTimeToAdoptionReport,
  computeTimeInShelterReport,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  PERIOD_TYPES,
  PERIOD_LABELS,
  exportToCSV,
} from './reports';

describe('reports domain', () => {
  describe('periodRange', () => {
    it('month: retorna primeiro e último dia do mês', () => {
      const ref = new Date('2025-06-15');
      const { start, end } = periodRange('month', ref);
      expect(start.getUTCFullYear()).toBe(2025);
      expect(start.getUTCMonth()).toBe(5); // June = 5
      expect(start.getUTCDate()).toBe(1);
      expect(end.getUTCMonth()).toBe(5);
      expect(end.getUTCDate()).toBe(30);
    });

    it('year: retorna 1º jan e 31 dez', () => {
      const ref = new Date('2025-06-15');
      const { start, end } = periodRange('year', ref);
      expect(start.getUTCFullYear()).toBe(2025);
      expect(start.getUTCMonth()).toBe(0);
      expect(start.getUTCDate()).toBe(1);
      expect(end.getUTCFullYear()).toBe(2025);
      expect(end.getUTCMonth()).toBe(11);
    });

    it('all: retorna null para start e end', () => {
      const { start, end } = periodRange('all');
      expect(start).toBeNull();
      expect(end).toBeNull();
    });
  });

  describe('lastNMonths', () => {
    it('retorna N meses incluindo o atual', () => {
      const ref = new Date('2025-06-15');
      const months = lastNMonths(3, ref);
      expect(months).toHaveLength(3);
      expect(months[0].month).toBe(3); // April
      expect(months[1].month).toBe(4); // May
      expect(months[2].month).toBe(5); // June
      expect(months[2].year).toBe(2025);
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

  describe('median', () => {
    it('ímpar: retorna o valor central', () => {
      expect(median([1, 5, 3])).toBe(3);
    });
    it('par: retorna média dos dois centrais', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
    it('vazio: retorna 0', () => {
      expect(median([])).toBe(0);
      expect(median(null)).toBe(0);
    });
  });

  describe('groupBySpecies', () => {
    it('conta corretamente', () => {
      const pets = [
        { species: 'dog' },
        { species: 'dog' },
        { species: 'cat' },
        { species: 'other' },
      ];
      const result = groupBySpecies(pets);
      expect(result.dog).toBe(2);
      expect(result.cat).toBe(1);
      expect(result.other).toBe(1);
    });

    it('trata species ausente como other', () => {
      // 'bird' é contado como 'bird', {} (ausente) vira 'other'
      const pets = [{ species: 'bird' }, {}];
      const result = groupBySpecies(pets);
      expect(result.other).toBe(1);  // só o que não tem species
      expect(result.bird).toBe(1);
    });
  });

  describe('countPetsInPeriod', () => {
    it('conta pets dentro do período', () => {
      const pets = [
        { id: 'p1', rescue_date: new Date('2025-06-15') },
        { id: 'p2', rescue_date: new Date('2025-07-01') },
        { id: 'p3', rescue_date: new Date('2025-05-01') },
      ];
      const start = new Date('2025-06-01');
      const end = new Date('2025-06-30');
      const result = countPetsInPeriod(pets, start, end);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('ignora pets sem rescue_date', () => {
      const pets = [{ id: 'p1' }, { id: 'p2', rescue_date: new Date('2025-06-15') }];
      const start = new Date('2025-06-01');
      const end = new Date('2025-06-30');
      const result = countPetsInPeriod(pets, start, end);
      expect(result).toHaveLength(1);
    });

    it('sem filtro retorna todos', () => {
      const pets = [{ id: 'p1', rescue_date: new Date('2025-06-15') }];
      const result = countPetsInPeriod(pets, null, null);
      expect(result).toHaveLength(1);
    });
  });

  describe('countAdoptionsInPeriod', () => {
    it('conta só adoption_completed', () => {
      const apps = [
        { id: 'a1', status: 'adoption_completed', decided_at: new Date('2025-06-15') },
        { id: 'a2', status: 'rejected', decided_at: new Date('2025-06-15') },
      ];
      const result = countAdoptionsInPeriod(apps, new Date('2025-06-01'), new Date('2025-06-30'));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });
  });

  describe('countReturnsInPeriod', () => {
    it('conta só returned', () => {
      const posts = [
        { id: 'p1', status: 'returned', returned_at: new Date('2025-06-10') },
        { id: 'p2', status: 'active', returned_at: new Date('2025-06-10') },
      ];
      const result = countReturnsInPeriod(posts, new Date('2025-06-01'), new Date('2025-06-30'));
      expect(result).toHaveLength(1);
    });
  });

  describe('computeRescuesReport', () => {
    it('computa corretamente', () => {
      const pets = [
        { id: 'p1', species: 'dog', rescue_date: new Date('2025-06-15'), intake_type: 'rescue' },
        { id: 'p2', species: 'cat', rescue_date: new Date('2025-06-20'), intake_type: 'rescue' },
        { id: 'p3', species: 'dog', rescue_date: new Date('2025-07-01'), intake_type: 'surrender' },
      ];
      const start = new Date('2025-06-01');
      const end = new Date('2025-06-30');
      const result = computeRescuesReport(pets, start, end, 12);

      expect(result.type).toBe('rescues');
      expect(result.total).toBe(2);
      expect(result.bySpecies.dog).toBe(1);
      expect(result.bySpecies.cat).toBe(1);
      expect(result.byIntakeType.rescue).toBe(2);
      expect(Array.isArray(result.byMonth)).toBe(true);
    });

    it('lança erro em input inválido', () => {
      expect(() => computeRescuesReport(null, null, null)).toThrow();
    });
  });

  describe('computeAdoptionsReport', () => {
    it('computa total e byStatus', () => {
      const apps = [
        { id: 'a1', status: 'adoption_completed', decided_at: new Date('2025-06-15'), created_at: new Date('2025-06-01') },
        { id: 'a2', status: 'adoption_completed', decided_at: new Date('2025-06-15'), created_at: new Date('2025-06-01') },
        { id: 'a3', status: 'rejected', decided_at: new Date('2025-06-15'), created_at: new Date('2025-06-01') },
      ];
      const posts = [];
      const result = computeAdoptionsReport(apps, posts, new Date('2025-06-01'), new Date('2025-06-30'), 12);

      expect(result.total).toBe(2);
      expect(result.byStatus.adoption_completed).toBe(2);
      expect(result.returnsCount).toBe(0);
    });
  });

  describe('computeFostersReport', () => {
    it('computa totais corretamente', () => {
      const fosters = [
        { id: 'f1', status: 'active', environment: 'house_yard' },
        { id: 'f2', status: 'active', environment: 'apartment' },
        { id: 'f3', status: 'ended', environment: 'house_yard' },
        { id: 'f4', status: 'cancelled', environment: 'rural' },
      ];
      const result = computeFostersReport(fosters);

      expect(result.total).toBe(4);
      expect(result.active).toBe(2);
      expect(result.ended).toBe(2);  // ended + cancelled = 2 terminais
      expect(result.byEnvironment.house_yard).toBe(2);
    });
  });

  describe('computeSpayNeuterReport', () => {
    it('computa taxa de castração', () => {
      const pets = [
        { id: 'p1', species: 'dog', neutered_at: new Date('2025-01-01') },
        { id: 'p2', species: 'dog', neutered_at: null },
        { id: 'p3', species: 'dog', neutered_at: null },
        { id: 'p4', species: 'cat', neutered_at: new Date('2025-01-01') },
      ];
      const result = computeSpayNeuterReport(pets);

      expect(result.totalPets).toBe(4);
      expect(result.neutered).toBe(2);
      expect(result.notNeutered).toBe(2);
      expect(result.neuteredRate).toBe(0.5);
    });
  });

  describe('computeComparativeReport', () => {
    it('computa por ano', () => {
      const pets = [
        { id: 'p1', rescue_date: new Date('2025-03-01') },
        { id: 'p2', rescue_date: new Date('2024-06-01') },
      ];
      const apps = [
        { id: 'a1', status: 'adoption_completed', decided_at: new Date('2025-03-10'), created_at: new Date('2025-03-01') },
      ];
      const posts = [];
      const result = computeComparativeReport(pets, apps, posts, [2024, 2025]);

      expect(result.years).toHaveLength(2);
      const y2025 = result.years.find((y) => y.year === 2025);
      const y2024 = result.years.find((y) => y.year === 2024);
      expect(y2025.rescues).toBe(1);
      expect(y2025.adoptions).toBe(1);
      expect(y2024.rescues).toBe(1);
    });
  });

  describe('computeBalanceReport', () => {
    it('calcula saldo líquido', () => {
      const pets = [{ id: 'p1', rescue_date: new Date('2025-06-01') }];
      const apps = [
        { id: 'a1', status: 'adoption_completed', decided_at: new Date('2025-06-15'), created_at: new Date('2025-06-01') },
      ];
      const posts = [];
      const result = computeBalanceReport(pets, apps, posts, 12, new Date('2025-06-20'));

      expect(result.totalIntake).toBeGreaterThanOrEqual(0);
      expect(result.totalAdoptions).toBeGreaterThanOrEqual(0);
      expect(typeof result.netBalance).toBe('number');
    });
  });

  describe('computeTimeToAdoptionReport', () => {
    it('calcula tempo médio', () => {
      const apps = [
        {
          id: 'a1',
          status: 'adoption_completed',
          created_at: { toDate: () => new Date('2025-06-01') },
          decided_at: { toDate: () => new Date('2025-06-16') },
        },
      ];
      const result = computeTimeToAdoptionReport(apps, 12, new Date('2025-06-20'));

      expect(result.type).toBe('time_to_adoption');
      expect(result.averageDays).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.byMonth)).toBe(true);
    });
  });

  describe('computeTimeInShelterReport', () => {
    it('calcula tempo por espécie', () => {
      const now = new Date();
      const pets = [
        { id: 'p1', species: 'dog', status: 'in_shelter', rescue_date: { toDate: () => new Date(now.getTime() - 30 * 86400000) } },
        { id: 'p2', species: 'cat', status: 'available', rescue_date: { toDate: () => new Date(now.getTime() - 60 * 86400000) } },
      ];
      const result = computeTimeInShelterReport(pets);

      expect(result.type).toBe('time_in_shelter');
      expect(result.bySpecies.dog).toBeDefined();
      expect(result.bySpecies.cat).toBeDefined();
    });
  });

  describe('exportToCSV', () => {
    it('não joga erro com array vazio', () => {
      expect(() => exportToCSV([], 'test.csv')).not.toThrow();
    });

    it('não joga erro com null', () => {
      expect(() => exportToCSV(null)).not.toThrow();
    });
  });

  describe('REPORT_TYPES e LABELS', () => {
    it('todos os report types têm label', () => {
      for (const type of REPORT_TYPES) {
        expect(REPORT_TYPE_LABELS[type]).toBeTruthy();
      }
    });

    it('PERIOD_TYPES tem labels', () => {
      for (const p of PERIOD_TYPES) {
        expect(PERIOD_LABELS[p]).toBeTruthy();
      }
    });
  });
});
