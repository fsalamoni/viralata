/**
 * @fileoverview Testes do domínio de Dashboard do Abrigo (Fase 14).
 *
 * Cobre:
 * - Schemas Zod (dashboardWidget, createWidget, updateWidget)
 * - Helpers de período (currentMonthRange, upcomingDaysRange)
 * - computeDashboardSummary com dados agregados
 * - countPetsBySpecies + isPetInShelter
 */

import { describe, it, expect } from 'vitest';

const {
  DASHBOARD_COLLECTIONS,
  WIDGET_TYPES,
  WIDGET_FILTER_OPERATORS,
  DASHBOARD_CARD_LABELS,
  DASHBOARD_TONE_CLASSES,
  currentMonthRange,
  upcomingDaysRange,
  dashboardWidgetSchema,
  createWidgetSchema,
  updateWidgetSchema,
  computeDashboardSummary,
  countPetsBySpecies,
  isPetInShelter,
  isKnownCardKey,
} = await import('./dashboard');

// ─── Enums e constantes ────────────────────────────────────────────────

describe('DASHBOARD_COLLECTIONS', () => {
  it('inclui todas as collections rastreadas', () => {
    expect(DASHBOARD_COLLECTIONS.PETS).toBe('pets');
    expect(DASHBOARD_COLLECTIONS.ADOPTION_WORKFLOW).toBe('adoption_workflow');
    expect(DASHBOARD_COLLECTIONS.POST_ADOPTION).toBe('post_adoption');
    expect(DASHBOARD_COLLECTIONS.FOSTERS).toBe('fosters');
    expect(DASHBOARD_COLLECTIONS.MEDICATIONS).toBe('medications');
    expect(DASHBOARD_COLLECTIONS.EXHIBITIONS).toBe('exhibitions');
  });
});

describe('WIDGET_TYPES / WIDGET_FILTER_OPERATORS', () => {
  it('tipos: count, list, trend', () => {
    expect(WIDGET_TYPES).toEqual(expect.arrayContaining(['count', 'list', 'trend']));
  });
  it('operadores incluem ==, !=, in, array-contains', () => {
    expect(WIDGET_FILTER_OPERATORS).toEqual(
      expect.arrayContaining(['==', '!=', 'in', 'array-contains']),
    );
  });
});

// ─── Helpers de período ────────────────────────────────────────────────

describe('currentMonthRange', () => {
  it('retorna início do mês UTC até now', () => {
    const now = new Date('2026-07-11T15:30:00.000Z');
    const { start, end } = currentMonthRange(now);
    expect(start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(end.toISOString()).toBe(now.toISOString());
  });
  it('default = now', () => {
    const { start, end } = currentMonthRange();
    expect(start.getUTCDate()).toBe(1);
    expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime());
  });
});

describe('upcomingDaysRange', () => {
  it('retorna now até now+N dias', () => {
    const now = new Date('2026-07-11T00:00:00.000Z');
    const { start, end } = upcomingDaysRange(30, now);
    const diff = end.getTime() - start.getTime();
    expect(diff).toBe(30 * 24 * 60 * 60 * 1000);
    expect(start.toISOString()).toBe('2026-07-11T00:00:00.000Z');
  });
});

// ─── Schemas Zod ───────────────────────────────────────────────────────

describe('dashboardWidgetSchema', () => {
  const validWidget = {
    shelter_club_id: 'club-1',
    type: 'count',
    title: 'Pets com pulga',
    query: {
      collection: 'pets',
      filters: [{ field: 'has_fleas', op: '==', value: true }],
    },
    icon: 'Bug',
    tone: 'warning',
    order: 50,
    size: 'md',
    created_by_uid: 'user-1',
  };

  it('valida widget completo', () => {
    const parsed = dashboardWidgetSchema.parse(validWidget);
    expect(parsed.shelter_club_id).toBe('club-1');
    expect(parsed.tone).toBe('warning');
  });

  it('defaults: tone=default, order=100, size=md', () => {
    const minimal = { ...validWidget };
    delete minimal.tone;
    delete minimal.order;
    delete minimal.size;
    const parsed = dashboardWidgetSchema.parse(minimal);
    expect(parsed.tone).toBe('default');
    expect(parsed.order).toBe(100);
    expect(parsed.size).toBe('md');
  });

  it('rejeita widget sem shelter_club_id', () => {
    expect(() => dashboardWidgetSchema.parse({ ...validWidget, shelter_club_id: '' })).toThrow();
  });

  it('rejeita widget com type inválido', () => {
    expect(() => dashboardWidgetSchema.parse({ ...validWidget, type: 'invalid' })).toThrow();
  });

  it('rejeita widget com collection não rastreada', () => {
    expect(() => dashboardWidgetSchema.parse({
      ...validWidget,
      query: { collection: 'random_collection', filters: [] },
    })).toThrow();
  });

  it('rejeita widget com campo extra (strict)', () => {
    expect(() => dashboardWidgetSchema.parse({ ...validWidget, foo: 'bar' })).toThrow();
  });
});

describe('createWidgetSchema', () => {
  it('aceita widget sem created_at/updated_at', () => {
    const input = {
      shelter_club_id: 'club-1',
      type: 'list',
      title: 'Próximas castrações',
      query: { collection: 'pets', filters: [] },
      created_by_uid: 'user-1',
    };
    expect(() => createWidgetSchema.parse(input)).not.toThrow();
  });
});

describe('updateWidgetSchema', () => {
  it('aceita update parcial (todos campos opcionais)', () => {
    expect(() => updateWidgetSchema.parse({ title: 'Novo' })).not.toThrow();
  });
  it('rejeita campos não permitidos', () => {
    expect(() => updateWidgetSchema.parse({ shelter_club_id: 'x' })).toThrow();
  });
});

// ─── countPetsBySpecies / isPetInShelter ───────────────────────────────

describe('countPetsBySpecies', () => {
  it('conta dogs, cats, other', () => {
    const pets = [
      { id: '1', species: 'dog' },
      { id: '2', species: 'dog' },
      { id: '3', species: 'cat' },
      { id: '4', species: 'rabbit' }, // other
    ];
    const r = countPetsBySpecies(pets);
    expect(r).toEqual({ dog: 2, cat: 1, other: 1 });
  });
  it('lista vazia = zeros', () => {
    expect(countPetsBySpecies([])).toEqual({ dog: 0, cat: 0, other: 0 });
  });
  it('tolera species ausente', () => {
    expect(countPetsBySpecies([{ id: '1' }]).other).toBe(1);
  });
});

describe('isPetInShelter', () => {
  it('pet sem status = true', () => {
    expect(isPetInShelter({ id: '1' })).toBe(true);
  });
  it('pet status=available = true', () => {
    expect(isPetInShelter({ status: 'available' })).toBe(true);
  });
  it('pet status=adopted = false', () => {
    expect(isPetInShelter({ status: 'adopted' })).toBe(false);
  });
  it('pet status=fostered = false', () => {
    expect(isPetInShelter({ status: 'fostered' })).toBe(false);
  });
  it('pet status=deceased = false', () => {
    expect(isPetInShelter({ status: 'deceased' })).toBe(false);
  });
  it('pet null = false', () => {
    expect(isPetInShelter(null)).toBe(false);
  });
});

// ─── computeDashboardSummary ───────────────────────────────────────────

function buildData(overrides = {}) {
  return {
    pets: [],
    adoptions: [],
    postAdoptions: [],
    fosters: [],
    exhibitions: [],
    medicationsCount: 0,
    medicationsDueToday: 0,
    customCounts: {},
    errors: {},
    ...overrides,
  };
}

describe('computeDashboardSummary', () => {
  const now = new Date('2026-07-11T15:00:00.000Z');

  it('retorna 12 cards padrão com shelter vazio', () => {
    const out = computeDashboardSummary('club-1', buildData(), { now });
    expect(out.clubId).toBe('club-1');
    expect(out.cards.length).toBe(12);
    expect(out.hasError).toBe(false);
    expect(out.computedAt.toISOString()).toBe(now.toISOString());
  });

  it('conta cães/gatos/outros corretamente', () => {
    const data = buildData({
      pets: [
        { id: '1', species: 'dog' },
        { id: '2', species: 'dog' },
        { id: '3', species: 'cat' },
        { id: '4', species: 'rabbit' },
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const dogs = out.cards.find((c) => c.key === 'dogs_in_shelter');
    const cats = out.cards.find((c) => c.key === 'cats_in_shelter');
    const others = out.cards.find((c) => c.key === 'other_animals_in_shelter');
    expect(dogs.count).toBe(2);
    expect(cats.count).toBe(1);
    expect(others.count).toBe(1);
  });

  it('conta resgates do mês (somente dentro do mês UTC)', () => {
    const data = buildData({
      pets: [
        { id: '1', rescue_date: '2026-07-05T10:00:00.000Z', species: 'dog' },
        { id: '2', rescue_date: '2026-06-30T23:00:00.000Z', species: 'cat' }, // junho
        { id: '3', rescue_date: '2026-07-10T10:00:00.000Z', species: 'dog' },
        { id: '4', rescue_date: '2026-08-01T10:00:00.000Z', species: 'dog' }, // agosto (mês futuro)
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const rescues = out.cards.find((c) => c.key === 'rescues_this_month');
    expect(rescues.count).toBe(2);
  });

  it('conta adoções do mês', () => {
    const data = buildData({
      adoptions: [
        { id: 'a1', status: 'adoption_completed', decided_at: '2026-07-10T12:00:00.000Z' },
        { id: 'a2', status: 'adoption_completed', decided_at: '2026-06-20T12:00:00.000Z' },
        { id: 'a3', status: 'under_review', decided_at: '2026-07-11T12:00:00.000Z' },
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const adoptions = out.cards.find((c) => c.key === 'adoptions_this_month');
    expect(adoptions.count).toBe(1);
  });

  it('conta devoluções do mês', () => {
    const data = buildData({
      postAdoptions: [
        { id: 'p1', status: 'returned', returned_at: '2026-07-08T10:00:00.000Z' },
        { id: 'p2', status: 'returned', returned_at: '2026-05-15T10:00:00.000Z' },
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const returns = out.cards.find((c) => c.key === 'returns_this_month');
    expect(returns.count).toBe(1);
  });

  it('conta castrações pendentes (pets do abrigo sem neutered_at)', () => {
    const data = buildData({
      pets: [
        { id: '1', species: 'dog', shelter_owner_club_id: 'club-1', status: 'available' },
        { id: '2', species: 'cat', shelter_owner_club_id: 'club-1', status: 'available', neutered_at: '2026-01-01' },
        { id: '3', species: 'dog', shelter_owner_club_id: 'club-1', status: 'adopted' }, // não conta
        { id: '4', species: 'dog', shelter_owner_club_id: 'club-2' }, // outro abrigo
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const spay = out.cards.find((c) => c.key === 'pending_spay_neuter');
    expect(spay.count).toBe(1);
  });

  it('conta processos em andamento (exclui terminais)', () => {
    const data = buildData({
      adoptions: [
        { id: 'a1', status: 'applied' },
        { id: 'a2', status: 'under_review' },
        { id: 'a3', status: 'approved' },
        { id: 'a4', status: 'adoption_completed' },
        { id: 'a5', status: 'rejected' },
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const proc = out.cards.find((c) => c.key === 'processes_in_progress');
    expect(proc.count).toBe(3);
  });

  it('conta acompanhamentos pós-adoção com milestones passados não-materializados', () => {
    const data = buildData({
      postAdoptions: [
        {
          id: 'p1',
          status: 'active',
          milestones: [
            { scheduled_for: '2026-07-01T00:00:00.000Z', materialized: false },
          ],
        },
        {
          id: 'p2',
          status: 'active',
          milestones: [
            { scheduled_for: '2026-08-01T00:00:00.000Z', materialized: false }, // futuro
          ],
        },
        {
          id: 'p3',
          status: 'active',
          milestones: [
            { scheduled_for: '2026-06-01T00:00:00.000Z', materialized: true }, // já materializado
          ],
        },
        {
          id: 'p4',
          status: 'returned',
          milestones: [
            { scheduled_for: '2026-07-01T00:00:00.000Z', materialized: false },
          ],
        },
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const post = out.cards.find((c) => c.key === 'post_adoption_pending');
    expect(post.count).toBe(1);
  });

  it('conta medicações ativas e mostra doses pendentes hoje no subtitle', () => {
    const data = buildData({
      medicationsCount: 5,
      medicationsDueToday: 2,
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const meds = out.cards.find((c) => c.key === 'active_medications');
    expect(meds.count).toBe(5);
    expect(meds.subtitle).toMatch(/2 doses/);
    expect(meds.tone).toBe('warning');
  });

  it('conta próximas vitrines (próximos 30 dias)', () => {
    const data = buildData({
      exhibitions: [
        { id: 'e1', start_date: '2026-07-20T10:00:00.000Z' },
        { id: 'e2', start_date: '2026-08-10T10:00:00.000Z' },
        { id: 'e3', start_date: '2026-09-15T10:00:00.000Z' }, // fora da janela
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const ex = out.cards.find((c) => c.key === 'upcoming_exhibitions');
    expect(ex.count).toBe(2);
  });

  it('conta animais em LT (fosters ativos)', () => {
    const data = buildData({
      fosters: [
        { id: 'f1', status: 'active' },
        { id: 'f2', status: 'active' },
        { id: 'f3', status: 'completed' },
      ],
    });
    const out = computeDashboardSummary('club-1', data, { now });
    const lt = out.cards.find((c) => c.key === 'animals_in_foster');
    expect(lt.count).toBe(2);
  });

  it('marca hasError=true se algum sub-source reportar erro', () => {
    const data = buildData({ errors: { pets: 'permission denied' } });
    const out = computeDashboardSummary('club-1', data, { now });
    expect(out.hasError).toBe(true);
    expect(out.errors.pets).toBe('permission denied');
  });

  it('rejeita clubId ausente', () => {
    expect(() => computeDashboardSummary(null, buildData(), { now })).toThrow();
  });

  it('adiciona widgets customizados (somente do mesmo abrigo)', () => {
    const customWidgets = [
      {
        id: 'w1',
        shelter_club_id: 'club-1',
        type: 'count',
        title: 'Pets com pulga',
        tone: 'warning',
        order: 5,
        size: 'md',
      },
      {
        id: 'w2',
        shelter_club_id: 'club-2', // outro abrigo — deve ser ignorado
        type: 'count',
        title: 'Outro abrigo',
      },
    ];
    const data = buildData({ customCounts: { w1: 7 } });
    const out = computeDashboardSummary('club-1', data, { now, customWidgets });
    // 12 padrão + 1 custom (w2 ignorado por shelter_club_id diferente)
    expect(out.cards.length).toBe(13);
    const custom = out.cards.find((c) => c.key === 'custom_w1');
    expect(custom).toBeDefined();
    expect(custom.title).toBe('Pets com pulga');
    expect(custom.count).toBe(7);
    // ordem: w1 (order=5) vem primeiro
    expect(out.cards[0].key).toBe('custom_w1');
  });
});

// ─── Labels e helpers finais ───────────────────────────────────────────

describe('DASHBOARD_CARD_LABELS', () => {
  it('tem 12 labels padrão em pt-BR', () => {
    expect(Object.keys(DASHBOARD_CARD_LABELS).length).toBe(12);
    expect(DASHBOARD_CARD_LABELS.dogs_in_shelter).toBe('Cães no abrigo');
    expect(DASHBOARD_CARD_LABELS.post_adoption_pending).toBe('Acompanhamentos pós-adoção');
  });
});

describe('DASHBOARD_TONE_CLASSES', () => {
  it('5 tones', () => {
    expect(Object.keys(DASHBOARD_TONE_CLASSES).length).toBe(5);
  });
});

describe('isKnownCardKey', () => {
  it('true para chaves conhecidas', () => {
    expect(isKnownCardKey('dogs_in_shelter')).toBe(true);
    expect(isKnownCardKey('upcoming_exhibitions')).toBe(true);
  });
  it('false para chaves customizadas ou inválidas', () => {
    expect(isKnownCardKey('custom_xyz')).toBe(false);
    expect(isKnownCardKey('')).toBe(false);
  });
});
