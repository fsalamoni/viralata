/**
 * @fileoverview Domínio: Gestão de Voluntários (Fase 13).
 *
 * Modelo de dados para o ciclo de vida de voluntários, multi-tenant:
 * cada voluntário tem um perfil global em
 * `users/{uid}/volunteer_profile/main` e uma rostagem por abrigo em
 * `clubs/{clubId}/volunteers/{volunteerUid}`. Participações (turnos
 * em eventos/feiras) ficam em
 * `clubs/{clubId}/volunteer_participations/{participationId}`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13
 */

import { z } from 'zod';
import { VOLUNTEER_TERMS_VERSION } from '@/modules/shelter/domain/legal/volunteerTerms';
import { signatureTextSchema } from '@/modules/shelter/domain/legal/terms';

// ─── Enums compartilhados ─────────────────────────────────────────────

/** Habilidades que o voluntário declara. */
export const VOLUNTEER_SKILLS = Object.freeze([
  'dog_walking',          // Passeio com cães
  'cat_socialization',    // Socialização de gatos
  'transport',            // Transporte de animais
  'grooming',             // Banho e tosa
  'photography',          // Fotografia de pets
  'events',               // Apoio em eventos/feiras
]);

export const VOLUNTEER_SKILL_LABELS = Object.freeze({
  dog_walking: 'Passeio com cães',
  cat_socialization: 'Socialização de gatos',
  transport: 'Transporte de animais',
  grooming: 'Banho e tosa',
  photography: 'Fotografia de pets',
  events: 'Apoio em eventos/feiras',
});

/** Dias da semana (3 letras, padrão ISO 8601). */
export const VOLUNTEER_DAYS_OF_WEEK = Object.freeze([
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
]);

export const VOLUNTEER_DAY_LABELS = Object.freeze({
  mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta',
  fri: 'Sexta', sat: 'Sábado', sun: 'Domingo',
});

/** Faixa de horário HH:MM (regex). */
const TIME_HHMM = /^\d{2}:\d{2}$/;

/** Status da rostagem per-shelter. */
export const VOLUNTEER_SHELTER_STATUS = Object.freeze([
  'active',     // Voluntário ativo no abrigo
  'paused',     // Pausou (férias, viagem, doença)
  'blocked',    // Bloqueado pelo abrigo
  'left',       // Saiu do abrigo (terminal)
]);

const TERMINAL_SHELTER_STATUSES = Object.freeze(['left']);

const VALID_SHELTER_STATUS_TRANSITIONS = Object.freeze({
  active: ['paused', 'blocked', 'left'],
  paused: ['active', 'blocked', 'left'],
  blocked: ['active', 'left'],
  left: [],
});

/** Status do background check (per-shelter, não portável). */
export const VOLUNTEER_BG_CHECK_STATUS = Object.freeze([
  'not_required', // Abrigo não exige
  'pending',      // Aguardando análise
  'approved',     // Aprovado
  'rejected',     // Rejeitado
]);

const TERMINAL_BG_CHECK_STATUSES = Object.freeze(['approved', 'rejected']);

const VALID_BG_CHECK_TRANSITIONS = Object.freeze({
  not_required: ['pending', 'approved', 'rejected'],
  pending: ['approved', 'rejected'],
  approved: ['pending'], // pode reabrir se info nova surgir
  rejected: ['pending'], // pode reconsiderar
});

/** Roles em participações (turnos). */
export const VOLUNTEER_PARTICIPATION_ROLES = Object.freeze([
  'carregamento',         // Montar/desmontar estrutura
  'transporte_ida',       // Levar animal ao evento
  'transporte_volta',     // Trazer animal de volta
  'cuidador',             // Cuidar dos animais no evento
  'outro',                // Outros
]);

export const VOLUNTEER_PARTICIPATION_ROLE_LABELS = Object.freeze({
  carregamento: 'Carregamento',
  transporte_ida: 'Transporte (ida)',
  transporte_volta: 'Transporte (volta)',
  cuidador: 'Cuidador',
  outro: 'Outro',
});

/** Tipos de evento aceitos na participation (Fase 11 define exhibitions;
 *  mas a Fase 13 não pode depender dela — a FK é string livre). */
export const VOLUNTEER_PARTICIPATION_EVENT_TYPES = Object.freeze([
  'exhibition',      // Vitrine / feira (FK opcional em exhibition_id)
  'shelter_visit',   // Visita ao abrigo (rotina)
  'foster_transport',// Levar animal ao LT
  'event_other',     // Outro tipo de evento
]);

export const VOLUNTEER_PARTICIPATION_EVENT_TYPE_LABELS = Object.freeze({
  exhibition: 'Vitrine / feira',
  shelter_visit: 'Visita ao abrigo',
  foster_transport: 'Transporte para lar temporário',
  event_other: 'Outro evento',
});

// ─── Schemas Zod ──────────────────────────────────────────────────────

const availabilityItemSchema = z.object({
  day_of_week: z.enum(VOLUNTEER_DAYS_OF_WEEK),
  start_time: z.string().regex(TIME_HHMM, 'Use HH:MM'),
  end_time: z.string().regex(TIME_HHMM, 'Use HH:MM'),
}).strict().refine(
  (v) => v.start_time < v.end_time,
  { message: 'end_time deve ser maior que start_time', path: ['end_time'] },
);

/**
 * Perfil global do voluntário. Doc em
 * `users/{uid}/volunteer_profile/main` (id fixo "main").
 */
export const volunteerProfileSchema = z.object({
  // Habilidades e disponibilidade
  skills: z.array(z.enum(VOLUNTEER_SKILLS)).max(20).default([]),
  availability: z.array(availabilityItemSchema).max(30).default([]),
  radius_km: z.number().int().min(0).max(500).optional(),
  transport_available: z.boolean().default(false),
  has_vehicle: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  // Termo (LGPD)
  terms_accepted_at: z.string().datetime().optional(),
  terms_version: z.string().max(20).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema para criar / atualizar o perfil. Todos os campos são opcionais
 * (mutação parcial) — o service faz o merge e exige o aceite do termo
 * apenas no PRIMEIRO create.
 */
export const upsertVolunteerProfileSchema = z.object({
  skills: z.array(z.enum(VOLUNTEER_SKILLS)).max(20).optional(),
  availability: z.array(availabilityItemSchema).max(30).optional(),
  radius_km: z.number().int().min(0).max(500).optional(),
  transport_available: z.boolean().optional(),
  has_vehicle: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * Schema do aceite do termo. Chamado uma vez (no primeiro create do
 * perfil ou quando o usuário quer re-aceitar uma nova versão).
 *
 * Conformidade: Lei 14.063/2020 — assinatura eletrônica avançada.
 * O `signature_text` é a fonte primária do hash do documento (ver
 * `volunteerProfileService.acceptVolunteerTerms` + `termsAcceptanceService.recordAcceptance`).
 * O `terms_version` deve bater com a versão canônica (drift-fix: v2
 * tem sufixo `-v2` para distinguir do stub v1).
 *
 * Campos opcionais `ip_address`, `user_agent`, `liveness_verified` e
 * `legal_basis` são metadados de contexto Lei 14.063/2020 — propagados
 * ao aceite canônico em `terms_acceptances/`. Não são estritamente
 * obrigatórios no client (defaults aplicados no service).
 */
export const acceptVolunteerTermsSchema = z.object({
  terms_version: z.string().min(1).max(30)
    .refine((v) => v === VOLUNTEER_TERMS_VERSION, {
      message: `Apenas a versão ${VOLUNTEER_TERMS_VERSION} do termo é aceita neste momento`,
    }),
  signature_text: signatureTextSchema,
  ip_address: z.string().max(64).optional(),
  user_agent: z.string().max(500).optional(),
  liveness_verified: z.boolean().optional(),
  legal_basis: z.string().max(120).optional(),
}).strict();

/**
 * Roster per-shelter. Doc em
 * `clubs/{clubId}/volunteers/{volunteerUid}` (id determinista = uid).
 */
export const shelterVolunteerRosterSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  volunteer_uid: z.string().min(1).max(128),
  // Snapshot do voluntário (denormalizado para resiliência)
  volunteer_name: z.string().min(2).max(120),
  volunteer_photo_url: z.string().url().optional(),
  volunteer_email: z.string().email().optional(),
  volunteer_phone: z.string().max(40).optional(),
  // Status da rostagem
  status: z.enum(VOLUNTEER_SHELTER_STATUS).default('active'),
  joined_at: z.string().datetime().optional(),
  left_at: z.string().datetime().optional(),
  // Background check (per-shelter, não portável)
  background_check_status: z.enum(VOLUNTEER_BG_CHECK_STATUS).default('not_required'),
  background_check_at: z.string().datetime().optional(),
  background_check_notes: z.string().max(1000).optional(),
  // Snapshot do aceite do termo (LGPD)
  terms_accepted_at: z.string().datetime().optional(),
  terms_version: z.string().max(20).optional(),
  signature_text: z.string().max(120).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema para o voluntário entrar na rostagem de um abrigo. Chamado
 * pelo próprio voluntário (auto-cadastro) ou pelo abrigo (convite).
 */
export const joinShelterAsVolunteerSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  volunteer_uid: z.string().min(1).max(128),
  // Snapshot do perfil global (o abrigo NÃO lê users/{uid}/volunteer_profile
  // diretamente — defense-in-depth + LGPD)
  volunteer_name: z.string().min(2).max(120),
  volunteer_email: z.string().email().optional(),
  volunteer_phone: z.string().max(40).optional(),
  volunteer_photo_url: z.string().url().optional(),
  // Aceite do termo (obrigatório). Defense-in-depth: a versão deve
  // ser a atualmente aceita (mesma checagem do `acceptVolunteerTermsSchema`).
  terms_version: z.string().min(1).max(30)
    .refine((v) => v === VOLUNTEER_TERMS_VERSION, {
      message: `Apenas a versão ${VOLUNTEER_TERMS_VERSION} do termo é aceita neste momento`,
    }),
  signature_text: signatureTextSchema,
}).strict();

/**
 * Schema para o abrigo atualizar o status do background check
 * (pending → approved/rejected) e/ou mudar o status da rostagem.
 */
export const updateShelterVolunteerSchema = z.object({
  status: z.enum(VOLUNTEER_SHELTER_STATUS).optional(),
  background_check_status: z.enum(VOLUNTEER_BG_CHECK_STATUS).optional(),
  background_check_notes: z.string().max(1000).optional(),
}).strict();

/**
 * Schema da participation. Doc em
 * `clubs/{clubId}/volunteer_participations/{participationId}`.
 *
 * exhibition_id é FK opcional para a Fase 11 (vitrines). Se a Fase 11
 * não tiver sido mergeada quando esta Fase 13 ativar, o abrigo pode
 * usar `event_type='exhibition'` + `exhibition_id=<string livre>`
 * sem quebrar.
 */
export const volunteerParticipationSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  volunteer_uid: z.string().min(1).max(128),
  volunteer_name: z.string().min(2).max(120),  // snapshot
  // Evento
  event_type: z.enum(VOLUNTEER_PARTICIPATION_EVENT_TYPES),
  event_id: z.string().max(128).optional(),         // string livre
  exhibition_id: z.string().max(128).optional(),    // FK Fase 11
  event_label: z.string().min(2).max(200),          // ex: "Vitrine da Praça XV"
  event_date: z.string().datetime(),
  // Role
  role: z.enum(VOLUNTEER_PARTICIPATION_ROLES),
  // Check-in/out
  check_in: z.string().datetime().optional(),
  check_out: z.string().datetime().optional(),
  hours_logged: z.number().min(0).max(48).default(0),
  // Observações
  notes: z.string().max(2000).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
  created_by: z.string().max(128).optional(),
}).strict();

/**
 * Schema para criar uma participation.
 */
export const createVolunteerParticipationSchema = volunteerParticipationSchema
  .omit({
    check_in: true, check_out: true, hours_logged: true,
    created_at: true, updated_at: true, created_by: true,
  });

/**
 * Schema para check-in / check-out.
 */
export const participationCheckSchema = z.object({
  action: z.enum(['check_in', 'check_out']),
  at: z.string().datetime().optional(), // default = now
}).strict();

// ─── Helpers de transição ──────────────────────────────────────────────

/**
 * Verifica se a transição `from → to` é válida para o status da
 * rostagem per-shelter.
 */
export function assertValidVolunteerStatusTransition(from, to) {
  if (!VOLUNTEER_SHELTER_STATUS.includes(from)) {
    throw new Error(`Status de voluntário inválido: ${from}`);
  }
  if (!VOLUNTEER_SHELTER_STATUS.includes(to)) {
    throw new Error(`Status de voluntário inválido: ${to}`);
  }
  if (TERMINAL_SHELTER_STATUSES.includes(from)) {
    throw new Error(`Voluntário em status terminal (${from}).`);
  }
  if (from === to) return; // noop
  const allowed = VALID_SHELTER_STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Transição inválida (voluntário): ${from} → ${to}. ` +
      `Permitidas: [${allowed.join(', ')}]`,
    );
  }
}

/**
 * Verifica se a transição `from → to` é válida para o background check.
 */
export function assertValidBgCheckTransition(from, to) {
  if (!VOLUNTEER_BG_CHECK_STATUS.includes(from)) {
    throw new Error(`Status de background check inválido: ${from}`);
  }
  if (!VOLUNTEER_BG_CHECK_STATUS.includes(to)) {
    throw new Error(`Status de background check inválido: ${to}`);
  }
  if (from === to) return; // noop
  const allowed = VALID_BG_CHECK_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Transição inválida (background check): ${from} → ${to}. ` +
      `Permitidas: [${allowed.join(', ')}]`,
    );
  }
}

// ─── Helpers de cálculo ────────────────────────────────────────────────

/**
 * Calcula horas a partir de check_in/check_out (ISO datetime). Retorna
 * 0 se incompleto. Arredonda para 2 casas decimais.
 */
export function calculateParticipationHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  if (end <= start) return 0;
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Verifica se a participation está em andamento (check_in feito,
 * check_out ainda não).
 */
export function isParticipationInProgress(participation) {
  return Boolean(participation?.check_in) && !participation?.check_out;
}

/**
 * Verifica se a participation está concluída (check_in e check_out
 * ambos feitos).
 */
export function isParticipationCompleted(participation) {
  return Boolean(participation?.check_in) && Boolean(participation?.check_out);
}

/**
 * Formata uma lista de availability items para exibição curta
 * (ex: "Seg 08:00-12:00, Qua 14:00-18:00").
 */
export function formatAvailability(availability) {
  if (!Array.isArray(availability) || availability.length === 0) return '';
  return availability
    .map((slot) => {
      const day = VOLUNTEER_DAY_LABELS[slot.day_of_week] || slot.day_of_week;
      return `${day} ${slot.start_time}-${slot.end_time}`;
    })
    .join(', ');
}

/**
 * Helper: o voluntário pode participar de eventos do abrigo?
 * Requer: status='active' E (background_check 'approved' OU 'not_required').
 */
export function canVolunteerParticipate(rosterEntry) {
  if (!rosterEntry) return false;
  if (rosterEntry.status !== 'active') return false;
  if (rosterEntry.background_check_status === 'rejected') return false;
  if (rosterEntry.background_check_status === 'pending') return false;
  return true;
}
