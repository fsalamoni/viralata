/**
 * @fileoverview Domínio: Smart Search — Fuzzy matching (TASK-018).
 *
 * Implementa busca fuzzy client-side via Levenshtein distance. Como o
 * Firestore nativo (decisão TASK-001) não tem typo-tolerance nativa,
 * compensamos com busca local em subset paginado (200 docs) e
 * debounce de 300ms.
 *
 * Estratégia:
 *  1. Servidor retorna subset paginado (200 docs) por entity+filter
 *  2. Cliente normaliza query + candidates
 *  3. Aplica `fuzzyMatch` com threshold (default: 0.4 = aceita typos leves)
 *  4. Rankeia por score (mix: Levenshtein + token match + prefix)
 *
 * Limit:
 *  - O(2^n) na distância de Levenshtein — bounded por max distance
 *  - Cache de 200 docs é OK em browser; limpa após 5min idle
 *
 * @see TASK-018
 * @see TASK-001 (decisão: Firestore nativo)
 */

import { normalizeText, tokenize } from './search';

// ─── Levenshtein distance ──────────────────────────────────────────────

/**
 * Limita a distância máxima (evita O(n²) para inputs muito diferentes).
 * Acima deste valor, retorna `max` (não vale a pena continuar).
 */
const MAX_LEVENSHTEIN_DISTANCE = 4;

/**
 * Calcula a distância de Levenshtein entre duas strings normalizadas.
 * Bounded por `MAX_LEVENSHTEIN_DISTANCE` (early return).
 *
 * Algoritmo: Wagner-Fischer com 2 linhas (O(min(a,b)) memória).
 *
 * @param {string} a (já normalizado: lowercase + sem acento)
 * @param {string} b (já normalizado)
 * @returns {number} distância de edição, 0 se idênticas
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  // Garante que a é a menor (otimização de memória)
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const aLen = a.length;
  const bLen = b.length;

  // Se a diferença de tamanho é maior que max, retorna max direto
  if (bLen - aLen > MAX_LEVENSHTEIN_DISTANCE) {
    return MAX_LEVENSHTEIN_DISTANCE;
  }

  // 2 linhas: previous e current
  const prev = new Array(aLen + 1);
  const curr = new Array(aLen + 1);
  for (let i = 0; i <= aLen; i += 1) prev[i] = i;

  for (let j = 1; j <= bLen; j += 1) {
    curr[0] = j;
    let rowMin = j;
    for (let i = 1; i <= aLen; i += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,      // insertion
        prev[i] + 1,          // deletion
        prev[i - 1] + cost,   // substitution
      );
      if (curr[i] < rowMin) rowMin = curr[i];
    }
    // Early return: se rowMin > max, distância final > max
    if (rowMin > MAX_LEVENSHTEIN_DISTANCE) {
      return MAX_LEVENSHTEIN_DISTANCE;
    }
    // Swap rows
    for (let i = 0; i <= aLen; i += 1) prev[i] = curr[i];
  }
  return prev[aLen];
}

// ─── Fuzzy matching ────────────────────────────────────────────────────

/**
 * Calcula score de similaridade entre `query` e `candidate` (ambos
 * normalizados). Retorna 0-1.
 *
 * Estratégia combinada:
 *  - exact match (==):                   1.0
 *  - prefix match (startsWith):         0.95
 *  - contains:                           0.85
 *  - token match:                        0.70
 *  - Levenshtein (≤max):                 1 - dist/maxLen
 *
 * O maior score vence.
 *
 * @param {string} queryNormalized
 * @param {string} candidateNormalized
 * @param {number} [threshold=0.5] score mínimo para considerar match
 * @returns {number} 0-1
 */
export function fuzzyScore(query, candidate, threshold = 0.5) {
  // Normaliza internamente para case + accent insensitive
  const queryNormalized = normalizeText(query);
  const candidateNormalized = normalizeText(candidate);
  if (!queryNormalized || !candidateNormalized) return 0;
  if (queryNormalized === candidateNormalized) return 1.0;
  if (candidateNormalized.startsWith(queryNormalized)) return 0.95;
  if (candidateNormalized.includes(queryNormalized)) return 0.85;

  // Token match: cada token da query é comparado com cada token do candidate
  const queryTokens = tokenize(queryNormalized);
  const candidateTokens = tokenize(candidateNormalized);
  let bestTokenScore = 0;
  for (const qt of queryTokens) {
    for (const ct of candidateTokens) {
      if (qt === ct) {
        bestTokenScore = Math.max(bestTokenScore, 0.7);
      } else if (ct.startsWith(qt) || qt.startsWith(ct)) {
        bestTokenScore = Math.max(bestTokenScore, 0.65);
      } else {
        const dist = levenshtein(qt, ct);
        const maxLen = Math.max(qt.length, ct.length);
        if (dist > 0 && dist <= MAX_LEVENSHTEIN_DISTANCE) {
          const sim = 1 - dist / maxLen;
          bestTokenScore = Math.max(bestTokenScore, sim * 0.55);
        }
      }
    }
  }
  if (bestTokenScore >= threshold) return bestTokenScore;

  // Whole-string Levenshtein como fallback
  const dist = levenshtein(queryNormalized, candidateNormalized);
  const maxLen = Math.max(queryNormalized.length, candidateNormalized.length);
  if (dist === 0 || dist > MAX_LEVENSHTEIN_DISTANCE) return bestTokenScore;
  const sim = 1 - dist / maxLen;
  return Math.max(bestTokenScore, sim);
}

/**
 * Aplica fuzzy match a um array de candidates. Retorna os matches com
 * score ≥ threshold, ordenados por score DESC.
 *
 * Cada candidate pode ser:
 *  - string: match contra a string inteira
 *  - { field, ... }: match contra `field` específico (outros campos
 *    preservados no output)
 *  - { fields: [string, ...] }: match contra qualquer um (usa maior score)
 *
 * @param {string} query
 * @param {Array} candidates
 * @param {object} [options] { threshold, maxResults, keys }
 * @returns {Array<{item: any, score: number, field: string}>}
 */
export function fuzzyMatch(query, candidates, options = {}) {
  const {
    threshold = 0.5,
    maxResults = 50,
    keys = null,  // null = candidate é string; array = match em vários campos
  } = options;

  if (!query || !candidates || candidates.length === 0) return [];

  const queryNorm = normalizeText(query);
  if (!queryNorm) return [];

  // Whitelist de keys permitidas (defesa contra prototype pollution)
  const safeKeys = Array.isArray(keys)
    ? keys.filter((k) => typeof k === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k))
    : null;

  const results = [];
  for (const item of candidates) {
    let bestScore = 0;
    let bestField = null;

    if (typeof item === 'string') {
      bestScore = fuzzyScore(queryNorm, normalizeText(item), threshold);
      bestField = null;
    } else if (safeKeys) {
      // Match em vários campos (Fuse.js-like)
      for (const key of safeKeys) {
        const v = item[key];
        if (v == null) continue;
        const score = fuzzyScore(queryNorm, normalizeText(String(v)), threshold);
        if (score > bestScore) {
          bestScore = score;
          bestField = key;
        }
      }
    } else if (item.field != null) {
      bestScore = fuzzyScore(queryNorm, String(item.field), threshold);
      bestField = null;
    } else if (Array.isArray(item.fields)) {
      for (const v of item.fields) {
        if (v == null) continue;
        const score = fuzzyScore(queryNorm, normalizeText(String(v)), threshold);
        if (score > bestScore) bestScore = score;
      }
    }

    if (bestScore >= threshold) {
      results.push({ item, score: bestScore, field: bestField });
    }
  }

  // Sort: score DESC, estável
  return results
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return 0;
    })
    .slice(0, maxResults);
}

/**
 * Helper: verifica se uma string é "fuzzy match" de outra.
 * Convenience wrapper.
 *
 * @param {string} query
 * @param {string} candidate
 * @param {number} [threshold=0.5]
 * @returns {boolean}
 */
export function isFuzzyMatch(query, candidate, threshold = 0.5) {
  return fuzzyScore(query, candidate, threshold) >= threshold;
}

// ─── Configuração ──────────────────────────────────────────────────────

/**
 * Defaults fuzzy match.
 */
export const FUZZY_DEFAULTS = Object.freeze({
  THRESHOLD: 0.5,
  MAX_RESULTS: 50,
  MAX_DISTANCE: MAX_LEVENSHTEIN_DISTANCE,
  DEBOUNCE_MS: 300,
  SUBSET_SIZE: 200,  // quantos docs buscar do Firestore
});
