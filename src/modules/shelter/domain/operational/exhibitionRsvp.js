/**
 * @fileoverview Domínio: RSVP / Escalas de Vitrines (Fase 12).
 *
 * Subcoleções em `clubs/{clubId}/exhibitions/{exhibitionId}/`:
 *  - `invites/{inviteId}` — convocação individual de voluntário
 *  - `shifts/{shiftId}`   — turno/função do evento (escala)
 *
 * Multi-tenant: cada doc carrega `shelter_club_id` E `exhibition_id`
 * (redundantes com a path — defense-in-depth no service e nas rules).
 *
 * Transições de status do RSVP (voluntário pode mudar de ideia até o
 * dia do evento — não há estado terminal):
 *
 *   pending  → yes | no | maybe
 *   yes      → no | maybe
 *   no       → yes | maybe
 *   maybe    → yes | no
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (RSVP / Escalas)
 */

import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────────────

/** Status do convite individual (RSVP do voluntário). */
export const RSVP_STATUS = Object.freeze([
  'pending',  // ainda não respondeu
  'yes',      // confirmou
  'no',       // recusou
  'maybe',    // talvez
]);

/** Roles pré-definidos para um shift (escala). */
export const SHIFT_ROLE = Object.freeze([
  'carregamento',      // carregar/transportar caixas
  'transporte_ida',    // dirigir na ida
  'transporte_volta',  // dirigir na volta
  'cuidador',          // cuidar dos animais no local
  'recepcao',          // recepção / triagem de visitantes
  'outro',
]);

// ─── Schemas (helpers internos) ────────────────────────────────────────

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const availabilitySchema = z.object({
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
}).strict();

/** Schema completo do doc `invites/{inviteId}`. */
export const rsvpInviteSchema = z.object({
  exhibition_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  volunteer_uid: z.string().min(1).max(128),
  volunteer_name: z.string().min(1).max(120),
  status: z.enum(RSVP_STATUS).default('pending'),
  notes: z.string().max(2000).optional().nullable(),
  availability: availabilitySchema.optional().nullable(),
  response_notes: z.string().max(2000).optional().nullable(),
  responded_at: z.union([z.string().datetime(), z.date(), z.null()]).optional().nullable(),
  created_by: z.string().min(1).max(128),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/** Schema para CRIAR um convite (input do service). */
export const createRsvpInviteSchema = z.object({
  exhibition_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  volunteer_uid: z.string().min(1).max(128),
  volunteer_name: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  availability: availabilitySchema.optional(),
}).strict();

/** Schema para o voluntário RESPONDER um convite. */
export const respondRsvpInviteSchema = z.object({
  status: z.enum(RSVP_STATUS),
  response_notes: z.string().max(2000).optional(),
}).strict();

/** Schema completo do doc `shifts/{shiftId}`. */
export const exhibitionShiftSchema = z.object({
  exhibition_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  date: z.string().regex(ISO_DATE_REGEX, 'date deve ser ISO YYYY-MM-DD'),
  time_start: z.string().regex(HHMM_REGEX, 'time_start deve ser HH:MM'),
  time_end: z.string().regex(HHMM_REGEX, 'time_end deve ser HH:MM'),
  role: z.enum(SHIFT_ROLE),
  role_label: z.string().min(1).max(120),
  needed_count: z.number().int().positive().max(200),
  assigned_uids: z.array(z.string().min(1).max(128)).default([]),
  notes: z.string().max(2000).optional().nullable(),
  created_by: z.string().min(1).max(128),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/** Schema para CRIAR um shift. */
export const createExhibitionShiftSchema = z.object({
  exhibition_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  date: z.string().regex(ISO_DATE_REGEX, 'date deve ser ISO YYYY-MM-DD'),
  time_start: z.string().regex(HHMM_REGEX, 'time_start deve ser HH:MM'),
  time_end: z.string().regex(HHMM_REGEX, 'time_end deve ser HH:MM'),
  role: z.enum(SHIFT_ROLE),
  role_label: z.string().min(1).max(120),
  needed_count: z.number().int().positive().max(200),
  notes: z.string().max(2000).optional(),
}).strict();

/** Schema para ATUALIZAR um shift (campos opcionais). */
export const updateExhibitionShiftSchema = z.object({
  date: z.string().regex(ISO_DATE_REGEX).optional(),
  time_start: z.string().regex(HHMM_REGEX).optional(),
  time_end: z.string().regex(HHMM_REGEX).optional(),
  role: z.enum(SHIFT_ROLE).optional(),
  role_label: z.string().min(1).max(120).optional(),
  needed_count: z.number().int().positive().max(200).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

// ─── Helpers de transição (RSVP) ──────────────────────────────────────

/**
 * Mapa de transições válidas. Segue o padrão `nextAllowed[from] = [to,...]`.
 *
 * IMPORTANTE: nenhum estado é TERMINAL — o voluntário pode mudar de
 * ideia até o dia do evento (a partir daí a edição é bloqueada via
 * service se a data já passou).
 */
const RSVP_TRANSITIONS = Object.freeze({
  pending: ['yes', 'no', 'maybe'],
  yes: ['no', 'maybe'],
  no: ['yes', 'maybe'],
  maybe: ['yes', 'no'],
});

/**
 * Garante que `from → to` é uma transição válida de status RSVP.
 * Lança Error se inválida. Retorna true se ok.
 *
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function assertValidRsvpTransition(from, to) {
  if (!RSVP_TRANSITIONS[from]) {
    throw new Error(`Status RSVP inválido (origem): ${from}`);
  }
  const allowed = RSVP_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(
      `Transição RSVP inválida: ${from} → ${to}. Permitido: ${allowed.join(', ')}`,
    );
  }
  return true;
}

/** Lista de transições permitidas a partir de um status. */
export function allowedRsvpTransitions(from) {
  return RSVP_TRANSITIONS[from] ? [...RSVP_TRANSITIONS[from]] : [];
}

// ─── Helpers de status (RSVP) ──────────────────────────────────────────

/** Status é "ainda não respondeu"? */
export function isPendingRsvp(status) {
  return status === 'pending';
}

/** Status é confirmação (yes)? */
export function isConfirmedRsvp(status) {
  return status === 'yes';
}

/** Status é recusa (no)? */
export function isDeclinedRsvp(status) {
  return status === 'no';
}

// ─── Labels pt-BR ──────────────────────────────────────────────────────

export const RSVP_STATUS_LABELS = Object.freeze({
  pending: 'Pendente',
  yes: 'Confirmado',
  no: 'Recusado',
  maybe: 'Talvez',
});

export const SHIFT_ROLE_LABELS = Object.freeze({
  carregamento: 'Carregamento',
  transporte_ida: 'Transporte (ida)',
  transporte_volta: 'Transporte (volta)',
  cuidador: 'Cuidador',
  recepcao: 'Recepção',
  outro: 'Outro',
});

export const RSVP_STATUS_COLORS = Object.freeze({
  pending: 'bg-zinc-100 text-zinc-700',
  yes: 'bg-green-100 text-green-700',
  no: 'bg-red-100 text-red-700',
  maybe: 'bg-amber-100 text-amber-700',
});

// ─── Helpers de shift (escala) ────────────────────────────────────────

/** Converte "HH:MM" em horas decimais. */
function _hhmmToHours(hhmm) {
  if (!HHMM_REGEX.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

/** Duração do shift em horas (time_end - time_start). */
export function shiftDurationHours(shift) {
  if (!shift?.time_start || !shift?.time_end) return 0;
  return _hhmmToHours(shift.time_end) - _hhmmToHours(shift.time_start);
}

/**
 * Atribui um voluntário ao shift (PURO — não muta).
 * Idempotente: se o uid já está em assigned_uids, retorna o mesmo shift.
 * @returns {object} novo shift com assigned_uids atualizado
 */
export function assignVolunteerToShift(shift, uid) {
  const current = Array.isArray(shift.assigned_uids) ? shift.assigned_uids : [];
  if (current.includes(uid)) return { ...shift, assigned_uids: [...current] };
  return { ...shift, assigned_uids: [...current, uid] };
}

/** Inverso: remove um voluntário (PURO). */
export function unassignVolunteerFromShift(shift, uid) {
  const current = Array.isArray(shift.assigned_uids) ? shift.assigned_uids : [];
  return { ...shift, assigned_uids: current.filter((u) => u !== uid) };
}

/** O shift ainda precisa de mais voluntários? */
export function shiftNeedsMoreVolunteers(shift) {
  const needed = Number(shift.needed_count || 0);
  const assigned = Array.isArray(shift.assigned_uids) ? shift.assigned_uids.length : 0;
  return assigned < needed;
}

/** Quantos voluntários ainda faltam. */
export function shiftRemainingSpots(shift) {
  const needed = Number(shift.needed_count || 0);
  const assigned = Array.isArray(shift.assigned_uids) ? shift.assigned_uids.length : 0;
  return Math.max(0, needed - assigned);
}

// ─── Aggregates (para UI) ───────────────────────────────────────────

/**
 * Conta RSVPs por status.
 * @param {Array} invites
 * @returns {{pending: number, yes: number, no: number, maybe: number, total: number}}
 */
export function summarizeRsvpStatuses(invites) {
  const acc = { pending: 0, yes: 0, no: 0, maybe: 0, total: 0 };
  if (!Array.isArray(invites)) return acc;
  for (const inv of invites) {
    const s = inv?.status;
    if (s && s in acc) acc[s] += 1;
    acc.total += 1;
  }
  return acc;
}
