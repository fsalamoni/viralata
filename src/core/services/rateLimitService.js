/**
 * @fileoverview rateLimitService — throttling client-side para mutations
 * sensíveis (TASK-299).
 *
 * **Por que client-side?** Firestore rules não têm counter de tempo
 * embutido (request.time é read-only, não pode escrever counter). Para
 * rate limit real, a opção é:
 *  - **Cloud Function** (checa counter collection, delega) — overkill
 *  - **Firestore rules custom** com exists() em counters — complexo
 *  - **Client-side** (este service) — defesa em primeira linha
 *
 * **Limitação**: um attacker motivado pode bypassar (modificar DevTools).
 * O rate limit aqui é UX guard + barreira contra bots simples. Para
 * segurança real, ver TASK-239 (Sentry + Crashlytics monitoring).
 *
 * **Como funciona**:
 *  - Sliding window em memória: Map<key, Array<timestamp>>
 *  - Ao chamar `check()`, limpa timestamps > windowMs atrás
 *  - Se len < max, registra novo timestamp e retorna {allowed: true}
 *  - Senão retorna {allowed: false, retryInMs}
 *
 * **Persistência**: a cada X mutations, salva snapshot em localStorage
 * (anti-reload attack). Ao montar, carrega de volta.
 *
 * **Onde usar**:
 *  - submitAdoptionApplication (5/min/user)
 *  - decideApplication (10/min/shelter_admin)
 *  - updatePet (30/min/user)
 *  - createPost, addComment (rate limit específico do forum)
 *  - LGPD export/delete (3/hora)
 */
import { logger } from '@/core/lib/logger';

const STORAGE_KEY = 'viralata.rateLimit.v1';
const PERSIST_EVERY = 10; // save a cada 10 mutations

/** Limites pré-definidos. */
export const RATE_LIMITS = Object.freeze({
  adoption_application: { max: 5, windowMs: 60_000, label: 'Adoção (5/min)' },
  decide_application: { max: 10, windowMs: 60_000, label: 'Decidir application (10/min)' },
  pet_update: { max: 30, windowMs: 60_000, label: 'Atualizar pet (30/min)' },
  post_create: { max: 10, windowMs: 60_000, label: 'Criar post (10/min)' },
  comment_create: { max: 20, windowMs: 60_000, label: 'Comentar (20/min)' },
  lgpd_export: { max: 3, windowMs: 3_600_000, label: 'Exportar dados (3/h)' },
  lgpd_delete: { max: 3, windowMs: 3_600_000, label: 'Deletar conta (3/h)' },
});

// Sliding window in-memory store.
const _store = new Map();
let _mutationCount = 0;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return;
    for (const [key, timestamps] of Object.entries(data)) {
      if (Array.isArray(timestamps)) {
        _store.set(key, timestamps.filter((t) => typeof t === 'number'));
      }
    }
    logger.info('[rateLimit] loaded from storage', { keys: _store.size });
  } catch (err) {
    logger.warn('[rateLimit] failed to load from storage', { err: String(err) });
  }
}

function persistToStorage() {
  try {
    const obj = {};
    for (const [key, timestamps] of _store.entries()) {
      obj[key] = timestamps;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    // localStorage cheio ou não disponível — silencioso
  }
}

function pruneOld(key, windowMs) {
  const arr = _store.get(key);
  if (!arr) return;
  const cutoff = Date.now() - windowMs;
  while (arr.length > 0 && arr[0] < cutoff) {
    arr.shift();
  }
  if (arr.length === 0) _store.delete(key);
}

/**
 * Verifica se uma mutation pode ser executada.
 *
 * @param {string} key — identificador único (ex: "adoption_application:user-123")
 * @param {number} max — máximo de mutations no windowMs
 * @param {number} windowMs — janela em ms
 * @returns {{allowed: boolean, remaining: number, retryInMs: number, limit: {max, windowMs, label}}}
 */
export function check(key, max, windowMs) {
  pruneOld(key, windowMs);
  const arr = _store.get(key) || [];
  const allowed = arr.length < max;
  const remaining = Math.max(0, max - arr.length);
  if (allowed) {
    arr.push(Date.now());
    _store.set(key, arr);
    _mutationCount++;
    if (_mutationCount % PERSIST_EVERY === 0) persistToStorage();
  }
  // retryInMs = (oldest timestamp + window) - now
  const oldest = arr[0] || Date.now();
  const retryInMs = Math.max(0, (oldest + windowMs) - Date.now());
  return {
    allowed,
    remaining,
    retryInMs,
    limit: { max, windowMs, label: `${max} em ${Math.round(windowMs / 1000)}s` },
  };
}

/**
 * Helper que usa RATE_LIMITS pré-definidos.
 * @param {string} actionKey — ex: "adoption_application"
 * @param {string} scope — ex: userId, clubId
 */
export function checkRate(actionKey, scope = 'global') {
  const limit = RATE_LIMITS[actionKey];
  if (!limit) {
    // Sem limite conhecido = allow
    return { allowed: true, remaining: Infinity, retryInMs: 0, limit: null };
  }
  return check(`${actionKey}:${scope}`, limit.max, limit.windowMs);
}

/**
 * Resetar contador (admin only).
 */
export function reset(key) {
  _store.delete(key);
  persistToStorage();
}

/**
 * Resetar tudo (logout).
 */
export function resetAll() {
  _store.clear();
  persistToStorage();
}

/**
 * Inspecionar estado (debug).
 */
export function inspect(key) {
  const arr = _store.get(key) || [];
  return {
    key,
    count: arr.length,
    oldest: arr[0] || null,
    newest: arr[arr.length - 1] || null,
  };
}

// Auto-load on import (browser only)
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  loadFromStorage();
}

/**
 * Formata retryInMs em texto amigável.
 */
export function formatRetryIn(retryInMs) {
  if (retryInMs < 1000) return 'em instantes';
  if (retryInMs < 60_000) return `em ${Math.ceil(retryInMs / 1000)}s`;
  return `em ${Math.ceil(retryInMs / 60_000)}min`;
}
