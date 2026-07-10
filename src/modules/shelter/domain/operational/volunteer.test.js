/**
 * @fileoverview Testes do domínio: Gestão de Voluntários (Fase 13).
 *
 * Cobre enums, schemas, helpers puros. Sem dependência de Firestore.
 */

import { describe, it, expect } from 'vitest';
import {
  VOLUNTEER_ROLE,
  VOLUNTEER_ROLE_LABELS,
  DAY_OF_WEEK,
  DAY_OF_WEEK_LABELS,
  VOLUNTEER_SKILL_SUGGESTIONS,
  volunteerProfileSchema,
  createVolunteerProfileSchema,
  updateVolunteerProfileSchema,
  volunteerParticipationSchema,
  createVolunteerParticipationSchema,
  updateVolunteerParticipationSchema,
  computeHoursLogged,
  summarizeVolunteerStats,
  isVolunteerAvailableAt,
  participationIsComplete,
  filterProfilesBySkills,
} from './volunteer';

// ─── Enums ──────────────────────────────────────────────────────────────

describe('VOLUNTEER_ROLE', () => {
  it('tem 6 papéis canônicos', () => {
    expect(VOLUNTEER_ROLE.length).toBe(6);
  });
  it('inclui os papéis principais', () => {
    expect(VOLUNTEER_ROLE).toContain('carregamento');
    expect(VOLUNTEER_ROLE).toContain('transporte_ida');
    expect(VOLUNTEER_ROLE).toContain('transporte_volta');
    expect(VOLUNTEER_ROLE).toContain('cuidador');
    expect(VOLUNTEER_ROLE).toContain('recepcao');
    expect(VOLUNTEER_ROLE).toContain('outro');
  });
  it('todos os papéis têm label pt-BR', () => {
    for (const r of VOLUNTEER_ROLE) {
      expect(VOLUNTEER_ROLE_LABELS[r]).toBeTruthy();
    }
  });
});

describe('DAY_OF_WEEK', () => {
  it('tem 7 dias começando em segunda', () => {
    expect(DAY_OF_WEEK).toEqual([
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday',
    ]);
  });
  it('todos os dias têm label pt-BR', () => {
    for (const d of DAY_OF_WEEK) {
      expect(DAY_OF_WEEK_LABELS[d]).toBeTruthy();
    }
  });
});

describe('VOLUNTEER_SKILL_SUGGESTIONS', () => {
  it('tem ao menos 10 skills sugeridas', () => {
    expect(VOLUNTEER_SKILL_SUGGESTIONS.length).toBeGreaterThanOrEqual(10);
  });
  it('todas são strings não-vazias', () => {
    for (const s of VOLUNTEER_SKILL_SUGGESTIONS) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ─── Schemas (perfil) ─────────────────────────────────────────────────

describe('createVolunteerProfileSchema', () => {
  const valid = {
    user_id: 'u-1',
    display_name: 'Maria Silva',
    skills: ['transporte', 'cuidador_caes'],
    certifications: [{ name: 'Curso X', issuer: 'ONG Y', year: 2024 }],
    availability: [{ day_of_week: 'saturday', from: '08:00', to: '18:00' }],
    notes: 'Disponível para turnos longos',
    active: true,
  };

  it('aceita input válido', () => {
    const r = createVolunteerProfileSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('aceita input mínimo (só user_id e display_name)', () => {
    const r = createVolunteerProfileSchema.safeParse({
      user_id: 'u-1',
      display_name: 'João',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita display_name curto', () => {
    const r = createVolunteerProfileSchema.safeParse({ ...valid, display_name: 'A' });
    expect(r.success).toBe(false);
  });

  it('rejeita availability com from > to', () => {
    const r = createVolunteerProfileSchema.safeParse({
      ...valid,
      availability: [{ day_of_week: 'saturday', from: '18:00', to: '08:00' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita availability com horário mal-formado', () => {
    const r = createVolunteerProfileSchema.safeParse({
      ...valid,
      availability: [{ day_of_week: 'saturday', from: '8h', to: '18:00' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita day_of_week fora do enum', () => {
    const r = createVolunteerProfileSchema.safeParse({
      ...valid,
      availability: [{ day_of_week: 'funday', from: '08:00', to: '18:00' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita certification com ano inválido', () => {
    const r = createVolunteerProfileSchema.safeParse({
      ...valid,
      certifications: [{ name: 'X', year: 1900 }],
    });
    expect(r.success).toBe(false);
  });
});

describe('updateVolunteerProfileSchema', () => {
  it('aceita patch vazio (noop)', () => {
    const r = updateVolunteerProfileSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('aceita display_name sozinho', () => {
    const r = updateVolunteerProfileSchema.safeParse({ display_name: 'Maria Atualizada' });
    expect(r.success).toBe(true);
  });

  it('rejeita campo desconhecido (strict)', () => {
    const r = updateVolunteerProfileSchema.safeParse({ role_inventado: 1 });
    expect(r.success).toBe(false);
  });
});

describe('volunteerProfileSchema', () => {
  it('default hours_logged_total = 0', () => {
    const r = volunteerProfileSchema.safeParse({
      id: 'main',
      user_id: 'u-1',
      display_name: 'Maria Silva',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.hours_logged_total).toBe(0);
      expect(r.data.active).toBe(true);
      expect(r.data.skills).toEqual([]);
    }
  });
});

// ─── Schemas (participation) ───────────────────────────────────────────

describe('createVolunteerParticipationSchema', () => {
  const valid = {
    volunteer_uid: 'u-1',
    volunteer_name: 'Maria Silva',
    exhibition_id: 'exh-1',
    shelter_club_id: 'club-1',
    role: 'cuidador',
    role_label: 'Cuidador dos cães',
    transport_provided: false,
    notes: 'Trouxe ração especial',
  };

  it('aceita input válido', () => {
    expect(createVolunteerParticipationSchema.safeParse(valid).success).toBe(true);
  });

  it('aceita exhibition_id nulo (sem exposição específica)', () => {
    const r = createVolunteerParticipationSchema.safeParse({ ...valid, exhibition_id: null });
    expect(r.success).toBe(true);
  });

  it('aceita exhibition_id omitido', () => {
    const { exhibition_id, ...rest } = valid;
    expect(createVolunteerParticipationSchema.safeParse(rest).success).toBe(true);
  });

  it('rejeita role fora do enum', () => {
    const r = createVolunteerParticipationSchema.safeParse({ ...valid, role: 'invalido' });
    expect(r.success).toBe(false);
  });

  it('rejeita sem volunteer_uid', () => {
    const { volunteer_uid, ...rest } = valid;
    expect(createVolunteerParticipationSchema.safeParse(rest).success).toBe(false);
  });
});

describe('updateVolunteerParticipationSchema', () => {
  it('aceita patch com check_in e check_out', () => {
    const r = updateVolunteerParticipationSchema.safeParse({
      check_in: '2026-07-10T08:00:00Z',
      check_out: '2026-07-10T18:00:00Z',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita campo imutável shelter_club_id', () => {
    const r = updateVolunteerParticipationSchema.safeParse({ shelter_club_id: 'outro' });
    expect(r.success).toBe(false);
  });
});

// ─── Helpers puros ─────────────────────────────────────────────────────

describe('computeHoursLogged', () => {
  it('calcula 2h entre timestamps ISO', () => {
    expect(computeHoursLogged(
      '2026-07-10T08:00:00Z',
      '2026-07-10T10:00:00Z',
    )).toBe(2);
  });

  it('arredonda para 2 casas decimais', () => {
    expect(computeHoursLogged(
      '2026-07-10T08:00:00Z',
      '2026-07-10T08:15:00Z',
    )).toBe(0.25);
  });

  it('aceita objetos Date', () => {
    const a = new Date('2026-07-10T08:00:00Z');
    const b = new Date('2026-07-10T11:00:00Z');
    expect(computeHoursLogged(a, b)).toBe(3);
  });

  it('aceita Firestore Timestamp-like (com toDate)', () => {
    const fakeTs = (iso) => ({ toDate: () => new Date(iso) });
    expect(computeHoursLogged(
      fakeTs('2026-07-10T08:00:00Z'),
      fakeTs('2026-07-10T12:30:00Z'),
    )).toBe(4.5);
  });

  it('retorna 0 se check_in ausente', () => {
    expect(computeHoursLogged(null, '2026-07-10T08:00:00Z')).toBe(0);
  });

  it('retorna 0 se check_out antes de check_in', () => {
    expect(computeHoursLogged(
      '2026-07-10T10:00:00Z',
      '2026-07-10T08:00:00Z',
    )).toBe(0);
  });

  it('retorna 0 para entrada inválida', () => {
    expect(computeHoursLogged('lixo', 'mais_lixo')).toBe(0);
  });
});

describe('summarizeVolunteerStats', () => {
  it('retorna zeros para lista vazia', () => {
    const s = summarizeVolunteerStats([]);
    expect(s.hoursTotal).toBe(0);
    expect(s.participationsCount).toBe(0);
    expect(s.transportOutbound).toBe(0);
    expect(s.transportReturn).toBe(0);
    expect(s.byRole).toEqual({});
  });

  it('soma horas e conta participações', () => {
    const s = summarizeVolunteerStats([
      { role: 'cuidador', hours_logged: 4 },
      { role: 'cuidador', hours_logged: 2.5 },
      { role: 'recepcao', hours_logged: 6 },
    ]);
    expect(s.participationsCount).toBe(3);
    expect(s.hoursTotal).toBe(12.5);
    expect(s.byRole.cuidador).toBe(2);
    expect(s.byRole.recepcao).toBe(1);
  });

  it('conta transporte_ida/volta', () => {
    const s = summarizeVolunteerStats([
      { role: 'transporte_ida', hours_logged: 2 },
      { role: 'transporte_volta', hours_logged: 2 },
      { role: 'transporte_volta', hours_logged: 3 },
      { role: 'cuidador', hours_logged: 5 },
    ]);
    expect(s.transportOutbound).toBe(1);
    expect(s.transportReturn).toBe(2);
  });

  it('calcula hours_logged a partir de check_in/check_out se ausente', () => {
    const s = summarizeVolunteerStats([
      { role: 'cuidador', check_in: '2026-07-10T08:00:00Z', check_out: '2026-07-10T12:00:00Z' },
    ]);
    expect(s.hoursTotal).toBe(4);
  });

  it('tolera entrada nula/undefined', () => {
    const s = summarizeVolunteerStats([null, undefined, { role: 'cuidador', hours_logged: 1 }]);
    expect(s.participationsCount).toBe(1);
    expect(s.hoursTotal).toBe(1);
  });
});

describe('isVolunteerAvailableAt', () => {
  const availability = [
    { day_of_week: 'saturday', from: '08:00', to: '18:00' },
    { day_of_week: 'sunday', from: '08:00', to: '12:00' },
  ];

  it('retorna true se dentro do slot', () => {
    expect(isVolunteerAvailableAt(availability, 'saturday', '12:00')).toBe(true);
  });

  it('aceita os extremos (inclusivo)', () => {
    expect(isVolunteerAvailableAt(availability, 'saturday', '08:00')).toBe(true);
    expect(isVolunteerAvailableAt(availability, 'saturday', '18:00')).toBe(true);
  });

  it('retorna false fora do slot', () => {
    expect(isVolunteerAvailableAt(availability, 'saturday', '20:00')).toBe(false);
  });

  it('retorna false em dia sem cobertura', () => {
    expect(isVolunteerAvailableAt(availability, 'monday', '10:00')).toBe(false);
  });

  it('retorna false se availability vazio', () => {
    expect(isVolunteerAvailableAt([], 'saturday', '12:00')).toBe(false);
  });

  it('retorna false se dia inválido', () => {
    expect(isVolunteerAvailableAt(availability, 'funday', '12:00')).toBe(false);
  });

  it('retorna false se horário mal-formado', () => {
    expect(isVolunteerAvailableAt(availability, 'saturday', '8h')).toBe(false);
  });
});

describe('participationIsComplete', () => {
  it('true se check_in e check_out presentes', () => {
    expect(participationIsComplete({
      check_in: '2026-07-10T08:00:00Z',
      check_out: '2026-07-10T18:00:00Z',
    })).toBe(true);
  });

  it('false se só check_in', () => {
    expect(participationIsComplete({ check_in: 'x' })).toBe(false);
  });

  it('false se só check_out', () => {
    expect(participationIsComplete({ check_out: 'x' })).toBe(false);
  });

  it('false se nenhum', () => {
    expect(participationIsComplete({})).toBe(false);
  });

  it('false se entrada nula', () => {
    expect(participationIsComplete(null)).toBe(false);
  });
});

describe('filterProfilesBySkills', () => {
  const profiles = [
    { id: 'p1', skills: ['transporte', 'cuidador_caes'] },
    { id: 'p2', skills: ['recepcao'] },
    { id: 'p3', skills: ['transporte'] },
    { id: 'p4', skills: [] },
  ];

  it('filtra por uma skill', () => {
    const r = filterProfilesBySkills(profiles, 'transporte');
    expect(r.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('filtra por múltiplas skills (OR)', () => {
    const r = filterProfilesBySkills(profiles, ['cuidador_caes', 'recepcao']);
    expect(r.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('retorna todos se skills vazio', () => {
    expect(filterProfilesBySkills(profiles, []).length).toBe(4);
    expect(filterProfilesBySkills(profiles, '').length).toBe(4);
  });

  it('retorna [] para input vazio', () => {
    expect(filterProfilesBySkills([], 'transporte')).toEqual([]);
  });

  it('tolera profiles com skills undefined', () => {
    const r = filterProfilesBySkills([{ id: 'x' }], 'transporte');
    expect(r).toEqual([]);
  });
});
