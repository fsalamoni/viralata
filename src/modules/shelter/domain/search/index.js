/**
 * @fileoverview Barrel exports do domínio Smart Search (Fase 18) +
 * Fuzzy matching (TASK-018) + Volunteer entity (TASK-241).
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
  buildSearchKeywords,
  matchPrefix,
  matchContains,
  // Builders
  buildSearchQuery,
  buildSearchIndexQuery,
  mapDocToResult,
  rankResult,
  rankResults,
  buildSnippet,
  // Entity lookups
  getSearchableEntity,
  getSearchableEntities,
  // LGPD (TASK-241)
  sanitizePii,
} from './search';

export {
  // Fuzzy matching (TASK-018)
  levenshtein,
  fuzzyScore,
  fuzzyMatch,
  isFuzzyMatch,
  FUZZY_DEFAULTS,
} from './fuzzy';
