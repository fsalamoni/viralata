/**
 * @fileoverview Domain: Atribuições Finas de Voluntários (TASK-274).
 *
 * Coleção: `clubs/{clubId}/volunteer_assignments/{assignmentId}`.
 *
 * Permite ao abrigo atribuir capabilities específicas (papéis) a cada
 * voluntário, com escopo opcional (abrigo, pet, event_type, task_id).
 *
 * Regra A §2.1: only_shelter_with(volunteers:manage) pode criar/editar.
 * Proprietário da atribuição pode ler os seus próprios registros.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-274
 */

import { z } from 'zod';

// ─── Capability enum ──────────────────────────────────────────────────────────
// Estende VOLUNTEER_PARTICIPATION_ROLES com extras que não são eventos.
export const VOLUNTEER_ASSIGNMENT_CAPABILITIES = Object.freeze([
  // Roles de evento (espelha VOLUNTEER_PARTICIPATION_ROLES)
  'carregamento',
  'transporte_ida',
  'transporte_volta',
  'cuidador',
  'outro',
  // Capabilities extras
  'general_help',      // Ajuda geral sem papel definido
  'photography',       // Fotografia / mídias
  'foster_support',    // Suporte a lar temporário
  'admin_tasks',       // Tarefas administrativas
]);

export const VOLUNTEER_ASSIGNMENT_CAPABILITY_LABELS = Object.freeze({
  carregamento: 'Carregamento',
  transporte_ida: 'Transporte (ida)',
  transporte_volta: 'Transporte (volta)',
  cuidador: 'Cuidador',
  outro: 'Outro',
  general_help: 'Ajuda geral',
  photography: 'Fotografia',
  foster_support: 'Suporte LT',
  admin_tasks: 'Tarefas admin',
});

export const VOLUNTEER_ASSIGNMENT_CAPABILITY_TONES = Object.freeze({
  carregamento: 'bg-blue-100 text-blue-900',
  transporte_ida: 'bg-purple-100 text-purple-900',
  transporte_volta: 'bg-violet-100 text-violet-900',
  cuidador: 'bg-green-100 text-green-900',
  outro: 'bg-zinc-100 text-zinc-700',
  general_help: 'bg-amber-100 text-amber-900',
  photography: 'bg-pink-100 text-pink-900',
  foster_support: 'bg-teal-100 text-teal-900',
  admin_tasks: 'bg-indigo-100 text-indigo-900',
});

// ─── Scope enum ────────────────────────────────────────────────────────────────
// shelter  → atribuição global para o abrigo
// pet      → scoped a um pet específico (pet_id preenchido)
// event_type → scoped a um tipo de evento (scope_value = 'exhibition', etc.)
// task_id  → scoped a uma tarefa/evento específico (scope_value = task/event id)
export const VOLUNTEER_ASSIGNMENT_SCOPES = Object.freeze([
  'shelter',
  'pet',
  'event_type',
  'task_id',
]);

export const VOLUNTEER_ASSIGNMENT_SCOPE_LABELS = Object.freeze({
  shelter: 'Abrigo (global)',
  pet: 'Pet específico',
  event_type: 'Tipo de evento',
  task_id: 'Tarefa/evento',
});

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const createVolunteerAssignmentSchema = z.object({
  volunteer_uid: z.string().min(1, 'volunteer_uid é obrigatório'),
  capability: z.enum(VOLUNTEER_ASSIGNMENT_CAPABILITIES, {
    errorMap: () => ({ message: 'capability inválida' }),
  }),
  scope: z.enum(VOLUNTEER_ASSIGNMENT_SCOPES).default('shelter'),
  scope_value: z.string().optional(), // pet_id | event_type | task_id
  starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'starts_at deve ser YYYY-MM-DD').optional(),
  ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ends_at deve ser YYYY-MM-DD').optional(),
  notes: z.string().max(500).optional(),
});

export const updateVolunteerAssignmentSchema = z.object({
  capability: z.enum(VOLUNTEER_ASSIGNMENT_CAPABILITIES).optional(),
  scope: z.enum(VOLUNTEER_ASSIGNMENT_SCOPES).optional(),
  scope_value: z.string().nullable().optional(),
  starts_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'starts_at deve ser YYYY-MM-DD')
    .nullable()
    .optional(),
  ends_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'ends_at deve ser YYYY-MM-DD')
    .nullable()
    .optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const listAssignmentsOptionsSchema = z.object({
  volunteerUid: z.string().optional(),
  capability: z.enum(VOLUNTEER_ASSIGNMENT_CAPABILITIES).optional(),
  scope: z.enum(VOLUNTEER_ASSIGNMENT_SCOPES).optional(),
  includeExpired: z.boolean().default(false),
  maxResults: z.number().int().min(1).max(1000).default(200),
});

/**
 * Verifica se uma atribuição está ativa na data informada.
 * Se starts_at/ends_at não estão definidos, considera-se ativa.
 */
export function isAssignmentActive(assignment, atDate = new Date()) {
  const now = atDate.toISOString().split('T')[0];
  if (assignment.starts_at && assignment.starts_at > now) return false;
  if (assignment.ends_at && assignment.ends_at < now) return false;
  return true;
}
