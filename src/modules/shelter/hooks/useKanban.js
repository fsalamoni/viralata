/**
 * @fileoverview Hooks React Query + useSubscription para o Kanban
 * (Fase 15).
 *
 * - `useBoard(clubId, boardId?)` — usa `subscribeBoard` (onSnapshot) para
 *   manter board + columns + cards em tempo real.
 * - `useBoards(clubId)` — lista de boards (sem real-time, refetch manual).
 * - `useMyCards(clubId, uid)` — cards onde o uid é assignee, derivado
 *   do snapshot.
 * - Mutations: createBoard, updateBoard, deleteBoard, createColumn,
 *   updateColumn, deleteColumn, reorderColumns, createCard,
 *   updateCard, deleteCard, moveCard.
 *
 * Pattern: mutations invalidam queries. subscribeBoard mantém o estado
 * vivo, então mutations de board/column/card só precisam invalidar
 * as listas estáticas.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribeBoard,
  getDefaultBoard,
  listBoards,
  listColumns,
  listCards,
  createBoard,
  updateBoard,
  deleteBoard,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  ensureDefaultBoard,
} from '@/modules/shelter/services/kanbanService';
import { computeMyCards } from '@/modules/shelter/domain/operational/kanban';

const STALE_TIME_MS = 30_000;

// ─── Board (real-time) ────────────────────────────────────────────────

/**
 * Hook principal. Retorna {board, columns, cards, errors, isLoading}.
 *
 * @param {string} clubId
 * @param {string|null} [boardId] - se null, usa o default
 */
export function useBoard(clubId, boardId = null) {
  const [state, setState] = useState({
    board: null,
    columns: [],
    cards: [],
    errors: {},
    isLoading: Boolean(clubId),
  });

  useEffect(() => {
    if (!clubId) {
      setState({
        board: null, columns: [], cards: [], errors: {}, isLoading: false,
      });
      return undefined;
    }
    setState((s) => ({ ...s, isLoading: true }));
    const unsub = subscribeBoard(clubId, boardId, (snapshot) => {
      setState({
        board: snapshot.board,
        columns: snapshot.columns || [],
        cards: snapshot.cards || [],
        errors: snapshot.errors || {},
        isLoading: false,
      });
    });
    return () => {
      try { unsub(); } catch { /* noop */ }
    };
  }, [clubId, boardId]);

  return state;
}

/**
 * Lista de boards (sem real-time, refetch manual).
 */
export function useBoards(clubId) {
  return useQuery({
    queryKey: ['kanban-boards', clubId],
    queryFn: () => listBoards(clubId),
    enabled: Boolean(clubId),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Hook para garantir que existe um board default. Usado na primeira
 * vez que o usuário acessa a página de Kanban.
 */
export function useEnsureDefaultBoard(clubId) {
  const [data, setData] = useState({ id: null, created: false, isLoading: Boolean(clubId) });
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!clubId) {
      setData({ id: null, created: false, isLoading: false });
      return undefined;
    }
    let cancelled = false;
    setData((s) => ({ ...s, isLoading: true }));
    (async () => {
      try {
        // Tenta ler o default primeiro
        const existing = await getDefaultBoard(clubId);
        if (cancelled) return;
        if (existing) {
          setData({ id: existing.id, created: false, isLoading: false });
          return;
        }
        // Cria um se não existir
        const actor = { uid: 'system-bootstrap', displayName: 'Sistema' };
        const out = await ensureDefaultBoard(clubId, actor);
        if (cancelled) return;
        setData({ id: out.id, created: !!out.created, isLoading: false });
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setData((s) => ({ ...s, isLoading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [clubId, reload]);

  return { ...data, error, refresh: () => setReload((r) => r + 1) };
}

// ─── My cards ─────────────────────────────────────────────────────────

/**
 * Cards onde o uid é assignee. Usa subscribeBoard para manter em
 * tempo real.
 *
 * @param {string} clubId
 * @param {string|null} uid
 * @returns {{cards: object[], isLoading: boolean, count: number}}
 */
export function useMyCards(clubId, uid) {
  const { cards, isLoading } = useBoard(clubId);
  const my = useMemo(() => computeMyCards(cards, uid), [cards, uid]);
  return { cards: my, isLoading, count: my.length };
}

// ─── Board mutations ──────────────────────────────────────────────────

export function useCreateBoard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createBoard({ ...input, shelter_club_id: clubId }, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-boards', clubId] });
    },
  });
}

export function useUpdateBoard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, updates, actor }) => updateBoard(clubId, boardId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-boards', clubId] });
    },
  });
}

export function useDeleteBoard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, actor }) => deleteBoard(clubId, boardId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-boards', clubId] });
    },
  });
}

// ─── Column mutations ─────────────────────────────────────────────────

export function useCreateColumn(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, input, actor }) =>
      createColumn({ ...input, shelter_club_id: clubId, board_id: boardId }, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-columns', clubId] });
    },
  });
}

export function useUpdateColumn(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, columnId, updates, actor }) =>
      updateColumn(clubId, boardId, columnId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-columns', clubId] });
    },
  });
}

export function useDeleteColumn(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, columnId, actor }) =>
      deleteColumn(clubId, boardId, columnId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-columns', clubId] });
    },
  });
}

export function useReorderColumns(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, orderedIds, actor }) =>
      reorderColumns(clubId, boardId, orderedIds, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-columns', clubId] });
    },
  });
}

// ─── Card mutations ───────────────────────────────────────────────────

export function useCreateCard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, input, actor }) =>
      createCard({ ...input, shelter_club_id: clubId, board_id: boardId }, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-cards', clubId] });
    },
  });
}

export function useUpdateCard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, cardId, updates, actor }) =>
      updateCard(clubId, boardId, cardId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-cards', clubId] });
    },
  });
}

export function useDeleteCard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, cardId, actor }) =>
      deleteCard(clubId, boardId, cardId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-cards', clubId] });
    },
  });
}

export function useMoveCard(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, cardId, toColumnId, toOrder, actor, comment }) =>
      moveCard(clubId, boardId, cardId, toColumnId, toOrder, actor, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban-cards', clubId] });
    },
  });
}

// ─── Static queries (sem real-time, refetch manual) ──────────────────

export function useColumnsStatic(clubId, boardId) {
  return useQuery({
    queryKey: ['kanban-columns', clubId, boardId],
    queryFn: () => listColumns(clubId, boardId),
    enabled: Boolean(clubId && boardId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCardsStatic(clubId, boardId) {
  return useQuery({
    queryKey: ['kanban-cards', clubId, boardId],
    queryFn: () => listCards(clubId, boardId),
    enabled: Boolean(clubId && boardId),
    staleTime: STALE_TIME_MS,
  });
}
