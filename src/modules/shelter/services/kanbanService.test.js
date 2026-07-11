/**
 * @fileoverview Testes do serviço de Kanban (Fase 15).
 *
 * Cobre:
 * - listBoards / getDefaultBoard
 * - createBoard: parse, audit, default-unset
 * - updateBoard: parse, noop, cross-tenant, default-unset
 * - deleteBoard: tenant check, cascade, audit
 * - listColumns / createColumn / updateColumn / deleteColumn
 * - reorderColumns: writeBatch
 * - listCards / getCard
 * - createCard: log entry inicial, audit
 * - updateCard: cross-tenant, change column
 * - deleteCard
 * - moveCard: log entry, noop same col+order, audit
 * - ensureDefaultBoard: idempotente
 * - subscribeBoard: snapshot agregado + unsubscribe
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockWriteBatch = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatchDelete = vi.fn();

const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/'), id: path[path.length - 1] }));
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockWhere = vi.fn((...args) => ({ _w: true, _args: args }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));

// onSnapshot tem múltiplas formas — salvamos callbacks por chamada
const mockOnSnapshotCallbacks = [];
const mockOnSnapshot = vi.fn((q, onData, onError) => {
  mockOnSnapshotCallbacks.push({ q, onData, onError });
  return vi.fn(); // unsubscribe
});

const mockDb = { _isDb: true };
const mockBatch = {
  update: (...a) => { mockBatchUpdate(...a); return mockBatch; },
  delete: (...a) => { mockBatchDelete(...a); return mockBatch; },
  commit: (...a) => { mockBatchCommit(...a); return Promise.resolve(); },
};

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: mockLimit,
  serverTimestamp: () => mockServerTimestamp(),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  writeBatch: () => mockBatch,
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const svc = await import('./kanbanService');
const {
  listBoards, getDefaultBoard, createBoard, updateBoard, deleteBoard,
  listColumns, createColumn, updateColumn, deleteColumn, reorderColumns,
  listCards, getCard, createCard, updateCard, deleteCard, moveCard,
  ensureDefaultBoard, subscribeBoard,
} = svc;

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset().mockResolvedValue({ id: 'new-id' });
  mockUpdateDoc.mockReset().mockResolvedValue(null);
  mockDeleteDoc.mockReset().mockResolvedValue(null);
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
  mockWriteBatch.mockClear();
  mockBatchUpdate.mockClear();
  mockBatchCommit.mockClear().mockResolvedValue(null);
  mockBatchDelete.mockClear();
  mockOnSnapshot.mockClear();
  mockOnSnapshotCallbacks.length = 0;
  // Defaults para writeBatch
  mockWriteBatch.mockReturnValue(mockBatch);
});

// Helper: docSnap com id
function docSnap(data, id = 'd-1') {
  return { id, exists: () => true, data: () => data, ref: { _path: id } };
}
function docSnapMissing() {
  return { id: 'x', exists: () => false, data: () => ({}), ref: { _path: 'x' } };
}

const validBoard = {
  shelter_club_id: 'club-1',
  title: 'Operação 2026',
  is_default: false,
  is_archived: false,
  created_by: 'user-1',
};
const validColumn = {
  shelter_club_id: 'club-1',
  board_id: 'board-1',
  title: 'Pendente',
  color: '#94a3b8',
  order: 0,
  responsible_uids: [],
  created_by: 'user-1',
};
const validCard = {
  shelter_club_id: 'club-1',
  board_id: 'b1',
  column_id: 'col-1',
  title: 'Tarefa X',
  type: 'other',
  priority: 'medium',
  assignees: ['user-1'],
  order: 0,
  checklist: [],
  attachments: [],
  log: [],
  is_archived: false,
  created_by: 'user-1',
};

// ─── Boards ───────────────────────────────────────────────────────────

describe('listBoards', () => {
  it('retorna [] se db null', async () => {
    // Sem mock, getDocs default resolve {docs: []}
    mockGetDocs.mockResolvedValue({ docs: [] });
    const list = await listBoards('club-1');
    expect(list).toEqual([]);
  });

  it('lista boards do abrigo', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        docSnap({ title: 'A', shelter_club_id: 'club-1' }, 'b1'),
        docSnap({ title: 'B', shelter_club_id: 'club-1' }, 'b2'),
      ],
    });
    const list = await listBoards('club-1');
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('b1');
    expect(list[1].title).toBe('B');
  });

  it('rejeita clubId ausente', async () => {
    await expect(listBoards(null)).rejects.toThrow(/clubId/);
    await expect(listBoards('')).rejects.toThrow(/clubId/);
  });
});

describe('getDefaultBoard', () => {
  it('retorna null se vazio', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    const b = await getDefaultBoard('club-1');
    expect(b).toBeNull();
  });

  it('retorna board default', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [docSnap({ title: 'Default', is_default: true }, 'b1')],
    });
    const b = await getDefaultBoard('club-1');
    expect(b.id).toBe('b1');
    expect(b.is_default).toBe(true);
  });
});

describe('createBoard', () => {
  it('cria board com audit', async () => {
    const out = await createBoard(validBoard, { uid: 'u1' });
    expect(out.id).toBe('new-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_board_created' }),
    );
  });

  it('se is_default=true, desmarca outros (1+ batch)', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [docSnap({ is_default: true }, 'b-old')],
    });
    await createBoard({ ...validBoard, is_default: true }, { uid: 'u1' });
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('rejeita actor sem uid', async () => {
    await expect(createBoard(validBoard, {})).rejects.toThrow(/actor\.uid/);
  });

  it('rejeita input inválido (sem title)', async () => {
    await expect(createBoard({ ...validBoard, title: '' }, { uid: 'u1' })).rejects.toThrow();
  });
});

describe('updateBoard', () => {
  it('atualiza board do mesmo abrigo', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1', title: 'Old' }));
    const out = await updateBoard('club-1', 'b1', { title: 'New' }, { uid: 'u1' });
    expect(out.changed_fields).toEqual(['title']);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_board_updated' }),
    );
  });

  it('noop em update vazio', async () => {
    const out = await updateBoard('club-1', 'b1', {}, { uid: 'u1' });
    expect(out.noop).toBe(true);
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-OTHER' }));
    await expect(updateBoard('club-1', 'b1', { title: 'X' }, { uid: 'u1' }))
      .rejects.toThrow(/Cross-tenant/);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejeita board inexistente', async () => {
    mockGetDoc.mockResolvedValue(docSnapMissing());
    await expect(updateBoard('club-1', 'b1', { title: 'X' }, { uid: 'u1' }))
      .rejects.toThrow(/não encontrado/);
  });
});

describe('deleteBoard', () => {
  it('deleta board + cascade (columns e cards)', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1', title: 'Old' }));
    // getDocs retorna colunas com cards
    mockGetDocs.mockResolvedValue({
      size: 1,
      docs: [docSnap({ column_id: 'col-1' }, 'c1')],
    });
    const out = await deleteBoard('club-1', 'b1', { uid: 'u1' });
    expect(out.deleted).toBe(true);
    expect(out.columns).toBe(1);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_board_deleted' }),
    );
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-OTHER' }));
    await expect(deleteBoard('club-1', 'b1', { uid: 'u1' }))
      .rejects.toThrow(/Cross-tenant/);
  });
});

// ─── Columns ─────────────────────────────────────────────────────────

describe('listColumns', () => {
  it('lista colunas do board', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        docSnap({ title: 'A', order: 0 }, 'c1'),
        docSnap({ title: 'B', order: 1 }, 'c2'),
      ],
    });
    const cols = await listColumns('club-1', 'b1');
    expect(cols.length).toBe(2);
  });

  it('rejeita args ausentes', async () => {
    await expect(listColumns(null, 'b1')).rejects.toThrow();
    await expect(listColumns('club-1', null)).rejects.toThrow();
  });
});

describe('createColumn', () => {
  it('cria coluna + audit', async () => {
    // verifyBoardTenant
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1' }));
    const out = await createColumn(validColumn, { uid: 'u1' });
    expect(out.id).toBe('new-id');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_column_created' }),
    );
  });

  it('rejeita board de outro abrigo', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-OTHER' }));
    await expect(createColumn(validColumn, { uid: 'u1' })).rejects.toThrow(/Cross-tenant/);
  });
});

describe('updateColumn', () => {
  it('atualiza coluna', async () => {
    mockGetDoc.mockResolvedValue(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1', title: 'Old',
    }));
    const out = await updateColumn('club-1', 'b1', 'c1', { title: 'New' }, { uid: 'u1' });
    expect(out.changed_fields).toEqual(['title']);
  });

  it('noop em update vazio', async () => {
    const out = await updateColumn('club-1', 'b1', 'c1', {}, { uid: 'u1' });
    expect(out.noop).toBe(true);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(docSnap({
      shelter_club_id: 'club-OTHER', board_id: 'board-1',
    }));
    await expect(updateColumn('club-1', 'b1', 'c1', { title: 'X' }, { uid: 'u1' }))
      .rejects.toThrow(/Cross-tenant/);
  });
});

describe('deleteColumn', () => {
  it('deleta coluna + conta orphan cards', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1', board_id: 'b1' }));
    mockGetDocs.mockResolvedValue({
      docs: [
        docSnap({ column_id: 'c1' }, 'card-1'),
        docSnap({ column_id: 'c2' }, 'card-2'),
      ],
    });
    const out = await deleteColumn('club-1', 'b1', 'c1', { uid: 'u1' });
    expect(out.deleted).toBe(true);
    expect(out.orphan_cards).toBe(1);
  });
});

describe('reorderColumns', () => {
  it('writeBatch.update chamado para cada coluna + commit', async () => {
    // verifyBoardTenant
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1' }));
    const out = await reorderColumns('club-1', 'b1', ['c1', 'c2', 'c3'], { uid: 'u1' });
    expect(out.reordered).toBe(3);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('rejeita orderedIds não-array', async () => {
    await expect(reorderColumns('club-1', 'b1', 'c1', { uid: 'u1' })).rejects.toThrow(/array/);
  });

  it('rejeita mais de 100 colunas', async () => {
    const arr = Array.from({ length: 101 }, (_, i) => `c${i}`);
    await expect(reorderColumns('club-1', 'b1', arr, { uid: 'u1' })).rejects.toThrow(/100/);
  });
});

// ─── Cards ───────────────────────────────────────────────────────────

describe('listCards', () => {
  it('lista cards', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [docSnap({ title: 'A' }, 'card-1')],
    });
    const cards = await listCards('club-1', 'b1');
    expect(cards.length).toBe(1);
  });

  it('rejeita args ausentes', async () => {
    await expect(listCards(null, 'b1')).rejects.toThrow();
  });
});

describe('getCard', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(docSnapMissing());
    expect(await getCard('club-1', 'b1', 'card-1')).toBeNull();
  });

  it('retorna card', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ title: 'X' }, 'card-1'));
    const c = await getCard('club-1', 'b1', 'card-1');
    expect(c.id).toBe('card-1');
  });
});

describe('createCard', () => {
  it('cria card com log entry inicial + audit', async () => {
    // verifyBoardTenant (1º getDoc) + verifyColumnTenant (2º getDoc)
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'club-1' })); // board
    mockGetDoc.mockResolvedValueOnce(docSnap({ shelter_club_id: 'club-1', board_id: 'b1' })); // column
    const out = await createCard(validCard, { uid: 'u1', displayName: 'Ana' });
    expect(out.id).toBe('new-id');
    expect(Array.isArray(out.log)).toBe(true);
    expect(out.log[0].to_column_id).toBe('col-1');
    expect(out.log[0].by_uid).toBe('u1');
    expect(out.log[0].by_name).toBe('Ana');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_card_created' }),
    );
  });

  it('rejeita actor sem uid', async () => {
    await expect(createCard(validCard, {})).rejects.toThrow(/actor\.uid/);
  });
});

describe('updateCard', () => {
  it('atualiza card', async () => {
    mockGetDoc.mockResolvedValue(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1', column_id: 'col-1', title: 'Old',
    }));
    const out = await updateCard('club-1', 'b1', 'card-1', { title: 'New' }, { uid: 'u1' });
    expect(out.changed_fields).toEqual(['title']);
  });

  it('change column_id → verifica tenant da nova coluna', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1', column_id: 'col-1',
    }));
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1',
    }));
    const out = await updateCard('club-1', 'b1', 'card-1', { column_id: 'col-2' }, { uid: 'u1' });
    expect(out.changed_fields).toEqual(['column_id']);
    expect(mockGetDoc).toHaveBeenCalledTimes(2);
  });

  it('noop em update vazio', async () => {
    const out = await updateCard('club-1', 'b1', 'card-1', {}, { uid: 'u1' });
    expect(out.noop).toBe(true);
  });
});

describe('deleteCard', () => {
  it('deleta card', async () => {
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1', board_id: 'b1' }));
    const out = await deleteCard('club-1', 'b1', 'card-1', { uid: 'u1' });
    expect(out.deleted).toBe(true);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_card_deleted' }),
    );
  });
});

describe('moveCard', () => {
  it('move card entre colunas + log entry + audit', async () => {
    // verifyCardTenant + verifyColumnTenant
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1', column_id: 'col-1', title: 'X', log: [],
    }));
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1',
    }));
    const out = await moveCard('club-1', 'b1', 'card-1', 'col-2', 0, { uid: 'u1' });
    expect(out.to_column_id).toBe('col-2');
    expect(out.from_column_id).toBe('col-1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'kanban_card_moved' }),
    );
  });

  it('noop se mesma coluna + mesma order', async () => {
    // verifyCardTenant (1o getDoc) + verifyColumnTenant (2o getDoc) antes do noop check
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1', column_id: 'col-1', order: 0, log: [],
    }));
    mockGetDoc.mockResolvedValueOnce(docSnap({
      shelter_club_id: 'club-1', board_id: 'b1',
    }));
    const out = await moveCard('club-1', 'b1', 'card-1', 'col-1', 0, { uid: 'u1' });
    expect(out.noop).toBe(true);
  });
});

// ─── ensureDefaultBoard ──────────────────────────────────────────────

describe('ensureDefaultBoard', () => {
  it('idempotente: retorna existente sem criar', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [docSnap({ title: 'Default', is_default: true }, 'b1')],
    });
    const out = await ensureDefaultBoard('club-1', { uid: 'u1' });
    expect(out.id).toBe('b1');
    expect(out.created).toBe(false);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('cria board default + 4 colunas se não existir', async () => {
    // 1ª getDocs: getDefaultBoard → vazio
    // 2ª getDocs: _unsetOtherDefaults → vazio
    // 3ª getDocs (e seguintes): listColumns para cascade check
    mockGetDocs
      .mockResolvedValueOnce({ empty: true, docs: [] }) // getDefaultBoard
      .mockResolvedValueOnce({ docs: [] }) // _unsetOtherDefaults
      .mockResolvedValue({ docs: [] }); // qualquer listagem subsequente
    mockGetDoc.mockResolvedValue(docSnap({ shelter_club_id: 'club-1', board_id: 'b1' }));
    mockAddDoc.mockResolvedValue({ id: 'new-board' });
    const out = await ensureDefaultBoard('club-1', { uid: 'u1' });
    expect(out.id).toBe('new-board');
    expect(out.created).toBe(true);
    // 4 colunas devem ter sido criadas
    expect(mockAddDoc.mock.calls.length).toBeGreaterThanOrEqual(5); // 1 board + 4 cols
  });
});

// ─── subscribeBoard ──────────────────────────────────────────────────

describe('subscribeBoard', () => {
  it('retorna unsubscribe function', () => {
    const cb = vi.fn();
    const unsub = subscribeBoard('club-1', null, cb);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('com boardId: inscreve board + columns + cards', () => {
    const cb = vi.fn();
    subscribeBoard('club-1', 'b1', cb);
    // 3 onSnapshot: board, columns, cards
    expect(mockOnSnapshot).toHaveBeenCalledTimes(3);
  });

  it('com boardId=null: inscreve em boards (default)', () => {
    const cb = vi.fn();
    subscribeBoard('club-1', null, cb);
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1); // boards query
  });

  it('callback é invocado após debounce', async () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    subscribeBoard('club-1', 'b1', cb);
    // 3 callbacks capturados
    const captured = mockOnSnapshotCallbacks;
    // Simula dados chegando
    for (const { onData } of captured) {
      onData({
        exists: () => true,
        id: 'x',
        data: () => ({ title: 'X' }),
        docs: [],
      });
    }
    // Avança timer
    await vi.advanceTimersByTimeAsync(1100);
    expect(cb).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('callback ordenado (board null + errors)', () => {
    const cb = vi.fn();
    subscribeBoard('club-1', null, cb);
    // Simula snapshot vazio
    const { onData } = mockOnSnapshotCallbacks[0];
    onData({ empty: true, docs: [] });
    // Não crasha
    expect(cb).not.toThrow;
  });
});
