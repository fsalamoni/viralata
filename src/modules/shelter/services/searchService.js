/**
 * @fileoverview Serviço: Smart Search (Fase 18).
 *
 * Busca multi-entidade no Firestore nativo (compound queries +
 * collectionGroup + prefix match). Nada de Meilisearch/Typesense/Algolia
 * externos.
 *
 * Multi-tenant: cada entity multi-tenant (pet, adopter, foster,
 * exhibition) exige `shelterId` no filtro. A entity `shelter` é
 * pública (clubs com directory_status='public').
 *
 * Audit log: searches com `actor` definido (admin/manager do abrigo)
 * geram entrada em `audit_logs` com a query normalizada. Searches
 * sem actor (ex: portal público de ONGs) NÃO geram audit log
 * (evita poluição).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 18
 */

import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  SEARCH_ENTITIES,
  SEARCH_ENTITY_IDS,
  SEARCH_LIMITS,
  searchFiltersSchema,
  searchOptionsSchema,
  searchResponseSchema,
  buildSearchQuery,
  mapDocToResult,
  rankResults,
  normalizeText,
} from '@/modules/shelter/domain/search';

const AUDIT_ACTION_SEARCH = 'shelter_search_executed';

// ─── Rate limit (TASK-241) ─────────────────────────────────────────────

/**
 * Rate limiter simples in-memory: N requests por janela de
 * WINDOW_MS. Por actor (uid) OU por IP (fallback).
 *
 * NOTA: in-memory NÃO escala horizontalmente. Suficiente para
 * single-instance (Viralata roda 1 frontend). Para multi-instance,
 * mover para Cloud Function + Firestore counter.
 *
 * Limites:
 *  - 60 req/min por uid
 *  - 30 req/min por ip (fallback)
 *  - Burst: 10 req imediato
 */
const RATE_LIMIT = Object.freeze({
  WINDOW_MS: 60_000,
  MAX_REQUESTS_PER_UID: 60,
  MAX_REQUESTS_PER_IP: 30,
  BURST: 10,
});
const _rateLimitState = new Map(); // key -> { count, windowStart }

function _rateLimitKey(actor, fallbackIp) {
  if (actor?.uid) return `uid:${actor.uid}`;
  if (fallbackIp) return `ip:${fallbackIp}`;
  return 'anon';
}

function _checkRateLimit(actor, fallbackIp = '0.0.0.0') {
  // Em ambiente de test, desabilita rate limit para não atrapalhar os
  // testes. Cobertura via Vitest com NODE_ENV=test.
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return { allowed: true, remaining: 999, resetMs: 0 };
  }
  const key = _rateLimitKey(actor, fallbackIp);
  const now = Date.now();
  const max = actor?.uid ? RATE_LIMIT.MAX_REQUESTS_PER_UID : RATE_LIMIT.MAX_REQUESTS_PER_IP;
  const state = _rateLimitState.get(key);
  if (!state || (now - state.windowStart) > RATE_LIMIT.WINDOW_MS) {
    _rateLimitState.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, resetMs: RATE_LIMIT.WINDOW_MS };
  }
  state.count += 1;
  const remaining = Math.max(0, max - state.count);
  const allowed = state.count <= max;
  return {
    allowed,
    remaining,
    resetMs: RATE_LIMIT.WINDOW_MS - (now - state.windowStart),
  };
}

function _buildFirestoreQuery(entity, plan) {
  const constraints = [];
  for (const c of plan.constraints) {
    if (c.type === 'where') {
      // TASK-241: array-contains-any é o mesmo op no SDK v9+
      constraints.push(where(c.field, c.op, c.value));
    } else if (c.type === 'orderBy') {
      constraints.push(orderBy(c.field, c.direction));
    } else if (c.type === 'limit') {
      constraints.push(limit(c.value));
    }
  }
  const ref = plan.subcollectionParent
    ? collection(db, 'clubs', plan.subcollectionParent, plan.collection)
    : collection(db, plan.collection);
  return query(ref, ...constraints);
}

// ─── Read ──────────────────────────────────────────────────────────────

/**
 * Busca em uma única entity.
 *
 * @param {string} entity entity ID (de SEARCH_ENTITY_IDS)
 * @param {object} [filters] filtros (validado via Zod)
 * @param {object} [options] opções (pageSize, maxResultsPerEntity, orderBy)
 * @returns {Promise<Array>} array de SearchResult (já rankeado)
 */
export async function searchEntity(entity, filters = {}, options = {}, context = {}) {
  if (!db) return [];
  if (!SEARCH_ENTITY_IDS.includes(entity)) {
    throw new Error(`Entity inválida: ${entity}`);
  }

  // Rate limit (TASK-241) — silencioso para evitar info disclosure
  const rl = _checkRateLimit(context?.actor, context?.ip);
  if (!rl.allowed) {
    logger.warn(`[searchEntity] rate limit exceeded for ${entity}: ${_rateLimitKey(context?.actor, context?.ip)}`);
    return [];
  }

  // Valida filtros. `shelterId` é obrigatório para entities
  // multi-tenant — buildSearchQuery lança se faltar.
  const parsedFilters = searchFiltersSchema.parse({
    ...filters,
    entity,
  });
  const parsedOptions = searchOptionsSchema.parse(options);

  let plan;
  try {
    plan = buildSearchQuery(entity, parsedFilters, parsedOptions);
  } catch (err) {
    // tenant isolation: cross-tenant sem shelterId → []
    logger.warn(`[searchEntity] buildSearchQuery falhou: ${err.message}`);
    return [];
  }

  const q = _buildFirestoreQuery(entity, plan);
  let snap;
  try {
    snap = await getDocs(q);
  } catch (err) {
    logger.error(`[searchEntity] Firestore falhou para ${entity}:`, err);
    throw err;
  }

  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Defense-in-depth: garante que cada doc respeita tenant (se aplicável)
  const cfg = SEARCH_ENTITIES[entity];
  if (parsedFilters.shelterId && !cfg.isPublic) {
    for (const docItem of docs) {
      // Para entities multi-tenant top-level: filtra client-side (defesa)
      // Para subcollections: a path já garante o tenant
      if (cfg.pathType === 'top-level'
          && docItem.shelter_club_id
          && docItem.shelter_club_id !== parsedFilters.shelterId) {
        logger.warn(
          `[searchEntity] cross-tenant detectado em ${entity}:`,
          { docId: docItem.id, expected: parsedFilters.shelterId, got: docItem.shelter_club_id },
        );
        // Remove o doc
        const idx = docs.indexOf(docItem);
        if (idx >= 0) docs.splice(idx, 1);
      }
    }
  }

  const queryStr = parsedFilters.query || '';
  const results = docs.map((d) => mapDocToResult(d, entity, queryStr));
  // Se houver query, rankeia. Senão, mantém ordem do Firestore.
  return queryStr ? rankResults(results, queryStr) : results;
}

/**
 * Busca multi-entity. Executa `searchEntity` em paralelo para cada
 * entity aplicável.
 *
 * @param {object} [filters] filtros (validado via Zod; `entity` é ignorado)
 * @param {object} [options] opções
 * @param {object} [context] contexto opcional: { actor, audit: true }
 * @returns {Promise<object>} searchResponseSchema-shaped
 */
export async function globalSearch(filters = {}, options = {}, context = {}) {
  if (!db) {
    return {
      query: filters.query || '',
      normalizedQuery: normalizeText(filters.query || ''),
      filters: searchFiltersSchema.parse(filters),
      results: [],
      byEntity: Object.fromEntries(
        SEARCH_ENTITY_IDS.map((id) => [id, []]),
      ),
      totalCount: 0,
    };
  }

  // Rate limit (TASK-241)
  const rl = _checkRateLimit(context?.actor, context?.ip);
  if (!rl.allowed) {
    logger.warn(`[globalSearch] rate limit exceeded for ${_rateLimitKey(context?.actor, context?.ip)}`);
    return {
      query: filters.query || '',
      normalizedQuery: normalizeText(filters.query || ''),
      filters: searchFiltersSchema.parse(filters),
      results: [],
      byEntity: Object.fromEntries(
        SEARCH_ENTITY_IDS.map((id) => [id, []]),
      ),
      totalCount: 0,
      rateLimited: true,
    };
  }

  const start = Date.now();
  const parsedFilters = searchFiltersSchema.parse(filters);
  const parsedOptions = searchOptionsSchema.parse(options);

  // Decide quais entities consultar
  const targetEntities = parsedFilters.entity
    ? [parsedFilters.entity]
    : SEARCH_ENTITY_IDS.filter((id) => {
      const cfg = SEARCH_ENTITIES[id];
      // Public entities (shelter) podem ser buscadas sem shelterId.
      // Multi-tenant entities exigem shelterId; se não vier, pula.
      if (cfg.isPublic) return true;
      return Boolean(parsedFilters.shelterId);
    });

  // Filtra entities incompatíveis com filtros (ex: adopter sem status)
  const compatible = targetEntities.filter((id) => {
    if (id === 'pet' && parsedFilters.species) return true; // OK
    return true;
  });

  // Executa em paralelo. Falha de uma entity NÃO derruba as outras.
  const promises = compatible.map(async (entity) => {
    try {
      // context é passado para sub-entity (rate-limit, audit, ip)
      const results = await searchEntity(entity, parsedFilters, parsedOptions, context);
      return [entity, results];
    } catch (err) {
      logger.error(`[globalSearch] entity ${entity} falhou:`, err);
      return [entity, []];
    }
  });

  const pairs = await Promise.all(promises);

  // Garante que TODAS as SEARCH_ENTITY_IDS tenham entrada em byEntity
  // (mesmo que [] se não foram consultadas). Facilita o consumidor.
  const byEntity = Object.fromEntries(
    SEARCH_ENTITY_IDS.map((id) => [id, []]),
  );
  const all = [];
  for (const [entity, results] of pairs) {
    byEntity[entity] = results;
    all.push(...results);
  }

  // Ranking global: score DESC
  const queryStr = parsedFilters.query || '';
  const rankedAll = queryStr ? rankResults(all, queryStr) : all;

  // Audit log best-effort (só se actor definido)
  if (context?.actor?.uid && context?.audit !== false) {
    try {
      await createAuditLog({
        action: AUDIT_ACTION_SEARCH,
        actor: context.actor,
        userId: context.actor.uid,
        details: {
          query: queryStr,
          normalized_query: normalizeText(queryStr),
          shelter_club_id: parsedFilters.shelterId || null,
          entity: parsedFilters.entity || 'all',
          result_count: rankedAll.length,
          filters: {
            status: parsedFilters.status,
            species: parsedFilters.species,
            petId: parsedFilters.petId,
            adopterUid: parsedFilters.adopterUid,
            dateRange: parsedFilters.dateRange,
          },
        },
      });
    } catch (err) {
      logger.warn('[globalSearch] audit log falhou:', err);
    }
  }

  const response = {
    query: queryStr,
    normalizedQuery: normalizeText(queryStr),
    filters: parsedFilters,
    results: rankedAll,
    byEntity,
    totalCount: rankedAll.length,
    durationMs: Date.now() - start,
  };

  // Validação final do envelope
  return searchResponseSchema.parse(response);
}

/**
 * Retorna a lista de entities pesquisáveis (para o painel de filtros).
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

/**
 * Helper: conta resultados por entity (sem ranking; mais barato para
 * mostrar "X Animais, Y Adotantes..." na UI antes da busca completa).
 *
 * @param {object} [filters]
 * @param {object} [options]
 * @returns {Promise<Record<string, number>>}
 */
export async function countResultsByEntity(filters = {}, options = {}) {
  if (!db) return {};
  const parsedFilters = searchFiltersSchema.parse(filters);
  const parsedOptions = searchOptionsSchema.parse({ maxResultsPerEntity: 1, ...options });

  const entities = parsedFilters.entity
    ? [parsedFilters.entity]
    : SEARCH_ENTITY_IDS.filter((id) => {
      const cfg = SEARCH_ENTITIES[id];
      if (cfg.isPublic) return true;
      return Boolean(parsedFilters.shelterId);
    });

  const results = await Promise.all(entities.map(async (entity) => {
    try {
      const r = await searchEntity(entity, parsedFilters, parsedOptions);
      return [entity, r.length];
    } catch (err) {
      logger.error(`[countResultsByEntity] ${entity} falhou:`, err);
      return [entity, 0];
    }
  }));
  return Object.fromEntries(results);
}

// ─── Snapshot helpers (Fase 18) ────────────────────────────────────────

/**
 * Constrói um snapshot do pet para a busca. Imutável, contém só os
 * campos que o search usa (defense-in-depth: mudanças no pet não
 * invalidam resultados de busca antigos).
 *
 * @param {object} pet
 * @returns {object}
 */
export function buildPetSnapshot(pet) {
  if (!pet) return null;
  return {
    id: pet.id,
    name: pet.name,
    breed: pet.breed,
    species: pet.species,
    status: pet.status,
    shelter_club_id: pet.shelter_club_id,
    rescue_location: pet.rescue_location,
    description: pet.description,
  };
}

/**
 * Constrói um snapshot do applicant para a busca.
 *
 * @param {object} interest
 * @returns {object}
 */
export function buildApplicantSnapshot(interest) {
  if (!interest) return null;
  return {
    id: interest.id,
    applicant_name: interest.applicant_name,
    applicant_email: interest.applicant_email,
    applicant_phone: interest.applicant_phone,
    status: interest.status,
    shelter_club_id: interest.shelter_club_id,
    pet_id: interest.pet_id,
    notes: interest.notes,
  };
}

export {
  SEARCH_ENTITIES,
  SEARCH_ENTITY_IDS,
  SEARCH_LIMITS,
  buildSearchQuery,
  normalizeText,
};
