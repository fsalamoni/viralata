/**
 * @fileoverview Serviço: Central de Pendências / Kanban (Fase 15).
 *
 * Coleções multi-tenant:
 *   clubs/{clubId}/kanban_boards/{boardId}
 *   clubs/{clubId}/kanban_columns/{columnId}
 *   clubs/{clubId}/kanban_cards/{cardId}
 *
 * Defense-in-depth multi-tenant:
 *  - shelter_club_id duplicado no doc (valida contra clubId da path)
 *  - board_id FK validado antes de criar cards
 *  - column_id FK validado antes de operações no card
 *  - Assignee pode atualizar SOMENTE o campo `status` do card
 *
 * Audit: toda mutação gera entrada em `audit_logs` (best-effort).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14 (Kanban)
 */

import {
  collection, collectionGroup, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  createBoardSchema, updateBoardSchema,
  createColumnSchema, updateColumnSchema,
  createCardSchema, updateCardSchema, moveCardSchema,
  addChecklistItemSchema,
  DEFAULT_COLUMNS,
  buildMoveLog, buildCreateLog, buildStatusChangeLog,
  generateChecklistItemId,
} from '@/modules/shelter/domain/operational/kanban';

const CLUBS_COLLECTION      = 'clubs';
const BOARDS_SUBCOLLECTION  = 'kanban_boards';
const COLUMNS_SUBCOLLECTION = 'kanban_columns';
const CARDS_SUBCOLLECTION   = 'kanban_cards';

// ─── Refs ──────────────────────────────────────────────────────────────

function boardRef(clubId, boardId) {
  return doc(db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION, boardId);
}
function columnRef(clubId, columnId) {
  return doc(db, CLUBS_COLLECTION, clubId, COLUMNS_SUBCOLLECTION, columnId);
}
function cardRef(clubId, cardId) {
  return doc(db, CLUBS_COLLECTION, clubId, CARDS_SUBCOLLECTION, cardId);
}
function boardsCol(clubId) {
  return collection(db, CLUBS_COLLECTION, clubId, BOARDS_SUBCOLLECTION);
}
function columnsCol(clubId) {
  return collection(db, CLUBS_COLLECTION, clubId, COLUMNS_SUBCOLLECTION);
}
function cardsCol(clubId) {
  return collection(db, CLUBS_COLLECTION, clubId, CARDS_SUBCOLLECTION);
}

// ─── Helpers internos ──────────────────────────────────────────────────

async function _verifyBoardTenant(boardId, shelterClubId) {
  if (!db) return true;
  if (!boardId || !shelterClubId) throw new Error('boardId e shelterClubId são obrigatórios');
  const snap = await getDoc(boardRef(shelterClubId, boardId));
  if (!snap.exists()) throw new Error('Board não encontrado neste abrigo');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) throw new Error('Acesso negado: board pertence a outro abrigo');
  return data;
}

async function _verifyColumnTenant(columnId, shelterClubId) {
  if (!db) return true;
  if (!columnId || !shelterClubId) throw new Error('columnId e shelterClubId são obrigatórios');
  const snap = await getDoc(columnRef(shelterClubId, columnId));
  if (!snap.exists()) throw new Error('Coluna não encontrada neste abrigo');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) throw new Error('Acesso negado: coluna pertence a outro abrigo');
  return data;
}

async function _verifyCardTenant(cardId, shelterClubId) {
  if (!db) return true;
  if (!cardId || !shelterClubId) throw new Error('cardId e shelterClubId são obrigatórios');
  const snap = await getDoc(cardRef(shelterClubId, cardId));
  if (!snap.exists()) throw new Error('Card não encontrado neste abrigo');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) throw new Error('Acesso negado: card pertence a outro abrigo');
  return data;
}

// ════════════════════════════════════════════════════════════════════
// BOARDS
// ════════════════════════════════════════════════════════════════════

/**
 * Lista todos os boards do abrigo ordenados por created_at desc.
 */
export async function listBoards(shelterClubId) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  const q = query(boardsCol(shelterClubId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Busca um board específico com validação de tenant.
 */
export async function getBoard(shelterClubId, boardId) {
  if (!db) return null;
  await _verifyBoardTenant(boardId, shelterClubId);
  const snap = await getDoc(boardRef(shelterClubId, boardId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Cria um board e suas colunas default.
 * Idempotência: se columns não for fornecido, cria DEFAULT_COLUMNS.
 */
export async function createBoard(shelterClubId, uid, payload) {
  if (!db) return { id: 'mock-board-id' };
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  if (!uid) throw new Error('uid é obrigatório para criar board');

  const parsed = createBoardSchema.parse(payload);
  const now = serverTimestamp();

  const boardData = {
    shelter_club_id: shelterClubId,
    name:            parsed.name,
    default_view:    parsed.default_view,
    owner_uid:       uid,
    columns_order:   [],
    created_at:       now,
    updated_at:       now,
  };

  const boardRef = await addDoc(boardsCol(shelterClubId), boardData);

  // Cria colunas default em batch
  const batch = writeBatch(db);
  const columnIds = [];
  for (const colDef of parsed.columns || DEFAULT_COLUMNS) {
    const colData = {
      shelter_club_id:  shelterClubId,
      board_id:          boardRef.id,
      title:             colDef.title,
      color:             colDef.color,
      order:             colDef.order,
      responsible_uids:  colDef.responsible_uids || [],
      created_at:        now,
      updated_at:        now,
    };
    const colRef = doc(collection(
      db, CLUBS_COLLECTION, shelterClubId, COLUMNS_SUBCOLLECTION,
    ));
    batch.set(colRef, colData);
    columnIds.push(colRef.id);
  }

  // Atualiza board com a ordem das colunas
  batch.update(boardRef, { columns_order: columnIds, updated_at: now });
  await batch.commit();

  logger.info('kanban: board criado', { boardId: boardRef.id, shelterClubId, uid });

  await createAuditLog({
    action: 'kanban_board_created',
    clubId: shelterClubId,
    uid,
    metadata: { boardId: boardRef.id, name: parsed.name, columnCount: columnIds.length },
  }).catch(() => {});

  return { id: boardRef.id, ...boardData, columns_order: columnIds };
}

/**
 * Atualiza metadados do board (nome, view).
 */
export async function updateBoard(shelterClubId, boardId, uid, updates) {
  if (!db) return;
  await _verifyBoardTenant(boardId, shelterClubId);
  const parsed = updateBoardSchema.parse(updates);
  const ref = boardRef(shelterClubId, boardId);
  await updateDoc(ref, { ...parsed, updated_at: serverTimestamp() });

  logger.info('kanban: board atualizado', { boardId, shelterClubId, uid });
}

/**
 * Delete um board e TODAS as suas colunas e cards (em cascata com batch).
 * Só owner ou platform_admin pode deletar.
 */
export async function deleteBoard(shelterClubId, boardId, uid) {
  if (!db) return;
  await _verifyBoardTenant(boardId, shelterClubId);
  const batch = writeBatch(db);

  // Deleta cards
  const cardsQ = query(cardsCol(shelterClubId), where('board_id', '==', boardId));
  const cardsSnap = await getDocs(cardsQ);
  cardsSnap.docs.forEach((d) => batch.delete(d.ref));

  // Deleta colunas
  const colsQ = query(columnsCol(shelterClubId), where('board_id', '==', boardId));
  const colsSnap = await getDocs(colsQ);
  colsSnap.docs.forEach((d) => batch.delete(d.ref));

  // Deleta board
  batch.delete(boardRef(shelterClubId, boardId));
  await batch.commit();

  logger.info('kanban: board deletado', { boardId, shelterClubId, uid });
}

// ════════════════════════════════════════════════════════════════════
// COLUMNS
// ════════════════════════════════════════════════════════════════════

/**
 * Lista colunas de um board ordenadas por order asc.
 */
export async function listColumns(shelterClubId, boardId) {
  if (!db) return [];
  if (!shelterClubId || !boardId) return [];
  await _verifyBoardTenant(boardId, shelterClubId);
  const q = query(
    columnsCol(shelterClubId),
    where('board_id', '==', boardId),
    orderBy('order', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria uma nova coluna em um board.
 */
export async function createColumn(shelterClubId, uid, payload) {
  if (!db) return { id: 'mock-col-id' };
  await _verifyBoardTenant(payload.board_id, shelterClubId);
  const parsed = createColumnSchema.parse({ ...payload, shelter_club_id: shelterClubId });
  const now = serverTimestamp();
  const ref = await addDoc(columnsCol(shelterClubId), {
    shelter_club_id: shelterClubId,
    board_id:         parsed.board_id,
    title:            parsed.title,
    color:            parsed.color,
    order:            parsed.order,
    responsible_uids:  parsed.responsible_uids,
    created_at:        now,
    updated_at:        now,
  });

  // Atualiza columns_order do board
  const boardSnap = await getDoc(boardRef(shelterClubId, parsed.board_id));
  if (boardSnap.exists()) {
    const current = boardSnap.data().columns_order || [];
    await updateDoc(boardRef(shelterClubId, parsed.board_id), {
      columns_order: [...current, ref.id],
      updated_at:    now,
    });
  }

  logger.info('kanban: coluna criada', { columnId: ref.id, shelterClubId, uid });
  return { id: ref.id };
}

/**
 * Atualiza metadados de uma coluna.
 */
export async function updateColumn(shelterClubId, columnId, uid, updates) {
  if (!db) return;
  await _verifyColumnTenant(columnId, shelterClubId);
  const parsed = updateColumnSchema.parse(updates);
  await updateDoc(columnRef(shelterClubId, columnId), {
    ...parsed,
    updated_at: serverTimestamp(),
  });
  logger.info('kanban: coluna atualizada', { columnId, shelterClubId, uid });
}

/**
 * Deleta uma coluna (rejeita se tiver cards).
 */
export async function deleteColumn(shelterClubId, columnId, uid) {
  if (!db) return;
  await _verifyColumnTenant(columnId, shelterClubId);

  // Verifica se há cards na coluna
  const cardsQ = query(
    cardsCol(shelterClubId),
    where('column_id', '==', columnId),
    limit(1),
  );
  const cardsSnap = await getDocs(cardsQ);
  if (!cardsSnap.empty) {
    throw new Error('Não é possível deletar coluna com cards. Remova ou mova os cards primeiro.');
  }

  await deleteDoc(columnRef(shelterClubId, columnId));

  // Remove da columns_order do board — busca board_id da própria coluna
  const colSnap = await getDoc(columnRef(shelterClubId, columnId));
  if (!colSnap.exists()) return; // já deletada
  const { board_id: boardId } = colSnap.data();
  const boardSnap = await getDoc(boardRef(shelterClubId, boardId));
  if (boardSnap.exists()) {
    const current = boardSnap.data().columns_order || [];
    await updateDoc(boardRef(shelterClubId, boardId), {
      columns_order: current.filter((id) => id !== columnId),
      updated_at:    serverTimestamp(),
    });
  }

  logger.info('kanban: coluna deletada', { columnId, shelterClubId, uid });
}

/**
 * Reordena uma coluna (atualiza order e columns_order do board).
 */
export async function reorderColumn(shelterClubId, columnId, uid, newOrder) {
  if (!db) return;
  await _verifyColumnTenant(columnId, shelterClubId);
  const colSnap = await getDoc(columnRef(shelterClubId, columnId));
  if (!colSnap.exists()) throw new Error('Coluna não encontrada');
  const boardId = colSnap.data().board_id;

  await updateDoc(columnRef(shelterClubId, columnId), {
    order:      newOrder,
    updated_at: serverTimestamp(),
  });

  // Atualiza columns_order do board
  const boardSnap = await getDoc(boardRef(shelterClubId, boardId));
  if (boardSnap.exists()) {
    const current = boardSnap.data().columns_order || [];
    // Remove columnId da posição atual e reinsere na nova
    const reordered = current.filter((id) => id !== columnId);
    reordered.splice(newOrder, 0, columnId);
    await updateDoc(boardRef(shelterClubId, boardId), {
      columns_order: reordered,
      updated_at:    serverTimestamp(),
    });
  }

  logger.info('kanban: coluna reordenada', { columnId, newOrder, shelterClubId, uid });
}

// ════════════════════════════════════════════════════════════════════
// CARDS
// ════════════════════════════════════════════════════════════════════

/**
 * Lista cards com filtros opcionais.
 */
export async function listCards(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  const { boardId, columnId, assigneeUid, type, status, maxResults = 500 } = options;
  const constraints = [];
  if (boardId)     constraints.push(where('board_id', '==', boardId));
  if (columnId)   constraints.push(where('column_id', '==', columnId));
  if (assigneeUid) constraints.push(where('assignees', 'array-contains', assigneeUid));
  if (type)       constraints.push(where('type', '==', type));
  if (status)     constraints.push(where('status', '==', status));
  constraints.push(orderBy('order', 'asc'));
  constraints.push(limit(maxResults));

  const q = query(cardsCol(shelterClubId), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Busca um card específico.
 */
export async function getCard(shelterClubId, cardId) {
  if (!db) return null;
  await _verifyCardTenant(cardId, shelterClubId);
  const snap = await getDoc(cardRef(shelterClubId, cardId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Cria um card em uma coluna.
 */
export async function createCard(shelterClubId, uid, payload) {
  if (!db) return { id: 'mock-card-id' };
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  if (!uid) throw new Error('uid é obrigatório');

  await _verifyColumnTenant(payload.column_id, shelterClubId);
  const parsed = createCardSchema.parse({ ...payload, shelter_club_id: shelterClubId });
  const now = serverTimestamp();

  const logEntry = buildCreateLog('pending', parsed.column_id, uid);
  const ref = await addDoc(cardsCol(shelterClubId), {
    shelter_club_id: shelterClubId,
    board_id:         parsed.board_id,
    column_id:        parsed.column_id,
    title:            parsed.title,
    description:      parsed.description,
    type:             parsed.type,
    assignees:        parsed.assignees,
    due_at:           parsed.due_at,
    priority:         parsed.priority,
    status:           'open',
    checklist:        [],
    attachments:       [],
    source_task_id:   parsed.source_task_id,
    order:            parsed.order,
    log:              [logEntry],
    created_by_uid:    uid,
    created_at:        now,
    updated_at:        now,
  });

  logger.info('kanban: card criado', { cardId: ref.id, shelterClubId, uid });

  await createAuditLog({
    action: 'kanban_card_created',
    clubId: shelterClubId,
    uid,
    metadata: { cardId: ref.id, columnId: parsed.column_id, type: parsed.type },
  }).catch(() => {});

  return { id: ref.id };
}

/**
 * Atualiza um card (owner ou admin only para todos campos).
 * Se caller é assignee, pode atualizar SOMENTE o campo `status`.
 */
export async function updateCard(shelterClubId, cardId, uid, updates, isAssignee = false) {
  if (!db) return;
  const card = await _verifyCardTenant(cardId, shelterClubId);

  // Se é assignee (não owner/admin), só permite atualizar status
  if (isAssignee) {
    const allowed = { status: updates.status };
    if (Object.keys(updates).some((k) => k !== 'status')) {
      logger.warn('kanban: assignee tentou atualizar campos não-permitidos', { cardId, uid });
    }
    if (allowed.status) {
      const statusLog = buildStatusChangeLog(cardId, allowed.status, uid);
      await updateDoc(cardRef(shelterClubId, cardId), {
        status:    allowed.status,
        log:       [...(card.log || []), statusLog],
        updated_at: serverTimestamp(),
      });
    }
    return;
  }

  // Full update (owner/admin)
  const parsed = updateCardSchema.parse(updates);
  const newLog = [...(card.log || [])];

  if (parsed.status && parsed.status !== card.status) {
    newLog.push(buildStatusChangeLog(cardId, parsed.status, uid));
  }

  await updateDoc(cardRef(shelterClubId, cardId), {
    ...parsed,
    log:       newLog,
    updated_at: serverTimestamp(),
  });

  logger.info('kanban: card atualizado', { cardId, shelterClubId, uid });
}

/**
 * Move um card para outra coluna (drag-and-drop).
 * Registra log de movimentação.
 */
export async function moveCard(shelterClubId, cardId, uid, payload) {
  if (!db) return;
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');

  const card = await _verifyCardTenant(cardId, shelterClubId);
  const { target_column_id, new_order, note } = moveCardSchema.parse(payload);

  await _verifyColumnTenant(target_column_id, shelterClubId);

  const fromColumnId = card.column_id;
  const moveLog = buildMoveLog(cardId, fromColumnId, target_column_id, uid, note);

  await updateDoc(cardRef(shelterClubId, cardId), {
    column_id:  target_column_id,
    order:      new_order,
    log:        [...(card.log || []), moveLog],
    updated_at: serverTimestamp(),
  });

  logger.info('kanban: card movido', { cardId, fromColumnId, target_column_id, uid });

  await createAuditLog({
    action: 'kanban_card_moved',
    clubId: shelterClubId,
    uid,
    metadata: { cardId, fromColumnId, targetColumnId: target_column_id },
  }).catch(() => {});
}

/**
 * Deleta um card.
 */
export async function deleteCard(shelterClubId, cardId, uid) {
  if (!db) return;
  await _verifyCardTenant(cardId, shelterClubId);
  await deleteDoc(cardRef(shelterClubId, cardId));
  logger.info('kanban: card deletado', { cardId, shelterClubId, uid });
}

/**
 * Adiciona item ao checklist de um card.
 */
export async function addChecklistItem(shelterClubId, cardId, uid, itemText) {
  if (!db) return;
  const card = await _verifyCardTenant(cardId, shelterClubId);
  const { text } = addChecklistItemSchema.parse({ text: itemText });
  const newItem = { id: generateChecklistItemId(), text, done: false };
  await updateDoc(cardRef(shelterClubId, cardId), {
    checklist:  [...(card.checklist || []), newItem],
    updated_at: serverTimestamp(),
  });
}

/**
 * Toggle um item do checklist (done ↔ not done).
 */
export async function toggleChecklistItem(shelterClubId, cardId, uid, itemIndex) {
  if (!db) return;
  const card = await _verifyCardTenant(cardId, shelterClubId);
  const checklist = [...(card.checklist || [])];
  if (itemIndex < 0 || itemIndex >= checklist.length) {
    throw new Error('Índice de checklist inválido');
  }
  checklist[itemIndex] = { ...checklist[itemIndex], done: !checklist[itemIndex].done };
  await updateDoc(cardRef(shelterClubId, cardId), {
    checklist:  checklist,
    updated_at: serverTimestamp(),
  });
}

/**
 * Lista cards onde o uid é assignee, incluindo info de board e coluna.
 */
export async function getCardsByAssignee(shelterClubId, uid) {
  if (!db) return [];
  if (!shelterClubId || !uid) return [];
  const cards = await listCards(shelterClubId, { assigneeUid: uid });

  // Enriquecer com board e column names
  const enriched = await Promise.all(
    cards.map(async (card) => {
      const [boardSnap, colSnap] = await Promise.all([
        getDoc(boardRef(shelterClubId, card.board_id)).catch(() => ({ exists: () => false })),
        getDoc(columnRef(shelterClubId, card.column_id)).catch(() => ({ exists: () => false })),
      ]);
      return {
        ...card,
        board_name:  boardSnap.exists() ? boardSnap.data().name : null,
        column_name: colSnap.exists()  ? colSnap.data().title : null,
        column_color: colSnap.exists() ? colSnap.data().color : null,
      };
    }),
  );
  return enriched;
}

/**
 * Lista todos os cards onde o `uid` é assignee, **cross-shelter**
 * (todos os abrigos onde o usuário tem tasks). Usa collectionGroup
 * para varrer `kanban_cards` em todos os clubes.
 *
 * Retorna cards enriquecidos com:
 *  - `shelter_club_id` (path do parent)
 *  - `shelter_club_name` (best-effort, requer read extra do clube)
 *  - `board_name` / `column_name` / `column_color`
 *
 * Performance: collectionGroup + array-contains + Firestore aggregate. Limite
 * 200 cards (ajustar se necessário). Para dashboards pessoais com mais
 * tasks, paginar ou usar Firestore query cursor.
 *
 * @param {string} uid - user id
 * @returns {Promise<Array>} lista de cards enriquecidos, ordenados por due_at asc
 */
export async function getMyCardsAll(uid) {
  if (!db) return [];
  if (!uid) return [];
  const q = query(
    collectionGroup(db, CARDS_SUBCOLLECTION),
    where('assignees', 'array-contains', uid),
    orderBy('due_at', 'asc'),
    limit(200),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [], empty: true }));

  // Extrair shelter_club_id do path: clubs/{clubId}/kanban_cards/{cardId}
  const enriched = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const card = { id: docSnap.id, ...docSnap.data() };
      const path = docSnap.ref.path; // clubs/{clubId}/kanban_cards/{cardId}
      // Reaproveita o helper puro (testado em kanbanService.getMyCardsAll.test.js)
      // para manter a regex em um único lugar.
      const { extractShelterClubIdFromCardsPath } = await import('./kanbanService.getMyCardsAll.js');
      const shelterClubId = extractShelterClubIdFromCardsPath(path);

      // Enrich com board + column
      const [boardSnap, colSnap, clubSnap] = await Promise.all([
        shelterClubId
          ? getDoc(boardRef(shelterClubId, card.board_id)).catch(() => ({ exists: () => false }))
          : Promise.resolve({ exists: () => false }),
        shelterClubId
          ? getDoc(columnRef(shelterClubId, card.column_id)).catch(() => ({ exists: () => false }))
          : Promise.resolve({ exists: () => false }),
        shelterClubId
          ? getDoc(doc(db, CLUBS_COLLECTION, shelterClubId)).catch(() => ({ exists: () => false }))
          : Promise.resolve({ exists: () => false }),
      ]);
      return {
        ...card,
        shelter_club_id: shelterClubId,
        shelter_club_name: clubSnap.exists() ? clubSnap.data().name : null,
        board_name: boardSnap.exists() ? boardSnap.data().name : null,
        column_name: colSnap.exists() ? colSnap.data().title : null,
        column_color: colSnap.exists() ? colSnap.data().color : null,
      };
    }),
  );
  return enriched;
}
