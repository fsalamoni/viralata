/**
 * @fileoverview Testes do serviço de Kanban (Fase 15).
 *
 * Cobre: boards CRUD, columns CRUD, cards CRUD, moveCard com log,
 * checklist, multi-tenant validation, permissões de assignee.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Firestore mocks — DECLARAR ANTES dos vi.mock (hoisting) ─────────

const mockGetDoc    = vi.fn();
const mockGetDocs   = vi.fn();
const mockAddDoc    = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatchSet   = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchDelete = vi.fn();
const mockCollection  = vi.fn(() => ({ _p: 'col' }));
const mockDoc         = vi.fn(() => ({ _r: true }));
const mockQuery       = vi.fn(() => ({ _q: true }));
const mockWhere       = vi.fn(() => ({ _w: true }));
const mockOrderBy      = vi.fn(() => ({ _o: true }));
const mockLimit       = vi.fn(() => ({ _l: true }));
const mockServerTimestamp = vi.fn(() => ({ _ts: true }));

const mockDb = { _db: true };
const mockBatch = {
  set:   mockBatchSet,
  update: mockBatchUpdate,
  delete: mockBatchDelete,
  commit: () => mockBatchCommit(),
};
const mockCreateAuditLog = vi.fn().mockResolvedValue(null);

vi.mock('firebase/firestore', () => ({
  collection:  (...a) => mockCollection(...a),
  doc:         (...a) => mockDoc(...a),
  getDoc:      (...a) => mockGetDoc(...a),
  getDocs:     (...a) => mockGetDocs(...a),
  addDoc:      (...a) => mockAddDoc(...a),
  updateDoc:   (...a) => mockUpdateDoc(...a),
  deleteDoc:   (...a) => mockDeleteDoc(...a),
  writeBatch:  () => mockBatch,
  query:       (...a) => mockQuery(...a),
  where:       (...a) => mockWhere(...a),
  orderBy:     (...a) => mockOrderBy(...a),
  limit:       (...a) => mockLimit(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: mockCreateAuditLog,
}));

// ─── Importação do service (depois dos mocks) ─────────────────────────
const {
  listBoards, getBoard, createBoard, updateBoard, deleteBoard,
  listColumns, createColumn, updateColumn, deleteColumn, reorderColumn,
  listCards, getCard, createCard, updateCard, moveCard, deleteCard,
  addChecklistItem, toggleChecklistItem, getCardsByAssignee,
} = await import('./kanbanService');

// ─── Helpers ──────────────────────────────────────────────────────────

function snap(data, id = 'id-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { id: 'missing', exists: () => false, data: () => undefined };
}

// Helper: sequencial mock for getDoc (returns values in order of calls)
function seqGetDoc(...values) {
  let idx = 0;
  mockGetDoc.mockImplementation(() => {
    if (idx < values.length) return values[idx++];
    return undefined;
  });
}
function seqGetDocs(...values) {
  let idx = 0;
  mockGetDocs.mockImplementation(() => {
    if (idx < values.length) return Promise.resolve(values[idx++]);
    return Promise.resolve({ docs: [] });
  });
}

const BOARD_DATA = {
  shelter_club_id: 'club-1',
  name:            'Tarefas',
  default_view:    'board',
  owner_uid:       'uid-owner',
  columns_order:   ['col-1', 'col-2'],
  created_at:      { _ts: true },
  updated_at:      { _ts: true },
};

const COLUMN_DATA = {
  shelter_club_id:  'club-1',
  board_id:         'board-1',
  title:            'Pendente',
  color:            '#6B7280',
  order:            0,
  responsible_uids: [],
  created_at:      { _ts: true },
  updated_at:      { _ts: true },
};

const CARD_DATA = {
  shelter_club_id: 'club-1',
  board_id:         'board-1',
  column_id:        'col-1',
  title:            'Vacinar Rex',
  description:      '',
  type:             'vaccine',
  assignees:        [],
  due_at:           null,
  priority:         'medium',
  status:           'open',
  checklist:        [],
  attachments:      [],
  source_task_id:   null,
  order:            0,
  log:              [],
  created_by_uid:   'uid-owner',
  created_at:       { _ts: true },
  updated_at:       { _ts: true },
};

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockDeleteDoc.mockReset();
  mockBatchCommit.mockReset();
  mockBatchSet.mockReset();
  mockBatchUpdate.mockReset();
  mockBatchDelete.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

// ════════════════════════════════════════════════════════════════════
// BOARDS
// ════════════════════════════════════════════════════════════════════

describe('kanbanService — boards', () => {
  it('listBoards: retorna boards ordenados', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        snap({ ...BOARD_DATA, name: 'Board A' }, 'b-a'),
        snap({ ...BOARD_DATA, name: 'Board B' }, 'b-b'),
      ],
    });
    const result = await listBoards('club-1');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Board A');
  });

  it('listBoards: lança se sem shelterClubId', async () => {
    await expect(listBoards('')).rejects.toThrow('shelterClubId é obrigatório');
  });

  it('getBoard: retorna board com tenant válido', async () => {
    seqGetDoc(snap(BOARD_DATA, 'board-1'), snap(BOARD_DATA, 'board-1'));
    const result = await getBoard('club-1', 'board-1');
    expect(result.id).toBe('board-1');
    expect(result.name).toBe('Tarefas');
  });

  it('getBoard: lança se cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, shelter_club_id: 'other-club' }));
    await expect(getBoard('club-1', 'board-1')).rejects.toThrow('Acesso negado');
  });

  it('getBoard: lança se board não existe', async () => {
    mockGetDoc.mockResolvedValueOnce(missingSnap());
    await expect(getBoard('club-1', 'missing')).rejects.toThrow('não encontrado');
  });

  it('createBoard: cria board + colunas default', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'new-board' });
    mockBatchSet.mockImplementation(() => {});
    mockBatchUpdate.mockImplementation(() => {});
    mockBatchCommit.mockResolvedValueOnce(undefined);
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, columns_order: [] }));

    const result = await createBoard('club-1', 'uid-1', { name: 'Meu Board' });
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('createBoard: lança se sem uid', async () => {
    await expect(createBoard('club-1', '', { name: 'X' })).rejects.toThrow('uid é obrigatório');
  });

  it('updateBoard: lança se cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, shelter_club_id: 'wrong' }));
    await expect(updateBoard('club-1', 'board-1', 'uid-1', { name: 'Novo Nome' }))
      .rejects.toThrow('Acesso negado');
  });

  it('deleteBoard: deleta board + colunas + cards em cascata', async () => {
    // deleteBoard uses batch.delete() NOT deleteDoc()
    mockGetDoc.mockResolvedValueOnce(snap(BOARD_DATA, 'board-1'));
    mockGetDocs.mockResolvedValueOnce({ docs: [] }); // cards
    mockGetDocs.mockResolvedValueOnce({ docs: [] }); // columns
    mockBatchCommit.mockResolvedValueOnce(undefined);

    await deleteBoard('club-1', 'board-1', 'uid-1');
    expect(mockBatchDelete).toHaveBeenCalled(); // batch.delete, not deleteDoc
  });
});

// ════════════════════════════════════════════════════════════════════
// COLUMNS
// ════════════════════════════════════════════════════════════════════

describe('kanbanService — columns', () => {
  it('listColumns: retorna colunas ordenadas', async () => {
    mockGetDoc.mockResolvedValueOnce(snap(BOARD_DATA)); // _verifyBoardTenant
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        snap({ ...COLUMN_DATA, order: 1, title: 'Em Progresso' }, 'col-2'),
        snap({ ...COLUMN_DATA, order: 0, title: 'Pendente' }, 'col-1'),
      ],
    });
    const result = await listColumns('club-1', 'board-1');
    expect(result).toHaveLength(2);
  });

  it('createColumn: cria e atualiza board columns_order', async () => {
    // Call order: _verifyBoardTenant(board_id) → addDoc → getDoc(board for update)
    mockGetDoc.mockResolvedValueOnce(snap(BOARD_DATA, 'board-1')); // _verifyBoardTenant
    mockAddDoc.mockResolvedValueOnce({ id: 'new-col' });
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, columns_order: [] })); // board snap for order update
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await createColumn('club-1', 'uid-1', {
      board_id: 'board-1',
      title: 'Urgente',
      color: '#EF4444',
      order: 2,
    });
    expect(mockAddDoc).toHaveBeenCalled();
  });

  it('updateColumn: lança se cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, shelter_club_id: 'wrong' }));
    await expect(updateColumn('club-1', 'col-1', 'uid-1', { title: 'Novo' }))
      .rejects.toThrow('Acesso negado');
  });

  it('deleteColumn: rejeita se coluna tem cards', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, board_id: 'board-1' })); // verify tenant
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'fake', exists: () => true, data: () => ({ column_id: 'col-1', board_id: 'board-1' }) }],
    });
    await expect(deleteColumn('club-1', 'col-1', 'uid-1'))
      .rejects.toThrow('Não é possível deletar coluna com cards');
  });

  it('deleteColumn: deleta se coluna vazia', async () => {
    // Call order: _verifyColumnTenant → getDocs(cards,empty) → deleteDoc → getDoc(col) → getDoc(board) → updateDoc
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, board_id: 'board-1' })); // _verifyColumnTenant
    mockGetDocs.mockResolvedValueOnce({ docs: [], empty: true }); // no cards
    mockDeleteDoc.mockResolvedValueOnce(undefined); // delete column
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, board_id: 'board-1' })); // col snap for board_id
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, columns_order: ['col-1'] })); // board snap
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await deleteColumn('club-1', 'col-1', 'uid-1');
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('reorderColumn: atualiza order + columns_order do board', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, board_id: 'board-1' })); // verify tenant
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, columns_order: ['col-1', 'col-2'] })); // col snap
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, columns_order: ['col-1', 'col-2'] })); // board snap
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await reorderColumn('club-1', 'col-1', 'uid-1', 2);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════
// CARDS
// ════════════════════════════════════════════════════════════════════

describe('kanbanService — cards', () => {
  it('listCards: retorna todos os cards', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        snap({ ...CARD_DATA, title: 'Card A' }, 'c-a'),
        snap({ ...CARD_DATA, title: 'Card B' }, 'c-b'),
      ],
    });
    const result = await listCards('club-1');
    expect(result).toHaveLength(2);
  });

  it('listCards: filtra por column_id', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [snap(CARD_DATA, 'c1')] });
    await listCards('club-1', { columnId: 'col-1' });
    expect(mockWhere).toHaveBeenCalledWith('column_id', '==', 'col-1');
  });

  it('listCards: filtra por assigneeUid', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await listCards('club-1', { assigneeUid: 'uid-3' });
    expect(mockWhere).toHaveBeenCalledWith('assignees', 'array-contains', 'uid-3');
  });

  it('listCards: filtra por type', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await listCards('club-1', { type: 'medication' });
    expect(mockWhere).toHaveBeenCalledWith('type', '==', 'medication');
  });

  it('getCard: retorna card com tenant válido', async () => {
    // Call order: _verifyCardTenant → getDoc
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, shelter_club_id: 'club-1' }));
    mockGetDoc.mockResolvedValueOnce(snap(CARD_DATA, 'card-1'));
    const result = await getCard('club-1', 'card-1');
    expect(result.id).toBe('card-1');
  });

  it('getCard: lança se cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, shelter_club_id: 'wrong' }));
    await expect(getCard('club-1', 'card-1')).rejects.toThrow('Acesso negado');
  });

  it('createCard: cria card com log de criação', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, shelter_club_id: 'club-1' })); // verify column tenant
    mockAddDoc.mockResolvedValueOnce({ id: 'new-card' });
    mockCreateAuditLog.mockResolvedValueOnce(null);

    const result = await createCard('club-1', 'uid-1', {
      board_id:  'board-1',
      column_id: 'col-1',
      title:     'Novo Card',
      type:      'vaccine',
    });
    expect(mockAddDoc).toHaveBeenCalled();
    const callArgs = mockAddDoc.mock.calls[0][1];
    expect(callArgs.status).toBe('open');
    expect(Array.isArray(callArgs.log)).toBe(true);
  });

  it('updateCard: full update para non-assignee', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, log: [] }));
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await updateCard('club-1', 'card-1', 'uid-admin', { title: 'Novo Título' });
    expect(mockUpdateDoc).toHaveBeenCalled();
    const args = mockUpdateDoc.mock.calls[0][1];
    expect(args.title).toBe('Novo Título');
  });

  it('updateCard: assignee só pode atualizar status', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, log: [] }));
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    // Assignee tenta mudar título → não deve chamar updateDoc com title
    await updateCard('club-1', 'card-1', 'uid-assignee', { title: 'Hack', status: 'resolved' }, true);
    const args = mockUpdateDoc.mock.calls[0][1];
    expect(args.title).toBeUndefined();
    expect(args.status).toBe('resolved');
  });

  it('updateCard: assignee adiciona log de status_change', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, log: [], status: 'open' }));
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await updateCard('club-1', 'card-1', 'uid-assignee', { status: 'resolved' }, true);
    const args = mockUpdateDoc.mock.calls[0][1];
    expect(args.log).toHaveLength(1);
    expect(args.log[0].action).toBe('status_changed');
  });

  it('moveCard: registra log de movimentação', async () => {
    // Call order: _verifyCardTenant → _verifyColumnTenant → updateDoc
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, column_id: 'col-1', log: [] })); // card tenant
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, shelter_club_id: 'club-1' })); // column tenant
    mockUpdateDoc.mockResolvedValueOnce(undefined);
    mockCreateAuditLog.mockResolvedValueOnce(null);

    await moveCard('club-1', 'card-1', 'uid-1', {
      target_column_id: 'col-2',
      new_order: 0,
      note: 'Moved to done',
    });
    const args = mockUpdateDoc.mock.calls[0][1];
    expect(args.log[0].action).toBe('moved');
    expect(args.log[0].from_column_id).toBe('col-1');
    expect(args.log[0].to_column_id).toBe('col-2');
    expect(args.log[0].note).toBe('Moved to done');
    expect(args.column_id).toBe('col-2');
  });

  it('moveCard: lança se target column inexistente', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, column_id: 'col-1', log: [] })); // card tenant
    mockGetDoc.mockResolvedValueOnce(missingSnap()); // column tenant fails
    await expect(
      moveCard('club-1', 'card-1', 'uid-1', { target_column_id: 'missing', new_order: 0 }),
    ).rejects.toThrow('não encontrada');
  });

  it('deleteCard: deleta card', async () => {
    mockGetDoc.mockResolvedValueOnce(snap(CARD_DATA));
    mockDeleteDoc.mockResolvedValueOnce(undefined);
    await deleteCard('club-1', 'card-1', 'uid-1');
    expect(mockDeleteDoc).toHaveBeenCalled();
  });

  it('addChecklistItem: adiciona item ao checklist', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, checklist: [] }));
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await addChecklistItem('club-1', 'card-1', 'uid-1', 'Comprar remédio');
    const args = mockUpdateDoc.mock.calls[0][1];
    expect(args.checklist).toHaveLength(1);
    expect(args.checklist[0].text).toBe('Comprar remédio');
    expect(args.checklist[0].done).toBe(false);
    expect(args.checklist[0].id).toMatch(/^cl_/);
  });

  it('toggleChecklistItem: inverte done', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({
      ...CARD_DATA,
      checklist: [{ id: 'cl-1', text: 'Tarefa', done: false }],
    }));
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await toggleChecklistItem('club-1', 'card-1', 'uid-1', 0);
    const args = mockUpdateDoc.mock.calls[0][1];
    expect(args.checklist[0].done).toBe(true);
  });

  it('toggleChecklistItem: lança se índice inválido', async () => {
    mockGetDoc.mockResolvedValueOnce(snap({ ...CARD_DATA, checklist: [] }));
    await expect(toggleChecklistItem('club-1', 'card-1', 'uid-1', 99))
      .rejects.toThrow('Índice de checklist inválido');
  });

  it('getCardsByAssignee: enrich com board e column names', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [snap({ ...CARD_DATA, board_id: 'b1', column_id: 'c1' }, 'card-1')],
    });
    mockGetDoc.mockResolvedValueOnce(snap({ ...BOARD_DATA, name: 'Meu Board' }, 'b1'));
    mockGetDoc.mockResolvedValueOnce(snap({ ...COLUMN_DATA, title: 'Urgente', color: '#EF4444' }, 'c1'));

    const result = await getCardsByAssignee('club-1', 'uid-assignee');
    expect(result).toHaveLength(1);
    expect(result[0].board_name).toBe('Meu Board');
    expect(result[0].column_name).toBe('Urgente');
    expect(result[0].column_color).toBe('#EF4444');
  });
});
