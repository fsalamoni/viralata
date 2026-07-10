/**
 * @fileoverview Domínio: Pós-adoção (Fase 6)
 *
 * Define a estrutura de milestones de pós-adoção e o template das tasks
 * materializadas. Padrão CRON (seção 11.4 do roadmap):
 *  - Armazenar `adoption_date` + `milestones[]` (config estática)
 *  - Cloud Function agendada (CRON diário) materializa tasks dinamicamente
 *  - Idempotência: tasks materializadas uma vez não duplicam
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 6 + § 11.4
 */

import { z } from 'zod';

// ─── Milestone types ────────────────────────────────────────────────────

export const POST_ADOPTION_MILESTONE_TYPES = Object.freeze([
  'check_in',           // Check-in de bem-estar
  'vaccine_reminder',   // Lembrete de vacina/reforço
  'weight_measurement', // Solicitação de pesagem
  'photo_request',      // Pedido de foto
  'home_visit',         // Visita agendada
  'vet_followup',       // Consulta veterinária
  'training',           // Sessão de adestramento
  'document_update',    // Atualização cadastral
  'birthday',           // Aniversário do pet (anual)
  'adoption_anniversary', // Aniversário da adoção
  'reactivation',       // Reativação (se o adotante sumiu)
]);

// ─── Templates padrão (Fase 6 inicial) ─────────────────────────────────

/**
 * Milestones padrão que o sistema cria quando uma adoção é aprovada.
 * Cada abrigo pode customizar (Fase 18+ permite override).
 */
export const DEFAULT_MILESTONES = Object.freeze([
  { type: 'check_in',     days_after: 7,    title: '1ª semana: Como está o pet?' },
  { type: 'check_in',     days_after: 21,   title: '3 semanas: Adaptação inicial' },
  { type: 'vet_followup', days_after: 30,   title: '1 mês: Consulta veterinária' },
  { type: 'photo_request', days_after: 60,  title: '2 meses: Pedir foto atual' },
  { type: 'vaccine_reminder', days_after: 90, title: '3 meses: Lembrete de reforço' },
  { type: 'check_in',     days_after: 90,   title: '3 meses: Acompanhamento' },
  { type: 'check_in',     days_after: 180,  title: '6 meses: Adaptação avançada' },
  { type: 'check_in',     days_after: 365,  title: '1 ano: Aniversário de adoção' },
  { type: 'check_in',     days_after: 730,  title: '2 anos: Acompanhamento longo prazo' },
  { type: 'check_in',     days_after: 1095, title: '3 anos: Última visita padrão' },
]);

// ─── Schemas ────────────────────────────────────────────────────────────

const milestoneSchema = z.object({
  type: z.enum(POST_ADOPTION_MILESTONE_TYPES),
  days_after: z.number().int().min(0).max(365 * 10),  // até 10 anos
  title: z.string().min(1).max(200),
  template_id: z.string().max(80).optional(),
}).strict();

/**
 * Schema da adoption. Estende o application (Fase 3) com os campos de
 * pós-adoção. Em produção, isso é um doc separado
 * `clubs/{clubId}/post_adoption/{adoptionId}` que referencia o application.
 */
export const postAdoptionSchema = z.object({
  application_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  adopter_uid: z.string().min(1).max(128),
  adoption_date: z.string().datetime(),            // ISO 8601
  milestones: z.array(milestoneSchema).max(50),
  // Materialização
  materialized_count: z.number().int().nonnegative().default(0),
  last_materialized_at: z.string().datetime().optional(),
  // Status
  status: z.enum(['active', 'paused', 'completed', 'returned', 'cancelled'])
    .default('active'),
  // Custódia (se devolvido)
  returned_at: z.string().datetime().optional(),
  return_reason: z.string().max(1000).optional(),
  // Auditoria
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema da task materializada no Kanban (Fase 15). Cada milestone
 * gera um doc em `clubs/{clubId}/kanban/{boardId}/tasks/{taskId}`.
 */
export const postAdoptionTaskSchema = z.object({
  post_adoption_id: z.string().min(1).max(128),  // FK para postAdoption
  application_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  pet_id: z.string().min(1).max(128),
  adopter_uid: z.string().min(1).max(128),
  type: z.enum(POST_ADOPTION_MILESTONE_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  // Quando deve ser feita
  scheduled_for: z.string().datetime(),
  // Quando foi materializada
  materialized_at: z.string().datetime(),
  // Origem
  source_milestone_index: z.number().int().nonnegative(),
  // Status
  status: z.enum(['pending', 'in_progress', 'done', 'skipped']).default('pending'),
  completed_at: z.string().datetime().optional(),
  completed_by_uid: z.string().max(128).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Calcula a data agendada de um milestone a partir da data de adoção.
 * Útil para o CRON decidir se deve materializar agora.
 *
 * @param {string} adoptionDate - ISO 8601
 * @param {number} daysAfter
 * @returns {string} ISO 8601
 */
export function calculateMilestoneDate(adoptionDate, daysAfter) {
  const base = new Date(adoptionDate);
  base.setUTCDate(base.getUTCDate() + daysAfter);
  return base.toISOString();
}

/**
 * Decide se um milestone deve ser materializado. Critério:
 * 1. scheduled_for <= now (já passou)
 * 2. scheduled_for <= now + 90 dias (buffer — para garantir que o
 *    CRON não perca tasks se ficar fora 1-2 dias)
 *
 * @param {object} milestone - {scheduled_for: ISO 8601}
 * @param {Date} [now] - data de referência (default: now)
 * @returns {boolean}
 */
export function shouldMaterialize(milestone, now = new Date()) {
  const scheduled = new Date(milestone.scheduled_for);
  if (scheduled > now) return false;
  // Buffer de 90 dias para garantir resiliência do CRON
  const bufferMs = 90 * 24 * 60 * 60 * 1000;
  return scheduled.getTime() <= now.getTime() + bufferMs;
}

/**
 * Conta quantos milestones estão "passados" (já deviam ter sido
 * materializados). Útil para dashboards.
 */
export function countOverdueMilestones(milestones, now = new Date()) {
  return milestones.filter((m) => {
    const scheduled = new Date(m.scheduled_for);
    return scheduled < now;
  }).length;
}

/**
 * Conta quantos milestones estão "a caminho" (próximos 30 dias).
 */
export function countUpcomingMilestones(milestones, now = new Date()) {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return milestones.filter((m) => {
    const scheduled = new Date(m.scheduled_for);
    return scheduled > now && scheduled.getTime() - now.getTime() < thirtyDaysMs;
  }).length;
}

/**
 * Gera os milestones padrão a partir de uma data de adoção.
 */
export function generateDefaultMilestones(adoptionDate) {
  return DEFAULT_MILESTONES.map((m, i) => ({
    ...m,
    source_milestone_index: i,
    scheduled_for: calculateMilestoneDate(adoptionDate, m.days_after),
    materialized: false,
    materialized_task_id: null,
  }));
}
