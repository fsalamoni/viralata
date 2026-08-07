/**
 * @fileoverview Domínio: Tarefas do abrigo (painel Kanban operacional).
 *
 * Fases (fixas): Pendentes → Em desenvolvimento → Aguardando Terceiros →
 * Concluídas → Arquivadas.
 *
 * Cada tarefa é um documento em `clubs/{clubId}/tasks/{taskId}` com todos os
 * seus dados. O histórico amigável (timeline) fica no array `activity` do
 * próprio doc (visível a qualquer membro). O log de auditoria completo fica
 * na subcoleção `clubs/{clubId}/tasks/{taskId}/task_logs` (só atribuição
 * maior — regra de leitura restrita).
 *
 * Este arquivo é PURO (sem Firestore) para ser facilmente testável: define
 * fases, schemas (zod), validações de transição e helpers de prazo/atividade.
 */
import { z } from 'zod';

// ─── Fases ──────────────────────────────────────────────────────────────
export const TASK_PHASE = Object.freeze({
  PENDING: 'pending',
  IN_DEVELOPMENT: 'in_development',
  AWAITING_THIRD_PARTY: 'awaiting_third_party',
  DONE: 'done',
  ARCHIVED: 'archived',
});

export const TASK_PHASE_ORDER = [
  TASK_PHASE.PENDING,
  TASK_PHASE.IN_DEVELOPMENT,
  TASK_PHASE.AWAITING_THIRD_PARTY,
  TASK_PHASE.DONE,
  TASK_PHASE.ARCHIVED,
];

export const TASK_PHASE_LABEL = Object.freeze({
  [TASK_PHASE.PENDING]: 'Pendentes',
  [TASK_PHASE.IN_DEVELOPMENT]: 'Em desenvolvimento',
  [TASK_PHASE.AWAITING_THIRD_PARTY]: 'Aguardando Terceiros',
  [TASK_PHASE.DONE]: 'Concluídas',
  [TASK_PHASE.ARCHIVED]: 'Arquivadas',
});

export const TASK_PHASE_COLOR = Object.freeze({
  [TASK_PHASE.PENDING]: 'slate',
  [TASK_PHASE.IN_DEVELOPMENT]: 'sky',
  [TASK_PHASE.AWAITING_THIRD_PARTY]: 'amber',
  [TASK_PHASE.DONE]: 'emerald',
  [TASK_PHASE.ARCHIVED]: 'zinc',
});

export function isValidPhase(phase) {
  return TASK_PHASE_ORDER.includes(phase);
}

// ─── Tipos de atividade (timeline) ──────────────────────────────────────
export const TASK_ACTIVITY = Object.freeze({
  CREATED: 'created',
  MOVED: 'moved',
  RESPONSIBLE_SET: 'responsible_set',
  THIRD_PARTY_ADDED: 'third_party_added',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  EDITED: 'edited',
  ATTACHMENT_ADDED: 'attachment_added',
});

// ─── Schemas ────────────────────────────────────────────────────────────

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().max(200).default('anexo'),
  content_type: z.string().max(120).optional().nullable(),
  size: z.number().nonnegative().optional().nullable(),
});

/** Criação: título obrigatório; descrição, prazo e anexos opcionais. */
export const createTaskSchema = z.object({
  title: z.string().trim().min(2, 'Título é obrigatório (mín. 2 caracteres)').max(200),
  description: z.string().trim().max(4000).optional().default(''),
  due_at: z.string().optional().nullable(),
  attachments: z.array(attachmentSchema).max(20).optional().default([]),
});

/** Edição dos campos base da tarefa. */
export const editTaskSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  due_at: z.string().optional().nullable(),
});

/** Transição → Em desenvolvimento: exige responsável (uid ou nome). */
export const toInDevelopmentSchema = z.object({
  responsible_uid: z.string().optional().nullable(),
  responsible_name: z.string().trim().min(1, 'Informe o responsável').max(160),
});

/** Entrada de terceiro (Aguardando Terceiros). */
export const thirdPartySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome/título do terceiro').max(200),
  delivery_method: z.string().trim().min(1, 'Informe a forma de remessa').max(200),
  expectation: z.string().trim().min(1, 'Descreva o que se espera do terceiro').max(2000),
  expected_return_at: z.string().min(1, 'Informe o prazo esperado para retorno'),
});

/** Transição → Concluídas: exige descrição do que foi realizado. */
export const toDoneSchema = z.object({
  completion_note: z.string().trim().min(1, 'Descreva o que foi realizado').max(4000),
  attachments: z.array(attachmentSchema).max(20).optional().default([]),
});

/** Transição → Arquivadas: exige justificativa. */
export const toArchivedSchema = z.object({
  archive_reason: z.string().trim().min(1, 'Justifique o arquivamento').max(2000),
});

/**
 * Valida os dados obrigatórios para mover a tarefa até `toPhase`.
 * Retorna os dados normalizados (ou lança ZodError). Fases que não exigem
 * dados (ex.: voltar para Pendentes) retornam {}.
 */
export function validateTransition(toPhase, data = {}) {
  switch (toPhase) {
    case TASK_PHASE.IN_DEVELOPMENT:
      return { kind: 'in_development', data: toInDevelopmentSchema.parse(data) };
    case TASK_PHASE.AWAITING_THIRD_PARTY:
      return { kind: 'awaiting_third_party', data: thirdPartySchema.parse(data) };
    case TASK_PHASE.DONE:
      return { kind: 'done', data: toDoneSchema.parse(data) };
    case TASK_PHASE.ARCHIVED:
      return { kind: 'archived', data: toArchivedSchema.parse(data) };
    case TASK_PHASE.PENDING:
      return { kind: 'pending', data: {} };
    default:
      throw new Error(`Fase inválida: ${toPhase}`);
  }
}

// ─── Helpers de prazo ───────────────────────────────────────────────────

function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Um terceiro está com prazo vencido se seu expected_return_at já passou. */
export function isThirdPartyOverdue(tp, now = Date.now()) {
  const ms = toMillis(tp?.expected_return_at);
  return ms != null && ms < now;
}

/**
 * A tarefa tem prazo de terceiro vencido? (só relevante na fase Aguardando
 * Terceiros, mas calculável de forma independente da fase).
 */
export function taskHasOverdueThirdParty(task, now = Date.now()) {
  const list = Array.isArray(task?.third_parties) ? task.third_parties : [];
  return list.some((tp) => isThirdPartyOverdue(tp, now));
}

/** A tarefa (prazo próprio) está vencida? */
export function isTaskOverdue(task, now = Date.now()) {
  if (!task?.due_at) return false;
  if (task.phase === TASK_PHASE.DONE || task.phase === TASK_PHASE.ARCHIVED) return false;
  const ms = toMillis(task.due_at);
  return ms != null && ms < now;
}

// ─── Ids / atividade ────────────────────────────────────────────────────

/** Gera um id curto para entradas de terceiro / atividade. */
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Monta uma entrada de atividade (timeline) da tarefa.
 * @param {string} type TASK_ACTIVITY.*
 * @param {{uid?:string,name?:string}} actor
 * @param {string} message texto amigável
 * @param {object} [meta] metadados adicionais
 */
export function buildActivity(type, actor, message, meta = {}) {
  const entry = {
    id: genId('act'),
    type,
    at: new Date().toISOString(),
    by_uid: actor?.uid || null,
    by_name: actor?.name || actor?.displayName || 'Membro',
    message: message || '',
  };
  if (meta && Object.keys(meta).length > 0) entry.meta = meta;
  return entry;
}
