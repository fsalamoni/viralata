/**
 * @fileoverview Testes do domínio de Vitrines / Eventos (Fase 11).
 */

import { describe, it, expect } from 'vitest';
import {
  EXHIBITION_STATUS,
  EXHIBITION_STATUS_LABELS,
  SHIFT_ROLES,
  SHIFT_ROLE_LABELS,
  POST_EVENT_DESTINATIONS,
  POST_EVENT_DESTINATION_LABELS,
  VALID_EXHIBITION_TRANSITIONS,
  exhibitionSchema,
  createExhibitionSchema,
  updateExhibitionSchema,
  shiftSchema,
  createShiftSchema,
  updateShiftSchema,
  postEventLogSchema,
  createPostEventLogSchema,
  addInternalPetSchema,
  removeInternalPetSchema,
  addExternalPetSchema,
  removeExternalPetSchema,
  cancelExhibitionSchema,
  assertValidExhibitionTransition,
  isExhibitionTerminal,
  totalExhibitionAnimals,
  isExhibitionLive,
  isExhibitionUpcoming,
  isExhibitionPast,
  exhibitionDurationHours,
  formatExhibitionDateTime,
} from './exhibition';

// ─── Enums ──────────────────────────────────────────────────────────────

describe('EXHIBITION_STATUS', () => {
  it('tem 4 estados', () => {
    expect(EXHIBITION_STATUS.length).toBe(4);
  });
  it('inclui scheduled, active, completed, cancelled', () => {
    expect(EXHIBITION_STATUS).toEqual(
      expect.arrayContaining(['scheduled', 'active', 'completed', 'cancelled']),
    );
  });
});

describe('EXHIBITION_STATUS_LABELS', () => {
  it('tem label para cada status', () => {
    for (const s of EXHIBITION_STATUS) {
      expect(EXHIBITION_STATUS_LABELS[s]).toBeTruthy();
    }
  });
  it('labels em pt-BR', () => {
    expect(EXHIBITION_STATUS_LABELS.scheduled).toBe('Agendada');
    expect(EXHIBITION_STATUS_LABELS.active).toBe('Em andamento');
    expect(EXHIBITION_STATUS_LABELS.completed).toBe('Concluída');
    expect(EXHIBITION_STATUS_LABELS.cancelled).toBe('Cancelada');
  });
});

describe('SHIFT_ROLES', () => {
  it('tem 5 roles', () => {
    expect(SHIFT_ROLES.length).toBe(5);
  });
  it('inclui os 5 roles do escopo', () => {
    expect(SHIFT_ROLES).toEqual([
      'carregamento',
      'transporte_ida',
      'transporte_volta',
      'cuidador',
      'recepcao',
    ]);
  });
});

describe('POST_EVENT_DESTINATIONS', () => {
  it('tem 4 destinos', () => {
    expect(POST_EVENT_DESTINATIONS.length).toBe(4);
  });
  it('inclui os 4 destinos do escopo', () => {
    expect(POST_EVENT_DESTINATIONS).toEqual([
      'returned_to_shelter',
      'adopted',
      'transferred',
      'died',
    ]);
  });
});

describe('SHIFT_ROLE_LABELS & POST_EVENT_DESTINATION_LABELS', () => {
  it('labels de shift roles em pt-BR', () => {
    expect(SHIFT_ROLE_LABELS.carregamento).toBe('Carregamento');
    expect(SHIFT_ROLE_LABELS.transporte_ida).toBe('Transporte (ida)');
    expect(SHIFT_ROLE_LABELS.transporte_volta).toBe('Transporte (volta)');
    expect(SHIFT_ROLE_LABELS.cuidador).toBe('Cuidador');
    expect(SHIFT_ROLE_LABELS.recepcao).toBe('Recepção');
  });
  it('labels de destinations em pt-BR', () => {
    expect(POST_EVENT_DESTINATION_LABELS.returned_to_shelter).toBe('Voltou ao abrigo');
    expect(POST_EVENT_DESTINATION_LABELS.adopted).toBe('Adotado no evento');
    expect(POST_EVENT_DESTINATION_LABELS.transferred).toBe('Transferido');
    expect(POST_EVENT_DESTINATION_LABELS.died).toBe('Óbito');
  });
});

// ─── Transições ────────────────────────────────────────────────────────

describe('VALID_EXHIBITION_TRANSITIONS', () => {
  it('scheduled → active | cancelled', () => {
    expect(VALID_EXHIBITION_TRANSITIONS.scheduled).toEqual(['active', 'cancelled']);
  });
  it('active → completed | cancelled', () => {
    expect(VALID_EXHIBITION_TRANSITIONS.active).toEqual(['completed', 'cancelled']);
  });
  it('completed e cancelled são terminais (array vazio)', () => {
    expect(VALID_EXHIBITION_TRANSITIONS.completed).toEqual([]);
    expect(VALID_EXHIBITION_TRANSITIONS.cancelled).toEqual([]);
  });
});

describe('assertValidExhibitionTransition', () => {
  it('permite scheduled → active', () => {
    expect(() => assertValidExhibitionTransition('scheduled', 'active')).not.toThrow();
  });
  it('permite scheduled → cancelled', () => {
    expect(() => assertValidExhibitionTransition('scheduled', 'cancelled')).not.toThrow();
  });
  it('permite active → completed', () => {
    expect(() => assertValidExhibitionTransition('active', 'completed')).not.toThrow();
  });
  it('permite active → cancelled', () => {
    expect(() => assertValidExhibitionTransition('active', 'cancelled')).not.toThrow();
  });
  it('rejeita scheduled → completed (pula active)', () => {
    expect(() => assertValidExhibitionTransition('scheduled', 'completed')).toThrow(/não permitida/);
  });
  it('rejeita completed → qualquer (terminal)', () => {
    expect(() => assertValidExhibitionTransition('completed', 'active')).toThrow(/terminal/);
    expect(() => assertValidExhibitionTransition('completed', 'cancelled')).toThrow();
  });
  it('rejeita cancelled → qualquer (terminal)', () => {
    expect(() => assertValidExhibitionTransition('cancelled', 'active')).toThrow(/terminal/);
  });
  it('rejeita mesmo status (no-op)', () => {
    expect(() => assertValidExhibitionTransition('scheduled', 'scheduled')).toThrow(/já está/);
  });
  it('rejeita status inválido', () => {
    expect(() => assertValidExhibitionTransition('foo', 'active')).toThrow(/inválido/);
    expect(() => assertValidExhibitionTransition('scheduled', 'bar')).toThrow(/inválido/);
  });
});

describe('isExhibitionTerminal', () => {
  it('completed e cancelled são terminais', () => {
    expect(isExhibitionTerminal('completed')).toBe(true);
    expect(isExhibitionTerminal('cancelled')).toBe(true);
  });
  it('scheduled e active não são terminais', () => {
    expect(isExhibitionTerminal('scheduled')).toBe(false);
    expect(isExhibitionTerminal('active')).toBe(false);
  });
});

// ─── Schemas: createExhibitionSchema ──────────────────────────────────

const validCreate = {
  shelter_club_id: 'c-1',
  title: 'Vitrine da Praça',
  organizer_uid: 'u-1',
  venue: {
    address: 'Praça XV, 100',
    lat: -22.9,
    lng: -43.2,
  },
  datetime_start: '2026-08-01T14:00:00.000Z',
  datetime_end: '2026-08-01T18:00:00.000Z',
  requires_volunteers: true,
};

describe('createExhibitionSchema', () => {
  it('aceita payload mínimo válido', () => {
    expect(() => createExhibitionSchema.parse(validCreate)).not.toThrow();
  });
  it('aceita venue com place_id opcional', () => {
    const withPlace = {
      ...validCreate,
      venue: { ...validCreate.venue, place_id: 'ChIJ123' },
    };
    expect(() => createExhibitionSchema.parse(withPlace)).not.toThrow();
  });
  it('rejeita title muito curto', () => {
    expect(() => createExhibitionSchema.parse({ ...validCreate, title: 'ab' })).toThrow();
  });
  it('rejeita title muito longo', () => {
    expect(() => createExhibitionSchema.parse({ ...validCreate, title: 'a'.repeat(201) })).toThrow();
  });
  it('rejeita lat fora de [-90, 90]', () => {
    expect(() => createExhibitionSchema.parse({
      ...validCreate, venue: { ...validCreate.venue, lat: 91 },
    })).toThrow();
    expect(() => createExhibitionSchema.parse({
      ...validCreate, venue: { ...validCreate.venue, lat: -91 },
    })).toThrow();
  });
  it('rejeita lng fora de [-180, 180]', () => {
    expect(() => createExhibitionSchema.parse({
      ...validCreate, venue: { ...validCreate.venue, lng: 181 },
    })).toThrow();
  });
  it('rejeita venue.address muito curto', () => {
    expect(() => createExhibitionSchema.parse({
      ...validCreate, venue: { ...validCreate.venue, address: 'ab' },
    })).toThrow();
  });
  it('rejeita datetime_end <= datetime_start', () => {
    expect(() => createExhibitionSchema.parse({
      ...validCreate,
      datetime_start: '2026-08-01T18:00:00.000Z',
      datetime_end: '2026-08-01T14:00:00.000Z',
    })).toThrow(/datetime_end deve ser maior/);
  });
  it('rejeita organizer_uid vazio', () => {
    expect(() => createExhibitionSchema.parse({ ...validCreate, organizer_uid: '' })).toThrow();
  });
  it('rejeita co_organizers_uids > 50', () => {
    const arr = Array.from({ length: 51 }, (_, i) => `u-${i}`);
    expect(() => createExhibitionSchema.parse({ ...validCreate, co_organizers_uids: arr })).toThrow();
  });
  it('aceita co_organizers_uids até 50', () => {
    const arr = Array.from({ length: 50 }, (_, i) => `u-${i}`);
    expect(() => createExhibitionSchema.parse({ ...validCreate, co_organizers_uids: arr })).not.toThrow();
  });
  it('default requires_volunteers=false se omitido', () => {
    const { requires_volunteers, ...rest } = validCreate;
    const r = createExhibitionSchema.parse(rest);
    expect(r.requires_volunteers).toBe(false);
  });
});

// ─── Schemas: updateExhibitionSchema ──────────────────────────────────

describe('updateExhibitionSchema', () => {
  it('aceita patch parcial (só title)', () => {
    expect(() => updateExhibitionSchema.parse({ title: 'Novo título' })).not.toThrow();
  });
  it('aceita patch vazio (no-op)', () => {
    expect(() => updateExhibitionSchema.parse({})).not.toThrow();
  });
  it('NÃO aceita shelter_club_id (imutável)', () => {
    expect(() => updateExhibitionSchema.parse({ shelter_club_id: 'c-2' })).toThrow();
  });
  it('NÃO aceita organizer_uid (imutável)', () => {
    expect(() => updateExhibitionSchema.parse({ organizer_uid: 'u-2' })).toThrow();
  });
  it('NÃO aceita organizer_name (imutável)', () => {
    expect(() => updateExhibitionSchema.parse({ organizer_name: 'Maria' })).toThrow();
  });
  it('NÃO aceita pet_ids direto (usar addInternalPet)', () => {
    expect(() => updateExhibitionSchema.parse({ pet_ids: ['p-1'] })).toThrow();
  });
  it('NÃO aceita external_pets direto', () => {
    expect(() => updateExhibitionSchema.parse({ external_pets: [] })).toThrow();
  });
  it('NÃO aceita status direto (usar start/complete/cancel)', () => {
    expect(() => updateExhibitionSchema.parse({ status: 'active' })).toThrow();
  });
});

// ─── Schemas: shift ───────────────────────────────────────────────────

const validShiftCreate = {
  shelter_club_id: 'c-1',
  exhibition_id: 'e-1',
  start_at: '2026-08-01T13:00:00.000Z',
  end_at: '2026-08-01T15:00:00.000Z',
  role: 'carregamento',
  slots_total: 3,
};

describe('createShiftSchema', () => {
  it('aceita payload mínimo', () => {
    expect(() => createShiftSchema.parse(validShiftCreate)).not.toThrow();
  });
  it('rejeita slots_total < 1', () => {
    expect(() => createShiftSchema.parse({ ...validShiftCreate, slots_total: 0 })).toThrow();
  });
  it('rejeita role inválido', () => {
    expect(() => createShiftSchema.parse({ ...validShiftCreate, role: 'invalido' })).toThrow();
  });
  it('rejeita end_at <= start_at', () => {
    expect(() => createShiftSchema.parse({
      ...validShiftCreate,
      start_at: '2026-08-01T15:00:00.000Z',
      end_at: '2026-08-01T13:00:00.000Z',
    })).toThrow();
  });
});

describe('updateShiftSchema', () => {
  it('aceita patch parcial', () => {
    expect(() => updateShiftSchema.parse({ slots_filled: 1 })).not.toThrow();
  });
  it('rejeita shelter_club_id (imutável)', () => {
    expect(() => updateShiftSchema.parse({ shelter_club_id: 'c-2' })).toThrow();
  });
  it('rejeita exhibition_id (imutável)', () => {
    expect(() => updateShiftSchema.parse({ exhibition_id: 'e-2' })).toThrow();
  });
});

// ─── Schemas: post_event_log ──────────────────────────────────────────

const validLogCreate = {
  shelter_club_id: 'c-1',
  exhibition_id: 'e-1',
  pet_id: 'p-1',
  pet_origin: 'internal',
  destination: 'returned_to_shelter',
};

describe('createPostEventLogSchema', () => {
  it('aceita payload mínimo', () => {
    expect(() => createPostEventLogSchema.parse(validLogCreate)).not.toThrow();
  });
  it('rejeita pet_origin inválido', () => {
    expect(() => createPostEventLogSchema.parse({ ...validLogCreate, pet_origin: 'unknown' })).toThrow();
  });
  it('rejeita destination inválido', () => {
    expect(() => createPostEventLogSchema.parse({ ...validLogCreate, destination: 'fugiu' })).toThrow();
  });
  it('aceita todos os 4 destinations', () => {
    for (const d of POST_EVENT_DESTINATIONS) {
      expect(() => createPostEventLogSchema.parse({ ...validLogCreate, destination: d })).not.toThrow();
    }
  });
  it('aceita adopter_uid opcional para adopted', () => {
    expect(() => createPostEventLogSchema.parse({
      ...validLogCreate, destination: 'adopted', adopter_uid: 'u-99',
    })).not.toThrow();
  });
  it('aceita transferred_to_shelter_* opcional para transferred', () => {
    expect(() => createPostEventLogSchema.parse({
      ...validLogCreate,
      destination: 'transferred',
      transferred_to_shelter_id: 'c-2',
      transferred_to_shelter_name: 'Outro Abrigo',
    })).not.toThrow();
  });
});

// ─── Schemas: add/remove pets ─────────────────────────────────────────

describe('addInternalPetSchema / removeInternalPetSchema', () => {
  it('aceita pet_id string', () => {
    expect(() => addInternalPetSchema.parse({ pet_id: 'p-1' })).not.toThrow();
    expect(() => removeInternalPetSchema.parse({ pet_id: 'p-1' })).not.toThrow();
  });
  it('rejeita pet_id vazio', () => {
    expect(() => addInternalPetSchema.parse({ pet_id: '' })).toThrow();
    expect(() => removeInternalPetSchema.parse({ pet_id: '' })).toThrow();
  });
  it('rejeita payload vazio', () => {
    expect(() => addInternalPetSchema.parse({})).toThrow();
  });
});

describe('addExternalPetSchema', () => {
  it('aceita pet externo mínimo', () => {
    expect(() => addExternalPetSchema.parse({
      pet_id: 'p-1', owner_shelter_id: 'c-2', name: 'Rex',
    })).not.toThrow();
  });
  it('rejeita sem pet_id', () => {
    expect(() => addExternalPetSchema.parse({ owner_shelter_id: 'c-2', name: 'Rex' })).toThrow();
  });
  it('rejeita sem owner_shelter_id', () => {
    expect(() => addExternalPetSchema.parse({ pet_id: 'p-1', name: 'Rex' })).toThrow();
  });
  it('rejeita sem name', () => {
    expect(() => addExternalPetSchema.parse({ pet_id: 'p-1', owner_shelter_id: 'c-2' })).toThrow();
  });
  it('rejeita species inválida', () => {
    expect(() => addExternalPetSchema.parse({
      pet_id: 'p-1', owner_shelter_id: 'c-2', name: 'Rex', species: 'fish',
    })).toThrow();
  });
});

describe('cancelExhibitionSchema', () => {
  it('aceita reason com pelo menos 3 chars', () => {
    expect(() => cancelExhibitionSchema.parse({ reason: 'Chuva forte' })).not.toThrow();
  });
  it('rejeita reason muito curto', () => {
    expect(() => cancelExhibitionSchema.parse({ reason: 'ab' })).toThrow();
  });
  it('rejeita reason muito longo', () => {
    expect(() => cancelExhibitionSchema.parse({ reason: 'a'.repeat(501) })).toThrow();
  });
});

// ─── Schema completo: exhibitionSchema ────────────────────────────────

describe('exhibitionSchema (full doc)', () => {
  const baseDoc = {
    shelter_club_id: 'c-1',
    title: 'Vitrine da Praça',
    organizer_uid: 'u-1',
    co_organizers_uids: ['u-2'],
    venue: { address: 'Praça XV', lat: -22.9, lng: -43.2 },
    datetime_start: '2026-08-01T14:00:00.000Z',
    datetime_end: '2026-08-01T18:00:00.000Z',
    status: 'scheduled',
    pet_ids: ['p-1'],
    external_pets: [{ pet_id: 'p-2', owner_shelter_id: 'c-2', name: 'Buddy' }],
    requires_volunteers: false,
    notes: 'Levar ração',
  };
  it('aceita doc completo', () => {
    expect(() => exhibitionSchema.parse(baseDoc)).not.toThrow();
  });
  it('default pet_ids=[]', () => {
    const { pet_ids, ...rest } = baseDoc;
    const r = exhibitionSchema.parse(rest);
    expect(r.pet_ids).toEqual([]);
  });
  it('default external_pets=[]', () => {
    const { external_pets, ...rest } = baseDoc;
    const r = exhibitionSchema.parse(rest);
    expect(r.external_pets).toEqual([]);
  });
  it('aceita pet_ids até 200', () => {
    const arr = Array.from({ length: 200 }, (_, i) => `p-${i}`);
    expect(() => exhibitionSchema.parse({ ...baseDoc, pet_ids: arr })).not.toThrow();
  });
  it('rejeita pet_ids > 200', () => {
    const arr = Array.from({ length: 201 }, (_, i) => `p-${i}`);
    expect(() => exhibitionSchema.parse({ ...baseDoc, pet_ids: arr })).toThrow();
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────

describe('totalExhibitionAnimals', () => {
  it('conta internos + externos', () => {
    expect(totalExhibitionAnimals({
      pet_ids: ['p-1', 'p-2'],
      external_pets: [{ pet_id: 'p-3' }, { pet_id: 'p-4' }],
    })).toBe(4);
  });
  it('retorna 0 para null/undefined', () => {
    expect(totalExhibitionAnimals(null)).toBe(0);
    expect(totalExhibitionAnimals(undefined)).toBe(0);
  });
  it('conta só internos quando external vazio', () => {
    expect(totalExhibitionAnimals({ pet_ids: ['p-1', 'p-2'], external_pets: [] })).toBe(2);
  });
  it('conta só externos quando internal vazio', () => {
    expect(totalExhibitionAnimals({
      pet_ids: [],
      external_pets: [{ pet_id: 'p-1' }, { pet_id: 'p-2' }, { pet_id: 'p-3' }],
    })).toBe(3);
  });
});

describe('isExhibitionLive / Upcoming / Past', () => {
  const now = new Date('2026-08-01T15:00:00.000Z');
  it('live = true se agora entre start e end', () => {
    const ex = {
      datetime_start: '2026-08-01T14:00:00.000Z',
      datetime_end: '2026-08-01T18:00:00.000Z',
    };
    expect(isExhibitionLive(ex, now)).toBe(true);
  });
  it('live = false antes do start', () => {
    const ex = {
      datetime_start: '2026-08-02T14:00:00.000Z',
      datetime_end: '2026-08-02T18:00:00.000Z',
    };
    expect(isExhibitionLive(ex, now)).toBe(false);
  });
  it('live = false depois do end', () => {
    const ex = {
      datetime_start: '2026-07-30T14:00:00.000Z',
      datetime_end: '2026-07-30T18:00:00.000Z',
    };
    expect(isExhibitionLive(ex, now)).toBe(false);
  });
  it('upcoming = true se start no futuro', () => {
    const ex = {
      datetime_start: '2026-08-02T14:00:00.000Z',
      datetime_end: '2026-08-02T18:00:00.000Z',
    };
    expect(isExhibitionUpcoming(ex, now)).toBe(true);
  });
  it('past = true se end no passado', () => {
    const ex = {
      datetime_start: '2026-07-30T14:00:00.000Z',
      datetime_end: '2026-07-30T18:00:00.000Z',
    };
    expect(isExhibitionPast(ex, now)).toBe(true);
  });
});

describe('exhibitionDurationHours', () => {
  it('calcula horas corretamente', () => {
    const ex = {
      datetime_start: '2026-08-01T14:00:00.000Z',
      datetime_end: '2026-08-01T18:30:00.000Z',
    };
    expect(exhibitionDurationHours(ex)).toBe(4.5);
  });
  it('retorna 0 se start ou end ausente', () => {
    expect(exhibitionDurationHours({})).toBe(0);
    expect(exhibitionDurationHours({ datetime_start: 'x' })).toBe(0);
  });
});

describe('formatExhibitionDateTime', () => {
  it('formata ISO em pt-BR', () => {
    expect(formatExhibitionDateTime('2026-08-01T14:30:00.000Z')).toBe('01/08/2026 14:30');
  });
  it('retorna "—" para null/undefined/inválido', () => {
    expect(formatExhibitionDateTime(null)).toBe('—');
    expect(formatExhibitionDateTime(undefined)).toBe('—');
    expect(formatExhibitionDateTime('invalid')).toBe('—');
  });
});
