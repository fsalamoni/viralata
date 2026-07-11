/**
 * @fileoverview Testes do domínio kanban (Fase 15).
 */

import { describe, it, expect } from 'vitest';
import {
  // Enums
  BOARD_STATUS, CARD_TYPE, CARD_PRIORITY, CARD_STATUS,
  // Labels
  CARD_PRIORITY_LABELS, CARD_PRIORITY_COLORS, CARD_STATUS_LABELS, CARD_TYPE_LABELS,
  // Defaults
  DEFAULT_COLUMNS,
  // Schemas
  createBoardSchema, updateBoardSchema,
  createColumnSchema, updateColumnSchema,
  createCardSchema, updateCardSchema, moveCardSchema, addChecklistItemSchema,
  // Helpers
  generateLogId, generateChecklistItemId, generateAttachmentId,
  isColumnTerminal, isCardAssignee, isColumnResponsible,
  isCardOverdue, checklistProgress, countOpenCards,
  groupCardsByColumn,
  buildMoveLog, buildCreateLog, buildStatusChangeLog,
  isValidCardType, isValidCardPriority,
} from './kanban';

describe('kanban — enums', () => {
  it('BOARD_STATUS tem 2 valores', () => {
    expect(BOARD_STATUS).toEqual(['active', 'archived']);
  });

  it('CARD_TYPE tem 6 tipos', () => {
    expect(CARD_TYPE).toHaveLength(6);
    expect(CARD_TYPE).toContain('medication');
    expect(CARD_TYPE).toContain('spay_neuter');
    expect(CARD_TYPE).toContain('vaccine');
    expect(CARD_TYPE).toContain('post_adoption_contact');
    expect(CARD_TYPE).toContain('process');
    expect(CARD_TYPE).toContain('other');
  });

  it('CARD_PRIORITY tem 4 níveis', () => {
    expect(CARD_PRIORITY).toHaveLength(4);
    expect(CARD_PRIORITY).toEqual(['low', 'medium', 'high', 'urgent']);
  });

  it('CARD_STATUS tem 4 status', () => {
    expect(CARD_STATUS).toHaveLength(4);
    expect(CARD_STATUS).toEqual(['open', 'in_progress', 'resolved', 'cancelled']);
  });

  it('labels cobrem todos os valores', () => {
    CARD_TYPE.forEach((t) => {
      expect(CARD_TYPE_LABELS[t]).toBeTruthy();
    });
    CARD_PRIORITY.forEach((p) => {
      expect(CARD_PRIORITY_LABELS[p]).toBeTruthy();
      expect(CARD_PRIORITY_COLORS[p]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
    CARD_STATUS.forEach((s) => {
      expect(CARD_STATUS_LABELS[s]).toBeTruthy();
    });
  });

  it('DEFAULT_COLUMNS tem 4 colunas', () => {
    expect(DEFAULT_COLUMNS).toHaveLength(4);
  });

  it('DEFAULT_COLUMNS tem cores hex válidas', () => {
    DEFAULT_COLUMNS.forEach((col) => {
      expect(col.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof col.order).toBe('number');
      expect(Array.isArray(col.responsible_uids)).toBe(true);
    });
  });
});

describe('kanban — createBoardSchema', () => {
  it('aceita payload mínimo válido', () => {
    const result = createBoardSchema.parse({ name: 'Minhas Tarefas' });
    expect(result.name).toBe('Minhas Tarefas');
    expect(result.default_view).toBe('board');
  });

  it('aceita nome customizado', () => {
    const result = createBoardSchema.parse({ name: 'Agenda de julho' });
    expect(result.name).toBe('Agenda de julho');
  });

  it('rejeita nome vazio', () => {
    expect(() => createBoardSchema.parse({ name: '' })).toThrow();
  });

  it('rejeita nome com mais de 100 caracteres', () => {
    const longName = 'a'.repeat(101);
    expect(() => createBoardSchema.parse({ name: longName })).toThrow();
  });

  it('ignora campo desconhecido (sem strict)', () => {
    // sem .strict(), Zod ignora chaves desconhecidas
    const result = createBoardSchema.parse({ name: 'Tarefas', foo: 'bar' });
    expect(result.name).toBe('Tarefas');
  });
});

describe('kanban — createColumnSchema', () => {
  it('aceita payload mínimo válido', () => {
    const result = createColumnSchema.parse({
      board_id: 'board-1',
      title: 'Pendente',
    });
    expect(result.board_id).toBe('board-1');
    expect(result.title).toBe('Pendente');
    expect(result.color).toBe('#6B7280');
    expect(result.order).toBe(0);
    expect(result.responsible_uids).toEqual([]);
  });

  it('aceita cor customizada', () => {
    const result = createColumnSchema.parse({
      board_id: 'b1', title: 'Urgente', color: '#FF0000',
    });
    expect(result.color).toBe('#FF0000');
  });

  it('rejeita cor inválida', () => {
    expect(() => createColumnSchema.parse({
      board_id: 'b1', title: 'X', color: 'red',
    })).toThrow();
  });

  it('rejeita título vazio', () => {
    expect(() => createColumnSchema.parse({
      board_id: 'b1', title: '',
    })).toThrow();
  });
});

describe('kanban — createCardSchema', () => {
  it('aceita payload mínimo', () => {
    const result = createCardSchema.parse({
      board_id: 'board-1', column_id: 'col-1', title: 'Vacinar Rex',
    });
    expect(result.board_id).toBe('board-1');
    expect(result.column_id).toBe('col-1');
    expect(result.title).toBe('Vacinar Rex');
    expect(result.type).toBe('other');
    expect(result.priority).toBe('medium');
    expect(result.assignees).toEqual([]);
    expect(result.due_at).toBe(null);
  });

  it('aceita card completo com todos os campos', () => {
    const payload = {
      board_id: 'b1',
      column_id: 'c1',
      title: 'Medicar Luna',
      description: 'Antibiótico 2x ao dia por 7 dias',
      type: 'medication',
      assignees: ['uid-vet-1'],
      due_at: '2026-07-20',
      priority: 'high',
      checklist: [{ id: 'cl1', text: 'Comprar remédio', done: false }],
      attachments: [],
      source_task_id: 'task-123',
      order: 3,
    };
    const result = createCardSchema.parse(payload);
    expect(result.type).toBe('medication');
    expect(result.priority).toBe('high');
    expect(result.checklist).toHaveLength(1);
  });

  it('rejeita título vazio', () => {
    expect(() => createCardSchema.parse({
      board_id: 'b1', column_id: 'c1', title: '',
    })).toThrow();
  });

  it('rejeita type inválido', () => {
    expect(() => createCardSchema.parse({
      board_id: 'b1', column_id: 'c1', title: 'X', type: 'invalid',
    })).toThrow();
  });

  it('rejeita priority inválida', () => {
    expect(() => createCardSchema.parse({
      board_id: 'b1', column_id: 'c1', title: 'X', priority: 'super_high',
    })).toThrow();
  });
});

describe('kanban — moveCardSchema', () => {
  it('aceita payload mínimo', () => {
    const result = moveCardSchema.parse({ target_column_id: 'col-2' });
    expect(result.target_column_id).toBe('col-2');
    expect(result.new_order).toBe(0);
    expect(result.note).toBe(null);
  });

  it('aceita nova ordem e nota', () => {
    const result = moveCardSchema.parse({
      target_column_id: 'col-3',
      new_order: 5,
      note: 'Cliente confirmou presença',
    });
    expect(result.new_order).toBe(5);
    expect(result.note).toBe('Cliente confirmou presença');
  });
});

describe('kanban — helpers', () => {
  it('generateLogId tem prefixo log_', () => {
    expect(generateLogId()).toMatch(/^log_/);
  });

  it('generateLogId é único', () => {
    const ids = new Set(Array.from({ length: 100 }, generateLogId));
    expect(ids.size).toBe(100);
  });

  it('generateChecklistItemId tem prefixo cl_', () => {
    expect(generateChecklistItemId()).toMatch(/^cl_/);
  });

  it('generateAttachmentId tem prefixo att_', () => {
    expect(generateAttachmentId()).toMatch(/^att_/);
  });

  it('isColumnTerminal reconhece colunas terminais', () => {
    expect(isColumnTerminal('Concluído')).toBe(true);
    expect(isColumnTerminal('Cancelado')).toBe(true);
    expect(isColumnTerminal('Pendente')).toBe(false);
    expect(isColumnTerminal('Em Progresso')).toBe(false);
  });

  it('isCardAssignee detecta assignee', () => {
    const card = { assignees: ['uid-1', 'uid-2'] };
    expect(isCardAssignee(card, 'uid-1')).toBe(true);
    expect(isCardAssignee(card, 'uid-3')).toBe(false);
    expect(isCardAssignee(null, 'uid-1')).toBe(false);
  });

  it('isColumnResponsible detecta responsável', () => {
    const col = { responsible_uids: ['uid-1'] };
    expect(isColumnResponsible(col, 'uid-1')).toBe(true);
    expect(isColumnResponsible(col, 'uid-9')).toBe(false);
  });

  it('isCardOverdue detecta data passada', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    expect(isCardOverdue({ due_at: pastDate })).toBe(true);
    expect(isCardOverdue({ due_at: futureDate })).toBe(false);
    expect(isCardOverdue({ due_at: null })).toBe(false);
  });

  it('checklistProgress calcula corretamente', () => {
    expect(checklistProgress({ checklist: [] })).toBe(0);
    expect(checklistProgress({ checklist: [{ done: false }, { done: false }] })).toBe(0);
    expect(checklistProgress({ checklist: [{ done: true }, { done: false }] })).toBe(50);
    expect(checklistProgress({ checklist: [{ done: true }, { done: true }] })).toBe(100);
    expect(checklistProgress(null)).toBe(0);
  });

  it('countOpenCards filtra resolved e cancelled', () => {
    const cards = [
      { status: 'open' },
      { status: 'in_progress' },
      { status: 'resolved' },
      { status: 'cancelled' },
      { status: 'open' },
    ];
    expect(countOpenCards(cards)).toBe(3);
    expect(countOpenCards([])).toBe(0);
    expect(countOpenCards(null)).toBe(0);
  });

  it('groupCardsByColumn agrupa e ordena', () => {
    const cards = [
      { id: 'c1', column_id: 'col-1', order: 2 },
      { id: 'c2', column_id: 'col-2', order: 0 },
      { id: 'c3', column_id: 'col-1', order: 0 },
      { id: 'c4', column_id: 'col-1', order: 1 },
    ];
    const map = groupCardsByColumn(cards);
    expect(map.get('col-1')).toEqual([
      { id: 'c3', column_id: 'col-1', order: 0 },
      { id: 'c4', column_id: 'col-1', order: 1 },
      { id: 'c1', column_id: 'col-1', order: 2 },
    ]);
    expect(map.get('col-2')).toEqual([
      { id: 'c2', column_id: 'col-2', order: 0 },
    ]);
  });

  it('buildMoveLog gera entrada correta', () => {
    const log = buildMoveLog('card-1', 'col-1', 'col-2', 'uid-user', 'moved to done');
    expect(log.action).toBe('moved');
    expect(log.from_column_id).toBe('col-1');
    expect(log.to_column_id).toBe('col-2');
    expect(log.by_uid).toBe('uid-user');
    expect(log.note).toBe('moved to done');
    expect(log.id).toMatch(/^log_/);
  });

  it('buildCreateLog gera entrada com to_column_id', () => {
    const log = buildCreateLog('card-new', 'col-1', 'uid-creator');
    expect(log.action).toBe('created');
    expect(log.to_column_id).toBe('col-1');
    expect(log.from_column_id).toBe(null);
  });

  it('buildStatusChangeLog gera nota automática', () => {
    const log = buildStatusChangeLog('card-1', 'resolved', 'uid-user');
    expect(log.action).toBe('status_changed');
    expect(log.note).toBe('Status alterado para: resolved');
  });

  it('isValidCardType valida corretamente', () => {
    expect(isValidCardType('medication')).toBe(true);
    expect(isValidCardType('invalid')).toBe(false);
    expect(isValidCardType(null)).toBe(false);
  });

  it('isValidCardPriority valida corretamente', () => {
    expect(isValidCardPriority('high')).toBe(true);
    expect(isValidCardPriority('super_high')).toBe(false);
  });
});
