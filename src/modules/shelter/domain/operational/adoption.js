/**
 * @fileoverview Domínio: Workflow de Adoção (Fase 3)
 *
 * Define o ciclo de vida de uma application de adoção:
 *   applied → under_review → approved | rejected
 *           → adoption_completed (após assinado termo, Fase 18)
 *           → cancelled (pelo applicant ou abrigo)
 *
 * Subcoleção multi-tenant: `clubs/{clubId}/adoption_workflow/{applicationId}`.
 * Cada application pertence a um abrigo (`shelter_club_id`) — apps
 * cross-abrigo não vazam.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 3 + § 11.1
 */

import { z } from 'zod';

// ─── Estados ────────────────────────────────────────────────────────────

export const APPLICATION_STATUS = Object.freeze([
  'applied',               // Adotante enviou, ainda não visto
  'under_review',          // Equipe do abrigo está revisando
  'approved',              // Aprovado, aguardando assinatura do termo (Fase 18)
  'rejected',              // Recusado (com motivo)
  'adoption_completed',    // Termo assinado, adoção efetiva
  'cancelled',             // Cancelado (pelo applicant ou abrigo)
  'withdrawn',             // Adotante desistiu
]);

// Estados terminais (não mudam mais)
export const TERMINAL_STATUSES = Object.freeze([
  'adoption_completed',
  'rejected',
  'cancelled',
  'withdrawn',
]);

// Transições permitidas (de → para[])
const VALID_TRANSITIONS = Object.freeze({
  applied: ['under_review', 'cancelled', 'withdrawn'],
  under_review: ['approved', 'rejected', 'cancelled', 'withdrawn'],
  approved: ['adoption_completed', 'cancelled', 'withdrawn'],
  rejected: [], // terminal
  adoption_completed: [], // terminal
  cancelled: [], // terminal
  withdrawn: [], // terminal
});

/**
 * Verifica se a transição `from → to` é válida. Lança erro se não.
 */
export function assertValidTransition(from, to) {
  if (!APPLICATION_STATUS.includes(from)) {
    throw new Error(`Status inválido: ${from}`);
  }
  if (!APPLICATION_STATUS.includes(to)) {
    throw new Error(`Status inválido: ${to}`);
  }
  const allowed = VALID_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}. Permitidas: [${allowed.join(', ')}]`);
  }
}

// ─── Schema ─────────────────────────────────────────────────────────────

/**
 * Respostas do formulário de aplicação. Adotante preenche antes de submeter.
 * `applicant_uid` é derivado do user logado.
 */
const applicantFormSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  // Sobre o adotante
  age: z.number().int().min(16).max(120).optional(),
  household_size: z.number().int().min(1).max(50).optional(),
  has_yard: z.boolean().optional(),
  has_other_pets: z.boolean().optional(),
  other_pets_description: z.string().max(500).optional(),
  has_children: z.boolean().optional(),
  children_ages: z.array(z.number().int().min(0).max(18)).max(10).optional(),
  // Sobre a adoção
  reason_to_adopt: z.string().min(10).max(2000),
  living_arrangement: z.enum(['house', 'apartment', 'rural', 'other']).optional(),
  landlord_allows_pets: z.boolean().optional(),
  // Consentimentos
  agreed_to_home_visit: z.boolean().default(false),
  agreed_to_follow_up: z.boolean().default(false),
}).strict();

/**
 * Schema completo da application. `applicant_uid`, `pet_id`, `shelter_club_id`
 * são setados pelo sistema.
 */
export const adoptionApplicationSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  applicant_uid: z.string().min(1).max(128),
  applicant_form: applicantFormSchema,
  status: z.enum(APPLICATION_STATUS).default('applied'),
  decision_notes: z.string().max(2000).optional(),  // nota do abrigo ao decidir
  decided_by_uid: z.string().max(128).optional(),
  decided_at: z.string().datetime().optional(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema de "submit" (criação pelo adotante). Não inclui campos do abrigo.
 *
 * FASE 19 (Bloco 4): `terms_signature_text` é OPCIONAL para preservar
 * backward-compat com a Fase 3 (já em produção). Quando presente,
 * gera os campos imutáveis `terms_accepted_at` + `terms_version` +
 * `signature_text` no doc da application. A UI gated pela feature
 * flag `SHELTER_LEGAL_TERMS_V1` envia sempre que a flag está ON.
 */
export const submitApplicationSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  applicant_form: applicantFormSchema,
  // Fase 19: assinatura do Termo de Adoção (Lei 14.063/2020).
  // Opcional para backward-compat.
  terms_signature_text: z.string().min(3).max(120).optional(),
}).strict();

/**
 * Schema de "decisão" (mudança de status pelo abrigo). Inclui notas e
 * quem decidiu.
 */
export const decideApplicationSchema = z.object({
  to_status: z.enum(APPLICATION_STATUS),
  decision_notes: z.string().max(2000).optional(),
}).strict();

// ─── Helpers ────────────────────────────────────────────────────────────

export const APPLICATION_STATUS_LABELS = Object.freeze({
  applied: 'Recebida',
  under_review: 'Em análise',
  approved: 'Aprovada',
  rejected: 'Recusada',
  adoption_completed: 'Adoção concluída',
  cancelled: 'Cancelada',
  withdrawn: 'Desistiu',
});

export const APPLICATION_STATUS_TONES = Object.freeze({
  applied: 'bg-blue-100 text-blue-900',
  under_review: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
  adoption_completed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-zinc-100 text-zinc-700',
  withdrawn: 'bg-zinc-100 text-zinc-700',
});

/**
 * Indica se a application está terminada (não muda mais).
 */
export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Próximos status permitidos a partir de `current`.
 */
export function nextStatuses(current) {
  return VALID_TRANSITIONS[current] || [];
}
