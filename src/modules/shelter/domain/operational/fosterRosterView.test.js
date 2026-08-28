/**
 * @fileoverview Testes: fosterRosterView (Fase 3 — SHELTER_FOSTER_V2).
 */

import { describe, it, expect } from 'vitest';
import {
  parseAvailabilityWindows,
  isFosterAvailableOn,
  isFosterAvailableToday,
  fosterAvailabilityPeriodSummary,
  fosterPetTypeLabels,
  fosterCapacitySummary,
  groupFosterHomes,
} from './fosterRosterView.js';

const SEP = [{ start_date: '2026-09-01', end_date: '2026-09-30' }];
const TWO = [
  { start_date: '2026-10-15', end_date: '2026-10-20' },
  { start_date: '2026-09-01', end_date: '2026-09-30' },
];

describe('parseAvailabilityWindows', () => {
  it('mantém só janelas válidas (end >= start)', () => {
    const out = parseAvailabilityWindows([
      { start_date: '2026-09-01', end_date: '2026-09-30' },
      { start_date: '2026-09-30', end_date: '2026-09-01' }, // invertida → drop
      { start_date: 'lixo', end_date: '2026-09-30' },       // malformada → drop
      null,
      { foo: 'bar' },
    ]);
    expect(out).toEqual([{ start: '2026-09-01', end: '2026-09-30' }]);
  });
  it('aceita datetime ISO cortando para o dia', () => {
    const out = parseAvailabilityWindows([
      { start_date: '2026-09-01T00:00:00Z', end_date: '2026-09-30T23:59:59Z' },
    ]);
    expect(out).toEqual([{ start: '2026-09-01', end: '2026-09-30' }]);
  });
  it('defensivo: não-array → []', () => {
    expect(parseAvailabilityWindows(undefined)).toEqual([]);
    expect(parseAvailabilityWindows(null)).toEqual([]);
    expect(parseAvailabilityWindows('x')).toEqual([]);
  });
});

describe('isFosterAvailableOn / Today', () => {
  it('true quando a data cai dentro de uma janela (inclusive)', () => {
    expect(isFosterAvailableOn(SEP, new Date('2026-09-01T12:00:00Z'))).toBe(true);
    expect(isFosterAvailableOn(SEP, new Date('2026-09-30T12:00:00Z'))).toBe(true);
    expect(isFosterAvailableOn(SEP, new Date('2026-09-15T12:00:00Z'))).toBe(true);
  });
  it('false fora de todas as janelas', () => {
    expect(isFosterAvailableOn(SEP, new Date('2026-08-31T12:00:00Z'))).toBe(false);
    expect(isFosterAvailableOn(SEP, new Date('2026-10-01T12:00:00Z'))).toBe(false);
  });
  it('múltiplas janelas: true se cair em qualquer uma', () => {
    expect(isFosterAvailableOn(TWO, new Date('2026-10-17T12:00:00Z'))).toBe(true);
    expect(isFosterAvailableOn(TWO, new Date('2026-09-10T12:00:00Z'))).toBe(true);
    expect(isFosterAvailableOn(TWO, new Date('2026-10-10T12:00:00Z'))).toBe(false);
  });
  it('sem janelas → false', () => {
    expect(isFosterAvailableOn([], new Date('2026-09-01T12:00:00Z'))).toBe(false);
    expect(isFosterAvailableToday(undefined)).toBe(false);
  });
  it('isFosterAvailableToday usa o now injetado', () => {
    expect(isFosterAvailableToday(SEP, new Date('2026-09-15T12:00:00Z'))).toBe(true);
    expect(isFosterAvailableToday(SEP, new Date('2026-12-15T12:00:00Z'))).toBe(false);
  });
});

describe('fosterAvailabilityPeriodSummary', () => {
  it('formata pt-BR e ordena por início', () => {
    expect(fosterAvailabilityPeriodSummary(TWO)).toBe(
      '01/09/2026 – 30/09/2026; 15/10/2026 – 20/10/2026',
    );
  });
  it('vazio quando não há janelas', () => {
    expect(fosterAvailabilityPeriodSummary([])).toBe('');
    expect(fosterAvailabilityPeriodSummary(undefined)).toBe('');
  });
});

describe('fosterPetTypeLabels', () => {
  it('mapeia tipos conhecidos na ordem canônica', () => {
    expect(fosterPetTypeLabels(['cat', 'dog', 'puppy'])).toEqual([
      'Cães', 'Gatos', 'Filhotes (cão)',
    ]);
  });
  it('ignora tipos desconhecidos e não-array', () => {
    expect(fosterPetTypeLabels(['dog', 'zzz'])).toEqual(['Cães']);
    expect(fosterPetTypeLabels(undefined)).toEqual([]);
  });
});

describe('fosterCapacitySummary', () => {
  it('formata plural/singular', () => {
    expect(fosterCapacitySummary(1)).toBe('Até 1 pet');
    expect(fosterCapacitySummary(3)).toBe('Até 3 pets');
  });
  it('sem vaga / não informado', () => {
    expect(fosterCapacitySummary(0)).toBe('Sem vaga');
    expect(fosterCapacitySummary(undefined)).toBe('');
    expect(fosterCapacitySummary(null)).toBe('');
  });
});

describe('groupFosterHomes', () => {
  const placements = [
    {
      id: 'p1', foster_uid: 'u1', status: 'ended', start_date: '2026-06-01T00:00:00Z',
      foster_profile_snapshot: { full_name: 'Ana', email: 'ana@x.com', phone: '11999' },
    },
    {
      id: 'p2', foster_uid: 'u1', status: 'active', start_date: '2026-08-01T00:00:00Z',
      foster_profile_snapshot: { full_name: 'Ana', email: 'ana@x.com', phone: '11999' },
      availability_dates: SEP, capacity: 2, accepted_pet_types: ['dog', 'cat'],
    },
    {
      id: 'p3', foster_uid: 'u2', status: 'pending', start_date: '2026-08-10T00:00:00Z',
      foster_profile_snapshot: { full_name: 'Bruno' },
    },
  ];

  it('agrupa por foster_uid (uma linha por lar)', () => {
    const rows = groupFosterHomes(placements);
    expect(rows.map((r) => r.foster_uid)).toEqual(['u1', 'u2']); // ordenado por nome
  });
  it('usa o placement mais recente como representativo', () => {
    const [ana] = groupFosterHomes(placements);
    expect(ana.latest_placement_id).toBe('p2');
    expect(ana.capacity).toBe(2);
    expect(ana.accepted_pet_types).toEqual(['dog', 'cat']);
    expect(ana.availability_dates).toEqual(SEP);
  });
  it('conta placements ativos/pendentes/vivos', () => {
    const [ana, bruno] = groupFosterHomes(placements);
    expect(ana.active_count).toBe(1);
    expect(ana.placements_count).toBe(2);
    expect(ana.live_count).toBe(1);
    expect(bruno.pending_count).toBe(1);
    expect(bruno.live_count).toBe(1);
  });
  it('defensivo: entradas inválidas e sem foster_uid são ignoradas', () => {
    expect(groupFosterHomes([null, {}, { status: 'active' }])).toEqual([]);
    expect(groupFosterHomes(undefined)).toEqual([]);
  });
});
