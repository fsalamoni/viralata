/**
 * @fileoverview Domínio: Vitrines / Eventos (Fase 11).
 *
 * Define o ciclo de vida de uma vitrine (evento de exposição onde
 * abrigos levam animais para adoção). Suporta coalizão entre múltiplos
 * abrigos (co_organizers + external_pets), escalas de trabalho
 * (shifts) e registro do destino de cada animal pós-evento
 * (post_event_log).
 *
 * Multi-tenant: cada coleção vive sob
 * `clubs/{clubId}/exhibitions/{exhibitionId}` (e subcoleções).
 *
 * State machine:
 *   scheduled → active → completed   (ciclo principal)
 *   scheduled | active → cancelled   (terminal alternativo)
 *   completed e cancelled são terminais (transições bloqueadas)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 11
 */

import { z } from 'zod';

// ─── Estados ────────────────────────────────────────────────────────────

export const EXHIBITION_STATUS = Object.freeze([
  'scheduled',  // Evento planejado, ainda não começou
  'active',     // Evento acontecendo (janela de início → fim)
  'completed',  // Evento finalizado, animais retornaram/adotaram
  'cancelled',  // Evento cancelado antes/depois de começar
]);

// Estados terminais
const TERMINAL_STATUSES = Object.freeze(['completed', 'cancelled']);

// Transições válidas
export const VALID_EXHIBITION_TRANSITIONS = Object.freeze({
  scheduled: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

/**
 * Valida a transição de status. Lança erro se inválida.
 * Mensagem em pt-BR para aparecer direto na UI.
 */
export function assertValidExhibitionTransition(currentStatus, nextStatus) {
  if (!EXHIBITION_STATUS.includes(currentStatus)) {
    throw new Error(`Status atual inválido: ${currentStatus}`);
  }
  if (!EXHIBITION_STATUS.includes(nextStatus)) {
    throw new Error(`Próximo status inválido: ${nextStatus}`);
  }
  if (currentStatus === nextStatus) {
    throw new Error(`Evento já está em "${currentStatus}".`);
  }
  const allowed = VALID_EXHIBITION_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Transição "${currentStatus}" → "${nextStatus}" não permitida. `
        + `Transições válidas: ${allowed.join(', ') || '(terminal)'}.`,
    );
  }
}

export function isExhibitionTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

// ─── Roles de turno ─────────────────────────────────────────────────────

export const SHIFT_ROLES = Object.freeze([
  'carregamento',      // Carregar/descarregar animais/equipamento
  'transporte_ida',    // Levar animais até o local
  'transporte_volta',  // Trazer animais de volta
  'cuidador',          // Cuidar dos animais no local
  'recepcao',          // Recepção do público / triagem
]);

// ─── Destinos pós-evento ────────────────────────────────────────────────

export const POST_EVENT_DESTINATIONS = Object.freeze([
  'returned_to_shelter',  // Voltou ao abrigo de origem
  'adopted',              // Adotado no evento
  'transferred',          // Transferido para outro abrigo
  'died',                 // Óbito (raro, mas possível — stress/etc)
]);

// ─── Schema: venue (local do evento) ───────────────────────────────────

/**
 * Endereço + geolocalização do local do evento.
 * `place_id` é o ID do Google Places (opcional, vindo de autocomplete).
 */
const venueSchema = z.object({
  address: z.string().min(3).max(300),       // Endereço legível
  place_id: z.string().max(300).optional(),  // Google Places ID
  lat: z.number().min(-90).max(90),          // Latitude
  lng: z.number().min(-180).max(180),        // Longitude
}).strict();

// ─── Schema: external_pets (pets de outros abrigos) ────────────────────

/**
 * Pets de abrigos parceiros (não internos).
 * Snapshot imutável no momento do cadastro pra rastreabilidade.
 */
const externalPetSchema = z.object({
  pet_id: z.string().min(1).max(128),         // ID do pet no abrigo de origem
  owner_shelter_id: z.string().min(1).max(128), // FK para clubs/{clubId}
  owner_shelter_name: z.string().max(200).optional(),
  name: z.string().min(1).max(120),
  species: z.enum(['dog', 'cat', 'bird', 'other']).optional(),
  notes: z.string().max(500).optional(),
}).strict();

// ─── Schema: exhibition (vitrine) ──────────────────────────────────────

/**
 * Schema completo de uma vitrine.
 */
export const exhibitionSchema = z.object({
  // Multi-tenant
  shelter_club_id: z.string().min(1).max(128),
  // Identificação
  title: z.string().min(3).max(200),
  // Organização
  organizer_uid: z.string().min(1).max(128),     // FK para users/{uid}
  organizer_name: z.string().max(200).optional(), // snapshot do nome
  co_organizers_uids: z.array(z.string().min(1).max(128)).max(50).default([]),
  // Local
  venue: venueSchema,
  // Janela
  datetime_start: z.string().datetime(),  // ISO 8601
  datetime_end: z.string().datetime(),    // ISO 8601
  // Estado
  status: z.enum(EXHIBITION_STATUS).default('scheduled'),
  // Animais
  pet_ids: z.array(z.string().min(1).max(128)).max(200).default([]),
  external_pets: z.array(externalPetSchema).max(200).default([]),
  // Config
  requires_volunteers: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  // Cancelamento (se status='cancelled')
  cancelled_at: z.string().datetime().optional(),
  cancelled_by_uid: z.string().max(128).optional(),
  cancellation_reason: z.string().max(500).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
  created_by_uid: z.string().max(128).optional(),
  updated_by_uid: z.string().max(128).optional(),
}).strict();

/**
 * Schema para criar uma vitrine nova.
 * Audit fields são omitidos (preenchidos pelo service).
 */
export const createExhibitionSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  title: z.string().min(3).max(200),
  organizer_uid: z.string().min(1).max(128),
  organizer_name: z.string().max(200).optional(),
  co_organizers_uids: z.array(z.string().min(1).max(128)).max(50).default([]),
  venue: venueSchema,
  datetime_start: z.string().datetime(),
  datetime_end: z.string().datetime(),
  requires_volunteers: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
}).strict().refine(
  (data) => new Date(data.datetime_end) > new Date(data.datetime_start),
  {
    message: 'datetime_end deve ser maior que datetime_start',
    path: ['datetime_end'],
  },
);

/**
 * Schema para atualizar uma vitrine.
 * Campos imutáveis: shelter_club_id, organizer_uid, organizer_name,
 * created_at, created_by_uid (não estão aqui).
 */
export const updateExhibitionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  co_organizers_uids: z.array(z.string().min(1).max(128)).max(50).optional(),
  venue: venueSchema.optional(),
  datetime_start: z.string().datetime().optional(),
  datetime_end: z.string().datetime().optional(),
  requires_volunteers: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * Schema para adicionar/remover pet interno.
 */
export const addInternalPetSchema = z.object({
  pet_id: z.string().min(1).max(128),
}).strict();

/**
 * Schema para remover pet interno.
 */
export const removeInternalPetSchema = z.object({
  pet_id: z.string().min(1).max(128),
}).strict();

/**
 * Schema para adicionar pet externo.
 */
export const addExternalPetSchema = externalPetSchema;

export const removeExternalPetSchema = z.object({
  pet_id: z.string().min(1).max(128),
}).strict();

/**
 * Schema para cancelar uma vitrine.
 */
export const cancelExhibitionSchema = z.object({
  reason: z.string().min(3).max(500),
}).strict();

// ─── Schema: shift (escala) ────────────────────────────────────────────

/**
 * Turno dentro de uma vitrine. Ex: "carregamento 08:00-10:00, 3 vagas".
 */
export const shiftSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  exhibition_id: z.string().min(1).max(128),
  start_at: z.string().datetime(),         // ISO 8601
  end_at: z.string().datetime(),           // ISO 8601
  role: z.enum(SHIFT_ROLES),
  slots_total: z.number().int().min(0).max(1000),
  slots_filled: z.number().int().min(0).max(1000).default(0),
  notes: z.string().max(500).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
  created_by_uid: z.string().max(128).optional(),
}).strict().refine(
  (data) => new Date(data.end_at) > new Date(data.start_at),
  {
    message: 'end_at deve ser maior que start_at',
    path: ['end_at'],
  },
);

export const createShiftSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  exhibition_id: z.string().min(1).max(128),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  role: z.enum(SHIFT_ROLES),
  slots_total: z.number().int().min(1).max(1000),
  notes: z.string().max(500).optional(),
}).strict().refine(
  (data) => new Date(data.end_at) > new Date(data.start_at),
  {
    message: 'end_at deve ser maior que start_at',
    path: ['end_at'],
  },
);

export const updateShiftSchema = z.object({
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  role: z.enum(SHIFT_ROLES).optional(),
  slots_total: z.number().int().min(1).max(1000).optional(),
  slots_filled: z.number().int().min(0).max(1000).optional(),
  notes: z.string().max(500).optional(),
}).strict();

// ─── Schema: post_event_log ────────────────────────────────────────────

/**
 * Log do destino de cada animal depois do evento.
 * Origem: interno (pet_id em pet_ids[]) ou externo (external_pets[].pet_id).
 */
export const postEventLogSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  exhibition_id: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  pet_origin: z.enum(['internal', 'external']),
  destination: z.enum(POST_EVENT_DESTINATIONS),
  notes: z.string().max(2000).optional(),
  logged_at: z.string().datetime().optional(),     // ISO 8601, default = agora
  logged_by_uid: z.string().min(1).max(128),
  logged_by_name: z.string().max(200).optional(),
  // Para 'adopted' (opcional): FK para o adotante
  adopter_uid: z.string().max(128).optional(),
  // Para 'transferred' (opcional): abrigo de destino
  transferred_to_shelter_id: z.string().max(128).optional(),
  transferred_to_shelter_name: z.string().max(200).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

export const createPostEventLogSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  exhibition_id: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  pet_origin: z.enum(['internal', 'external']),
  destination: z.enum(POST_EVENT_DESTINATIONS),
  notes: z.string().max(2000).optional(),
  adopter_uid: z.string().max(128).optional(),
  transferred_to_shelter_id: z.string().max(128).optional(),
  transferred_to_shelter_name: z.string().max(200).optional(),
}).strict();

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Total de animais de uma vitrine (internos + externos).
 */
export function totalExhibitionAnimals(exhibition) {
  if (!exhibition) return 0;
  return (exhibition.pet_ids?.length || 0) + (exhibition.external_pets?.length || 0);
}

/**
 * Verifica se a vitrine está acontecendo agora
 * (entre datetime_start e datetime_end).
 */
export function isExhibitionLive(exhibition, now = new Date()) {
  if (!exhibition?.datetime_start || !exhibition?.datetime_end) return false;
  const start = new Date(exhibition.datetime_start);
  const end = new Date(exhibition.datetime_end);
  return now >= start && now <= end;
}

/**
 * Verifica se a vitrine está no futuro.
 */
export function isExhibitionUpcoming(exhibition, now = new Date()) {
  if (!exhibition?.datetime_start) return false;
  return new Date(exhibition.datetime_start) > now;
}

/**
 * Verifica se a vitrine já passou.
 */
export function isExhibitionPast(exhibition, now = new Date()) {
  if (!exhibition?.datetime_end) return false;
  return new Date(exhibition.datetime_end) < now;
}

/**
 * Duração da vitrine em horas (arredondado para 1 casa decimal).
 */
export function exhibitionDurationHours(exhibition) {
  if (!exhibition?.datetime_start || !exhibition?.datetime_end) return 0;
  const ms = new Date(exhibition.datetime_end) - new Date(exhibition.datetime_start);
  return Math.round((ms / 3_600_000) * 10) / 10;
}

/**
 * Formata datetime ISO em 'DD/MM/YYYY HH:mm' (pt-BR).
 */
export function formatExhibitionDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/**
 * Labels em pt-BR para os status.
 */
export const EXHIBITION_STATUS_LABELS = Object.freeze({
  scheduled: 'Agendada',
  active: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
});

/**
 * Labels em pt-BR para os roles dos turnos.
 */
export const SHIFT_ROLE_LABELS = Object.freeze({
  carregamento: 'Carregamento',
  transporte_ida: 'Transporte (ida)',
  transporte_volta: 'Transporte (volta)',
  cuidador: 'Cuidador',
  recepcao: 'Recepção',
});

/**
 * Labels em pt-BR para os destinos do post_event_log.
 */
export const POST_EVENT_DESTINATION_LABELS = Object.freeze({
  returned_to_shelter: 'Voltou ao abrigo',
  adopted: 'Adotado no evento',
  transferred: 'Transferido',
  died: 'Óbito',
});
