/**
 * @fileoverview Testes do domínio de Kanban (Fase 15).
 *
 * Cobre:
 * - Enums (KANBAN_CARD_TYPES, KANBAN_PRIORITIES, KANBAN_COLUMN_COLORS)
 * - defaultColumns (4 colunas, ordem 0..3, slugs esperados)
 * - Schemas Zod (board/column/card/log/moveCard)
 * - toMillis (Date/string/number/Firestore Timestamp)
 * - isCardOverdue (com/sem coluna concluída)
 * - sortCardsByOrder (não muta, tiebreaker por created_at)
 * - computeMyCards (filtra por uid)
 * - computeBoardProgress (total/byColumn/overdue/byPriority)
 * - canMoveCard (validação estrutural)
 * - checkWipLimit (ok/at_limit/over/no_limit)
 * - appendLogEntry (imutável)
 * - emptyCardDraft
 */

import { describe, it, expect } from 'vitest';

const {
  KANBAN_CARD_TYPES,
  KANBAN_CARD_TYPE_LABELS,
  KANBAN_CARD_TYPE_TONES,
  KANBAN_PRIORITIES,
  KANBAN_PRIORITY_LABELS,
  KANBAN_PRIORITY_TONES,
  KANBAN_COLUMN_COLORS,
  DEFAULT_COLUMN_SLUGS,
  isValidColumnColor,
  defaultColumns,
  boardSchema,
  createBoardSchema,
  updateBoardSchema,
  columnSchema,
  createColumnSchema,
  updateColumnSchema,
  cardSchema,
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  logEntrySchema,
  toMillis,
  isCardOverdue,
  sortCardsByOrder,
  computeMyCards,
  computeBoardProgress,
  canMoveCard,
  checkWipLimit,
  appendLogEntry,
  emptyCardDraft,
  formatKanbanLogEntry,
  emptyChecklistItem,
  defaultChecklistItem,
} = await import('./kanban');

// ─── Enums e constantes ────────────────────────────────────────────────

describe('KANBAN_CARD_TYPES', () => {
  it('tem 6 tipos incluindo medication, spay_neuter, vaccine, post_adoption_contact, process, other', () => {
    expect(KANBAN_CARD_TYPES.length).toBe(6);
    expect(KANBAN_CARD_TYPES).toEqual(
      expect.arrayContaining([
        'medication', 'spay_neuter', 'vaccine',
        'post_adoption_contact', 'process', 'other',
      ]),
    );
  });
});

describe('KANBAN_CARD_TYPE_LABELS / TONES', () => {
  it('labels pt-BR para todos os 6 tipos', () => {
    expect(Object.keys(KANBAN_CARD_TYPE_LABELS).length).toBe(6);
    expect(KANBAN_CARD_TYPE_LABELS.medication).toBe('Medicação');
    expect(KANBAN_CARD_TYPE_LABELS.spay_neuter).toBe('Castração');
  });
  it('tones (classes Tailwind) para todos os 6 tipos', () => {
    expect(Object.keys(KANBAN_CARD_TYPE_TONES).length).toBe(6);
  });
});

describe('KANBAN_PRIORITIES', () => {
  it('tem 4 níveis: low, medium, high, urgent', () => {
    expect(KANBAN_PRIORITIES).toEqual(['low', 'medium', 'high', 'urgent']);
  });
  it('labels pt-BR para os 4 níveis', () => {
    expect(KANBAN_PRIORITY_LABELS.low).toBe('Baixa');
    expect(KANBAN_PRIORITY_LABELS.urgent).toBe('Urgente');
  });
  it('tones para os 4 níveis', () => {
    expect(Object.keys(KANBAN_PRIORITY_TONES).length).toBe(4);
  });
});

describe('KANBAN_COLUMN_COLORS', () => {
  it('tem 8 cores hex pré-definidas', () => {
    expect(KANBAN_COLUMN_COLORS.length).toBe(8);
    for (const c of KANBAN_COLUMN_COLORS) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('isValidColumnColor', () => {
  it('aceita cores do palette', () => {
    expect(isValidColumnColor(KANBAN_COLUMN_COLORS[0])).toBe(true);
  });
  it('aceita hex genérico', () => {
    expect(isValidColumnColor('#abcdef')).toBe(true);
  });
  it('rejeita hex inválido', () => {
    expect(isValidColumnColor('#xyz')).toBe(false);
    expect(isValidColumnColor('red')).toBe(false);
    expect(isValidColumnColor(null)).toBe(false);
  });
});

// ─── defaultColumns ───────────────────────────────────────────────────

describe('defaultColumns', () => {
  it('retorna 4 colunas com order 0..3 e slugs esperados', () => {
    const cols = defaultColumns('user-1');
    expect(cols.length).toBe(4);
    expect(cols.map((c) => c.slug)).toEqual(DEFAULT_COLUMN_SLUGS);
    expect(cols.map((c) => c.order)).toEqual([0, 1, 2, 3]);
    for (const c of cols) {
      expect(c.title).toBeTruthy();
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c.responsible_uids).toEqual([]);
    }
  });
  it('registra created_by', () => {
    const cols = defaultColumns('user-x');
    for (const c of cols) expect(c.created_by).toBe('user-x');
  });
});

// ─── Schemas Zod ───────────────────────────────────────────────────────

const validBoard = {
  shelter_club_id: 'club-1',
  title: 'Operação 2026',
  description: 'Board principal',
  is_default: true,
  is_archived: false,
  created_by: 'user-1',
};

describe('boardSchema', () => {
  it('aceita board válido', () => {
    expect(() => boardSchema.parse(validBoard)).not.toThrow();
  });
  it('rejeita title vazio', () => {
    expect(() => boardSchema.parse({ ...validBoard, title: '' })).toThrow();
  });
  it('rejeita shelter_club_id ausente', () => {
    const { shelter_club_id, ...rest } = validBoard;
    expect(() => boardSchema.parse(rest)).toThrow();
  });
});

describe('createBoardSchema', () => {
  it('não exige created_at/updated_at', () => {
    expect(() => createBoardSchema.parse(validBoard)).not.toThrow();
  });
});

describe('updateBoardSchema', () => {
  it('aceita update vazio (no-op)', () => {
    expect(() => updateBoardSchema.parse({})).not.toThrow();
  });
  it('aceita apenas title', () => {
    expect(() => updateBoardSchema.parse({ title: 'Novo' })).not.toThrow();
  });
});

const validColumn = {
  shelter_club_id: 'club-1',
  board_id: 'board-1',
  title: 'Pendente',
  color: '#94a3b8',
  order: 0,
  responsible_uids: ['user-1'],
  wip_limit: 5,
  created_by: 'user-1',
};

describe('columnSchema', () => {
  it('aceita column válida', () => {
    expect(() => columnSchema.parse(validColumn)).not.toThrow();
  });
  it('rejeita color não-hex', () => {
    expect(() => columnSchema.parse({ ...validColumn, color: 'red' })).toThrow();
  });
  it('rejeita order negativo', () => {
    expect(() => columnSchema.parse({ ...validColumn, order: -1 })).toThrow();
  });
  it('aceita wip_limit null', () => {
    expect(() => columnSchema.parse({ ...validColumn, wip_limit: null })).not.toThrow();
  });
});

describe('createColumnSchema / updateColumnSchema', () => {
  it('create não exige created_at', () => {
    expect(() => createColumnSchema.parse(validColumn)).not.toThrow();
  });
  it('update aceita parcial', () => {
    expect(() => updateColumnSchema.parse({ title: 'X' })).not.toThrow();
  });
});

const validCard = {
  shelter_club_id: 'club-1',
  board_id: 'board-1',
  column_id: 'col-1',
  title: 'Vacinar Rex',
  description: 'V10 + antirrábica',
  type: 'vaccine',
  priority: 'high',
  assignees: ['user-1', 'user-2'],
  due_at: '2026-08-01T10:00:00Z',
  pet_id: 'pet-1',
  pet_name: 'Rex',
  order: 0,
  checklist: [{ text: 'Comprar vacina', done: false, uid: 'ck-1' }],
  attachments: [],
  log: [],
  is_archived: false,
  created_by: 'user-1',
};

describe('cardSchema', () => {
  it('aceita card válido', () => {
    expect(() => cardSchema.parse(validCard)).not.toThrow();
  });
  it('rejeita type inválido', () => {
    expect(() => cardSchema.parse({ ...validCard, type: 'invalid' })).toThrow();
  });
  it('rejeita priority inválida', () => {
    expect(() => cardSchema.parse({ ...validCard, priority: 'extreme' })).toThrow();
  });
  it('aceita due_at como Date / string / number / null', () => {
    expect(() => cardSchema.parse({ ...validCard, due_at: new Date() })).not.toThrow();
    expect(() => cardSchema.parse({ ...validCard, due_at: Date.now() })).not.toThrow();
    expect(() => cardSchema.parse({ ...validCard, due_at: null })).not.toThrow();
  });
  it('rejeita checklist item sem text', () => {
    expect(() => cardSchema.parse({
      ...validCard,
      checklist: [{ done: false, uid: 'x' }],
    })).toThrow();
  });
});

describe('createCardSchema', () => {
  it('não exige created_at/updated_at', () => {
    expect(() => createCardSchema.parse(validCard)).not.toThrow();
  });
});

describe('updateCardSchema', () => {
  it('aceita update vazio (no-op)', () => {
    expect(() => updateCardSchema.parse({})).not.toThrow();
  });
  it('aceita column_id + order (move parcial)', () => {
    expect(() => updateCardSchema.parse({ column_id: 'col-2', order: 5 })).not.toThrow();
  });
});

describe('moveCardSchema', () => {
  it('exige to_column_id', () => {
    expect(() => moveCardSchema.parse({ order: 0 })).toThrow();
  });
  it('default order=0', () => {
    const parsed = moveCardSchema.parse({ to_column_id: 'col-2' });
    expect(parsed.order).toBe(0);
  });
  it('aceita comment', () => {
    const parsed = moveCardSchema.parse({ to_column_id: 'col-2', order: 3, comment: 'ok' });
    expect(parsed.comment).toBe('ok');
  });
});

describe('logEntrySchema', () => {
  it('aceita entrada mínima', () => {
    expect(() => logEntrySchema.parse({
      to_column_id: 'col-1', by_uid: 'u1',
    })).not.toThrow();
  });
  it('aceita from_column_id null (= criação inicial)', () => {
    const parsed = logEntrySchema.parse({
      from_column_id: null,
      to_column_id: 'col-1',
      by_uid: 'u1',
    });
    expect(parsed.from_column_id).toBeNull();
  });
  it('rejeita sem to_column_id', () => {
    expect(() => logEntrySchema.parse({ by_uid: 'u1' })).toThrow();
  });
});

// ─── Helpers puros ─────────────────────────────────────────────────────

describe('toMillis', () => {
  it('Date', () => {
    const d = new Date('2026-07-11T10:00:00Z');
    expect(toMillis(d)).toBe(d.getTime());
  });
  it('number', () => {
    expect(toMillis(1234567890)).toBe(1234567890);
  });
  it('string ISO', () => {
    expect(toMillis('2026-07-11T10:00:00Z')).toBe(Date.parse('2026-07-11T10:00:00Z'));
  });
  it('Firestore Timestamp-like (seconds/nanoseconds)', () => {
    const t = toMillis({ seconds: 1700000000, nanoseconds: 0 });
    expect(t).toBe(1700000000 * 1000);
  });
  it('Firestore Timestamp-like (toMillis method)', () => {
    const t = toMillis({ toMillis: () => 999 });
    expect(t).toBe(999);
  });
  it('null/undefined/inválido', () => {
    expect(toMillis(null)).toBeNull();
    expect(toMillis(undefined)).toBeNull();
    expect(toMillis('not-a-date')).toBeNull();
    expect(toMillis({})).toBeNull();
  });
});

describe('isCardOverdue', () => {
  const past = '2020-01-01T00:00:00Z';
  const future = '2099-01-01T00:00:00Z';
  it('sem due_at → false', () => {
    expect(isCardOverdue({})).toBe(false);
  });
  it('due_at no futuro → false', () => {
    expect(isCardOverdue({ due_at: future })).toBe(false);
  });
  it('due_at no passado → true (default concluded slug)', () => {
    expect(isCardOverdue({ due_at: past })).toBe(true);
  });
  it('due_at no passado, mas coluna slug=concluida → false', () => {
    expect(isCardOverdue({ due_at: past, column_slug: 'concluida' })).toBe(false);
  });
});

describe('sortCardsByOrder', () => {
  it('ordena por order asc, não muta', () => {
    const a = { id: 'a', order: 2 };
    const b = { id: 'b', order: 0 };
    const c = { id: 'c', order: 1 };
    const arr = [a, b, c];
    const sorted = sortCardsByOrder(arr);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(arr.map((x) => x.id)).toEqual(['a', 'b', 'c']); // não mutou
  });
  it('tiebreaker: created_at desc', () => {
    const a = { id: 'a', order: 1, created_at: 100 };
    const b = { id: 'b', order: 1, created_at: 200 };
    const sorted = sortCardsByOrder([a, b]);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('input inválido → []', () => {
    expect(sortCardsByOrder(null)).toEqual([]);
    expect(sortCardsByOrder(undefined)).toEqual([]);
  });
});

describe('computeMyCards', () => {
  const cards = [
    { id: '1', assignees: ['u1'] },
    { id: '2', assignees: ['u2'] },
    { id: '3', assignees: ['u1', 'u2'] },
    { id: '4', assignees: [] },
  ];
  it('filtra por uid', () => {
    const mine = computeMyCards(cards, 'u1');
    expect(mine.map((c) => c.id)).toEqual(['1', '3']);
  });
  it('uid vazio → []', () => {
    expect(computeMyCards(cards, null)).toEqual([]);
    expect(computeMyCards(cards, '')).toEqual([]);
  });
  it('input inválido → []', () => {
    expect(computeMyCards(null, 'u1')).toEqual([]);
  });
});

describe('computeBoardProgress', () => {
  const now = new Date('2026-07-11T12:00:00Z').getTime();
  const board = {
    id: 'b1',
    columns: [
      { id: 'col-pendente' },
      { id: 'col-andamento' },
      { id: 'col-concluida' },
    ],
  };
  const cards = [
    { id: '1', column_id: 'col-pendente', priority: 'urgent', due_at: '2020-01-01T00:00:00Z' },
    { id: '2', column_id: 'col-andamento', priority: 'high', due_at: '2099-01-01T00:00:00Z' },
    { id: '3', column_id: 'col-concluida', priority: 'low', due_at: '2020-01-01T00:00:00Z', column_slug: 'concluida' },
    { id: '4', column_id: 'col-pendente', priority: 'medium', is_archived: true },
    { id: '5', column_id: 'col-andamento', priority: 'medium' },
  ];
  it('computa total, byColumn, overdue, byPriority', () => {
    const p = computeBoardProgress(board, cards, { now });
    expect(p.total).toBe(4); // exclui is_archived
    expect(p.byColumn['col-pendente']).toBe(1);
    expect(p.byColumn['col-andamento']).toBe(2);
    expect(p.byColumn['col-concluida']).toBe(1);
    expect(p.overdue).toBe(1); // só o card 1 (card 3 está em coluna concluída)
    expect(p.byPriority.urgent).toBe(1);
    expect(p.byPriority.high).toBe(1);
    expect(p.byPriority.medium).toBe(1);
    expect(p.byPriority.low).toBe(1);
  });
  it('board sem columns → byColumn vazio mas sem crash', () => {
    const p = computeBoardProgress({}, [], { now });
    expect(p.total).toBe(0);
    expect(p.byColumn).toEqual({});
  });
  it('cards null → vazio', () => {
    const p = computeBoardProgress(board, null, { now });
    expect(p.total).toBe(0);
  });
});

describe('canMoveCard', () => {
  it('sem toCol → fail', () => {
    expect(canMoveCard({ id: '1' }, null, null)).toEqual({ ok: false, reason: expect.any(String) });
  });
  it('mesma coluna → ok', () => {
    const col = { id: 'col-1' };
    expect(canMoveCard({ id: '1' }, col, col)).toEqual({ ok: true });
  });
  it('colunas diferentes → ok', () => {
    expect(canMoveCard({ id: '1' }, { id: 'a' }, { id: 'b' })).toEqual({ ok: true });
  });
  it('sem card → fail', () => {
    expect(canMoveCard(null, { id: 'a' }, { id: 'b' })).toEqual({ ok: false, reason: expect.any(String) });
  });
});

describe('checkWipLimit', () => {
  it('sem wip_limit → no_limit', () => {
    expect(checkWipLimit({ wip_limit: null }, 100)).toBe('no_limit');
    expect(checkWipLimit({}, 100)).toBe('no_limit');
  });
  it('count < limit → ok', () => {
    expect(checkWipLimit({ wip_limit: 5 }, 3)).toBe('ok');
  });
  it('count === limit → at_limit', () => {
    expect(checkWipLimit({ wip_limit: 5 }, 5)).toBe('at_limit');
  });
  it('count > limit → over', () => {
    expect(checkWipLimit({ wip_limit: 5 }, 8)).toBe('over');
  });
  it('count inválido → no_limit', () => {
    expect(checkWipLimit({ wip_limit: 5 }, -1)).toBe('no_limit');
  });
});

describe('appendLogEntry', () => {
  it('adiciona entrada sem mutar', () => {
    const card = { id: '1', log: [] };
    const next = appendLogEntry(card, {
      from_column_id: null,
      to_column_id: 'col-2',
      by_uid: 'u1',
      by_name: 'Ana',
    });
    expect(next.log.length).toBe(1);
    expect(next.log[0].to_column_id).toBe('col-2');
    expect(card.log.length).toBe(0); // não mutou
  });
  it('preserva log existente', () => {
    const card = { id: '1', log: [{ to_column_id: 'col-1', by_uid: 'u1' }] };
    const next = appendLogEntry(card, { to_column_id: 'col-2', by_uid: 'u2' });
    expect(next.log.length).toBe(2);
    expect(next.log[0].to_column_id).toBe('col-1');
    expect(next.log[1].to_column_id).toBe('col-2');
  });
  it('rejeita entrada inválida', () => {
    expect(() => appendLogEntry({ id: '1', log: [] }, { by_uid: 'u1' })).toThrow();
  });
});

describe('emptyCardDraft', () => {
  it('preenche defaults sane', () => {
    const draft = emptyCardDraft({
      shelterClubId: 'club-1', boardId: 'b1', columnId: 'c1', createdBy: 'u1',
    });
    expect(draft.shelter_club_id).toBe('club-1');
    expect(draft.board_id).toBe('b1');
    expect(draft.column_id).toBe('c1');
    expect(draft.created_by).toBe('u1');
    expect(draft.type).toBe('other');
    expect(draft.priority).toBe('medium');
    expect(draft.assignees).toEqual([]);
    expect(draft.checklist).toEqual([]);
    expect(draft.attachments).toEqual([]);
    expect(draft.log).toEqual([]);
    expect(draft.is_archived).toBe(false);
  });
});


// ─── formatKanbanLogEntry ──────────────────────────────────────────────

describe('formatKanbanLogEntry', () => {
  const cols = [
    { id: 'col-1', title: 'Pendente' },
    { id: 'col-2', title: 'Em andamento' },
  ];
  it('"criado" quando sem from_column_id', () => {
    const e = { from_column_id: null, to_column_id: 'col-1', by_uid: 'u' };
    expect(formatKanbanLogEntry(e, cols)).toBe('Criado em "Pendente"');
  });
  it('"movido de → para" quando tem from', () => {
    const e = { from_column_id: 'col-1', to_column_id: 'col-2', by_uid: 'u' };
    expect(formatKanbanLogEntry(e, cols)).toBe('Movido de "Pendente" → "Em andamento"');
  });
  it('usa id se coluna não encontrada', () => {
    const e = { to_column_id: 'col-X', by_uid: 'u' };
    expect(formatKanbanLogEntry(e, cols)).toBe('Criado em "col-X"');
  });
  it('sem columns → não crasha', () => {
    const e = { to_column_id: 'col-1', by_uid: 'u' };
    expect(formatKanbanLogEntry(e, [])).toBe('Criado em "col-1"');
  });
});

// ─── emptyChecklistItem / defaultChecklistItem ────────────────────────

describe('emptyChecklistItem / defaultChecklistItem', () => {
  it('campos defaults', () => {
    const it = emptyChecklistItem();
    expect(it.text).toBe('');
    expect(it.done).toBe(false);
    expect(typeof it.uid).toBe('string');
    expect(it.uid.length).toBeGreaterThan(0);
  });
  it('aceita uid custom', () => {
    const it = emptyChecklistItem('ck-1');
    expect(it.uid).toBe('ck-1');
  });
  it('defaultChecklistItem é alias', () => {
    const a = defaultChecklistItem('x');
    expect(a.uid).toBe('x');
  });
  it('gera uids únicos', () => {
    const a = emptyChecklistItem();
    const b = emptyChecklistItem();
    expect(a.uid).not.toBe(b.uid);
  });
});
