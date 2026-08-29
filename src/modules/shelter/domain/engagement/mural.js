/**
 * Domínio do Mural V2 do abrigo (ROADMAP · Fase 4 · SHELTER_MURAL_V2).
 *
 * Camada PURA (sem Firestore): enums de estado/moderação, limites e
 * normalizadores de entrada. Estende — de forma ADITIVA — o normalizador de
 * post da organização (`normalizePostInput`) com os campos avançados do mural:
 * `status` (rascunho/agendado/publicado/arquivado), `scheduled_for`, `pinned`,
 * `tags` e `mentions`. Nenhum campo existente é alterado: quando a flag está
 * OFF, este código não roda e o mural atual permanece idêntico.
 *
 * Todos os campos são gravados no MESMO documento `club_posts` (aditivos),
 * conforme o roadmap. Posts legados (sem `status`) são tratados como
 * `published` para preservar o comportamento atual.
 */

import { normalizePostInput } from '@/modules/organizations/domain/validators';

/** Estado de publicação de um post do mural. */
export const POST_STATUS = Object.freeze({
  DRAFT: 'draft', // rascunho — só o abrigo vê, nunca público
  SCHEDULED: 'scheduled', // agendado — publica quando `scheduled_for` chega
  PUBLISHED: 'published', // publicado — visível ao público
  ARCHIVED: 'archived', // arquivado — recolhido do público, mantido no histórico
});

export const POST_STATUS_LABELS = Object.freeze({
  [POST_STATUS.DRAFT]: 'Rascunho',
  [POST_STATUS.SCHEDULED]: 'Agendado',
  [POST_STATUS.PUBLISHED]: 'Publicado',
  [POST_STATUS.ARCHIVED]: 'Arquivado',
});

const VALID_STATUSES = Object.freeze(Object.values(POST_STATUS));

/** Limites do composer avançado. */
export const MURAL_LIMITS = Object.freeze({
  TAGS_MAX: 8,
  TAG_MAX_LEN: 24,
  MENTIONS_MAX: 20,
  MENTION_NAME_MAX: 120,
});

/** true se `value` é um POST_STATUS conhecido. */
export function isValidPostStatus(value) {
  return VALID_STATUSES.includes(value);
}

/**
 * Normaliza uma lista de tags. Aceita array ou string separada por vírgula.
 * Cada tag: trim, minúsculas, sem `#`, deduplicada, limitada em tamanho e
 * quantidade. Retorna sempre um array (possivelmente vazio).
 */
export function normalizeTagList(raw) {
  let parts = [];
  if (Array.isArray(raw)) {
    parts = raw;
  } else if (typeof raw === 'string') {
    parts = raw.split(',');
  }
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const tag = String(part ?? '')
      .trim()
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .slice(0, MURAL_LIMITS.TAG_MAX_LEN)
      .trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MURAL_LIMITS.TAGS_MAX) break;
  }
  return out;
}

/**
 * Normaliza menções. Aceita array de `{ uid, name }` (ou strings). Deduplica
 * por `uid` (quando presente) ou por `name`. Retorna array `{ uid, name }`.
 */
export function normalizeMentions(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    let uid = '';
    let name = '';
    if (item && typeof item === 'object') {
      uid = String(item.uid ?? '').trim();
      name = String(item.name ?? item.label ?? '').trim();
    } else if (typeof item === 'string') {
      name = item.trim();
    }
    name = name.slice(0, MURAL_LIMITS.MENTION_NAME_MAX);
    const key = uid || name.toLowerCase();
    if (!key || seen.has(key)) continue;
    if (!uid && !name) continue;
    seen.add(key);
    out.push({ uid, name });
    if (out.length >= MURAL_LIMITS.MENTIONS_MAX) break;
  }
  return out;
}

/**
 * Converte uma entrada de agendamento (`scheduled_for`) para epoch ms ou null.
 * Aceita number (ms), string ISO/datetime-local ou Date.
 */
export function parseScheduledFor(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Normaliza a entrada COMPLETA de um post do mural V2. Reaproveita
 * `normalizePostInput` (título/conteúdo/anexos/interação) e acrescenta os
 * campos avançados. Resolve o `status` efetivo de forma coerente:
 *  - Se vier `scheduled_for` no futuro e status !== draft → `scheduled`.
 *  - Se `status` inválido → `published`.
 *
 * Retorna também `hasContent` (herdado) para a UI validar antes de enviar.
 */
export function normalizeMuralPostInput(input = {}, now = Date.now()) {
  const base = normalizePostInput(input);

  const tags = normalizeTagList(input.tags);
  const mentions = normalizeMentions(input.mentions);
  const pinned = input.pinned === true;

  let status = isValidPostStatus(input.status) ? input.status : POST_STATUS.PUBLISHED;
  const scheduledFor = parseScheduledFor(input.scheduled_for);

  // Coerência: um rascunho nunca vira agendado/publicado automaticamente.
  if (status !== POST_STATUS.DRAFT) {
    if (scheduledFor && scheduledFor > now) {
      status = POST_STATUS.SCHEDULED;
    } else if (status === POST_STATUS.SCHEDULED) {
      // Agendado sem data futura = publica imediatamente.
      status = POST_STATUS.PUBLISHED;
    }
  }

  return {
    ...base,
    tags,
    mentions,
    pinned,
    status,
    // Só persiste `scheduled_for` quando o post está de fato agendado.
    scheduled_for: status === POST_STATUS.SCHEDULED ? scheduledFor : null,
  };
}
