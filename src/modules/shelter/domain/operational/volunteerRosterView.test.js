/**
 * @fileoverview Testes: volunteerRosterView (Fase 2 — SHELTER_VOLUNTEERS_V2).
 */

import { describe, it, expect } from 'vitest';
import {
  jsDayToCode,
  isVolunteerAvailableOn,
  isVolunteerAvailableToday,
  availabilityDays,
  availabilityDaysSummary,
  availabilityTimeRange,
  availabilityPeriodSummary,
  volunteerActivityLabels,
  VOLUNTEER_DAY_SHORT_LABELS,
} from './volunteerRosterView.js';

// Slots de exemplo
const MON = { day_of_week: 'mon', start_time: '08:00', end_time: '12:00' };
const WED = { day_of_week: 'wed', start_time: '14:00', end_time: '18:00' };
const FRI = { day_of_week: 'fri', start_time: '09:00', end_time: '11:00' };

describe('jsDayToCode', () => {
  it('mapeia getDay() para o código ISO', () => {
    // 2026-08-31 é uma segunda-feira; use datas UTC-noon para evitar TZ drift.
    expect(jsDayToCode(new Date('2026-08-31T12:00:00Z'))).toBe('mon'); // seg
    expect(jsDayToCode(new Date('2026-09-02T12:00:00Z'))).toBe('wed'); // qua
    expect(jsDayToCode(new Date('2026-09-06T12:00:00Z'))).toBe('sun'); // dom
  });
  it('retorna null para datas inválidas', () => {
    expect(jsDayToCode(new Date('not-a-date'))).toBeNull();
    expect(jsDayToCode('2026-08-31')).toBeNull();
    expect(jsDayToCode(null)).toBeNull();
  });
});

describe('isVolunteerAvailableOn / Today', () => {
  it('true quando há slot no mesmo dia da semana', () => {
    // 2026-08-31 = segunda
    expect(isVolunteerAvailableOn([MON, WED], new Date('2026-08-31T12:00:00Z'))).toBe(true);
  });
  it('false quando não há slot no dia', () => {
    // 2026-09-01 = terça
    expect(isVolunteerAvailableOn([MON, WED], new Date('2026-09-01T12:00:00Z'))).toBe(false);
  });
  it('false para availability vazia/ausente', () => {
    expect(isVolunteerAvailableOn([], new Date('2026-08-31T12:00:00Z'))).toBe(false);
    expect(isVolunteerAvailableOn(undefined, new Date('2026-08-31T12:00:00Z'))).toBe(false);
    expect(isVolunteerAvailableOn(null)).toBe(false);
  });
  it('isVolunteerAvailableToday usa a data injetada', () => {
    expect(isVolunteerAvailableToday([FRI], new Date('2026-09-04T12:00:00Z'))).toBe(true); // sexta
    expect(isVolunteerAvailableToday([FRI], new Date('2026-09-03T12:00:00Z'))).toBe(false); // quinta
  });
  it('ignora slots com day_of_week inválido', () => {
    expect(isVolunteerAvailableOn([{ day_of_week: 'xxx' }], new Date('2026-08-31T12:00:00Z'))).toBe(false);
  });
});

describe('availabilityDays / Summary', () => {
  it('retorna dias únicos ordenados Seg→Dom (curto)', () => {
    expect(availabilityDays([FRI, MON, WED])).toEqual(['Seg', 'Qua', 'Sex']);
  });
  it('remove duplicados', () => {
    expect(availabilityDays([MON, { ...MON, start_time: '13:00', end_time: '15:00' }])).toEqual(['Seg']);
  });
  it('summary junta com vírgula', () => {
    expect(availabilityDaysSummary([MON, WED])).toBe('Seg, Qua');
  });
  it('summary vazio para availability vazia', () => {
    expect(availabilityDaysSummary([])).toBe('');
  });
  it('aceita rótulos longos com short:false', () => {
    expect(availabilityDays([MON], { short: false })).toEqual(['Segunda']);
  });
  it('VOLUNTEER_DAY_SHORT_LABELS cobre os 7 dias', () => {
    expect(Object.keys(VOLUNTEER_DAY_SHORT_LABELS)).toHaveLength(7);
  });
});

describe('availabilityTimeRange', () => {
  it('agrega menor start e maior end', () => {
    expect(availabilityTimeRange([MON, WED])).toEqual({ start: '08:00', end: '18:00' });
  });
  it('null quando não há slots', () => {
    expect(availabilityTimeRange([])).toBeNull();
    expect(availabilityTimeRange(undefined)).toBeNull();
  });
});

describe('availabilityPeriodSummary', () => {
  it('combina dias e faixa', () => {
    expect(availabilityPeriodSummary([MON, WED, FRI])).toBe('Seg, Qua, Sex · 08:00–18:00');
  });
  it('vazio quando sem disponibilidade', () => {
    expect(availabilityPeriodSummary([])).toBe('');
  });
});

describe('volunteerActivityLabels', () => {
  it('mapeia skills para rótulos', () => {
    expect(volunteerActivityLabels(['dog_walking', 'transport'])).toEqual([
      'Passeio com cães', 'Transporte de animais',
    ]);
  });
  it('ignora skills desconhecidas', () => {
    expect(volunteerActivityLabels(['dog_walking', 'fly_to_moon'])).toEqual(['Passeio com cães']);
  });
  it('retorna [] para entrada inválida', () => {
    expect(volunteerActivityLabels(undefined)).toEqual([]);
    expect(volunteerActivityLabels(null)).toEqual([]);
    expect(volunteerActivityLabels('dog_walking')).toEqual([]);
  });
});
