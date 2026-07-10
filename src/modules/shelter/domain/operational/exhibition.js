/**
 * @fileoverview Domínio: Vitrines / Eventos (Fase 11).
 *
 * Define o ciclo de vida de uma Vitrine (evento de exposição onde
 * abrigos levam animais para adoção). Multi-tenant: cada evento
 * pertence a um abrigo organizador (`organizer_shelter_id`, redundante
 * com a path do Firestore para defense-in-depth).
 *
 * Suporta coalizão entre múltiplos abrigos (campo `co_organizers`) e
 * pets de outros abrigos (campo `external_pets`). Após o evento, o
 * abrigo registra o destino de cada animal em `post_event_log`.
 *
 * State machine:
 *   planned → active → done   (ciclo principal)
 *   planned | active → cancelled  (terminal alternativo)
 *   done é terminal (não pode cancelar)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 10 (numeração do doc)
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.3 — Vitrines / Eventos
 */

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────

/** Status do evento. */
export const EXHIBITION_STATUS = Object.freeze([
  'planned',     // evento criado, ainda não aconteceu
  'active',      // evento acontecendo (no dia)
  'done',        // evento encerrado, outcomes registrados
  'cancelled',   // cancelado antes/depois de acontecer
]);

/** Status terminais (não podem transicionar para mais nada). */
const TERMINAL_STATUSES = Object.freeze(['done', 'cancelled']);

/** Transições válidas. */
const VALID_TRANSITIONS = Object.freeze({
  planned: ['active', 'cancelled'],
  active: ['done', 'cancelled'],
  done: [],
  cancelled: [],
});

/** Destino do animal após o evento. */
export const EXHIBITION_OUTCOMES = Object.freeze([
  'returned',  // voltou ao abrigo
  'adopted',   // foi adotado
  'foster',    // foi para lar temporário
  'other',     // outro (especificar em notes)
]);

// ─── Sub-schemas ─────────────────────────────────────────────────────

/** Sub-schema de localização do evento. */
const exhibitionLocationSchema = z.object({
  address: z.string().min(3).max(300),
  city: z.string().min(2).max(120),
  state: z.string().length(2).regex(/^[A-Z]{2}$/),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  place_id: z.string().max(200).optional().nullable(),
}).strict();

/** Sub-schema de pet externo (coalizão entre abrigos). */
const externalPetSchema = z.object({
  owner_uid: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  shelter_id: z.string().min(1).max(128),
}).strict();

/** Sub-schema de outcome pós-evento. */
const postEventLogEntrySchema = z.object({
  pet_id: z.string().min(1).max(128),
  outcome: z.enum(EXHIBITION_OUTCOMES),
  adopter_uid: z.string().min(1).max(128).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
}).strict();

// ─── Schemas principais ─────────────────────────────────────────────

/**
 * Schema do doc de exposição (coleção `exhibitions/{exhibitionId}`).
 * `organizer_shelter_id` é IMUTÁVEL após criação (defense-in-depth).
 */
export const exhibitionSchema = z.object({
  title: z.string().min(3).max(200),
  organizer_shelter_id: z.string().min(1).max(128),
  co_organizers: z.array(z.string().min(1).max(128)).max(20).optional(),
  location: exhibitionLocationSchema,
  date: z.unknown(), // Timestamp (aceito no service via conversão)
  time_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM esperado'),
  time_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM esperado'),
  status: z.enum(EXHIBITION_STATUS).default('planned'),
  responsible_uids: z.array(z.string().min(1).max(128)).min(1, 'Pelo menos 1 responsável'),
  animals: z.array(z.string().min(1).max(128)).max(100).optional(),
  external_pets: z.array(externalPetSchema).max(50).optional(),
  post_event_log: z.array(postEventLogEntrySchema).optional(),
  notes: z.string().max(2000).optional().nullable(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
  created_by: z.string().min(1).max(128).optional(),
}).strict();

/**
 * Schema para criar uma nova vitrine.
 * `organizer_shelter_id` é obrigatório e IMUTÁVEL.
 */
export const createExhibitionSchema = z.object({
  title: z.string().min(3).max(200),
  organizer_shelter_id: z.string().min(1).max(128),
  co_organizers: z.array(z.string().min(1).max(128)).max(20).optional(),
  location: exhibitionLocationSchema,
  date: z.unknown(),
  time_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM esperado'),
  time_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM esperado'),
  responsible_uids: z.array(z.string().min(1).max(128)).min(1, 'Pelo menos 1 responsável'),
  animals: z.array(z.string().min(1).max(128)).max(100).optional(),
  external_pets: z.array(externalPetSchema).max(50).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * Schema para atualizar campos editáveis de uma vitrine.
 * NÃO permite trocar `organizer_shelter_id` (imutável).
 * Transições de status devem ser feitas via `activateExhibition`/
 * `completeExhibition`/`cancelExhibition` no service.
 */
export const updateExhibitionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  co_organizers: z.array(z.string().min(1).max(128)).max(20).optional(),
  location: exhibitionLocationSchema.optional(),
  date: z.unknown().optional(),
  time_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM esperado').optional(),
  time_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM esperado').optional(),
  responsible_uids: z.array(z.string().min(1).max(128)).min(1).optional(),
  animals: z.array(z.string().min(1).max(128)).max(100).optional(),
  external_pets: z.array(externalPetSchema).max(50).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/** Schema para outcome individual (adicionar a `post_event_log`). */
export const addOutcomeSchema = z.object({
  pet_id: z.string().min(1).max(128),
  outcome: z.enum(EXHIBITION_OUTCOMES),
  adopter_uid: z.string().min(1).max(128).optional(),
  notes: z.string().max(1000).optional(),
}).strict();

/** Schema para cancelar uma vitrine. */
export const cancelExhibitionSchema = z.object({
  reason: z.string().max(1000).optional(),
}).strict();

// ─── Helpers ────────────────────────────────────────────────────────

/** Labels pt-BR para status. */
export const EXHIBITION_STATUS_LABELS = Object.freeze({
  planned: 'Planejado',
  active: 'Em andamento',
  done: 'Encerrado',
  cancelled: 'Cancelado',
});

/** Labels pt-BR para outcomes. */
export const EXHIBITION_OUTCOME_LABELS = Object.freeze({
  returned: 'Voltou ao abrigo',
  adopted: 'Adotado',
  foster: 'Lar temporário',
  other: 'Outro',
});

/** Verifica se a transição `from → to` é válida. */
export function assertValidExhibitionTransition(from, to) {
  if (!EXHIBITION_STATUS.includes(from)) {
    throw new Error(`Status inválido: ${from}`);
  }
  if (!EXHIBITION_STATUS.includes(to)) {
    throw new Error(`Status inválido: ${to}`);
  }
  if (TERMINAL_STATUSES.includes(from)) {
    throw new Error(`Vitrine em status terminal (${from}). Transição bloqueada.`);
  }
  const allowed = VALID_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Transição inválida: ${from} → ${to}. Permitidas a partir de ${from}: [${allowed.join(', ') || 'nenhuma'}]`,
    );
  }
}

/** Verifica se o status é terminal. */
export function isTerminalExhibitionStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

/** Helper: extrai Date do campo `date` (Timestamp | Date | string ISO). */
function _toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  return null;
}

/**
 * Verifica se a vitrine é "futura" (ainda vai acontecer).
 * Considera a data+horário de início.
 */
export function exhibitionIsUpcoming(date, timeStart, now = new Date()) {
  const d = _toDate(date);
  if (!d) return false;
  if (timeStart) {
    const [h, m] = timeStart.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d > now;
}

/**
 * Verifica se a vitrine é "passada" (já aconteceu).
 */
export function exhibitionIsPast(date, timeEnd, now = new Date()) {
  const d = _toDate(date);
  if (!d) return false;
  if (timeEnd) {
    const [h, m] = timeEnd.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  }
  return d < now;
}

/**
 * Formata o horário da vitrine para exibição (ex: "Sáb 12/07 · 14:00–18:00").
 * @param {*} date - Date / Timestamp / ISO string
 * @param {string} timeStart - HH:MM
 * @param {string} timeEnd - HH:MM
 * @param {string} [locale='pt-BR']
 */
export function formatExhibitionSchedule(date, timeStart, timeEnd, locale = 'pt-BR') {
  const d = _toDate(date);
  if (!d) return '—';
  const dayMonth = d.toLocaleDateString(locale, {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });
  if (timeStart && timeEnd) {
    return `${dayMonth} · ${timeStart}–${timeEnd}`;
  }
  if (timeStart) {
    return `${dayMonth} · ${timeStart}`;
  }
  return dayMonth;
}

/**
 * Conta animais do abrigo + pets externos (total levado ao evento).
 */
export function exhibitionTotalAnimals(exhibition) {
  const a = Array.isArray(exhibition?.animals) ? exhibition.animals.length : 0;
  const e = Array.isArray(exhibition?.external_pets) ? exhibition.external_pets.length : 0;
  return a + e;
}
