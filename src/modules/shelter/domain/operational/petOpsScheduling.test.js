import { describe, it, expect } from 'vitest';
import {
  toDate,
  startOfDay,
  daysUntil,
  effectiveDate,
  isScheduled,
  recordStatus,
  isUpcoming,
  summarizeAlerts,
  proximityLabel,
  PET_OPS_RECORD_STATUS,
} from './petOpsScheduling';

// Ref fixa para testes determinísticos: 2026-06-15 12:00 local.
const NOW = new Date(2026, 5, 15, 12, 0, 0);
const iso = (y, m, d) => new Date(y, m - 1, d).toISOString();

describe('petOpsScheduling', () => {
  describe('toDate', () => {
    it('aceita ISO string, Date, epoch e Firestore-like', () => {
      expect(toDate('2026-06-15')).toBeInstanceOf(Date);
      expect(toDate(new Date(2026, 0, 1))).toBeInstanceOf(Date);
      expect(toDate({ seconds: 1_700_000_000 })).toBeInstanceOf(Date);
      expect(toDate({ toDate: () => new Date(2026, 0, 1) })).toBeInstanceOf(Date);
    });
    it('retorna null para vazio/inválido', () => {
      expect(toDate(null)).toBeNull();
      expect(toDate('')).toBeNull();
      expect(toDate('not-a-date')).toBeNull();
    });
  });

  describe('daysUntil / startOfDay', () => {
    it('conta dias por dia (ignora horas)', () => {
      expect(daysUntil(new Date(2026, 5, 16, 1), NOW)).toBe(1);
      expect(daysUntil(new Date(2026, 5, 15, 23), NOW)).toBe(0);
      expect(daysUntil(new Date(2026, 5, 13, 5), NOW)).toBe(-2);
    });
    it('startOfDay zera horas', () => {
      const d = startOfDay(new Date(2026, 5, 15, 18, 30));
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    });
  });

  describe('effectiveDate', () => {
    it('usa scheduled_for quando presente, senão o campo nativo', () => {
      const rec = { visit_date: iso(2026, 6, 10), scheduled_for: iso(2026, 6, 20) };
      expect(effectiveDate(rec, 'visit_date').getTime()).toBe(toDate(rec.scheduled_for).getTime());
      const rec2 = { visit_date: iso(2026, 6, 10) };
      expect(effectiveDate(rec2, 'visit_date').getTime()).toBe(toDate(rec2.visit_date).getTime());
    });
  });

  describe('recordStatus', () => {
    it('done: sem scheduled_for', () => {
      expect(recordStatus({ visit_date: iso(2026, 6, 1) }, NOW)).toBe(PET_OPS_RECORD_STATUS.DONE);
    });
    it('done: scheduled_for mas com completed_at', () => {
      expect(recordStatus({ scheduled_for: iso(2026, 6, 20), completed_at: iso(2026, 6, 14) }, NOW))
        .toBe(PET_OPS_RECORD_STATUS.DONE);
    });
    it('scheduled: scheduled_for hoje ou futuro', () => {
      expect(recordStatus({ scheduled_for: iso(2026, 6, 15) }, NOW)).toBe(PET_OPS_RECORD_STATUS.SCHEDULED);
      expect(recordStatus({ scheduled_for: iso(2026, 6, 20) }, NOW)).toBe(PET_OPS_RECORD_STATUS.SCHEDULED);
    });
    it('overdue: scheduled_for no passado, sem completed_at', () => {
      expect(recordStatus({ scheduled_for: iso(2026, 6, 10) }, NOW)).toBe(PET_OPS_RECORD_STATUS.OVERDUE);
    });
  });

  describe('isScheduled', () => {
    it('true só com scheduled_for e sem completed_at', () => {
      expect(isScheduled({ scheduled_for: iso(2026, 6, 20) })).toBe(true);
      expect(isScheduled({ scheduled_for: iso(2026, 6, 20), completed_at: iso(2026, 6, 1) })).toBe(false);
      expect(isScheduled({ visit_date: iso(2026, 6, 1) })).toBe(false);
    });
  });

  describe('isUpcoming', () => {
    it('true para agendado dentro da janela (7d), false para atrasado/distante', () => {
      expect(isUpcoming({ scheduled_for: iso(2026, 6, 16) }, NOW)).toBe(true);   // amanhã
      expect(isUpcoming({ scheduled_for: iso(2026, 6, 22) }, NOW)).toBe(true);   // +7d
      expect(isUpcoming({ scheduled_for: iso(2026, 6, 23) }, NOW)).toBe(false);  // +8d
      expect(isUpcoming({ scheduled_for: iso(2026, 6, 10) }, NOW)).toBe(false);  // atrasado
      expect(isUpcoming({ visit_date: iso(2026, 6, 1) }, NOW)).toBe(false);      // realizado
    });
  });

  describe('summarizeAlerts', () => {
    it('conta próximos e atrasados', () => {
      const records = [
        { scheduled_for: iso(2026, 6, 16) },   // próximo
        { scheduled_for: iso(2026, 6, 18) },   // próximo
        { scheduled_for: iso(2026, 6, 10) },   // atrasado
        { scheduled_for: iso(2026, 7, 30) },   // agendado longe (não conta)
        { visit_date: iso(2026, 6, 1) },       // realizado
      ];
      expect(summarizeAlerts(records, NOW)).toEqual({ upcoming: 2, overdue: 1 });
    });
    it('lista vazia', () => {
      expect(summarizeAlerts([], NOW)).toEqual({ upcoming: 0, overdue: 0 });
    });
  });

  describe('proximityLabel', () => {
    it('rótulos PT-BR', () => {
      expect(proximityLabel({ scheduled_for: iso(2026, 6, 15) }, NOW)).toBe('hoje');
      expect(proximityLabel({ scheduled_for: iso(2026, 6, 16) }, NOW)).toBe('amanhã');
      expect(proximityLabel({ scheduled_for: iso(2026, 6, 18) }, NOW)).toBe('em 3 dias');
      expect(proximityLabel({ scheduled_for: iso(2026, 6, 14) }, NOW)).toBe('atrasada há 1 dia');
      expect(proximityLabel({ scheduled_for: iso(2026, 6, 12) }, NOW)).toBe('atrasada há 3 dias');
      expect(proximityLabel({ visit_date: iso(2026, 6, 1) }, NOW)).toBe('');
    });
  });
});
