/**
 * @fileoverview Testes do domínio de RSVP / Escalas de Vitrines (Fase 12).
 *
 * Cobre: enums, schemas Zod, transições, helpers de status,
 * helpers de shift (assign/unassign/needs), summarizeRsvpStatuses.
 */

import { describe, it, expect } from 'vitest';
import {
  RSVP_STATUS,
  SHIFT_ROLE,
  RSVP_STATUS_LABELS,
  SHIFT_ROLE_LABELS,
  RSVP_STATUS_COLORS,
  rsvpInviteSchema,
  createRsvpInviteSchema,
  respondRsvpInviteSchema,
  exhibitionShiftSchema,
  createExhibitionShiftSchema,
  updateExhibitionShiftSchema,
  assertValidRsvpTransition,
  allowedRsvpTransitions,
  isPendingRsvp,
  isConfirmedRsvp,
  isDeclinedRsvp,
  shiftDurationHours,
  assignVolunteerToShift,
  unassignVolunteerFromShift,
  shiftNeedsMoreVolunteers,
  shiftRemainingSpots,
  summarizeRsvpStatuses,
} from './exhibitionRsvp.js';

// ─── Enums ────────────────────────────────────────────────────────────

describe('RSVP_STATUS', () => {
  it('tem exatamente 4 valores', () => {
    expect(RSVP_STATUS).toEqual(['pending', 'yes', 'no', 'maybe']);
  });
});

describe('SHIFT_ROLE', () => {
  it('tem 6 roles pré-definidos', () => {
    expect(SHIFT_ROLE.length).toBe(6);
    expect(SHIFT_ROLE).toEqual(
      expect.arrayContaining([
        'carregamento', 'transporte_ida', 'transporte_volta',
        'cuidador', 'recepcao', 'outro',
      ]),
    );
  });
});

describe('labels', () => {
  it('RSVP_STATUS_LABELS cobre todos os status', () => {
    for (const s of RSVP_STATUS) {
      expect(RSVP_STATUS_LABELS[s]).toBeTruthy();
    }
  });
  it('SHIFT_ROLE_LABELS cobre todos os roles', () => {
    for (const r of SHIFT_ROLE) {
      expect(SHIFT_ROLE_LABELS[r]).toBeTruthy();
    }
  });
  it('RSVP_STATUS_COLORS tem cor para cada status', () => {
    for (const s of RSVP_STATUS) {
      expect(RSVP_STATUS_COLORS[s]).toMatch(/^bg-/);
    }
  });
});

// ─── Schemas ──────────────────────────────────────────────────────────

describe('createRsvpInviteSchema', () => {
  const valid = {
    exhibition_id: 'exh-1',
    shelter_club_id: 'c1',
    volunteer_uid: 'u-1',
    volunteer_name: 'Maria Silva',
  };

  it('aceita input mínimo válido', () => {
    expect(createRsvpInviteSchema.safeParse(valid).success).toBe(true);
  });

  it('aceita com notes e availability', () => {
    const r = createRsvpInviteSchema.safeParse({
      ...valid,
      notes: 'Posso chegar cedo',
      availability: {
        from: '2026-07-15T13:00:00.000Z',
        to: '2026-07-15T18:00:00.000Z',
      },
    });
    expect(r.success).toBe(true);
  });

  it('rejeita sem volunteer_uid', () => {
    const { volunteer_uid, ...rest } = valid;
    expect(createRsvpInviteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejeita volunteer_name vazio', () => {
    expect(createRsvpInviteSchema.safeParse({ ...valid, volunteer_name: '' }).success).toBe(false);
  });

  it('rejeita notes > 2000 chars', () => {
    expect(
      createRsvpInviteSchema.safeParse({ ...valid, notes: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });
});

describe('respondRsvpInviteSchema', () => {
  it('aceita status yes', () => {
    expect(respondRsvpInviteSchema.safeParse({ status: 'yes' }).success).toBe(true);
  });

  it('aceita status no', () => {
    expect(respondRsvpInviteSchema.safeParse({ status: 'no' }).success).toBe(true);
  });

  it('aceita status maybe', () => {
    expect(respondRsvpInviteSchema.safeParse({ status: 'maybe' }).success).toBe(true);
  });

  it('rejeita status inválido', () => {
    expect(respondRsvpInviteSchema.safeParse({ status: 'foo' }).success).toBe(false);
  });

  it('rejeita sem status', () => {
    expect(respondRsvpInviteSchema.safeParse({}).success).toBe(false);
  });

  it('aceita response_notes opcional', () => {
    const r = respondRsvpInviteSchema.safeParse({ status: 'yes', response_notes: 'Confirmo!' });
    expect(r.success).toBe(true);
  });
});

describe('createExhibitionShiftSchema', () => {
  const valid = {
    exhibition_id: 'exh-1',
    shelter_club_id: 'c1',
    date: '2026-07-15',
    time_start: '14:00',
    time_end: '18:00',
    role: 'cuidador',
    role_label: 'Cuidador dos cães',
    needed_count: 3,
  };

  it('aceita input mínimo válido', () => {
    expect(createExhibitionShiftSchema.safeParse(valid).success).toBe(true);
  });

  it('rejeita time_start fora do formato HH:MM', () => {
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, time_start: '25:00' }).success,
    ).toBe(false);
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, time_start: '9:00' }).success,
    ).toBe(false);
  });

  it('rejeita time_end fora do formato HH:MM', () => {
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, time_end: 'abc' }).success,
    ).toBe(false);
  });

  it('rejeita date fora do formato YYYY-MM-DD', () => {
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, date: '15/07/2026' }).success,
    ).toBe(false);
  });

  it('rejeita needed_count <= 0', () => {
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, needed_count: 0 }).success,
    ).toBe(false);
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, needed_count: -1 }).success,
    ).toBe(false);
  });

  it('rejeita role inválido', () => {
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, role: 'admin' }).success,
    ).toBe(false);
  });

  it('rejeita needed_count não-inteiro', () => {
    expect(
      createExhibitionShiftSchema.safeParse({ ...valid, needed_count: 1.5 }).success,
    ).toBe(false);
  });
});

describe('updateExhibitionShiftSchema', () => {
  it('aceita parcial (só needed_count)', () => {
    expect(updateExhibitionShiftSchema.safeParse({ needed_count: 5 }).success).toBe(true);
  });

  it('rejeita shelter_club_id (não pode trocar tenant)', () => {
    expect(
      updateExhibitionShiftSchema.safeParse({ shelter_club_id: 'c2' }).success,
    ).toBe(false);
  });

  it('rejeita exhibition_id (não pode trocar FK)', () => {
    expect(
      updateExhibitionShiftSchema.safeParse({ exhibition_id: 'exh-2' }).success,
    ).toBe(false);
  });
});

describe('rsvpInviteSchema (full doc)', () => {
  it('aceita doc completo', () => {
    const r = rsvpInviteSchema.safeParse({
      exhibition_id: 'exh-1',
      shelter_club_id: 'c1',
      volunteer_uid: 'u-1',
      volunteer_name: 'Maria',
      status: 'yes',
      notes: 'Levar ração',
      response_notes: 'Confirmo!',
      responded_at: '2026-07-10T15:00:00.000Z',
      created_by: 'admin-1',
    });
    expect(r.success).toBe(true);
  });
});

// ─── Transições ───────────────────────────────────────────────────────

describe('assertValidRsvpTransition', () => {
  it('pending → yes é válido', () => {
    expect(assertValidRsvpTransition('pending', 'yes')).toBe(true);
  });

  it('pending → no é válido', () => {
    expect(assertValidRsvpTransition('pending', 'no')).toBe(true);
  });

  it('pending → maybe é válido', () => {
    expect(assertValidRsvpTransition('pending', 'maybe')).toBe(true);
  });

  it('yes → no é válido (voluntário pode mudar)', () => {
    expect(assertValidRsvpTransition('yes', 'no')).toBe(true);
  });

  it('no → yes é válido (voluntário pode mudar)', () => {
    expect(assertValidRsvpTransition('no', 'yes')).toBe(true);
  });

  it('maybe → yes é válido', () => {
    expect(assertValidRsvpTransition('maybe', 'yes')).toBe(true);
  });

  it('lança em transição inválida (yes → pending)', () => {
    expect(() => assertValidRsvpTransition('yes', 'pending')).toThrow();
  });

  it('lança em origem inválida', () => {
    expect(() => assertValidRsvpTransition('foo', 'yes')).toThrow();
  });

  it('lança em destino inválido', () => {
    expect(() => assertValidRsvpTransition('pending', 'bar')).toThrow();
  });
});

describe('allowedRsvpTransitions', () => {
  it('pending tem 3 destinos', () => {
    expect(allowedRsvpTransitions('pending')).toEqual(['yes', 'no', 'maybe']);
  });

  it('yes tem 2 destinos (não volta pra pending)', () => {
    expect(allowedRsvpTransitions('yes')).toEqual(['no', 'maybe']);
  });

  it('origem inválida retorna []', () => {
    expect(allowedRsvpTransitions('foo')).toEqual([]);
  });
});

// ─── Status helpers ───────────────────────────────────────────────────

describe('isPendingRsvp / isConfirmedRsvp / isDeclinedRsvp', () => {
  it('isPendingRsvp identifica pending', () => {
    expect(isPendingRsvp('pending')).toBe(true);
    expect(isPendingRsvp('yes')).toBe(false);
  });

  it('isConfirmedRsvp identifica yes', () => {
    expect(isConfirmedRsvp('yes')).toBe(true);
    expect(isConfirmedRsvp('pending')).toBe(false);
  });

  it('isDeclinedRsvp identifica no', () => {
    expect(isDeclinedRsvp('no')).toBe(true);
    expect(isDeclinedRsvp('maybe')).toBe(false);
  });
});

// ─── Shift helpers ────────────────────────────────────────────────────

describe('shiftDurationHours', () => {
  it('calcula 4h para 14:00 → 18:00', () => {
    expect(shiftDurationHours({ time_start: '14:00', time_end: '18:00' })).toBe(4);
  });

  it('calcula 2.5h para 14:00 → 16:30', () => {
    expect(shiftDurationHours({ time_start: '14:00', time_end: '16:30' })).toBeCloseTo(2.5);
  });

  it('retorna 0 se campos faltam', () => {
    expect(shiftDurationHours({ time_start: '14:00' })).toBe(0);
    expect(shiftDurationHours({})).toBe(0);
  });

  it('retorna 0 se formato inválido', () => {
    expect(shiftDurationHours({ time_start: 'foo', time_end: 'bar' })).toBe(0);
  });
});

describe('assignVolunteerToShift / unassignVolunteerFromShift', () => {
  const shift = {
    id: 's1',
    needed_count: 2,
    assigned_uids: ['u1'],
  };

  it('assign adiciona uid (puro)', () => {
    const r = assignVolunteerToShift(shift, 'u2');
    expect(r.assigned_uids).toEqual(['u1', 'u2']);
    // original não foi mutado
    expect(shift.assigned_uids).toEqual(['u1']);
  });

  it('assign é idempotente', () => {
    const r = assignVolunteerToShift(shift, 'u1');
    expect(r.assigned_uids).toEqual(['u1']);
  });

  it('unassign remove uid (puro)', () => {
    const r = unassignVolunteerFromShift(shift, 'u1');
    expect(r.assigned_uids).toEqual([]);
    // original não foi mutado
    expect(shift.assigned_uids).toEqual(['u1']);
  });

  it('unassign com uid inexistente é noop', () => {
    const r = unassignVolunteerFromShift(shift, 'u999');
    expect(r.assigned_uids).toEqual(['u1']);
  });

  it('lida com assigned_uids undefined', () => {
    const r = assignVolunteerToShift({ needed_count: 1 }, 'u1');
    expect(r.assigned_uids).toEqual(['u1']);
  });
});

describe('shiftNeedsMoreVolunteers / shiftRemainingSpots', () => {
  it('precisa se assigned < needed', () => {
    const shift = { needed_count: 3, assigned_uids: ['u1'] };
    expect(shiftNeedsMoreVolunteers(shift)).toBe(true);
    expect(shiftRemainingSpots(shift)).toBe(2);
  });

  it('não precisa se assigned == needed', () => {
    const shift = { needed_count: 2, assigned_uids: ['u1', 'u2'] };
    expect(shiftNeedsMoreVolunteers(shift)).toBe(false);
    expect(shiftRemainingSpots(shift)).toBe(0);
  });

  it('não precisa se assigned > needed (overbooked)', () => {
    const shift = { needed_count: 1, assigned_uids: ['u1', 'u2', 'u3'] };
    expect(shiftNeedsMoreVolunteers(shift)).toBe(false);
    expect(shiftRemainingSpots(shift)).toBe(0);
  });

  it('lida com assigned_uids undefined', () => {
    const shift = { needed_count: 1 };
    expect(shiftNeedsMoreVolunteers(shift)).toBe(true);
    expect(shiftRemainingSpots(shift)).toBe(1);
  });
});

// ─── Summarize ────────────────────────────────────────────────────────

describe('summarizeRsvpStatuses', () => {
  it('conta 0 quando array vazio', () => {
    expect(summarizeRsvpStatuses([])).toEqual({
      pending: 0, yes: 0, no: 0, maybe: 0, total: 0,
    });
  });

  it('conta corretamente por status', () => {
    const invites = [
      { status: 'yes' },
      { status: 'yes' },
      { status: 'no' },
      { status: 'maybe' },
      { status: 'pending' },
    ];
    expect(summarizeRsvpStatuses(invites)).toEqual({
      pending: 1, yes: 2, no: 1, maybe: 1, total: 5,
    });
  });

  it('ignora status inválido', () => {
    const invites = [{ status: 'yes' }, { status: 'foo' }, { }];
    expect(summarizeRsvpStatuses(invites)).toEqual({
      pending: 0, yes: 1, no: 0, maybe: 0, total: 3,
    });
  });

  it('lida com input não-array', () => {
    expect(summarizeRsvpStatuses(null)).toEqual({
      pending: 0, yes: 0, no: 0, maybe: 0, total: 0,
    });
    expect(summarizeRsvpStatuses(undefined)).toEqual({
      pending: 0, yes: 0, no: 0, maybe: 0, total: 0,
    });
  });
});
