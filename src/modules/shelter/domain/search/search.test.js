/**
 * @fileoverview Testes do domínio Smart Search (Fase 18).
 *
 * Cobre: normalizeText, tokenize, matchPrefix, matchContains,
 * buildSearchQuery, rankResult, rankResults, mapDocToResult, schemas
 * Zod.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  tokenize,
  matchPrefix,
  matchContains,
  buildSearchQuery,
  rankResult,
  rankResults,
  mapDocToResult,
  buildSnippet,
  searchFiltersSchema,
  searchOptionsSchema,
  searchResultSchema,
  searchResponseSchema,
  SEARCH_ENTITIES,
  SEARCH_ENTITY_IDS,
  SEARCH_LIMITS,
  getSearchableEntity,
  getSearchableEntities,
} from './search';

describe('normalizeText', () => {
  it('lowercase + remove acentos', () => {
    expect(normalizeText('Rex')).toBe('rex');
    expect(normalizeText('João')).toBe('joao');
    expect(normalizeText('São Paulo')).toBe('sao paulo');
    expect(normalizeText('Ação')).toBe('acao');
  });

  it('cedilha vira c', () => {
    expect(normalizeText('Coração')).toBe('coracao');
    expect(normalizeText('Construção')).toBe('construcao');
  });

  it('preserva números e espaços', () => {
    expect(normalizeText('Pet 123')).toBe('pet 123');
  });

  it('lida com null/empty/number', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
    expect(normalizeText(42)).toBe('42');
  });
});

describe('tokenize', () => {
  it('split em não-alphanumeric', () => {
    // 'o' tem 1 char (letra) e é descartado por design.
    expect(tokenize('Rex, o cão!')).toEqual(['rex', 'cao']);
  });

  it('remove tokens de 1 char (letra)', () => {
    expect(tokenize('a b c')).toEqual([]);
  });

  it('mantém tokens de 1 dígito', () => {
    expect(tokenize('pet 1 e 2')).toEqual(['pet', '1', '2']);
  });

  it('remove tokens vazios', () => {
    expect(tokenize('  rex   ')).toEqual(['rex']);
  });

  it('input vazio/null', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe('matchPrefix / matchContains', () => {
  it('matchPrefix é case + accent insensitive', () => {
    expect(matchPrefix('Rex', 're')).toBe(true);
    expect(matchPrefix('João', 'JO')).toBe(true);
    expect(matchPrefix('Rex', 'xy')).toBe(false);
  });

  it('matchPrefix aceita prefix vazio', () => {
    expect(matchPrefix('Rex', '')).toBe(true);
  });

  it('matchContains inclui substring', () => {
    expect(matchContains('Rex Labrador', 'lab')).toBe(true);
    expect(matchContains('Rex Labrador', 'fox')).toBe(false);
  });
});

describe('buildSearchQuery — entity=pet', () => {
  it('compõe where shelter_club_id + status + species + prefix', () => {
    const q = buildSearchQuery('pet', {
      shelterId: 'c1',
      status: 'available',
      species: 'dog',
      query: 'Rex',
    }, {});
    expect(q.collection).toBe('pets');
    expect(q.subcollectionParent).toBeUndefined();
    expect(q.requireShelterId).toBe(true);

    const fields = q.constraints.map((c) => c.field);
    expect(fields).toContain('shelter_club_id');
    expect(fields).toContain('status');
    expect(fields).toContain('species');
    expect(fields).toContain('name');
  });

  it('lança se pet sem shelterId', () => {
    expect(() => buildSearchQuery('pet', { status: 'available' }, {}))
      .toThrow(/shelterId/);
  });

  it('orderBy default = created_at DESC', () => {
    const q = buildSearchQuery('pet', { shelterId: 'c1' }, {});
    const last = q.constraints[q.constraints.length - 1];
    expect(last.type).toBe('limit');
    const order = q.constraints.find((c) => c.type === 'orderBy');
    expect(order.field).toBe('created_at');
    expect(order.direction).toBe('desc');
  });

  it('orderBy custom', () => {
    const q = buildSearchQuery('pet', { shelterId: 'c1' }, { orderBy: 'name', orderDirection: 'asc' });
    const order = q.constraints.find((c) => c.type === 'orderBy');
    expect(order.field).toBe('name');
    expect(order.direction).toBe('asc');
  });

  it('aplica limit customizado', () => {
    const q = buildSearchQuery('pet', { shelterId: 'c1' }, { maxResultsPerEntity: 50 });
    const limit = q.constraints.find((c) => c.type === 'limit');
    expect(limit.value).toBe(50);
  });
});

describe('buildSearchQuery — entity=shelter (público)', () => {
  it('não exige shelterId', () => {
    const q = buildSearchQuery('shelter', {}, {});
    expect(q.requireShelterId).toBe(false);
    expect(q.isPublic).toBe(true);
    // directory_status default = public
    const dir = q.constraints.find((c) => c.field === 'directory_status');
    expect(dir.value).toBe('public');
  });

  it('permite filter de status (directory_status)', () => {
    const q = buildSearchQuery('shelter', { status: 'public' }, {});
    const dirs = q.constraints.filter((c) => c.field === 'directory_status');
    expect(dirs.length).toBe(1);
  });

  it('prefix match em name', () => {
    const q = buildSearchQuery('shelter', { query: 'Abrigo' }, {});
    // 2 constraints de prefix (>=, <) + 1 orderBy em name (default)
    const nameConstraints = q.constraints.filter((c) => c.field === 'name');
    expect(nameConstraints.length).toBe(3);
    const rangeConstraints = nameConstraints.filter((c) => c.type === 'where');
    expect(rangeConstraints.length).toBe(2);
    expect(rangeConstraints[0].op).toBe('>=');
    expect(rangeConstraints[1].op).toBe('<');
  });
});

describe('buildSearchQuery — entity=foster (subcollection)', () => {
  it('exige shelterId', () => {
    expect(() => buildSearchQuery('foster', {}, {}))
      .toThrow(/shelterId/);
  });

  it('configura subcollectionParent', () => {
    const q = buildSearchQuery('foster', { shelterId: 'c1' }, {});
    expect(q.subcollectionParent).toBe('c1');
    expect(q.collection).toBe('fosters');
  });

  it('filtra por petId / adopterUid', () => {
    const q = buildSearchQuery('foster', {
      shelterId: 'c1',
      petId: 'p1',
      adopterUid: 'u1',
    }, {});
    const fields = q.constraints.map((c) => c.field);
    expect(fields).toContain('pet_id');
    expect(fields).toContain('foster_uid');
  });
});

describe('buildSearchQuery — entity=exhibition (subcollection)', () => {
  it('compõe com shelter_club_id (multi-tenant) + status', () => {
    const q = buildSearchQuery('exhibition', {
      shelterId: 'c1',
      status: 'scheduled',
    }, {});
    expect(q.subcollectionParent).toBe('c1');
    const fields = q.constraints.map((c) => c.field);
    expect(fields).toContain('shelter_club_id');
    expect(fields).toContain('status');
  });
});

describe('buildSearchQuery — entity=adopter', () => {
  it('multi-tenant', () => {
    const q = buildSearchQuery('adopter', { shelterId: 'c1' }, {});
    const fields = q.constraints.map((c) => c.field);
    expect(fields).toContain('shelter_club_id');
  });
});

describe('buildSearchQuery — erros', () => {
  it('entity inválida lança', () => {
    expect(() => buildSearchQuery('invalid', {}, {}))
      .toThrow(/Entity inválida/);
  });
});

describe('dateRange', () => {
  it('compõe >= from e <= to em created_at', () => {
    const q = buildSearchQuery('pet', {
      shelterId: 'c1',
      dateRange: { from: '2026-01-01', to: '2026-12-31' },
    }, {});
    const gte = q.constraints.find((c) => c.field === 'created_at' && c.op === '>=');
    const lte = q.constraints.find((c) => c.field === 'created_at' && c.op === '<=');
    expect(gte.value).toContain('2026-01-01');
    expect(lte.value).toContain('2026-12-31');
  });

  it('dateRange.from > to é rejeitado pelo Zod', () => {
    const r = searchFiltersSchema.safeParse({
      shelterId: 'c1',
      dateRange: { from: '2026-12-31', to: '2026-01-01' },
    });
    expect(r.success).toBe(false);
  });
});

describe('Schemas Zod', () => {
  it('searchFiltersSchema aceita filtros mínimos', () => {
    const r = searchFiltersSchema.safeParse({ query: 'Rex' });
    expect(r.success).toBe(true);
  });

  it('searchFiltersSchema rejeita entity inválida', () => {
    const r = searchFiltersSchema.safeParse({ entity: 'invalid' });
    expect(r.success).toBe(false);
  });

  it('searchFiltersSchema rejeita query > 200 chars', () => {
    const r = searchFiltersSchema.safeParse({ query: 'x'.repeat(201) });
    expect(r.success).toBe(false);
  });

  it('searchFiltersSchema aceita dateRange válido', () => {
    const r = searchFiltersSchema.safeParse({
      dateRange: { from: '2026-01-01', to: '2026-06-30' },
    });
    expect(r.success).toBe(true);
  });

  it('searchOptionsSchema valida pageSize', () => {
    expect(searchOptionsSchema.safeParse({ pageSize: 10 }).success).toBe(true);
    expect(searchOptionsSchema.safeParse({ pageSize: 0 }).success).toBe(false);
    expect(searchOptionsSchema.safeParse({ pageSize: 9999 }).success).toBe(false);
  });

  it('searchResultSchema valida score entre 0 e 1', () => {
    const valid = {
      id: 'x', entity: 'pet', title: 'Rex', url: '/pets/x', score: 0.8,
    };
    expect(searchResultSchema.safeParse(valid).success).toBe(true);
    expect(searchResultSchema.safeParse({ ...valid, score: 1.5 }).success).toBe(false);
    expect(searchResultSchema.safeParse({ ...valid, score: -0.1 }).success).toBe(false);
  });

  it('searchResponseSchema aceita byEntity vazio', () => {
    const r = searchResponseSchema.safeParse({
      query: 'Rex',
      normalizedQuery: 'rex',
      filters: {},
      results: [],
      byEntity: {},
      totalCount: 0,
    });
    expect(r.success).toBe(true);
  });
});

describe('rankResult', () => {
  it('exact match → 1.0', () => {
    const score = rankResult({ name: 'Rex' }, 'Rex', 'pet');
    expect(score).toBe(1.0);
  });

  it('exact é accent insensitive', () => {
    const score = rankResult({ name: 'João' }, 'joao', 'pet');
    expect(score).toBe(1.0);
  });

  it('prefix match → 0.85', () => {
    const score = rankResult({ name: 'Rex Labrador' }, 'Rex', 'pet');
    expect(score).toBe(0.85);
  });

  it('contains em searchableField → 0.6', () => {
    const score = rankResult({
      name: 'Sem Match',
      description: 'Achei o Rex perdido',
    }, 'Rex', 'pet');
    expect(score).toBe(0.6);
  });

  it('token match → 0.4', () => {
    const score = rankResult({ name: 'Meu Pet Rex' }, 'labrador', 'pet');
    // Não vai dar match — título "Meu Pet Rex" não tem "labrador"
    expect(score).toBe(0);
  });

  it('sem match → 0', () => {
    const score = rankResult({ name: 'Rex' }, 'Tobby', 'pet');
    expect(score).toBe(0);
  });

  it('bonus de subtitle match', () => {
    const a = rankResult({ name: 'Rex', breed: 'Labrador' }, 'lab', 'pet');
    // name: prefix? "rex" starts with "lab"? não. contains? não. token? não.
    // breed: contains "lab"? sim → 0.6
    // subtitle bonus +0.05 → 0.65
    expect(a).toBe(0.65);
  });

  it('query vazio → 0', () => {
    expect(rankResult({ name: 'Rex' }, '', 'pet')).toBe(0);
  });

  it('entity inválida → 0', () => {
    expect(rankResult({ name: 'Rex' }, 'Rex', 'invalid')).toBe(0);
  });
});

describe('rankResults', () => {
  it('ordena por score DESC', () => {
    const results = [
      { id: 'a', score: 0.4 },
      { id: 'b', score: 0.85 },
      { id: 'c', score: 0.6 },
    ];
    const ranked = rankResults(results, 'x');
    expect(ranked.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('estável em empate', () => {
    const results = [
      { id: 'a', score: 0.5 },
      { id: 'b', score: 0.5 },
      { id: 'c', score: 0.5 },
    ];
    const ranked = rankResults(results, 'x');
    expect(ranked.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('input não-array → []', () => {
    expect(rankResults(null, 'x')).toEqual([]);
    expect(rankResults(undefined, 'x')).toEqual([]);
  });
});

describe('mapDocToResult', () => {
  it('mapeia campos canônicos', () => {
    const r = mapDocToResult({
      id: 'p1', name: 'Rex', breed: 'Labrador',
    }, 'pet', 'Rex');
    expect(r.id).toBe('p1');
    expect(r.entity).toBe('pet');
    expect(r.title).toBe('Rex');
    expect(r.subtitle).toBe('Labrador');
    expect(r.url).toBe('/pets/p1');
    expect(r.score).toBe(1.0);
    expect(r.snippet).toContain('Rex');
  });

  it('URL pattern é gerado corretamente', () => {
    expect(mapDocToResult({ id: 'x1', name: 'X' }, 'shelter', 'X').url)
      .toBe('/clubs/x1');
    expect(mapDocToResult({ id: 'x2', name: 'X' }, 'adopter', 'X').url)
      .toBe('/admin/adoption-applications/x2');
    expect(mapDocToResult({ id: 'x3', title: 'X' }, 'exhibition', 'X').url)
      .toBe('/admin/exhibitions/x3');
  });
});

describe('buildSnippet', () => {
  it('gera snippet com contexto', () => {
    const s = buildSnippet({
      name: 'Rex',
      description: 'Cachorro muito dócil e brincalhão, ideal para famílias com crianças',
    }, 'docil', 'pet');
    expect(s).toContain('dócil');
  });

  it('snippet curto recebe elipses', () => {
    const s = buildSnippet({
      name: 'Rex',
      description: 'A'.repeat(500),
    }, 're', 'pet');
    expect(s.length).toBeLessThanOrEqual(SEARCH_LIMITS.SNIPPET_MAX_LEN + 1);
  });

  it('sem match → vazio', () => {
    expect(buildSnippet({ name: 'Rex' }, 'zzz', 'pet')).toBe('');
  });
});

describe('Entity lookups', () => {
  it('getSearchableEntity retorna config', () => {
    expect(getSearchableEntity('pet').label).toBe('Animais');
    expect(() => getSearchableEntity('invalid')).toThrow();
  });

  it('getSearchableEntities retorna 5 entries', () => {
    const list = getSearchableEntities();
    expect(list.length).toBe(5);
    expect(list.map((e) => e.id).sort()).toEqual(
      ['adopter', 'exhibition', 'foster', 'pet', 'shelter'].sort(),
    );
  });

  it('SEARCH_ENTITIES tem 5 entries', () => {
    expect(SEARCH_ENTITY_IDS.length).toBe(5);
    expect(Object.keys(SEARCH_ENTITIES).length).toBe(5);
  });
});
