/**
 * @fileoverview Domínio: Central de Pendências / Kanban (Fase 15).
 *
 * Define o modelo de dados e lógica de negócio do sistema de kanban
 * para gestão de tarefas do abrigo.
 *
 * Multi-tenant: todas as coleções vivem como subcoleção de clubs:
 *   `clubs/{clubId}/kanban_boards/{boardId}`
 *   `clubs/{clubId}/kanban_columns/{columnId}`
 *   `clubs/{clubId}/kanban_cards/{cardId}`
 *
 * Recursos:
 *   - Boards customizáveis (1+ por abrigo)
 *   - Colunas configuráveis (título, cor, ordem, responsáveis)
 *   - Cards com tipo, prioridade, responsáveis, checklist, due date
 *   - Log completo de movimentações (de qual coluna → qual coluna)
 *   - Integração com post-adoption via `source_task_id` (opcional)
 *   - Drag-and-drop via @dnd-kit (componente, não domain)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14 (Kanban)
 */

import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────────────

/** Status do board */
export const BOARD_STATUS = Object.freeze(['active', 'archived']);

/** Tipos de card */
export const CARD_TYPE = Object.freeze([
  'medication',             // Medicação do animal
  'spay_neuter',            // Castração
  'vaccine',                // Vacinação
  'post_adoption_contact',  // Contato pós-adoção
  'process',                // Processo administrativo
  'other',                  // Outro tipo
]);

/** Prioridade do card */
export const CARD_PRIORITY = Object.freeze(['low', 'medium', 'high', 'urgent']);

/** Status do card ( ciclo do card ) */
export const CARD_STATUS = Object.freeze(['open', 'in_progress', 'resolved', 'cancelled']);

// ─── Labels e Cores ─────────────────────────────────────────────────────

export const CARD_PRIORITY_LABELS = Object.freeze({
  low:    'Baixa',
  medium: 'Média',
  high:   'Alta',
  urgent: 'Urgente',
});

export const CARD_PRIORITY_COLORS = Object.freeze({
  low:    '#6B7280',
  medium: '#F59E0B',
  high:   '#EF4444',
  urgent: '#7C3AED',
});

export const CARD_STATUS_LABELS = Object.freeze({
  open:       'Aberto',
  in_progress: 'Em Progresso',
  resolved:   'Resolvido',
  cancelled:  'Cancelado',
});

export const CARD_TYPE_LABELS = Object.freeze({
  medication:            'Medicação',
  spay_neuter:           'Castração',
  vaccine:               'Vacina',
  post_adoption_contact: 'Contato Pós-Adoção',
  process:               'Processo',
  other:                 'Outro',
});

// ─── Colunas Default ───────────────────────────────────────────────────

/**
 * Colunas criadas por padrão ao se criar um board.
 * Cada objeto pode ser passado direto para createColumnSchema.
 */
export const DEFAULT_COLUMNS = Object.freeze([
  { title: 'Pendente',     color: '#6B7280', order: 0, responsible_uids: [] },
  { title: 'Em Progresso', color: '#3B82F6', order: 1, responsible_uids: [] },
  { title: 'Bloqueado',    color: '#EF4444', order: 2, responsible_uids: [] },
  { title: 'Concluído',    color: '#22C55E', order: 3, responsible_uids: [] },
]);

// ─── Schemas Zod ─────────────────────────────────────────────────────────

// ── Board ───────────────────────────────────────────────────────────────

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  default_view: z.enum(['board', 'list']).default('board'),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  default_view: z.enum(['board', 'list']).optional(),
});

// ── Column ──────────────────────────────────────────────────────────────

export const createColumnSchema = z.object({
  board_id: z.string().min(1),
  title: z.string().min(1, 'Título é obrigatório').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor hexadecimal').default('#6B7280'),
  order: z.number().int().min(0).default(0),
  responsible_uids: z.array(z.string()).default([]),
});

export const updateColumnSchema = z.object({
  title: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
  responsible_uids: z.array(z.string()).optional(),
});

// ── Card ────────────────────────────────────────────────────────────────

const checklistItemSchema = z.object({
  id:   z.string(),
  text: z.string().min(1),
  done: z.boolean().default(false),
}).strict();

const attachmentSchema = z.object({
  id:   z.string(),
  name: z.string(),
  url:  z.string().url(),
  type: z.string(),
}).strict();

/** Log de uma movimentação entre colunas */
const cardMoveLogSchema = z.object({
  id:             z.string(),
  action:        z.enum(['moved', 'created', 'updated', 'status_changed', 'assigned', 'checklist_updated']),
  from_column_id: z.string().nullable().default(null),
  to_column_id:   z.string().nullable().default(null),
  by_uid:        z.string(),
  at:            z.string(), // ISO 8601
  note:          z.string().nullable().default(null),
}).strict();

export const createCardSchema = z.object({
  board_id: z.string().min(1),
  column_id: z.string().min(1),
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(5000).default(''),
  type: z.enum(CARD_TYPE).default('other'),
  assignees: z.array(z.string()).default([]),
  due_at: z.string().nullable().default(null),
  priority: z.enum(CARD_PRIORITY).default('medium'),
  checklist: z.array(checklistItemSchema).default([]),
  attachments: z.array(attachmentSchema).default([]),
  source_task_id: z.string().nullable().default(null),
  order: z.number().int().min(0).default(0),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(CARD_TYPE).optional(),
  assignees: z.array(z.string()).optional(),
  due_at: z.string().nullable().optional(),
  priority: z.enum(CARD_PRIORITY).optional(),
  status: z.enum(CARD_STATUS).optional(),
  checklist: z.array(checklistItemSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

export const moveCardSchema = z.object({
  target_column_id: z.string().min(1),
  new_order: z.number().int().min(0).default(0),
  note: z.string().max(500).nullable().default(null),
}).strict();

export const addChecklistItemSchema = z.object({
  text: z.string().min(1, 'Texto do item é obrigatório').max(300),
}).strict();

// ─── Helpers puros ─────────────────────────────────────────────────────

/**
 * Gera um ID único para log entry.
 */
export function generateLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Gera ID de item de checklist.
 */
export function generateChecklistItemId() {
  return `cl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Gera ID de attachment.
 */
export function generateAttachmentId() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Verifica se o card está em uma coluna terminal (concluída ou cancelada).
 * Usado para desabilitar drag em colunas de destino terminal.
 */
export function isColumnTerminal(columnTitle) {
  return columnTitle === 'Concluído' || columnTitle === 'Cancelado';
}

/**
 * Verifica se o uid é assignee do card.
 */
export function isCardAssignee(card, uid) {
  return Boolean(card?.assignees?.includes(uid));
}

/**
 * Verifica se o uid é responsável pela coluna.
 */
export function isColumnResponsible(column, uid) {
  return Boolean(column?.responsible_uids?.includes(uid));
}

/**
 * Verifica se o card está overdue (due_at no passado).
 */
export function isCardOverdue(card) {
  if (!card?.due_at) return false;
  return new Date(card.due_at) < new Date();
}

/**
 * Calcula a porcentagem de checklist concluído.
 */
export function checklistProgress(card) {
  if (!card?.checklist || card.checklist.length === 0) return 0;
  const done = card.checklist.filter((item) => item.done).length;
  return Math.round((done / card.checklist.length) * 100);
}

/**
 * Conta quantos cards estão "abertos" (não resolved, não cancelled).
 */
export function countOpenCards(cards) {
  return (cards || []).filter(
    (c) => c.status !== 'resolved' && c.status !== 'cancelled',
  ).length;
}

/**
 * Agrupa cards por column_id para renderização do board.
 * Retorna Map<columnId, Card[]>.
 */
export function groupCardsByColumn(cards) {
  const map = new Map();
  for (const card of cards || []) {
    const col = card.column_id;
    if (!map.has(col)) map.set(col, []);
    map.get(col).push(card);
  }
  // Ordena cards dentro de cada coluna por `order`
  for (const [, colCards] of map) {
    colCards.sort((a, b) => a.order - b.order);
  }
  return map;
}

/**
 * Prepara o log de movimentação entre colunas para ser pushado no array.
 */
export function buildMoveLog(cardId, fromColumnId, toColumnId, byUid, note = null) {
  return {
    id:              generateLogId(),
    action:          'moved',
    from_column_id:  fromColumnId,
    to_column_id:    toColumnId,
    by_uid:          byUid,
    at:              new Date().toISOString(),
    note,
  };
}

/**
 * Prepara o log de criação de card.
 */
export function buildCreateLog(cardId, columnId, byUid) {
  return {
    id:             generateLogId(),
    action:         'created',
    from_column_id: null,
    to_column_id:   columnId,
    by_uid:         byUid,
    at:             new Date().toISOString(),
    note:           null,
  };
}

/**
 * Prepara o log de mudança de status.
 */
export function buildStatusChangeLog(cardId, newStatus, byUid, note = null) {
  return {
    id:             generateLogId(),
    action:         'status_changed',
    from_column_id: null,
    to_column_id:   null,
    by_uid:         byUid,
    at:             new Date().toISOString(),
    note:           note || `Status alterado para: ${newStatus}`,
  };
}

/**
 * Valida que o campo type é um CARD_TYPE válido.
 */
export function isValidCardType(type) {
  return CARD_TYPE.includes(type);
}

/**
 * Valida que o campo priority é um CARD_PRIORITY válido.
 */
export function isValidCardPriority(priority) {
  return CARD_PRIORITY.includes(priority);
}
