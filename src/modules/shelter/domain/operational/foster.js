/**
 * @fileoverview Domínio: Lares Temporários (Fase 7)
 *
 * Define o ciclo de vida de um placement de lar temporário. Multi-tenant:
 * cada placement pertence a um abrigo.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 7
 */

import { z } from 'zod';

// ─── Estados ────────────────────────────────────────────────────────────

export const FOSTER_STATUS = Object.freeze([
  'pending',     // Aguardando aceite do LT
  'active',      // Ativo, animal no LT
  'extended',    // Prorrogado além do end_date original
  'ended',       // Finalizado (animal voltou ou foi adotado)
  'cancelled',   // Cancelado antes de começar
  'interrupted', // Animal voltou antes do prazo (problema)
]);

// Estados terminais
const TERMINAL_STATUSES = Object.freeze(['ended', 'cancelled', 'interrupted']);

// Transições válidas
const VALID_TRANSITIONS = Object.freeze({
  pending: ['active', 'cancelled'],
  active: ['extended', 'ended', 'interrupted'],
  extended: ['ended', 'interrupted'],
  ended: [],
  cancelled: [],
  interrupted: [],
});

// ─── Enums ──────────────────────────────────────────────────────────────

export const FOSTER_ENVIRONMENTS = Object.freeze([
  'house_yard',         // Casa com quintal
  'house_no_yard',      // Casa sem quintal
  'apartment',          // Apartamento
  'rural',              // Propriedade rural
  'shelter_facility',   // Instalação tipo abrigo (LT institucional)
]);

export const FOSTER_EXPERIENCE = Object.freeze([
  'none',           // Nunca teve pet
  'beginner',       // Teve pets
  'intermediate',   // Confortável
  'experienced',    // Teve vários
  'professional',   // Trabalha com animais
]);

// ─── Fase 3 (SHELTER_FOSTER_V2) · Disponibilidade do lar temporário ─────
//
// Aditivos. Um lar temporário é uma espécie de voluntário em lista própria;
// indica as DATAS em que fica à disposição para acolher pets, a QUANTIDADE
// (capacidade) e os TIPOS de pet que aceita. Campos opcionais — placements
// existentes seguem válidos sem eles (sem regressão).

/** Tipos de pet que um lar temporário pode se dispor a acolher. */
export const FOSTER_PET_TYPES = Object.freeze([
  'dog',            // Cães (adultos)
  'cat',            // Gatos (adultos)
  'puppy',          // Filhotes de cão
  'kitten',         // Filhotes de gato
  'senior',         // Idosos
  'special_needs',  // Necessidades especiais (tratamento/reabilitação)
  'small_animal',   // Pequenos animais (roedores, aves, etc.)
  'other',          // Outros
]);

export const FOSTER_PET_TYPE_LABELS = Object.freeze({
  dog: 'Cães',
  cat: 'Gatos',
  puppy: 'Filhotes (cão)',
  kitten: 'Filhotes (gato)',
  senior: 'Idosos',
  special_needs: 'Necessidades especiais',
  small_animal: 'Pequenos animais',
  other: 'Outros',
});

/** Uma janela de disponibilidade (datas calendário, granularidade de dia). */
export const fosterAvailabilityDateSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // YYYY-MM-DD
}).strict();

// ─── Schema do foster (perfil do lar temporário) ──────────────────────

const fosterProfileSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/).optional(),
  address: z.string().max(300).optional(),
  environment: z.enum(FOSTER_ENVIRONMENTS).optional(),
  has_yard: z.boolean().optional(),
  has_fence: z.boolean().optional(),
  other_pets: z.array(z.object({
    species: z.enum(['dog', 'cat', 'bird', 'other']),
    name: z.string().max(80),
    castrated: z.boolean().optional(),
    vaccinated: z.boolean().optional(),
  }).strict()).max(20).optional(),
  experience: z.enum(FOSTER_EXPERIENCE).optional(),
  years_experience: z.number().int().min(0).max(80).optional(),
  // Termo
  terms_accepted_at: z.string().datetime().optional(),
  terms_version: z.string().max(20).optional(),
  // Consentimento para exibir histórico público (TASK-326)
  consent_to_show_history: z.boolean().default(false),
}).strict();

// ─── Schema do placement ───────────────────────────────────────────────

/**
 * Schema do placement. Cada placement = (abrigo, LT, pet) com prazo.
 */
export const fosterPlacementSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  foster_uid: z.string().min(1).max(128),     // FK para users/{uid}
  foster_profile_snapshot: fosterProfileSchema, // snapshot imutável
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),            // ISO 8601
  status: z.enum(FOSTER_STATUS).default('pending'),
  // Extensão
  original_end_date: z.string().datetime().optional(), // antes de prorrogar
  extension_reason: z.string().max(500).optional(),
  // Término
  ended_at: z.string().datetime().optional(),
  ended_by_uid: z.string().max(128).optional(),
  ended_reason: z.string().max(1000).optional(),
  // Avaliação
  pet_returned_healthy: z.boolean().optional(), // animal voltou saudável
  foster_rating: z.number().int().min(1).max(5).optional(),
  foster_feedback: z.string().max(2000).optional(),
  // ─── Fase 3 (SHELTER_FOSTER_V2) · Disponibilidade declarada (aditivo) ──
  // Datas em que o lar fica à disposição, capacidade e tipos de pet aceitos.
  // Opcionais: placements existentes seguem válidos sem eles.
  availability_dates: z.array(fosterAvailabilityDateSchema).max(60).optional(),
  capacity: z.number().int().min(0).max(50).optional(),
  accepted_pet_types: z.array(z.enum(FOSTER_PET_TYPES)).max(FOSTER_PET_TYPES.length).optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema para criar um novo placement (LT sendo proposto).
 */
export const createFosterPlacementSchema = fosterProfileSchema.omit({
  terms_accepted_at: true, terms_version: true,
}).extend({
  shelter_club_id: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  foster_uid: z.string().min(1).max(128),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

/**
 * Schema para o LT aceitar o placement (status pending → active).
 * Inclui aceite do termo (versão texto do termo é mostrada na UI).
 */
export const acceptFosterPlacementSchema = z.object({
  terms_version: z.string().min(1).max(20),  // versão do termo aceito
  signature_text: z.string().min(2).max(120), // nome digitado (substitui e-assinatura da Fase 18)
}).strict();

/**
 * Schema para prorrogar (extender) o prazo.
 */
export const extendFosterPlacementSchema = z.object({
  new_end_date: z.string().datetime(),
  reason: z.string().min(3).max(500),
}).strict();

/**
 * Schema para finalizar (end).
 */
export const endFosterPlacementSchema = z.object({
  reason: z.string().min(3).max(1000),
  pet_returned_healthy: z.boolean().optional(),
  foster_rating: z.number().int().min(1).max(5).optional(),
  foster_feedback: z.string().max(2000).optional(),
}).strict();

/**
 * Fase 3 (SHELTER_FOSTER_V2) · Schema para o abrigo editar a disponibilidade
 * declarada de um lar temporário (datas à disposição, capacidade e tipos de
 * pet aceitos). Todos os campos são opcionais — envie só o que mudou. Aditivo:
 * não altera o ciclo de vida (status) do placement.
 */
export const updateFosterAvailabilitySchema = z.object({
  availability_dates: z.array(fosterAvailabilityDateSchema).max(60).optional(),
  capacity: z.number().int().min(0).max(50).optional(),
  accepted_pet_types: z.array(z.enum(FOSTER_PET_TYPES)).max(FOSTER_PET_TYPES.length).optional(),
}).strict();

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Verifica se a transição `from → to` é válida.
 */
export function assertValidFosterTransition(from, to) {
  if (!FOSTER_STATUS.includes(from)) throw new Error(`Status inválido: ${from}`);
  if (!FOSTER_STATUS.includes(to)) throw new Error(`Status inválido: ${to}`);
  if (TERMINAL_STATUSES.includes(from)) {
    throw new Error(`Placement em status terminal (${from}).`);
  }
  const allowed = VALID_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}. Permitidas: [${allowed.join(', ')}]`);
  }
}

/**
 * Calcula a duração em dias de um placement.
 */
export function fosterDurationDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se o placement está próximo do fim (próximos 7 dias).
 */
export function isFosterNearEnd(endDate, now = new Date()) {
  const end = new Date(endDate);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return end.getTime() - now.getTime() < sevenDaysMs && end > now;
}

/**
 * Verifica se o placement está vencido.
 */
export function isFosterOverdue(endDate, now = new Date()) {
  return new Date(endDate) < now;
}
