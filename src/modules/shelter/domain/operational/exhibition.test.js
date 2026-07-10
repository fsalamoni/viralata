/**
 * @fileoverview Testes do domínio de Vitrines / Eventos (Fase 11).
 *
 * Cobre enums, transições, validações Zod e helpers de schedule.
 */

import { describe, it, expect } from 'vitest';
import {
  EXHIBITION_STATUS,
  EXHIBITION_OUTCOMES,
  EXHIBITION_STATUS_LABELS,
  EXHIBITION_OUTCOME_LABELS,
  exhibitionSchema,
  createExhibitionSchema,
  updateExhibitionSchema,
  addOutcomeSchema,
  cancelExhibitionSchema,
  assertValidExhibitionTransition,
  isTerminalExhibitionStatus,
  exhibitionIsUpcoming,
  exhibitionIsPast,
  formatExhibitionSchedule,
  exhibitionTotalAnimals,
} from './exhibition';

// ─── Enums ──────────────────────────────────────────────────────────

describe('EXHIBITION_STATUS', () => {
  it('tem 4 estados', () => {
    expect(EXHIBITION_STATUS.length).toBe(4);
  });
  it('inclui planned, active, done, cancelled', () => {
    expect(EXHIBITION_STATUS).toContain('planned');
    expect(EXHIBITION_STATUS).toContain('active');
    expect(EXHIBITION_STATUS).toContain('done');
    expect(EXHIBITION_STATUS).toContain('cancelled');
  });
});

describe('EXHIBITION_OUTCOMES', () => {
  it('tem 4 outcomes', () => {
    expect(EXHIBITION_OUTCOMES.length).toBe(4);
  });
  it('inclui returned, adopted, foster, other', () => {
    expect(EXHIBITION_OUTCOMES).toEqual(
      expect.arrayContaining(['returned', 'adopted', 'foster', 'other']),
    );
  });
});

describe('EXHIBITION_STATUS_LABELS', () => {
  it('tem label pt-BR para cada status', () => {
    for (const s of EXHIBITION_STATUS) {
      expect(EXHIBITION_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});

describe('EXHIBITION_OUTCOME_LABELS', () => {
  it('tem label pt-BR para cada outcome', () => {
    for (const o of EXHIBITION_OUTCOMES) {
      expect(EXHIBITION_OUTCOME_LABELS[o]).toBeTruthy();
    }
  });
});

// ─── State machine ──────────────────────────────────────────────────

describe('assertValidExhibitionTransition', () => {
  it('permite planned → active', () => {
    expect(() => assertValidExhibitionTransition('planned', 'active')).not.toThrow();
  });
  it('permite planned → cancelled', () => {
    expect(() => assertValidExhibitionTransition('planned', 'cancelled')).not.toThrow();
  });
  it('permite active → done', () => {
    expect(() => assertValidExhibitionTransition('active', 'done')).not.toThrow();
  });
  it('permite active → cancelled', () => {
    expect(() => assertValidExhibitionTransition('active', 'cancelled')).not.toThrow();
  });
  it('rejeita done → qualquer (terminal)', () => {
    expect(() => assertValidExhibitionTransition('done', 'active')).toThrow(/terminal/);
    expect(() => assertValidExhibitionTransition('done', 'cancelled')).toThrow(/terminal/);
  });
  it('rejeita cancelled → qualquer (terminal)', () => {
    expect(() => assertValidExhibitionTransition('cancelled', 'active')).toThrow(/terminal/);
  });
  it('rejeita planned → done (precisa ativar antes)', () => {
    expect(() => assertValidExhibitionTransition('planned', 'done')).toThrow(/Transição inválida/);
  });
  it('rejeita status inválido', () => {
    expect(() => assertValidExhibitionTransition('foo', 'active')).toThrow(/inválido/);
    expect(() => assertValidExhibitionTransition('planned', 'bar')).toThrow(/inválido/);
  });
});

describe('isTerminalExhibitionStatus', () => {
  it('done é terminal', () => {
    expect(isTerminalExhibitionStatus('done')).toBe(true);
  });
  it('cancelled é terminal', () => {
    expect(isTerminalExhibitionStatus('cancelled')).toBe(true);
  });
  it('planned e active não são terminais', () => {
    expect(isTerminalExhibitionStatus('planned')).toBe(false);
    expect(isTerminalExhibitionStatus('active')).toBe(false);
  });
});

// ─── Schema (create) ───────────────────────────────────────────────

const baseCreate = {
  title: 'Vitrine da Praça XV',
  organizer_shelter_id: 'shelter-abc',
  co_organizers: ['shelter-xyz'],
  location: {
    address: 'Praça XV, s/n',
    city: 'Florianópolis',
    state: 'SC',
  },
  date: { seconds: 1720740000, nanoseconds: 0 },
  time_start: '14:00',
  time_end: '18:00',
  responsible_uids: ['user-1'],
  animals: ['pet-1', 'pet-2'],
  external_pets: [
    { owner_uid: 'user-x', pet_id: 'pet-y', shelter_id: 'shelter-z' },
  ],
  notes: 'Trazer coleiras extras',
};

describe('createExhibitionSchema', () => {
  it('aceita input válido', () => {
    expect(createExhibitionSchema.safeParse(baseCreate).success).toBe(true);
  });
  it('rejeita title curto', () => {
    expect(createExhibitionSchema.safeParse({ ...baseCreate, title: 'ab' }).success).toBe(false);
  });
  it('rejeita sem organizer_shelter_id', () => {
    const { organizer_shelter_id, ...input } = baseCreate;
    expect(createExhibitionSchema.safeParse(input).success).toBe(false);
  });
  it('rejeita time_start fora do formato HH:MM', () => {
    expect(createExhibitionSchema.safeParse({ ...baseCreate, time_start: '25:00' }).success).toBe(false);
    expect(createExhibitionSchema.safeParse({ ...baseCreate, time_start: '14h' }).success).toBe(false);
  });
  it('rejeita time_end inválido', () => {
    expect(createExhibitionSchema.safeParse({ ...baseCreate, time_end: '14:99' }).success).toBe(false);
  });
  it('rejeita responsible_uids vazio', () => {
    expect(createExhibitionSchema.safeParse({ ...baseCreate, responsible_uids: [] }).success).toBe(false);
  });
  it('rejeita state fora do padrão de 2 letras maiúsculas', () => {
    expect(createExhibitionSchema.safeParse({
      ...baseCreate,
      location: { ...baseCreate.location, state: 'sc' },
    }).success).toBe(false);
    expect(createExhibitionSchema.safeParse({
      ...baseCreate,
      location: { ...baseCreate.location, state: 'SCC' },
    }).success).toBe(false);
  });
  it('rejeita lat fora de [-90, 90]', () => {
    expect(createExhibitionSchema.safeParse({
      ...baseCreate,
      location: { ...baseCreate.location, lat: 91 },
    }).success).toBe(false);
  });
  it('aceita location com lat/lng/place_id opcionais', () => {
    const input = {
      ...baseCreate,
      location: { ...baseCreate.location, lat: -27.59, lng: -48.55, place_id: 'g-place' },
    };
    expect(createExhibitionSchema.safeParse(input).success).toBe(true);
  });
  it('rejeita co_organizers > 20', () => {
    expect(createExhibitionSchema.safeParse({
      ...baseCreate,
      co_organizers: Array(21).fill('shelter-x'),
    }).success).toBe(false);
  });
});

describe('updateExhibitionSchema', () => {
  it('aceita parcial (só title)', () => {
    expect(updateExhibitionSchema.safeParse({ title: 'Nova vitrine' }).success).toBe(true);
  });
  it('aceita mudança de notas', () => {
    expect(updateExhibitionSchema.safeParse({ notes: 'Atualizado' }).success).toBe(true);
  });
  it('rejeita trocar organizer_shelter_id (imutável)', () => {
    expect(updateExhibitionSchema.safeParse({ organizer_shelter_id: 'outro' }).success).toBe(false);
  });
  it('rejeita trocar status (via update — deve usar service específico)', () => {
    expect(updateExhibitionSchema.safeParse({ status: 'cancelled' }).success).toBe(false);
  });
});

describe('addOutcomeSchema', () => {
  it('aceita outcome returned sem adopter', () => {
    expect(addOutcomeSchema.safeParse({
      pet_id: 'p1', outcome: 'returned',
    }).success).toBe(true);
  });
  it('aceita outcome adopted com adopter_uid', () => {
    expect(addOutcomeSchema.safeParse({
      pet_id: 'p1', outcome: 'adopted', adopter_uid: 'u-adopter',
    }).success).toBe(true);
  });
  it('rejeita outcome inválido', () => {
    expect(addOutcomeSchema.safeParse({ pet_id: 'p1', outcome: 'fugiu' }).success).toBe(false);
  });
});

describe('cancelExhibitionSchema', () => {
  it('aceita sem reason (opcional)', () => {
    expect(cancelExhibitionSchema.safeParse({}).success).toBe(true);
  });
  it('aceita com reason', () => {
    expect(cancelExhibitionSchema.safeParse({ reason: 'Chuva forte' }).success).toBe(true);
  });
  it('rejeita reason > 1000 chars', () => {
    expect(cancelExhibitionSchema.safeParse({ reason: 'x'.repeat(1001) }).success).toBe(false);
  });
});

// ─── Helpers de data/horário ────────────────────────────────────────

describe('exhibitionIsUpcoming', () => {
  it('retorna true para data futura', () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    expect(exhibitionIsUpcoming(future, '14:00', new Date())).toBe(true);
  });
  it('retorna false para data passada', () => {
    const past = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    expect(exhibitionIsUpcoming(past, '14:00', new Date())).toBe(false);
  });
  it('aceita Timestamp-like (seconds)', () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    expect(exhibitionIsUpcoming(
      { seconds: Math.floor(future.getTime() / 1000) },
      '14:00',
      new Date(),
    )).toBe(true);
  });
  it('retorna false para null', () => {
    expect(exhibitionIsUpcoming(null, '14:00')).toBe(false);
  });
});

describe('exhibitionIsPast', () => {
  it('retorna true para data passada', () => {
    const past = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    expect(exhibitionIsPast(past, '18:00', new Date())).toBe(true);
  });
  it('retorna false para data futura', () => {
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    expect(exhibitionIsPast(future, '18:00', new Date())).toBe(false);
  });
});

describe('formatExhibitionSchedule', () => {
  it('formata data + range horário', () => {
    const date = new Date('2026-07-15T18:00:00.000Z');
    const r = formatExhibitionSchedule(date, '14:00', '18:00');
    expect(r).toMatch(/14:00.*18:00/);
    expect(r).toMatch(/07/);
    expect(r).toMatch(/15/);
  });
  it('formata data sem horário', () => {
    const date = new Date('2026-07-15T18:00:00.000Z');
    const r = formatExhibitionSchedule(date, null, null);
    expect(r).toMatch(/07/);
  });
  it('retorna — para data inválida', () => {
    expect(formatExhibitionSchedule(null, '14:00', '18:00')).toBe('—');
  });
});

describe('exhibitionTotalAnimals', () => {
  it('soma animals + external_pets', () => {
    expect(exhibitionTotalAnimals({
      animals: ['p1', 'p2'],
      external_pets: [{ owner_uid: 'u', pet_id: 'p3', shelter_id: 's' }],
    })).toBe(3);
  });
  it('retorna 0 para evento vazio', () => {
    expect(exhibitionTotalAnimals({})).toBe(0);
    expect(exhibitionTotalAnimals(null)).toBe(0);
  });
  it('lida com undefined/ausentes', () => {
    expect(exhibitionTotalAnimals({ animals: undefined, external_pets: undefined })).toBe(0);
  });
});

// ─── exhibitionSchema (doc completo) ─────────────────────────────────

describe('exhibitionSchema (doc completo)', () => {
  it('aceita doc com status done + post_event_log', () => {
    const doc = {
      ...baseCreate,
      status: 'done',
      post_event_log: [
        { pet_id: 'p1', outcome: 'adopted', adopter_uid: 'u-1', notes: 'Família Silva' },
        { pet_id: 'p2', outcome: 'returned' },
      ],
      created_at: { seconds: 1720740000, nanoseconds: 0 },
      updated_at: { seconds: 1720740000, nanoseconds: 0 },
      created_by: 'user-1',
    };
    expect(exhibitionSchema.safeParse(doc).success).toBe(true);
  });
  it('rejeita post_event_log com outcome inválido', () => {
    const doc = {
      ...baseCreate,
      post_event_log: [{ pet_id: 'p1', outcome: 'fugiu' }],
    };
    expect(exhibitionSchema.safeParse(doc).success).toBe(false);
  });
});
