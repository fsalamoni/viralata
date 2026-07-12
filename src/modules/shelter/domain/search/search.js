/**
 * @fileoverview Domínio: Smart Search (Fase 18).
 *
 * Define a busca inteligente multi-entidade do Sistema de Gestão do
 * Abrigo. A busca é executada pelo `searchService` em cima do Firestore
 * nativo (compound queries + collectionGroup + prefix match). Nada aqui
 * depende de Meilisearch/Typesense/Algolia externos.
 *
 * Entidades pesquisáveis (multi-tenant via `shelter_club_id`):
 *   - pet:        collection `pets` (top-level)
 *   - adopter:    collection `adoption_interests` (top-level)
 *   - shelter:    collection `clubs` (top-level; `directory_status` permite
 *                 listagem pública)
 *   - foster:     subcollection `clubs/{clubId}/fosters`
 *   - exhibition: subcollection `clubs/{clubId}/exhibitions`
 *
 * Ranking:
 *   1. Match exato (case-insensitive)        → score 1.00
 *   2. Match de prefixo em name/title        → score 0.85
 *   3. Match de substring em qualquer campo  → score 0.60
 *   4. Match de token (palavra)              → score 0.40
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 18
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

/**
 * Entidades pesquisáveis. Cada entrada define o `path` no Firestore
 * (top-level vs subcollection) e os campos pesquisáveis/filtráveis.
 *
 * IMPORTANTE: a `path` é SEMPRE relativa a um único tenant:
 *   - top-level (`pets`, `adoption_interests`, `clubs`) → multi-tenant
 *     via where no campo `shelter_club_id` OU leitura pública
 *     (clubs com directory_status='public').
 *   - subcollection (`clubs/{clubId}/fosters`,
 *     `clubs/{clubId}/exhibitions`) → `shelter_club_id` da path é o
 *     tenant.
 */
export const SEARCH_ENTITIES = Object.freeze({
  pet: Object.freeze({
    id: 'pet',
    label: 'Animais',
    collection: 'pets',
    pathType: 'top-level',
    isPublic: false,
    searchableFields: Object.freeze(['name', 'description', 'breed', 'rescue_location']),
    filterableFields: Object.freeze({
      status: { type: 'string' },
      species: { type: 'string' },
      shelter_club_id: { type: 'string', required: true },
    }),
    titleField: 'name',
    subtitleField: 'breed',
    urlPattern: '/pets/{id}',
  }),
  adopter: Object.freeze({
    id: 'adopter',
    label: 'Adotantes',
    collection: 'adoption_interests',
    pathType: 'top-level',
    isPublic: false,
    searchableFields: Object.freeze(['applicant_name', 'applicant_email', 'applicant_phone', 'notes']),
    filterableFields: Object.freeze({
      status: { type: 'string' },
      shelter_club_id: { type: 'string', required: true },
    }),
    titleField: 'applicant_name',
    subtitleField: 'applicant_email',
    urlPattern: '/admin/adoption-applications/{id}',
  }),
  shelter: Object.freeze({
    id: 'shelter',
    label: 'Abrigos',
    collection: 'clubs',
    pathType: 'top-level',
    isPublic: true,  // leitura pública (busca de ONGs)
    searchableFields: Object.freeze(['name', 'description', 'city', 'state', 'neighborhood']),
    filterableFields: Object.freeze({
      directory_status: { type: 'string' },
    }),
    titleField: 'name',
    subtitleField: 'city',
    urlPattern: '/clubs/{id}',
  }),
  foster: Object.freeze({
    id: 'foster',
    label: 'Lares Temporários',
    collection: 'fosters',
    pathType: 'subcollection',
    parentCollection: 'clubs',
    isPublic: false,
    searchableFields: Object.freeze(['full_name', 'email', 'phone', 'address', 'experience']),
    filterableFields: Object.freeze({
      status: { type: 'string' },
      pet_id: { type: 'string' },
      foster_uid: { type: 'string' },
    }),
    titleField: 'full_name',
    subtitleField: 'address',
    urlPattern: '/admin/fosters/{id}',
  }),
  exhibition: Object.freeze({
    id: 'exhibition',
    label: 'Vitrines',
    collection: 'exhibitions',
    pathType: 'subcollection',
    parentCollection: 'clubs',
    isPublic: false,
    searchableFields: Object.freeze(['title', 'description', 'location', 'city', 'organizer_name']),
    filterableFields: Object.freeze({
      status: { type: 'string' },
      shelter_club_id: { type: 'string', required: true },
    }),
    titleField: 'title',
    subtitleField: 'location',
    urlPattern: '/admin/exhibitions/{id}',
  }),
});

/** Lista de IDs de entidades (para iterar). */
export const SEARCH_ENTITY_IDS = Object.freeze(Object.keys(SEARCH_ENTITIES));

/** Set para O(1) lookup. */
const _entityIdSet = new Set(SEARCH_ENTITY_IDS);

/**
 * Limites de paginação. Defaults: 20 por entity, max 50. O total
 * retornado por globalSearch é bounded por entity (N entities ×
 * maxResultsPerEntity).
 */
export const SEARCH_LIMITS = Object.freeze({
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 1,
  DEFAULT_MAX_RESULTS_PER_ENTITY: 20,
  HARD_MAX_RESULTS_PER_ENTITY: 100,
  SNIPPET_MAX_LEN: 160,
});

// ─── Helpers de texto ──────────────────────────────────────────────────

/**
 * Tabela de normalização (lowercase + remoção de acentos). Cobre
 * letras latinas (com e sem acento) e cedilha. Caso especial:
 * "ç"/"Ç" → "c"/"c".
 */
const NORMALIZE_LOOKUP = {
  'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ñ': 'n',
  'ç': 'c',
  'Á': 'a', 'À': 'a', 'Ã': 'a', 'Â': 'a', 'Ä': 'a',
  'É': 'e', 'È': 'e', 'Ê': 'e', 'Ë': 'e',
  'Í': 'i', 'Ì': 'i', 'Î': 'i', 'Ï': 'i',
  'Ó': 'o', 'Ò': 'o', 'Õ': 'o', 'Ô': 'o', 'Ö': 'o',
  'Ú': 'u', 'Ù': 'u', 'Û': 'u', 'Ü': 'u',
  'Ý': 'y',
  'Ñ': 'n',
  'Ç': 'c',
};

/**
 * Normaliza texto: lowercase + remoção de acentos. Não remove
 * pontuação/espaços — isso é tarefa de `tokenize`.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (text == null) return '';
  if (typeof text !== 'string') return String(text);
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const mapped = NORMALIZE_LOOKUP[ch];
    out += mapped != null ? mapped : ch;
  }
  return out.toLowerCase();
}

/**
 * Tokeniza texto normalizado. Split em não-alphanumeric. Remove
 * tokens vazios e descarta tokens de 1 char (a menos que sejam
 * dígitos). Útil para `rankResults` (token match).
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text) return [];
  const normalized = normalizeText(text);
  return normalized
    .split(/[^a-z0-9]+/g)
    .filter((t) => t && (t.length > 1 || /^\d+$/.test(t)));
}

/**
 * Verifica se `text` começa com `prefix` (case + accent insensitive).
 *
 * @param {string} text
 * @param {string} prefix
 * @returns {boolean}
 */
/**
 * TASK-075: gera o array `search_keywords` gravado no doc (pets e,
 * futuramente, outras entities). Tokens normalizados (sem acento,
 * lowercase) + prefixos de 3..N chars do nome, permitindo
 * `array-contains` no Firestore para busca por prefixo server-side.
 * Bounded a 100 keywords para não estourar o limite de índice.
 *
 * @param {object} fields - mapa campo→valor (ex.: {name, breed, description})
 * @returns {string[]} keywords únicos, ordenados
 */
export function buildSearchKeywords(fields = {}) {
  const keywords = new Set();
  const values = Object.values(fields).filter((v) => typeof v === 'string' && v);
  for (const value of values) {
    for (const token of tokenize(value)) {
      if (token.length < 2) continue;
      keywords.add(token);
      // Prefixos do token (3..len-1) — busca incremental
      for (let i = 3; i < token.length && keywords.size < 100; i += 1) {
        keywords.add(token.slice(0, i));
      }
      if (keywords.size >= 100) break;
    }
    if (keywords.size >= 100) break;
  }
  return Array.from(keywords).sort();
}

export function matchPrefix(text, prefix) {
  if (!prefix) return true;
  if (text == null) return false;
  const t = normalizeText(text);
  const p = normalizeText(prefix);
  return t.startsWith(p);
}

/**
 * Verifica se `text` contém `needle` (case + accent insensitive).
 *
 * @param {string} text
 * @param {string} needle
 * @returns {boolean}
 */
export function matchContains(text, needle) {
  if (!needle) return true;
  if (text == null) return false;
  const t = normalizeText(text);
  const n = normalizeText(needle);
  return t.includes(n);
}

// ─── Schemas Zod ───────────────────────────────────────────────────────

/** Schema para o intervalo de datas. ISO 8601 (YYYY-MM-DD). */
const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
}).strict().refine(
  (v) => v.from <= v.to,
  { message: 'dateRange.from deve ser <= dateRange.to' },
);

/**
 * Filtros de busca. Todos os campos são opcionais. Validações de
 * entidade (campos pesquisáveis) e tenant são feitas em
 * `buildSearchQuery` e no service.
 */
export const searchFiltersSchema = z.object({
  /** Entity específica ('pet' | 'adopter' | ...). null = multi-entity. */
  entity: z.enum(SEARCH_ENTITY_IDS).optional(),
  /** Texto livre (busca em searchableFields). */
  query: z.string().max(200).optional(),
  /** Status (semantic, ex: 'available', 'pending'). */
  status: z.string().max(60).optional(),
  /** Espécie (apenas para pets). */
  species: z.enum(['dog', 'cat', 'bird', 'other']).optional(),
  /** Filtro por abrigo. OBRIGATÓRIO para entities multi-tenant
   *  (pet, adopter, foster, exhibition) — exceto shelter que é público. */
  shelterId: z.string().min(1).max(128).optional(),
  /** Intervalo de datas (genérico: birth_date, rescue_date, start_date). */
  dateRange: dateRangeSchema.optional(),
  /** Filtro genérico por pet (foster: pet_id). */
  petId: z.string().min(1).max(128).optional(),
  /** Filtro por adotante (foster: foster_uid). */
  adopterUid: z.string().min(1).max(128).optional(),
}).strict();

/** Opções de paginação + ordenação. */
export const searchOptionsSchema = z.object({
  pageSize: z.number().int()
    .min(SEARCH_LIMITS.MIN_PAGE_SIZE)
    .max(SEARCH_LIMITS.MAX_PAGE_SIZE)
    .optional(),
  maxResultsPerEntity: z.number().int()
    .min(1)
    .max(SEARCH_LIMITS.HARD_MAX_RESULTS_PER_ENTITY)
    .optional(),
  /** Ordenar por campo específico. Default: created_at DESC. */
  orderBy: z.string().max(64).optional(),
  /** Direção ASC ou DESC. Default: DESC. */
  orderDirection: z.enum(['asc', 'desc']).optional(),
}).strict();

/** Schema de uma entidade pesquisável (ID do SEARCH_ENTITIES). */
export const searchEntitySchema = z.enum(SEARCH_ENTITY_IDS);

/** Schema do resultado de busca. */
export const searchResultSchema = z.object({
  id: z.string().min(1),
  entity: searchEntitySchema,
  title: z.string().max(300),
  subtitle: z.string().max(300).optional(),
  url: z.string().max(500),
  score: z.number().min(0).max(1),
  snippet: z.string().max(SEARCH_LIMITS.SNIPPET_MAX_LEN).optional(),
}).strict();

/** Schema do envelope de resposta (global search). */
export const searchResponseSchema = z.object({
  query: z.string(),
  normalizedQuery: z.string(),
  filters: searchFiltersSchema,
  results: z.array(searchResultSchema),
  byEntity: z.record(
    searchEntitySchema,
    z.array(searchResultSchema),
  ),
  totalCount: z.number().int().min(0),
  durationMs: z.number().min(0).optional(),
}).strict();

// ─── Builders ──────────────────────────────────────────────────────────

/**
 * Constrói a configuração da compound query para uma entity.
 *
 * Retorna:
 *   - collection: nome da collection (top-level) ou
 *                 `clubs/{shelterId}/fosters` (subcollection).
 *   - constraints: array de constraints Firestore
 *                 (where + orderBy + limit). Cada item é
 *                 `{ type, field, op?, value?, direction? }` —
 *                 o service converte para where()/orderBy().
 *   - requireShelterId: true se a entity exige shelterId (multi-tenant).
 *
 * IMPORTANTE: este builder NÃO chama `query()`. O service é que monta
 * a query final. Isto permite testes puros sem mock de firestore.
 *
 * @param {string} entity entity ID (de SEARCH_ENTITY_IDS)
 * @param {object} filters filtros validados (Zod)
 * @param {object} options opções validadas (Zod)
 * @returns {{
 *   collection: string,
 *   subcollectionParent?: string,
 *   constraints: Array<object>,
 *   requireShelterId: boolean,
 *   isPublic: boolean,
 * }}
 */
export function buildSearchQuery(entity, filters = {}, options = {}) {
  if (!_entityIdSet.has(entity)) {
    throw new Error(`Entity inválida: ${entity}`);
  }
  const cfg = SEARCH_ENTITIES[entity];
  const constraints = [];
  let requireShelterId = false;
  let collectionPath = cfg.collection;
  let subcollectionParent;

  if (cfg.pathType === 'subcollection') {
    if (!filters.shelterId) {
      throw new Error(
        `shelterId é obrigatório para entity "${entity}" (subcollection).`,
      );
    }
    subcollectionParent = filters.shelterId;
  }

  // ─── Filtros where ──────────────────────────────────────────────────
  if (cfg.pathType === 'top-level' && cfg.isPublic) {
    // Entity pública (shelter): filtra por directory_status
    if (filters.status) {
      constraints.push({
        type: 'where', field: 'directory_status', op: '==', value: filters.status,
      });
    } else if (cfg.filterableFields.directory_status) {
      // Default: só abrigos públicos
      constraints.push({
        type: 'where', field: 'directory_status', op: '==', value: 'public',
      });
    }
  } else {
    // Multi-tenant: shelter_club_id OBRIGATÓRIO
    if (cfg.filterableFields.shelter_club_id?.required) {
      requireShelterId = true;
    }
    if (filters.shelterId) {
      constraints.push({
        type: 'where', field: 'shelter_club_id', op: '==', value: filters.shelterId,
      });
    } else if (requireShelterId) {
      throw new Error(
        `shelterId é obrigatório para entity "${entity}" (multi-tenant).`,
      );
    }
    if (filters.status) {
      constraints.push({
        type: 'where', field: 'status', op: '==', value: filters.status,
      });
    }
  }

  // Filtros específicos por entity
  if (entity === 'pet' && filters.species) {
    constraints.push({
      type: 'where', field: 'species', op: '==', value: filters.species,
    });
  }
  if (entity === 'foster') {
    if (filters.petId) {
      constraints.push({
        type: 'where', field: 'pet_id', op: '==', value: filters.petId,
      });
    }
    if (filters.adopterUid) {
      constraints.push({
        type: 'where', field: 'foster_uid', op: '==', value: filters.adopterUid,
      });
    }
  }

  // dateRange genérico: usa created_at como default
  if (filters.dateRange) {
    constraints.push({
      type: 'where', field: 'created_at', op: '>=', value: `${filters.dateRange.from}T00:00:00.000Z`,
    });
    constraints.push({
      type: 'where', field: 'created_at', op: '<=', value: `${filters.dateRange.to}T23:59:59.999Z`,
    });
  }

  // Prefix match no titleField (usa >= + < para range query no Firestore).
  // NÃO fazemos prefix match se não houver query livre (filtramos só por
  // equality).
  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim();
    const titleField = cfg.titleField;
    if (titleField) {
      // Prefix match: titleField >= q (lower) AND titleField < q+\uf8ff
      constraints.push({
        type: 'where', field: titleField, op: '>=', value: q,
      });
      constraints.push({
        type: 'where', field: titleField, op: '<', value: `${q}\uf8ff`,
      });
    }
  }

  // ─── Order + limit ──────────────────────────────────────────────────
  const orderField = options.orderBy || (cfg.pathType === 'top-level' && cfg.isPublic ? 'name' : 'created_at');
  const orderDir = (options.orderDirection || 'desc').toLowerCase();
  constraints.push({
    type: 'orderBy', field: orderField, direction: orderDir,
  });

  const limitN = options.maxResultsPerEntity
    || SEARCH_LIMITS.DEFAULT_MAX_RESULTS_PER_ENTITY;
  constraints.push({ type: 'limit', value: limitN });

  return {
    collection: collectionPath,
    subcollectionParent,
    constraints,
    requireShelterId,
    isPublic: cfg.isPublic,
  };
}

// ─── Ranking ───────────────────────────────────────────────────────────

/**
 * Calcula o score de um único doc contra o query normalizado.
 * Retorna número entre 0 e 1.
 *
 * Algoritmo:
 *  - exact (titleField === query):              1.00
 *  - prefix (titleField.startsWith(query)):     0.85
 *  - contains (qualquer searchableField inclui): 0.60
 *  - token (qualquer token == query):           0.40
 *  - senão:                                     0
 *
 * Quando há múltiplos hits, fica com o MAIOR. Bonus: +0.05 se o
 * subtitleField também der match.
 */
export function rankResult(doc, query, entityId) {
  if (!doc || !query) return 0;
  const cfg = SEARCH_ENTITIES[entityId];
  if (!cfg) return 0;

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const titleValue = doc[cfg.titleField];
  const titleNorm = normalizeText(titleValue);
  const tokens = tokenize(query);

  let score = 0;

  // exact
  if (titleNorm && titleNorm === normalizedQuery) {
    score = Math.max(score, 1.0);
  }
  // prefix
  if (titleNorm && titleNorm.startsWith(normalizedQuery)) {
    score = Math.max(score, 0.85);
  }
  // contains em searchable fields
  for (const field of cfg.searchableFields) {
    const v = doc[field];
    if (v == null) continue;
    if (matchContains(String(v), query)) {
      score = Math.max(score, 0.6);
      break;
    }
  }
  // token match
  for (const tok of tokens) {
    if (titleNorm === tok) {
      score = Math.max(score, 0.45);
    } else if (titleNorm.startsWith(tok)) {
      score = Math.max(score, 0.4);
    } else {
      for (const field of cfg.searchableFields) {
        const v = doc[field];
        if (v == null) continue;
        if (matchContains(String(v), tok)) {
          score = Math.max(score, 0.35);
          break;
        }
      }
    }
  }

  // Bonus: match em subtitle
  if (cfg.subtitleField) {
    const sub = doc[cfg.subtitleField];
    if (sub != null && matchContains(String(sub), query)) {
      score = Math.min(1, score + 0.05);
    }
  }

  return Math.round(score * 10000) / 10000;
}

/**
 * Gera snippet do campo que deu match. Trunca em SNIPPET_MAX_LEN com
 * elipses. Retorna o campo mais relevante (titleField ou primeiro
 * searchableField com match).
 */
export function buildSnippet(doc, query, entityId) {
  if (!doc) return '';
  const cfg = SEARCH_ENTITIES[entityId];
  if (!cfg) return '';

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return '';

  // Tenta titleField primeiro
  const candidates = [
    cfg.titleField,
    ...cfg.searchableFields,
  ].filter(Boolean);

  for (const field of candidates) {
    const v = doc[field];
    if (v == null) continue;
    const text = String(v);
    const norm = normalizeText(text);
    const idx = norm.indexOf(normalizedQuery);
    if (idx === -1) continue;
    // Encontra o range aproximado no texto original
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + normalizedQuery.length + 80);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = `…${snippet}`;
    if (end < text.length) snippet = `${snippet}…`;
    if (snippet.length > SEARCH_LIMITS.SNIPPET_MAX_LEN) {
      snippet = `${snippet.slice(0, SEARCH_LIMITS.SNIPPET_MAX_LEN)}…`;
    }
    return snippet;
  }
  return '';
}

/**
 * Mapeia um doc cru + entity + query num SearchResult.
 *
 * @param {object} doc dados do Firestore (já com `id`)
 * @param {string} entityId
 * @param {string} query
 * @returns {{
 *   id: string,
 *   entity: string,
 *   title: string,
 *   subtitle: string,
 *   url: string,
 *   score: number,
 *   snippet: string,
 * }}
 */
export function mapDocToResult(doc, entityId, query) {
  const cfg = SEARCH_ENTITIES[entityId];
  const title = String(doc[cfg.titleField] || '(sem título)');
  const subtitle = cfg.subtitleField && doc[cfg.subtitleField] != null
    ? String(doc[cfg.subtitleField])
    : '';
  const url = cfg.urlPattern.replace('{id}', doc.id);
  const score = rankResult(doc, query, entityId);
  const snippet = buildSnippet(doc, query, entityId);
  return {
    id: doc.id,
    entity: entityId,
    title,
    subtitle,
    url,
    score,
    snippet,
  };
}

/**
 * Ordena um array de SearchResults por score DESC. Estável (preserva
 * ordem de entrada como tie-breaker).
 *
 * @param {Array} results
 * @returns {Array}
 */
export function rankResults(results, _query) {
  if (!Array.isArray(results)) return [];
  return [...results]
    .map((r, idx) => ({ r, idx }))
    .sort((a, b) => {
      if (b.r.score !== a.r.score) return b.r.score - a.r.score;
      return a.idx - b.idx;
    })
    .map((x) => x.r);
}

/**
 * Helper: valida `entity` e retorna config. Lança se inválida.
 *
 * @param {string} entity
 * @returns {object} config da entity
 */
export function getSearchableEntity(entity) {
  if (!_entityIdSet.has(entity)) {
    throw new Error(`Entity inválida: ${entity}`);
  }
  return SEARCH_ENTITIES[entity];
}

/**
 * Helper: lista de entities pesquisáveis (para o painel de filtros).
 *
 * @returns {Array<{id: string, label: string, isPublic: boolean}>}
 */
export function getSearchableEntities() {
  return SEARCH_ENTITY_IDS.map((id) => ({
    id,
    label: SEARCH_ENTITIES[id].label,
    isPublic: SEARCH_ENTITIES[id].isPublic,
  }));
}
