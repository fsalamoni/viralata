/**
 * @fileoverview Serviço: Central de Pendências (Kanban) — Fase 15.
 *
 * Coleções multi-tenant:
 *   clubs/{clubId}/kanban_boards/{boardId}
 *   clubs/{clubId}/kanban_boards/{boardId}/kanban_columns/{columnId}
 *   clubs/{clubId}/kanban_boards/{boardId}/kanban_cards/{cardId}
 *
 * Multi-tenant defense-in-depth:
 *  - `shelter_club_id` redundante em todos os docs
 *  - Verificação de tenant em todo update/delete (cross-tenant blocked)
 *  - 1 board default por abrigo (enforçado na criação via check + flag)
 *
 * Audit: toda mutação gera entrada imutável em `audit_logs` (best-effort).
 *
 * Real-time: `subscribeBoard(clubId, callback)` agrega `onSnapshot` em
 * `kanban_boards`, `kanban_columns` e `kanban_cards` do abrigo, com
 * debounce de 1s para evitar render-spam.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 15
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  defaultColumns,
  createBoardSchema,
  updateBoardSchema,
  createColumnSchema,
  updateColumnSchema,
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  appendLogEntry,
  DEFAULT_COLUMN_SLUGS,
} from '@/modules/shelter/domain/operational/kanban';

const CLUBS_COLLECTION = 'clubs';
const BOARDS_SUBCOLLECTION = 'kanban_boards';
const COLUMNS_SUBCOLLECTION = 'kanban_columns';
const CARDS_SUBCOLLECTION = 'kanban_cards';
const DEBOUNCE_MS = 1000;

// ─── Helpers internos ─────────────────────────────────────────────────

function _boardRef(clubId, boardId) {
  return doc(db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION, boardId);
}
function _boardsCollection(clubId) {
  return collection(db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION);
}
function _columnsCollection(clubId, boardId) {
  return collection(
    db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION, boardId, COLUMNS_SUBCOLLECTION,
  );
}
function _columnRef(clubId, boardId, columnId) {
  return doc(
    db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION, boardId, COLUMNS_SUBCOLLECTION, columnId,
  );
}
function _cardsCollection(clubId, boardId) {
  return collection(
    db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION, boardId, CARDS_SUBCOLLECTION,
  );
}
function _cardRef(clubId, boardId, cardId) {
  return doc(
    db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION, boardId, CARDS_SUBCOLLECTION, cardId,
  );
}

async function _verifyBoardTenant(clubId, boardId) {
  if (!clubId || !boardId) {
    throw new Error('clubId e boardId são obrigatórios');
  }
  const ref = _boardRef(clubId, boardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Board não encontrado.');
  const data = snap.data();
  if (data.shelter_club_id !== clubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data, _ref: ref };
}

async function _verifyColumnTenant(clubId, boardId, columnId) {
  if (!clubId || !boardId || !columnId) {
    throw new Error('clubId, boardId e columnId são obrigatórios');
  }
  const ref = _columnRef(clubId, boardId, columnId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Coluna não encontrada.');
  const data = snap.data();
  if (data.shelter_club_id !== clubId || data.board_id !== boardId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data, _ref: ref };
}

async function _verifyCardTenant(clubId, boardId, cardId) {
  if (!clubId || !boardId || !cardId) {
    throw new Error('clubId, boardId e cardId são obrigatórios');
  }
  const ref = _cardRef(clubId, boardId, cardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Card não encontrado.');
  const data = snap.data();
  if (data.shelter_club_id !== clubId || data.board_id !== boardId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data, _ref: ref };
}

// ─── Boards ────────────────────────────────────────────────────────────

/**
 * Lista todos os boards do abrigo (ativos ou arquivados).
 *
 * @param {string} clubId
 * @returns {Promise<object[]>}
 */
export async function listBoards(clubId) {
  if (!db) return [];
  if (!clubId) throw new Error('clubId é obrigatório');
  const q = query(
    _boardsCollection(clubId),
    orderBy('created_at', 'asc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Retorna o board default do abrigo, ou null se não existir.
 *
 * @param {string} clubId
 * @returns {Promise<object|null>}
 */
export async function getDefaultBoard(clubId) {
  if (!db) return null;
  if (!clubId) throw new Error('clubId é obrigatório');
  const q = query(
    _boardsCollection(clubId),
    where('is_default', '==', true),
    where('is_archived', '==', false),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/**
 * Cria um board. Se `is_default=true`, desmarca qualquer outro board
 * default do mesmo abrigo (defesa em profundidade: 1 default por abrigo).
 *
 * @param {object} input - {shelter_club_id, title, description?, is_default?, created_by}
 * @param {object} actor - {uid, displayName}
 * @returns {Promise<{id: string, ...payload}>}
 */
export async function createBoard(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createBoardSchema.parse(input);

  // Se for default, desmarca outros
  if (parsed.is_default) {
    await _unsetOtherDefaults(parsed.shelter_club_id);
  }

  const payload = {
    ...parsed,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(_boardsCollection(parsed.shelter_club_id), payload);

  await createAuditLog({
    action: 'kanban_board_created',
    actor,
    details: {
      board_id: ref.id,
      shelter_club_id: parsed.shelter_club_id,
      title: parsed.title,
      is_default: parsed.is_default,
    },
  }).catch((err) => {
    logger.warn('kanbanService.createBoard', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...payload };
}

/**
 * Helper interno: desmarca `is_default` em todos os boards do abrigo
 * exceto o de id `exceptBoardId` (se passado).
 */
async function _unsetOtherDefaults(clubId, exceptBoardId = null) {
  const q = query(
    _boardsCollection(clubId),
    where('is_default', '==', true),
    limit(10),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    if (d.id === exceptBoardId) continue;
    batch.update(d.ref, { is_default: false, updated_at: serverTimestamp() });
    count += 1;
  }
  if (count > 0) await batch.commit();
}

/**
 * Atualiza um board. Se `is_default=true` for setado, desmarca os outros.
 *
 * @param {string} clubId
 * @param {string} boardId
 * @param {object} updates
 * @param {object} actor
 * @returns {Promise<{changed_fields: string[], noop?: boolean}>}
 */
export async function updateBoard(clubId, boardId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateBoardSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const current = await _verifyBoardTenant(clubId, boardId);

  // Se marcando como default, desmarca outros
  if (parsed.is_default === true) {
    await _unsetOtherDefaults(clubId, boardId);
  }

  const patch = {
    ...parsed,
    updated_at: serverTimestamp(),
  };

  await updateDoc(_boardRef(clubId, boardId), patch);

  await createAuditLog({
    action: 'kanban_board_updated',
    actor,
    details: {
      board_id: boardId,
      shelter_club_id: clubId,
      changed: Object.keys(parsed),
    },
  }).catch((err) => {
    logger.warn('kanbanService.updateBoard', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { changed_fields: Object.keys(parsed) };
}

/**
 * Deleta um board. Cascade: deleta todas as colunas e cards do board.
 * (Não é transacional — mas se um passo falhar, o restante é ignorado
 * e o usuário pode re-executar; logs vão para audit).
 *
 * @param {string} clubId
 * @param {string} boardId
 * @param {object} actor
 * @returns {Promise<{id: string, deleted: boolean, columns: number, cards: number}>}
 */
export async function deleteBoard(clubId, boardId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyBoardTenant(clubId, boardId);

  // Coleta cards e colunas para deletar
  const colsSnap = await getDocs(_columnsCollection(clubId, boardId));
  let totalCards = 0;
  for (const c of colsSnap.docs) {
    const cardsSnap = await getDocs(_cardsCollection(clubId, boardId));
    // Firestore não tem "delete subcollection" — deleta 1 a 1
    for (const card of cardsSnap.docs) {
      await deleteDoc(card.ref);
      totalCards += 1;
    }
    await deleteDoc(c.ref);
  }

  await deleteDoc(_boardRef(clubId, boardId));

  await createAuditLog({
    action: 'kanban_board_deleted',
    actor,
    details: {
      board_id: boardId,
      shelter_club_id: clubId,
      title: current.title,
      columns_deleted: colsSnap.size,
      cards_deleted: totalCards,
    },
  }).catch((err) => {
    logger.warn('kanbanService.deleteBoard', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: boardId, deleted: true, columns: colsSnap.size, cards: totalCards };
}

// ─── Columns ──────────────────────────────────────────────────────────

/**
 * Lista colunas de um board, ordenadas por `order`.
 */
export async function listColumns(clubId, boardId) {
  if (!db) return [];
  if (!clubId || !boardId) throw new Error('clubId e boardId são obrigatórios');
  const q = query(
    _columnsCollection(clubId, boardId),
    orderBy('order', 'asc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria uma coluna.
 */
export async function createColumn(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createColumnSchema.parse(input);

  // Verifica que o board pertence ao mesmo abrigo
  await _verifyBoardTenant(parsed.shelter_club_id, parsed.board_id);

  const payload = {
    ...parsed,
    created_at: serverTimestamp(),
  };

  const ref = await addDoc(_columnsCollection(parsed.shelter_club_id, parsed.board_id), payload);

  await createAuditLog({
    action: 'kanban_column_created',
    actor,
    details: {
      column_id: ref.id,
      board_id: parsed.board_id,
      shelter_club_id: parsed.shelter_club_id,
      title: parsed.title,
    },
  }).catch((err) => {
    logger.warn('kanbanService.createColumn', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: ref.id, ...payload };
}

/**
 * Atualiza uma coluna.
 */
export async function updateColumn(clubId, boardId, columnId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateColumnSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  await _verifyColumnTenant(clubId, boardId, columnId);

  await updateDoc(_columnRef(clubId, boardId, columnId), parsed);

  await createAuditLog({
    action: 'kanban_column_updated',
    actor,
    details: {
      column_id: columnId,
      board_id: boardId,
      shelter_club_id: clubId,
      changed: Object.keys(parsed),
    },
  }).catch((err) => {
    logger.warn('kanbanService.updateColumn', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { changed_fields: Object.keys(parsed) };
}

/**
 * Deleta uma coluna. ATENÇÃO: cards na coluna ficam órfãos. UI deve
 * mover antes ou pedir confirmação. Aqui apenas auditamos.
 */
export async function deleteColumn(clubId, boardId, columnId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyColumnTenant(clubId, boardId, columnId);

  // Conta cards antes
  const cardsSnap = await getDocs(_cardsCollection(clubId, boardId));
  const orphanCount = cardsSnap.docs.filter((d) => d.data().column_id === columnId).length;

  await deleteDoc(_columnRef(clubId, boardId, columnId));

  await createAuditLog({
    action: 'kanban_column_deleted',
    actor,
    details: {
      column_id: columnId,
      board_id: boardId,
      shelter_club_id: clubId,
      title: current.title,
      orphan_cards: orphanCount,
    },
  }).catch((err) => {
    logger.warn('kanbanService.deleteColumn', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: columnId, deleted: true, orphan_cards: orphanCount };
}

/**
 * Reordena colunas de um board. Recebe array de column IDs na ordem
 * desejada. Usa writeBatch para atomicidade.
 */
export async function reorderColumns(clubId, boardId, orderedIds, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!Array.isArray(orderedIds)) {
    throw new Error('orderedIds deve ser array');
  }
  if (orderedIds.length > 100) {
    throw new Error('Máximo de 100 colunas por board');
  }

  await _verifyBoardTenant(clubId, boardId);

  const batch = writeBatch(db);
  orderedIds.forEach((columnId, idx) => {
    const ref = _columnRef(clubId, boardId, columnId);
    batch.update(ref, { order: idx });
  });
  await batch.commit();

  await createAuditLog({
    action: 'kanban_columns_reordered',
    actor,
    details: {
      board_id: boardId,
      shelter_club_id: clubId,
      count: orderedIds.length,
    },
  }).catch((err) => {
    logger.warn('kanbanService.reorderColumns', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { reordered: orderedIds.length };
}

// ─── Cards ────────────────────────────────────────────────────────────

/**
 * Lista cards de um board (sem filtro por column).
 */
export async function listCards(clubId, boardId) {
  if (!db) return [];
  if (!clubId || !boardId) throw new Error('clubId e boardId são obrigatórios');
  const q = query(
    _cardsCollection(clubId, boardId),
    orderBy('order', 'asc'),
    limit(1000),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Retorna um card específico.
 */
export async function getCard(clubId, boardId, cardId) {
  if (!db) return null;
  if (!clubId || !boardId || !cardId) {
    throw new Error('clubId, boardId e cardId são obrigatórios');
  }
  const ref = _cardRef(clubId, boardId, cardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Cria um card.
 */
export async function createCard(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createCardSchema.parse(input);

  // Verifica board + column tenants
  await _verifyBoardTenant(parsed.shelter_club_id, parsed.board_id);
  await _verifyColumnTenant(parsed.shelter_club_id, parsed.board_id, parsed.column_id);

  // Appenda log entry inicial (criação = sem from_column_id)
  const initialLog = [{
    from_column_id: null,
    to_column_id: parsed.column_id,
    by_uid: actor.uid,
    by_name: actor.displayName || actor.uid,
    at: new Date(),
    comment: 'Card criado',
  }];

  const payload = {
    ...parsed,
    log: initialLog,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(_cardsCollection(parsed.shelter_club_id, parsed.board_id), payload);

  await createAuditLog({
    action: 'kanban_card_created',
    actor,
    details: {
      card_id: ref.id,
      board_id: parsed.board_id,
      column_id: parsed.column_id,
      shelter_club_id: parsed.shelter_club_id,
      title: parsed.title,
      type: parsed.type,
      priority: parsed.priority,
    },
  }).catch((err) => {
    logger.warn('kanbanService.createCard', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: ref.id, ...payload };
}

/**
 * Atualiza um card.
 */
export async function updateCard(clubId, boardId, cardId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateCardSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const current = await _verifyCardTenant(clubId, boardId, cardId);

  // Se mudou column_id, verifica tenant da nova coluna
  if (parsed.column_id && parsed.column_id !== current.column_id) {
    await _verifyColumnTenant(clubId, boardId, parsed.column_id);
  }

  const patch = {
    ...parsed,
    updated_at: serverTimestamp(),
  };

  await updateDoc(_cardRef(clubId, boardId, cardId), patch);

  await createAuditLog({
    action: 'kanban_card_updated',
    actor,
    details: {
      card_id: cardId,
      board_id: boardId,
      shelter_club_id: clubId,
      changed: Object.keys(parsed),
    },
  }).catch((err) => {
    logger.warn('kanbanService.updateCard', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { changed_fields: Object.keys(parsed) };
}

/**
 * Deleta um card.
 */
export async function deleteCard(clubId, boardId, cardId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyCardTenant(clubId, boardId, cardId);

  await deleteDoc(_cardRef(clubId, boardId, cardId));

  await createAuditLog({
    action: 'kanban_card_deleted',
    actor,
    details: {
      card_id: cardId,
      board_id: boardId,
      shelter_club_id: clubId,
      title: current.title,
    },
  }).catch((err) => {
    logger.warn('kanbanService.deleteCard', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: cardId, deleted: true };
}

/**
 * Move um card para outra coluna. Adiciona entrada de log.
 *
 * @param {string} clubId
 * @param {string} boardId
 * @param {string} cardId
 * @param {string} toColumnId
 * @param {number} [toOrder=0]
 * @param {object} actor
 * @param {string} [comment]
 */
export async function moveCard(clubId, boardId, cardId, toColumnId, toOrder, actor, comment) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = moveCardSchema.parse({
    to_column_id: toColumnId,
    order: toOrder,
    comment,
  });

  const current = await _verifyCardTenant(clubId, boardId, cardId);
  await _verifyColumnTenant(clubId, boardId, parsed.to_column_id);

  // Se mesma coluna + mesma order, noop
  if (current.column_id === parsed.to_column_id && (current.order || 0) === parsed.order) {
    return { noop: true, card_id: cardId };
  }

  // Appenda log entry
  const updated = appendLogEntry(current, {
    from_column_id: current.column_id || null,
    to_column_id: parsed.to_column_id,
    by_uid: actor.uid,
    by_name: actor.displayName || actor.uid,
    at: new Date(),
    comment: parsed.comment || null,
  });

  await updateDoc(_cardRef(clubId, boardId, cardId), {
    column_id: parsed.to_column_id,
    order: parsed.order,
    log: updated.log,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'kanban_card_moved',
    actor,
    details: {
      card_id: cardId,
      board_id: boardId,
      shelter_club_id: clubId,
      from_column_id: current.column_id || null,
      to_column_id: parsed.to_column_id,
      order: parsed.order,
    },
  }).catch((err) => {
    logger.warn('kanbanService.moveCard', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return {
    card_id: cardId,
    from_column_id: current.column_id || null,
    to_column_id: parsed.to_column_id,
    order: parsed.order,
  };
}

// ─── Materialização de board default ─────────────────────────────────

/**
 * Garante que o abrigo tem um board default. Se não tiver, cria um
 * com as 4 colunas padrão. Idempotente.
 *
 * @param {string} clubId
 * @param {object} actor
 * @returns {Promise<{id: string, created: boolean}>}
 */
export async function ensureDefaultBoard(clubId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!clubId) throw new Error('clubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const existing = await getDefaultBoard(clubId);
  if (existing) return { id: existing.id, created: false };

  // Cria board default
  const board = await createBoard({
    shelter_club_id: clubId,
    title: 'Central de Pendências',
    description: 'Board principal do abrigo',
    is_default: true,
    is_archived: false,
    created_by: actor.uid,
  }, actor);

  // Cria as 4 colunas padrão
  const cols = defaultColumns(actor.uid);
  for (const col of cols) {
    await createColumn({
      shelter_club_id: clubId,
      board_id: board.id,
      title: col.title,
      color: col.color,
      order: col.order,
      responsible_uids: [],
      wip_limit: null,
      created_by: actor.uid,
    }, actor);
  }

  return { id: board.id, created: true };
}

// ─── subscribeBoard (real-time) ──────────────────────────────────────

/**
 * Inscreve em boards + colunas + cards do abrigo. Retorna unsubscribe.
 *
 * Snapshot agregado retornado no callback:
 *   {
 *     board: {id, title, ...} | null,
 *     columns: [{id, title, color, order, ...}],
 *     cards: [{id, column_id, title, ...}],
 *     errors: { [key]: message },
 *   }
 *
 * @param {string} clubId
 * @param {string|null} [boardId=null] - board específico; se null, usa o default
 * @param {(snapshot: object) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeBoard(clubId, boardId, callback) {
  if (!db) {
    callback({ board: null, columns: [], cards: [], errors: { _init: 'db_unavailable' } });
    return () => {};
  }
  if (!clubId) throw new Error('clubId é obrigatório');
  if (typeof callback !== 'function') throw new Error('callback deve ser função');

  const state = {
    board: null,
    columns: [],
    cards: [],
    errors: {},
    _resolvedBoardId: null,
  };

  let timer = null;
  let unsubs = [];
  let disposed = false;

  function scheduleFlush() {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      callback({
        board: state.board,
        columns: [...state.columns].sort((a, b) => (a.order || 0) - (b.order || 0)),
        cards: [...state.cards].sort((a, b) => (a.order || 0) - (b.order || 0)),
        errors: { ...state.errors },
      });
    }, DEBOUNCE_MS);
  }

  function onError(key, err) {
    state.errors[key] = String(err?.message || err);
    scheduleFlush();
  }

  async function setupForBoard(boardIdToWatch) {
    if (!boardIdToWatch) {
      state.board = null;
      state.columns = [];
      state.cards = [];
      state.errors._board = 'no_default_board';
      scheduleFlush();
      return;
    }
    state._resolvedBoardId = boardIdToWatch;
    state.errors._board = null;

    // Inscreve no board
    unsubs.push(
      onSnapshot(
        _boardRef(clubId, boardIdToWatch),
        (snap) => {
          if (!snap.exists()) {
            state.board = null;
          } else {
            state.board = { id: snap.id, ...snap.data() };
          }
          scheduleFlush();
        },
        (err) => onError('board', err),
      ),
    );

    // Inscreve nas colunas
    unsubs.push(
      onSnapshot(
        query(_columnsCollection(clubId, boardIdToWatch), orderBy('order', 'asc'), limit(100)),
        (snap) => {
          state.columns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          scheduleFlush();
        },
        (err) => onError('columns', err),
      ),
    );

    // Inscreve nos cards
    unsubs.push(
      onSnapshot(
        query(_cardsCollection(clubId, boardIdToWatch), orderBy('order', 'asc'), limit(1000)),
        (snap) => {
          state.cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          scheduleFlush();
        },
        (err) => onError('cards', err),
      ),
    );
  }

  // Decide o board
  if (boardId) {
    setupForBoard(boardId);
  } else {
    // Inscreve nos boards e seleciona o default
    const q = query(
      _boardsCollection(clubId),
      where('is_default', '==', true),
      where('is_archived', '==', false),
      limit(1),
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            state.board = null;
            state.columns = [];
            state.cards = [];
            state.errors._board = 'no_default_board';
            scheduleFlush();
            return;
          }
          const b = snap.docs[0];
          // Reset e re-inscreve
          for (const u of unsubs) {
            try { u(); } catch { /* noop */ }
          }
          unsubs = [];
          setupForBoard(b.id);
        },
        (err) => onError('boards', err),
      ),
    );
  }

  return function unsubscribe() {
    disposed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    for (const u of unsubs) {
      try { u(); } catch { /* noop */ }
    }
    unsubs = [];
  };
}
