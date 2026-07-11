/**
 * @fileoverview Domínio: Central de Pendências (Kanban) — Fase 15.
 *
 * Define o modelo de dados do kanban de tarefas por abrigo:
 *  - Enums: tipos de card, prioridades
 *  - 4 colunas padrão (criadas automaticamente no primeiro acesso)
 *  - 8 cores pré-definidas para colunas
 *  - Schemas Zod para board / column / card / log entry
 *  - Helpers puros: computeBoardProgress, computeMyCards, sortCardsByOrder,
 *    canMoveCard, isCardOverdue, etc.
 *
 * Multi-tenant: cada board pertence a um único `shelter_club_id`. O
 * `shelter_club_id` é redundante em board/column/card (defense in depth).
 *
 * Coleções Firestore (em `clubs/{clubId}/...`):
 *   - kanban_boards/{boardId}
 *   - kanban_boards/{boardId}/kanban_columns/{columnId}
 *   - kanban_boards/{boardId}/kanban_cards/{cardId}
 *
 * Drag-and-drop: o cliente usa HTML5 DnD nativo (não dependemos de
 * @dnd-kit/core — feature flag-gated em `SHELTER_KANBAN`).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 15
 */

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────

/**
 * Tipos de card. Cada tipo tem um label e cor padrão (definidos em
 * `CARD_TYPE_LABELS` / `CARD_TYPE_COLORS` para uso na UI).
 */
export const KANBAN_CARD_TYPES = Object.freeze([
  'medication',         // Dose de medicação (linkada a um pet)
  'spay_neuter',        // Castração pendente
  'vaccine',            // Vacinação pendente
  'post_adoption_contact', // Contato de pós-adoção (Fase 6)
  'process',            // Processo administrativo (adoção, LGPD, etc.)
  'other',              // Genérico
]);

/**
 * Labels pt-BR para os tipos (UI).
 */
export const KANBAN_CARD_TYPE_LABELS = Object.freeze({
  medication: 'Medicação',
  spay_neuter: 'Castração',
  vaccine: 'Vacina',
  post_adoption_contact: 'Pós-adoção',
  process: 'Processo',
  other: 'Outro',
});

/**
 * Cores associadas aos tipos (classes Tailwind).
 */
export const KANBAN_CARD_TYPE_TONES = Object.freeze({
  medication: 'bg-blue-100 text-blue-900 border-blue-200',
  spay_neuter: 'bg-purple-100 text-purple-900 border-purple-200',
  vaccine: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  post_adoption_contact: 'bg-amber-100 text-amber-900 border-amber-200',
  process: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  other: 'bg-zinc-100 text-zinc-800 border-zinc-200',
});

/**
 * Níveis de prioridade.
 */
export const KANBAN_PRIORITIES = Object.freeze([
  'low',
  'medium',
  'high',
  'urgent',
]);

/**
 * Labels e tons pt-BR.
 */
export const KANBAN_PRIORITY_LABELS = Object.freeze({
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
});

export const KANBAN_PRIORITY_TONES = Object.freeze({
  low: 'bg-zinc-100 text-zinc-700',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-900',
  urgent: 'bg-red-100 text-red-900',
});

/**
 * 8 cores pré-definidas para colunas.
 */
export const KANBAN_COLUMN_COLORS = Object.freeze([
  '#94a3b8',  // slate-400
  '#3b82f6',  // blue-500
  '#10b981',  // emerald-500
  '#f59e0b',  // amber-500
  '#ef4444',  // red-500
  '#8b5cf6',  // violet-500
  '#ec4899',  // pink-500
  '#0ea5e9',  // sky-500
]);

/**
 * Retorna true se a cor está no palette pré-definido (ou é hex válida).
 */
export function isValidColumnColor(color) {
  if (typeof color !== 'string') return false;
  if (KANBAN_COLUMN_COLORS.includes(color)) return true;
  // Aceita hex (#rrggbb)
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

// ─── Default columns ──────────────────────────────────────────────────

/**
 * 4 colunas padrão criadas na primeira vez que o abrigo acessa o kanban.
 * São editáveis/removíveis depois. Os `id` aqui são "slots" lógicos —
 * ao materializar, geramos IDs reais e mantemos `order`.
 */
export const DEFAULT_COLUMN_SLUGS = Object.freeze([
  'pendente',
  'em_desenvolvimento',
  'revisao',
  'concluida',
]);

/**
 * Retorna array de 4 colunas padrão com defaults sane (cor, order,
 * responsible_uids=[]). Usado tanto pelo service (ao criar o board
 * default) quanto por testes.
 *
 * @param {string} [createdBy] - uid de quem está criando
 * @returns {Array<{slug: string, title: string, color: string, order: number, responsible_uids: string[]}>}
 */
export function defaultColumns(createdBy = null) {
  return [
    {
      slug: 'pendente',
      title: 'Pendente',
      color: KANBAN_COLUMN_COLORS[0], // slate
      order: 0,
      responsible_uids: [],
      created_by: createdBy,
    },
    {
      slug: 'em_desenvolvimento',
      title: 'Em desenvolvimento',
      color: KANBAN_COLUMN_COLORS[1], // blue
      order: 1,
      responsible_uids: [],
      created_by: createdBy,
    },
    {
      slug: 'revisao',
      title: 'Em revisão',
      color: KANBAN_COLUMN_COLORS[3], // amber
      order: 2,
      responsible_uids: [],
      created_by: createdBy,
    },
    {
      slug: 'concluida',
      title: 'Concluída',
      color: KANBAN_COLUMN_COLORS[2], // emerald
      order: 3,
      responsible_uids: [],
      created_by: createdBy,
    },
  ];
}

// ─── Sub-schemas ──────────────────────────────────────────────────────

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'cor deve ser hex (#rrggbb)');

const checklistItemSchema = z.object({
  text: z.string().min(1).max(300),
  done: z.boolean().default(false),
  uid: z.string().min(1).max(64), // id local estável (gerado no client)
}).strict();

const attachmentSchema = z.object({
  url: z.string().url().max(2048),
  name: z.string().min(1).max(300),
  type: z.string().max(80).optional(), // mime type
}).strict();

/**
 * Entrada do log de movimentação. Cada vez que o card muda de coluna,
 * um logEntry é appendado em `card.log`.
 */
export const logEntrySchema = z.object({
  from_column_id: z.string().max(128).nullable().optional(),
  to_column_id: z.string().min(1).max(128),
  by_uid: z.string().min(1).max(128),
  by_name: z.string().max(200).optional(),
  at: z.union([z.date(), z.string(), z.number()]).optional(), // Timestamp | string | ms
  comment: z.string().max(1000).nullable().optional(),
}).strict();

// ─── Schemas de Board ─────────────────────────────────────────────────

/**
 * Schema completo de um board.
 */
export const boardSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  is_default: z.boolean().default(false),
  is_archived: z.boolean().default(false),
  created_by: z.string().min(1).max(128),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

export const createBoardSchema = boardSchema.omit({
  created_at: true,
  updated_at: true,
}).strict();

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
  is_archived: z.boolean().optional(),
}).strict();

// ─── Schemas de Column ────────────────────────────────────────────────

export const columnSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  board_id: z.string().min(1).max(128),
  title: z.string().min(1).max(80),
  color: hexColorSchema,
  order: z.number().int().min(0).max(1000),
  responsible_uids: z.array(z.string().min(1).max(128)).max(50).default([]),
  wip_limit: z.number().int().min(0).max(1000).nullable().optional(),
  created_by: z.string().min(1).max(128),
  created_at: z.unknown().optional(),
}).strict();

export const createColumnSchema = columnSchema.omit({
  created_at: true,
}).strict();

export const updateColumnSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  color: hexColorSchema.optional(),
  order: z.number().int().min(0).max(1000).optional(),
  responsible_uids: z.array(z.string().min(1).max(128)).max(50).optional(),
  wip_limit: z.number().int().min(0).max(1000).nullable().optional(),
}).strict();

// ─── Schemas de Card ──────────────────────────────────────────────────

export const cardSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  board_id: z.string().min(1).max(128),
  column_id: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(KANBAN_CARD_TYPES).default('other'),
  priority: z.enum(KANBAN_PRIORITIES).default('medium'),
  assignees: z.array(z.string().min(1).max(128)).max(50).default([]),
  due_at: z.union([z.date(), z.string(), z.number()]).nullable().optional(),
  pet_id: z.string().max(128).nullable().optional(),
  pet_name: z.string().max(120).nullable().optional(),
  order: z.number().int().min(0).max(1_000_000).default(0),
  checklist: z.array(checklistItemSchema).max(200).default([]),
  attachments: z.array(attachmentSchema).max(50).default([]),
  log: z.array(logEntrySchema).max(500).default([]),
  is_archived: z.boolean().default(false),
  created_by: z.string().min(1).max(128),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

export const createCardSchema = cardSchema.omit({
  created_at: true,
  updated_at: true,
}).strict();

export const updateCardSchema = z.object({
  column_id: z.string().min(1).max(128).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(KANBAN_CARD_TYPES).optional(),
  priority: z.enum(KANBAN_PRIORITIES).optional(),
  assignees: z.array(z.string().min(1).max(128)).max(50).optional(),
  due_at: z.union([z.date(), z.string(), z.number()]).nullable().optional(),
  pet_id: z.string().max(128).nullable().optional(),
  pet_name: z.string().max(120).nullable().optional(),
  order: z.number().int().min(0).max(1_000_000).optional(),
  checklist: z.array(checklistItemSchema).max(200).optional(),
  attachments: z.array(attachmentSchema).max(50).optional(),
  is_archived: z.boolean().optional(),
}).strict();

/**
 * Schema de movimentação entre colunas.
 * `order` é a posição final desejada dentro da coluna destino.
 */
export const moveCardSchema = z.object({
  to_column_id: z.string().min(1).max(128),
  order: z.number().int().min(0).max(1_000_000).default(0),
  comment: z.string().max(1000).optional(),
}).strict();

// ─── Helpers puros ────────────────────────────────────────────────────

/**
 * Converte `due_at` (que pode ser Date | string ISO | ms number |
 * Timestamp do Firestore) em ms. Retorna null se inválido/ausente.
 *
 * @param {*} v
 * @returns {number|null}
 */
export function toMillis(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  // Firestore Timestamp tem toMillis()
  if (typeof v === 'object' && typeof v.toMillis === 'function') {
    try { return v.toMillis(); } catch { return null; }
  }
  if (typeof v === 'object' && typeof v.seconds === 'number') {
    return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  }
  return null;
}

/**
 * Card está overdue? Retorna true se tem `due_at` no passado e
 * NÃO está em uma coluna "concluída" (slug=concluida).
 *
 * @param {object} card
 * @param {string} [concludedColumnSlug] - slug identificador (default 'concluida')
 * @param {Date|number} [now]
 */
export function isCardOverdue(card, concludedColumnSlug = 'concluida', now = Date.now()) {
  if (!card) return false;
  const dueMs = toMillis(card.due_at);
  if (dueMs == null) return false;
  if (dueMs >= now) return false;
  // Não conta overdue se o card está em coluna "concluída"
  // (mas sem o slug, sempre conta — UI deve passar o slug correto)
  if (concludedColumnSlug && card.column_slug === concludedColumnSlug) return false;
  return true;
}

/**
 * Ordena cards por `order` asc, depois por `created_at` desc como
 * tiebreaker. **Não muta** o array.
 *
 * @template T
 * @param {T[]} cards
 * @returns {T[]}
 */
export function sortCardsByOrder(cards) {
  if (!Array.isArray(cards)) return [];
  return [...cards].sort((a, b) => {
    const oa = Number.isFinite(a?.order) ? a.order : 0;
    const ob = Number.isFinite(b?.order) ? b.order : 0;
    if (oa !== ob) return oa - ob;
    // tiebreaker: created_at desc
    const ca = toMillis(a?.created_at) || 0;
    const cb = toMillis(b?.created_at) || 0;
    return cb - ca;
  });
}

/**
 * Filtra cards onde `uid` é assignee. Se `uid` for null/empty, retorna [].
 *
 * @param {object[]} cards
 * @param {string|null|undefined} uid
 * @returns {object[]}
 */
export function computeMyCards(cards, uid) {
  if (!uid) return [];
  if (!Array.isArray(cards)) return [];
  return cards.filter((c) => Array.isArray(c?.assignees) && c.assignees.includes(uid));
}

/**
 * Computa progresso agregado de um board:
 *   - total: total de cards ativos (não arquivados)
 *   - byColumn: { [columnId]: count }
 *   - overdue: número de cards atrasados (não concluídos)
 *
 * @param {object} board - {id, columns: [...]}
 * @param {object[]} cards
 * @param {object} [options]
 * @param {string} [options.concludedColumnSlug='concluida']
 * @param {Date|number} [options.now]
 * @returns {{total: number, byColumn: Object<string, number>, overdue: number, byPriority: Object<string, number>}}
 */
export function computeBoardProgress(board, cards, options = {}) {
  const concludedSlug = options.concludedColumnSlug || 'concluida';
  const now = options.now ?? Date.now();
  const result = {
    total: 0,
    byColumn: {},
    overdue: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
  };

  // Inicializa contadores por coluna
  if (board && Array.isArray(board.columns)) {
    for (const col of board.columns) {
      if (col?.id) result.byColumn[col.id] = 0;
    }
  }

  if (!Array.isArray(cards)) return result;

  for (const c of cards) {
    if (c?.is_archived) continue;
    result.total += 1;
    if (c.column_id) {
      result.byColumn[c.column_id] = (result.byColumn[c.column_id] || 0) + 1;
    }
    if (c.priority && result.byPriority[c.priority] != null) {
      result.byPriority[c.priority] += 1;
    }
    if (isCardOverdue(c, concludedSlug, now)) {
      result.overdue += 1;
    }
  }

  return result;
}

/**
 * Pode mover um card entre colunas? Hoje a regra é simples:
 * - fromColumn e toColumn precisam existir
 * - uid precisa ser membro do board (assignee OU em `column.responsible_uids` OU ser owner do board) — mas o service é que decide
 * Aqui só validamos pré-condições de estrutura.
 *
 * @param {object} card
 * @param {object|null} fromCol - coluna de origem (pode ser null se for "create card")
 * @param {object|null} toCol - coluna destino
 * @param {string} [uid] - uid do usuário (informativo, regra real fica no service)
 * @returns {{ok: boolean, reason?: string}}
 */
export function canMoveCard(card, fromCol, toCol, _uid) {
  if (!card) return { ok: false, reason: 'card inválido' };
  if (!toCol) return { ok: false, reason: 'coluna destino inválida' };
  if (fromCol && fromCol.id === toCol.id) {
    // mover dentro da mesma coluna é OK (apenas reorder)
    return { ok: true };
  }
  return { ok: true };
}

/**
 * Verifica se a WIP limit de uma coluna foi atingida. Retorna:
 *   - 'ok'        → ainda cabe
 *   - 'at_limit'  → exatamente no limite
 *   - 'over'      → acima do limite
 *   - 'no_limit'  → sem limite configurado
 *
 * @param {object} column - {wip_limit?: number|null}
 * @param {number} cardCount
 * @returns {'ok' | 'at_limit' | 'over' | 'no_limit'}
 */
export function checkWipLimit(column, cardCount) {
  if (!column || column.wip_limit == null) return 'no_limit';
  if (!Number.isFinite(cardCount) || cardCount < 0) return 'no_limit';
  if (cardCount > column.wip_limit) return 'over';
  if (cardCount === column.wip_limit) return 'at_limit';
  return 'ok';
}

/**
 * Adiciona uma entrada de log a um card (imutável — retorna novo objeto).
 * O service usa isto ao mover um card.
 *
 * @param {object} card
 * @param {object} entry - {from_column_id, to_column_id, by_uid, by_name, at, comment}
 * @returns {object} novo objeto card com log appendado
 */
export function appendLogEntry(card, entry) {
  if (!card) return card;
  const parsed = logEntrySchema.parse(entry);
  const log = Array.isArray(card.log) ? [...card.log, parsed] : [parsed];
  return { ...card, log };
}

/**
 * Helper: cria o payload default de card (campos opcionais preenchidos).
 * Útil para a UI mostrar um form pré-preenchido.
 */
export function emptyCardDraft({ shelterClubId, boardId, columnId, createdBy }) {
  return {
    shelter_club_id: shelterClubId,
    board_id: boardId,
    column_id: columnId,
    title: '',
    description: '',
    type: 'other',
    priority: 'medium',
    assignees: [],
    due_at: null,
    pet_id: null,
    pet_name: null,
    order: 0,
    checklist: [],
    attachments: [],
    log: [],
    is_archived: false,
    created_by: createdBy,
  };
}

/**
 * Formata uma entrada de log para exibição na UI. Mostra:
 * "Criado em <col>" / "Movido de <col1> → <col2>".
 *
 * @param {object} entry
 * @param {Array<{id, title}>} columns
 * @returns {string}
 */
export function formatKanbanLogEntry(entry, columns = []) {
  if (!entry) return '';
  const toCol = columns.find((c) => c.id === entry.to_column_id);
  const toTitle = toCol?.title || entry.to_column_id || '?';
  if (!entry.from_column_id) return `Criado em "${toTitle}"`;
  const fromCol = columns.find((c) => c.id === entry.from_column_id);
  const fromTitle = fromCol?.title || entry.from_column_id || '?';
  return `Movido de "${fromTitle}" → "${toTitle}"`;
}

/**
 * Retorna um item de checklist vazio.
 */
export function emptyChecklistItem(uid = null) {
  return { text: '', done: false, uid: uid || `ck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
}

/**
 * Alias semântico de emptyChecklistItem.
 */
export function defaultChecklistItem(uid = null) {
  return emptyChecklistItem(uid);
}

// ─── Schemas compostos / re-exports para conveniência ────────────────

export const KANBAN_DOMAINS = Object.freeze({
  KANBAN_CARD_TYPES,
  KANBAN_CARD_TYPE_LABELS,
  KANBAN_CARD_TYPE_TONES,
  KANBAN_PRIORITIES,
  KANBAN_PRIORITY_LABELS,
  KANBAN_PRIORITY_TONES,
  KANBAN_COLUMN_COLORS,
  DEFAULT_COLUMN_SLUGS,
});
