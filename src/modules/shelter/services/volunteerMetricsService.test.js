/**
 * @fileoverview Tests do volunteerMetricsService (TASK-126).
 */
import { describe, it, expect } from 'vitest';
import { computeVolunteerMetrics } from './volunteerMetricsService.js';

function makeP(overrides = {}) {
  return {
    id: 'p1',
    status: 'completed',
    check_in: '2024-06-15T09:00:00Z',
    check_out: '2024-06-15T13:00:00Z',
    shelter_club_id: 'shelter-1',
    transport_offer: null,
    ...overrides,
  };
}

describe('volunteerMetricsService — computeVolunteerMetrics (TASK-126)', () => {
  it('retorna métricas vazias para input inválido', () => {
    expect(computeVolunteerMetrics(null).totalParticipations).toBe(0);
    expect(computeVolunteerMetrics(undefined).totalParticipations).toBe(0);
    expect(computeVolunteerMetrics('not array').totalParticipations).toBe(0);
  });

  it('conta total de participações', () => {
    const m = computeVolunteerMetrics([
      makeP(),
      makeP({ id: 'p2' }),
      makeP({ id: 'p3' }),
    ]);
    expect(m.totalParticipations).toBe(3);
  });

  it('soma horas via check_in/check_out', () => {
    const m = computeVolunteerMetrics([
      makeP({ check_in: '2024-06-15T09:00:00Z', check_out: '2024-06-15T13:00:00Z' }),
      makeP({ check_in: '2024-06-16T10:00:00Z', check_out: '2024-06-16T12:30:00Z' }),
    ]);
    // 4h + 2.5h = 6.5h
    expect(m.totalHours).toBe(6.5);
  });

  it('conta transporte_ida e transporte_volta', () => {
    const m = computeVolunteerMetrics([
      makeP({ id: 'p1', transport_offer: 'ride_ida' }),
      makeP({ id: 'p2', transport_offer: 'ride_volta' }),
      makeP({ id: 'p3', transport_offer: 'both' }),
      makeP({ id: 'p4', transport_offer: null }),
    ]);
    expect(m.transporteIda).toBe(2); // ride_ida + both
    expect(m.transporteVolta).toBe(2); // ride_volta + both
  });

  it('conta status: confirmados, noShows, cancelled', () => {
    const m = computeVolunteerMetrics([
      makeP({ status: 'completed' }),
      makeP({ id: 'p2', status: 'confirmed' }),
      makeP({ id: 'p3', status: 'checked_in' }),
      makeP({ id: 'p4', status: 'no_show' }),
      makeP({ id: 'p5', status: 'cancelled' }),
    ]);
    expect(m.confirmados).toBe(3);
    expect(m.noShows).toBe(1);
    expect(m.cancelled).toBe(1);
  });

  it('calcula frequência como % de confirmados/(confirmados+noShows)', () => {
    // 3 confirmados, 1 noShow = 75%
    const m = computeVolunteerMetrics([
      makeP({ status: 'completed' }),
      makeP({ id: 'p2', status: 'confirmed' }),
      makeP({ id: 'p3', status: 'checked_in' }),
      makeP({ id: 'p4', status: 'no_show' }),
    ]);
    expect(m.frequencia).toBe(75);
  });

  it('frequência 0 quando não tem presença registrada', () => {
    const m = computeVolunteerMetrics([
      makeP({ status: 'cancelled' }),
    ]);
    expect(m.frequencia).toBe(0);
  });

  it('frequência 100 quando 100% comparece', () => {
    const m = computeVolunteerMetrics([
      makeP({ status: 'completed' }),
      makeP({ id: 'p2', status: 'confirmed' }),
    ]);
    expect(m.frequencia).toBe(100);
  });

  it('encontra abrigo favorito (mais participações)', () => {
    const m = computeVolunteerMetrics([
      makeP({ id: 'p1', shelter_club_id: 's1' }),
      makeP({ id: 'p2', shelter_club_id: 's1' }),
      makeP({ id: 'p3', shelter_club_id: 's2' }),
    ]);
    expect(m.abrigoFavoritoId).toBe('s1');
    expect(m.abrigoFavoritoParticipacoes).toBe(2);
  });

  it('usa mapa de nomes para abrigo favorito', () => {
    const map = new Map([['s1', 'Abrigo do Bem']]);
    const m = computeVolunteerMetrics([
      makeP({ shelter_club_id: 's1' }),
      makeP({ id: 'p2', shelter_club_id: 's1' }),
    ], map);
    expect(m.abrigoFavoritoNome).toBe('Abrigo do Bem');
  });

  it('conta abrigos atendidos únicos', () => {
    const m = computeVolunteerMetrics([
      makeP({ id: 'p1', shelter_club_id: 's1' }),
      makeP({ id: 'p2', shelter_club_id: 's1' }),
      makeP({ id: 'p3', shelter_club_id: 's2' }),
      makeP({ id: 'p4', shelter_club_id: 's3' }),
    ]);
    expect(m.abrigosAtendidos).toBe(3);
  });

  it('aceita club_id como alternativa', () => {
    const m = computeVolunteerMetrics([
      makeP({ club_id: 's-via-alias' }),
    ]);
    expect(m.abrigosAtendidos).toBe(1);
  });

  it('registra período (início e fim)', () => {
    const m = computeVolunteerMetrics([
      makeP({ id: 'p1', event_date: '2024-03-15' }),
      makeP({ id: 'p2', event_date: '2024-08-20' }),
      makeP({ id: 'p3', event_date: '2024-05-10' }),
    ]);
    expect(m.periodoInicio).toBe('2024-03-15');
    expect(m.periodoFim).toBe('2024-08-20');
  });
});
