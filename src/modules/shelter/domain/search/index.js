/**
 * @fileoverview Barrel exports do domínio Smart Search (Fase 18).
 */

export {
  // Enums
  SEARCH_ENTITIES,
  SEARCH_ENTITY_IDS,
  SEARCH_LIMITS,
  // Schemas
  searchFiltersSchema,
  searchOptionsSchema,
  searchEntitySchema,
  searchResultSchema,
  searchResponseSchema,
  // Helpers de texto
  normalizeText,
  tokenize,
  matchPrefix,
  matchContains,
  // Builders
  buildSearchQuery,
  mapDocToResult,
  rankResult,
  rankResults,
  buildSnippet,
  // Entity lookups
  getSearchableEntity,
  getSearchableEntities,
} from './search';
