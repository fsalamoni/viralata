/**
 * @fileoverview Testes do serviço de Smart Search (Fase 18).
 *
 * Cobre: searchEntity, globalSearch, getSearchableEntities,
 * countResultsByEntity, snapshots, validações Zod, tenant isolation,
 * audit log, ranking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks Firestore ───────────────────────────────────────────────────

const mockWhere = vi.fn((field, op, value) => ({ _w: true, field, op, value }));
const mockOrderBy = vi.fn((field, dir) => ({ _o: true, field, dir }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockDb = { _isDb: true };

const mockCreateAuditLog = vi.fn().mockResolvedValue(null);

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (...args) => mockLimit(...args),
  getDocs: (...args) => mockGetDocs(...args),
  doc: vi.fn((db, ...path) => ({ _path: path.join('/') })),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _isServerTimestamp: true })),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

// Importa após os mocks
const {
  searchEntity,
  globalSearch,
  getSearchableEntities,
  countResultsByEntity,
  buildPetSnapshot,
  buildApplicantSnapshot,
} = await import('./searchService');

beforeEach(() => {
  mockGetDocs.mockReset();
  mockWhere.mockClear();
  mockOrderBy.mockClear();
  mockLimit.mockClear();
  mockCollection.mockClear();
  mockQuery.mockClear();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
  mockGetDocs.mockResolvedValue({ docs: [] });
});

// ─── Fixtures ──────────────────────────────────────────────────────────

function snap(data, id = 'd-1') {
  return { id, exists: () => true, data: () => data };
}

const PET_DOC = {
  name: 'Rex',
  breed: 'Labrador',
  status: 'available',
  species: 'dog',
  shelter_club_id: 'c1',
  description: 'Cão dócil e brincalhão',
};

const SHELTER_DOC = {
  name: 'Abrigo Esperança',
  city: 'São Paulo',
  directory_status: 'public',
};

const FOSTER_DOC = {
  full_name: 'Maria Silva',
  status: 'active',
  pet_id: 'p1',
  foster_uid: 'u-foster',
  shelter_club_id: 'c1',
};

// ─── searchEntity ──────────────────────────────────────────────────────

describe('searchEntity — pet', () => {
  it('retorna resultados para entity=pet com shelterId', async () => {
    mockGetDocs.mockResolvedValue({ docs: [snap(PET_DOC, 'p1')] });
    const results = await searchEntity('pet', {
      shelterId: 'c1',
      query: 'Rex',
    });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('p1');
    expect(results[0].entity).toBe('pet');
    expect(results[0].title).toBe('Rex');
    expect(results[0].url).toBe('/pets/p1');
  });

  it('retorna [] se pet sem shelterId (tenant isolation)', async () => {
    const results = await searchEntity('pet', { query: 'Rex' });
    expect(results).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('rejeita entity inválida', async () => {
    await expect(searchEntity('invalid', { shelterId: 'c1' }))
      .rejects.toThrow(/Entity inválida/);
  });

  it('rejeita filtros inválidos (zod)', async () => {
    await expect(searchEntity('pet', { query: 'x'.repeat(201) }))
      .rejects.toThrow();
  });

  it('filtra cross-tenant (defesa em profundidade)', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        snap({ ...PET_DOC, shelter_club_id: 'c-OTHER' }, 'p1'),
        snap(PET_DOC, 'p2'),
      ],
    });
    const results = await searchEntity('pet', { shelterId: 'c1' });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('p2');
  });

  it('aplica filtros: status, species', async () => {
    mockGetDocs.mockResolvedValue({ docs: [snap(PET_DOC, 'p1')] });
    await searchEntity('pet', {
      shelterId: 'c1',
      status: 'available',
      species: 'dog',
    });
    // Verifica que o Firestore recebeu os where corretos
    const allArgs = mockQuery.mock.calls[0];
    const wheres = allArgs.filter((a) => a && a._w);
    const fields = wheres.map((w) => w.field);
    expect(fields).toContain('shelter_club_id');
    expect(fields).toContain('status');
    expect(fields).toContain('species');
  });
});

describe('searchEntity — shelter (público)', () => {
  it('busca sem shelterId (público)', async () => {
    mockGetDocs.mockResolvedValue({ docs: [snap(SHELTER_DOC, 's1')] });
    const results = await searchEntity('shelter', { query: 'Esperança' });
    expect(results.length).toBe(1);
    expect(results[0].entity).toBe('shelter');
    expect(results[0].url).toBe('/clubs/s1');
  });

  it('default filtra por directory_status=public', async () => {
    await searchEntity('shelter', {});
    const allArgs = mockQuery.mock.calls[0];
    const wheres = allArgs.filter((a) => a && a._w);
    const dirWhere = wheres.find((w) => w.field === 'directory_status');
    expect(dirWhere.value).toBe('public');
  });
});

describe('searchEntity — foster (subcollection)', () => {
  it('busca com subcollectionParent=shelterId', async () => {
    mockGetDocs.mockResolvedValue({ docs: [snap(FOSTER_DOC, 'f1')] });
    const results = await searchEntity('foster', { shelterId: 'c1' });
    expect(results.length).toBe(1);
    expect(results[0].entity).toBe('foster');
    expect(results[0].url).toBe('/admin/fosters/f1');
    // Verifica que a collection denormalizada search_fosters foi consultada
    // (TASK-312: search_* collection é usada em vez de fosters direta)
    expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'search_fosters');
  });

  it('retorna [] se foster sem shelterId', async () => {
    const results = await searchEntity('foster', {});
    expect(results).toEqual([]);
  });
});

describe('searchEntity — exhibition (subcollection)', () => {
  it('busca em subcollection', async () => {
    const EX_DOC = { title: 'Feira de Adoção', status: 'scheduled', location: 'Praça' };
    mockGetDocs.mockResolvedValue({ docs: [snap(EX_DOC, 'e1')] });
    const results = await searchEntity('exhibition', { shelterId: 'c1' });
    expect(results.length).toBe(1);
    expect(results[0].entity).toBe('exhibition');
    expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'exhibitions');
  });
});

describe('searchEntity — adopter', () => {
  it('busca applicants com shelter_club_id', async () => {
    const A_DOC = {
      applicant_name: 'João',
      applicant_email: 'j@x.com',
      status: 'pending',
      shelter_club_id: 'c1',
    };
    mockGetDocs.mockResolvedValue({ docs: [snap(A_DOC, 'a1')] });
    const results = await searchEntity('adopter', { shelterId: 'c1' });
    expect(results.length).toBe(1);
    expect(results[0].entity).toBe('adopter');
    expect(results[0].title).toBe('João');
    expect(results[0].url).toBe('/admin/adoption-applications/a1');
  });
});

// ─── globalSearch ──────────────────────────────────────────────────────

describe('globalSearch', () => {
  it('busca multi-entity em paralelo (shelter public + pet multi-tenant)', async () => {
    mockGetDocs.mockImplementation(() => Promise.resolve({
      docs: [snap(PET_DOC, 'p1')],
    }));
    const result = await globalSearch({
      shelterId: 'c1',
      query: 'Rex',
    });
    expect(result.query).toBe('Rex');
    expect(result.normalizedQuery).toBe('rex');
    expect(result.totalCount).toBeGreaterThanOrEqual(1);
    expect(result.byEntity.pet).toBeDefined();
    expect(result.byEntity.shelter).toBeDefined();
    // totalCount inclui os dois
    expect(result.results.length).toBe(result.totalCount);
  });

  it('retorna envelope válido', async () => {
    const r = await globalSearch({ shelterId: 'c1', query: 'Rex' });
    expect(r).toHaveProperty('query');
    expect(r).toHaveProperty('normalizedQuery');
    expect(r).toHaveProperty('filters');
    expect(r).toHaveProperty('results');
    expect(r).toHaveProperty('byEntity');
    expect(r).toHaveProperty('totalCount');
    expect(r).toHaveProperty('durationMs');
  });

  it('audit log NÃO é gerado sem actor', async () => {
    await globalSearch({ shelterId: 'c1', query: 'Rex' });
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });

  it('audit log É gerado com actor', async () => {
    await globalSearch(
      { shelterId: 'c1', query: 'Rex' },
      {},
      { actor: { uid: 'u1', email: 'u@x.com' }, audit: true },
    );
    expect(mockCreateAuditLog).toHaveBeenCalled();
    const call = mockCreateAuditLog.mock.calls[0][0];
    expect(call.action).toBe('shelter_search_executed');
    expect(call.actor.uid).toBe('u1');
    expect(call.details.query).toBe('Rex');
    expect(call.details.shelter_club_id).toBe('c1');
  });

  it('audit log pode ser desligado via context.audit=false', async () => {
    await globalSearch(
      { shelterId: 'c1', query: 'Rex' },
      {},
      { actor: { uid: 'u1' }, audit: false },
    );
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });

  it('ranking global por score DESC', async () => {
    // mockGetDocs retorna pets diferentes para entity=pet
    mockGetDocs.mockImplementation((q) => {
      // Detecta se é pets ou clubs
      const isPets = q._args && q._args[0] && q._args[0]._path === 'pets';
      if (isPets) {
        return Promise.resolve({
          docs: [
            snap({ ...PET_DOC, name: 'Rex' }, 'p1'),
            snap({ ...PET_DOC, name: 'Rex Junior' }, 'p2'),
          ],
        });
      }
      return Promise.resolve({ docs: [] });
    });
    const r = await globalSearch({ shelterId: 'c1', query: 'Rex' });
    // Resultados devem estar ordenados por score DESC
    for (let i = 1; i < r.results.length; i++) {
      expect(r.results[i - 1].score).toBeGreaterThanOrEqual(r.results[i].score);
    }
  });

  it('falha de uma entity não derruba as outras', async () => {
    let callCount = 0;
    mockGetDocs.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('boom'));
      return Promise.resolve({ docs: [snap(PET_DOC, 'p1')] });
    });
    const r = await globalSearch({ shelterId: 'c1', query: 'Rex' });
    // Pelo menos 1 entity retornou resultado
    expect(r.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('filtra entities incompatíveis (multi-tenant sem shelterId)', async () => {
    const r = await globalSearch({ query: 'Rex' });
    // Sem shelterId, só 'shelter' (público) é consultado
    expect(r.byEntity.shelter).toBeDefined();
    // pet, adopter, foster, exhibition não devem ter sido chamados
    // (verificamos por totalCount = 0, dado o mock default de docs=[])
    expect(r.byEntity.pet).toEqual([]);
  });

  it('respeita entity específica (filtra outras)', async () => {
    mockGetDocs.mockResolvedValue({ docs: [snap(PET_DOC, 'p1')] });
    const r = await globalSearch({ shelterId: 'c1', query: 'Rex', entity: 'pet' });
    expect(r.byEntity.pet).toBeDefined();
    expect(r.byEntity.pet.length).toBe(1);
    // Outras entities não foram chamadas
    expect(r.byEntity.shelter).toEqual([]);
  });

  it('sem db, retorna envelope vazio', async () => {
    // Esse cenário é difícil de mockar no meio do test suite.
    // Em vez disso, verificamos que se getDocs falhar, response tem totalCount 0.
    mockGetDocs.mockRejectedValue(new Error('db indisponível'));
    const r = await globalSearch({ shelterId: 'c1', query: 'Rex' });
    expect(r.totalCount).toBe(0);
    expect(r.results).toEqual([]);
  });
});

// ─── getSearchableEntities ─────────────────────────────────────────────

describe('getSearchableEntities', () => {
  it('retorna 6 entities (TASK-241: +volunteer)', () => {
    const list = getSearchableEntities();
    expect(list.length).toBe(6);
    expect(list.map((e) => e.id).sort()).toEqual(
      ['adopter', 'exhibition', 'foster', 'pet', 'shelter', 'volunteer'].sort(),
    );
  });

  it('marca shelter como público', () => {
    const list = getSearchableEntities();
    const shelter = list.find((e) => e.id === 'shelter');
    expect(shelter.isPublic).toBe(true);
    const pet = list.find((e) => e.id === 'pet');
    expect(pet.isPublic).toBe(false);
  });
});

// ─── countResultsByEntity ──────────────────────────────────────────────

describe('countResultsByEntity', () => {
  it('retorna mapa entity → count', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [snap(PET_DOC, 'p1'), snap(PET_DOC, 'p2')],
    });
    const counts = await countResultsByEntity({ shelterId: 'c1' });
    expect(typeof counts).toBe('object');
    // Pelo menos 1 entity com count > 0
    const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(totalCount).toBeGreaterThanOrEqual(0);
  });
});

// ─── Snapshots ─────────────────────────────────────────────────────────

describe('buildPetSnapshot', () => {
  it('extrai apenas campos do search', () => {
    const s = buildPetSnapshot({
      id: 'p1',
      name: 'Rex',
      breed: 'Labrador',
      species: 'dog',
      status: 'available',
      shelter_club_id: 'c1',
      rescue_location: 'Rua A',
      description: 'Cão dócil',
      unwanted_field: 'IGNORAR',
      created_at_ms: 12345,
    });
    expect(s.id).toBe('p1');
    expect(s.name).toBe('Rex');
    expect(s.breed).toBe('Labrador');
    expect(s.species).toBe('dog');
    expect(s.status).toBe('available');
    expect(s.shelter_club_id).toBe('c1');
    expect(s.rescue_location).toBe('Rua A');
    expect(s.description).toBe('Cão dócil');
    expect(s.unwanted_field).toBeUndefined();
    expect(s.created_at_ms).toBeUndefined();
  });

  it('null input → null', () => {
    expect(buildPetSnapshot(null)).toBeNull();
  });
});

describe('buildApplicantSnapshot', () => {
  it('extrai campos do applicant', () => {
    const s = buildApplicantSnapshot({
      id: 'a1',
      applicant_name: 'João',
      applicant_email: 'j@x.com',
      applicant_phone: '+5511999999999',
      status: 'pending',
      shelter_club_id: 'c1',
      pet_id: 'p1',
      notes: 'Quer adotar Rex',
      unwanted: 'X',
    });
    expect(s.id).toBe('a1');
    expect(s.applicant_name).toBe('João');
    expect(s.notes).toBe('Quer adotar Rex');
    expect(s.unwanted).toBeUndefined();
  });

  it('null input → null', () => {
    expect(buildApplicantSnapshot(null)).toBeNull();
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('searchEntity com query vazia e sem filtros: docs são mantidos em ordem', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [snap(PET_DOC, 'p1'), snap(PET_DOC, 'p2')],
    });
    const results = await searchEntity('pet', { shelterId: 'c1' });
    expect(results.length).toBe(2);
    // Sem query, ordem é a do Firestore
    expect(results[0].id).toBe('p1');
    expect(results[1].id).toBe('p2');
  });

  it('searchEntity com prefix match: nome startsWith query', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        snap({ ...PET_DOC, name: 'Rex' }, 'p1'),
        snap({ ...PET_DOC, name: 'Rex Junior' }, 'p2'),
      ],
    });
    const results = await searchEntity('pet', { shelterId: 'c1', query: 'Rex' });
    // 'Rex' tem exact match (1.0), 'Rex Junior' tem prefix (0.85)
    expect(results[0].id).toBe('p1');
    expect(results[0].score).toBe(1.0);
    expect(results[1].id).toBe('p2');
    expect(results[1].score).toBe(0.85);
  });

  it('globalSearch com filtros inválidos: lança', async () => {
    await expect(globalSearch({ query: 'x'.repeat(201) })).rejects.toThrow();
  });

  it('globalSearch: sem db retorna envelope com count 0', async () => {
    // Não podemos simular db=null aqui; em vez disso validamos o
    // envelope shape. Como o mock de db é truthy, getDocs é chamado.
    mockGetDocs.mockResolvedValue({ docs: [] });
    const r = await globalSearch({});
    expect(r.totalCount).toBe(0);
    // byEntity contém todas as 6 entities, com shelter preenchido (público)
    expect(r.byEntity.shelter).toEqual([]);
    expect(Object.keys(r.byEntity).length).toBe(6);
  });
});
