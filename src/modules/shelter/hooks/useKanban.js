/**
 * useKanban — React Query hooks para boards, colunas e cards do Kanban
 * Feature-gated por SHELTER_KANBAN
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import * as kanbanService from '../services/kanbanService';

const SHELTER_KANBAN_KEY = 'shelter_kanban';

function kanbanEnabled() {
  try {
    const { isFeatureEnabled } = require('@/core/featureFlags');
    return isFeatureEnabled(SHELTER_KANBAN_KEY);
  } catch {
    return false;
  }
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const kanbanKeys = {
  all:        (clubId) => ['shelter', 'kanban', clubId],
  boards:     (clubId) => [...kanbanKeys.all(clubId), 'boards'],
  board:      (clubId, boardId) => [...kanbanKeys.all(clubId), 'board', boardId],
  columns:    (clubId, boardId) => [...kanbanKeys.all(clubId), 'board', boardId, 'columns'],
  cards:      (clubId, boardId) => [...kanbanKeys.all(clubId), 'board', boardId, 'cards'],
  card:       (clubId, cardId) => [...kanbanKeys.all(clubId), 'card', cardId],
  myCards:    (clubId, uid) => [...kanbanKeys.all(clubId), 'my-cards', uid],
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Lista todos os boards de um abrigo */
export function useBoards(clubId) {
  return useQuery({
    queryKey: kanbanKeys.boards(clubId),
    queryFn: () => kanbanService.listBoards(clubId),
    enabled: kanbanEnabled() && Boolean(clubId),
  });
}

/** Busca um board com suas colunas ordenadas */
export function useBoard(clubId, boardId) {
  return useQuery({
    queryKey: kanbanKeys.board(clubId, boardId),
    queryFn: () => kanbanService.getBoard(clubId, boardId),
    enabled: kanbanEnabled() && Boolean(clubId) && Boolean(boardId),
  });
}

/** Lista colunas de um board */
export function useColumns(clubId, boardId) {
  return useQuery({
    queryKey: kanbanKeys.columns(clubId, boardId),
    queryFn: () => kanbanService.listColumns(clubId, boardId),
    enabled: kanbanEnabled() && Boolean(clubId) && Boolean(boardId),
  });
}

/** Lista cards de um board (opcionalmente filtrados) */
export function useCards(clubId, boardId, filters = {}) {
  return useQuery({
    queryKey: [...kanbanKeys.cards(clubId, boardId), filters],
    queryFn: () => kanbanService.listCards(clubId, { boardId, ...filters }),
    enabled: kanbanEnabled() && Boolean(clubId),
  });
}

/** Cards atribuídos ao usuário logado */
export function useMyCards(clubId, uid) {
  return useQuery({
    queryKey: kanbanKeys.myCards(clubId, uid),
    queryFn: () => kanbanService.getCardsByAssignee(clubId, uid),
    enabled: kanbanEnabled() && Boolean(clubId) && Boolean(uid),
  });
}

/**
 * Cards atribuídos ao usuário logado em TODOS os abrigos (cross-shelter).
 * Usa collectionGroup query + array-contains. Limit 200 (paginar depois
 * se necessário). Usado pelo "Minhas tarefas" do Profile.
 */
export function useMyCardsAll(uid) {
  return useQuery({
    queryKey: [...kanbanKeys.all('*'), 'myCardsAll', uid],
    queryFn: () => kanbanService.getMyCardsAll(uid),
    enabled: kanbanEnabled() && Boolean(uid),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────


/** Cria / atualiza / deleta boards */
export function useBoardMutations(clubId) {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data) => kanbanService.createBoard(clubId, data),
    onSuccess: () => {
      kanbanKeys.boards(clubId).forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });

  const update = useMutation({
    mutationFn: ({ boardId, ...data }) => kanbanService.updateBoard(clubId, boardId, data),
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: kanbanKeys.board(clubId, boardId) });
      qc.invalidateQueries({ queryKey: kanbanKeys.boards(clubId) });
    },
  });

  const del = useMutation({
    mutationFn: (boardId) => kanbanService.deleteBoard(clubId, boardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.boards(clubId) });
    },
  });

  return { createBoard: create, updateBoard: update, deleteBoard: del };
}

/** Cria / atualiza / deleta / reordena colunas */
export function useColumnMutations(clubId, boardId) {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data) => kanbanService.createColumn(clubId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.columns(clubId, boardId) });
      qc.invalidateQueries({ queryKey: kanbanKeys.board(clubId, boardId) });
    },
  });

  const update = useMutation({
    mutationFn: ({ columnId, ...data }) => kanbanService.updateColumn(clubId, columnId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.columns(clubId, boardId) });
    },
  });

  const del = useMutation({
    mutationFn: (columnId) => kanbanService.deleteColumn(clubId, columnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.columns(clubId, boardId) });
      qc.invalidateQueries({ queryKey: kanbanKeys.board(clubId, boardId) });
    },
  });

  const reorder = useMutation({
    mutationFn: ({ columnId, newOrder }) => kanbanService.reorderColumn(clubId, columnId, newOrder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.columns(clubId, boardId) });
      qc.invalidateQueries({ queryKey: kanbanKeys.board(clubId, boardId) });
    },
  });

  return { createColumn: create, updateColumn: update, deleteColumn: del, reorderColumn: reorder };
}

/** Cria / atualiza / move / deleta cards */
export function useCardMutations(clubId, boardId) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.uid;

  const create = useMutation({
    mutationFn: (data) => kanbanService.createCard(clubId, uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(clubId, boardId) });
    },
  });

  const update = useMutation({
    mutationFn: ({ cardId, ...data }) => kanbanService.updateCard(clubId, cardId, uid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(clubId, boardId) });
    },
  });

  const move = useMutation({
    mutationFn: ({ cardId, targetColumnId, newOrder }) =>
      kanbanService.moveCard(clubId, cardId, uid, { target_column_id: targetColumnId, new_order: newOrder }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(clubId, boardId) });
    },
  });

  const del = useMutation({
    mutationFn: (cardId) => kanbanService.deleteCard(clubId, cardId, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(clubId, boardId) });
    },
  });

  const toggleChecklist = useMutation({
    mutationFn: ({ cardId, itemIndex }) => kanbanService.toggleChecklistItem(clubId, cardId, uid, itemIndex),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(clubId, boardId) });
    },
  });

  const addChecklist = useMutation({
    mutationFn: ({ cardId, text }) => kanbanService.addChecklistItem(clubId, cardId, uid, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: kanbanKeys.cards(clubId, boardId) });
    },
  });

  return { createCard: create, updateCard: update, moveCard: move, deleteCard: del, toggleChecklistItem: toggleChecklist, addChecklistItem: addChecklist };
}
