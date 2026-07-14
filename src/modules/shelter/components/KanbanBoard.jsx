/**
 * KanbanBoard — container drag-and-drop com colunas
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useCardMutations } from '../hooks/useKanban';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

export function KanbanBoard({ columns = [], cards = [], boardId, clubId, onCardClick, onAddColumn }) {
  const [activeId, setActiveId] = useState(null);
  const { moveCard } = useCardMutations(clubId, boardId);
  const a11yEnabled = useFeatureFlag(FEATURE_FLAG.A11Y_IMPROVEMENTS_V1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Mapa id -> card para lookup O(1) no dragEnd
  const cardsById = useMemo(() => {
    const m = new Map();
    for (const c of cards) m.set(c.id, c);
    return m;
  }, [cards]);

  // Mapa id -> column para checar se a drop target é uma coluna vazia
  const columnsById = useMemo(() => {
    const m = new Map();
    for (const c of columns) m.set(c.id, c);
    return m;
  }, [columns]);

  // Cards por coluna (ordena por `order` quando definido)
  const cardsByColumn = useMemo(() => {
    const acc = {};
    for (const col of columns) acc[col.id] = [];
    for (const c of cards) {
      if (acc[c.column_id]) acc[c.column_id].push(c);
    }
    for (const colId of Object.keys(acc)) {
      acc[colId].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return acc;
  }, [columns, cards]);

  const handleDragStart = useCallback(({ active }) => setActiveId(active.id), []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const draggedCard = cardsById.get(active.id);
    if (!draggedCard) return;

    // 1) Drop em outro card → move o dragged para a coluna do over,
    //    na posição do over.
    const overCard = cardsById.get(over.id);
    if (overCard) {
      const targetColumnId = overCard.column_id;
      const targetCards = cardsByColumn[targetColumnId] || [];
      let newOrder;
      if (draggedCard.column_id === targetColumnId) {
        // Reordenar dentro da mesma coluna: troca posições entre
        // dragged e over (índice de over no array ordenado).
        const overIdx = targetCards.findIndex((c) => c.id === over.id);
        newOrder = overIdx >= 0 ? overIdx : targetCards.length - 1;
      } else {
        // Mover para outra coluna: insere na posição do over.
        const overIdx = targetCards.findIndex((c) => c.id === over.id);
        newOrder = overIdx >= 0 ? overIdx : targetCards.length;
      }
      moveCard.mutate(
        { cardId: draggedCard.id, targetColumnId, newOrder },
        {
          onError: (err) => {
            toast.error('Não foi possível mover o card.');
            // eslint-disable-next-line no-console
            console.error('KanbanBoard.handleDragEnd', err);
          },
        },
      );
      return;
    }

    // 2) Drop em uma coluna vazia → move para o final da coluna target.
    const overColumn = columnsById.get(over.id);
    if (overColumn) {
      const targetCards = cardsByColumn[overColumn.id] || [];
      moveCard.mutate(
        { cardId: draggedCard.id, targetColumnId: overColumn.id, newOrder: targetCards.length },
        {
          onError: (err) => {
            toast.error('Não foi possível mover o card.');
            // eslint-disable-next-line no-console
            console.error('KanbanBoard.handleDragEnd', err);
          },
        },
      );
    }
  }, [cardsById, columnsById, cardsByColumn, moveCard]);

  const activeCard = activeId ? cardsById.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4 px-1"
        {...(a11yEnabled
          ? { role: 'region', 'aria-label': 'Quadro kanban' }
          : {})}
      >
        {columns.map((col) => (
          <SortableContext
            key={col.id}
            items={(cardsByColumn[col.id] || []).map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              column={col}
              cards={cardsByColumn[col.id] || []}
              boardId={boardId}
              clubId={clubId}
              onCardClick={onCardClick}
            />
          </SortableContext>
        ))}

        {/* Adicionar coluna */}
        <div className="flex-shrink-0 w-72">
          <button
            onClick={onAddColumn}
            className="w-full h-12 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-sm font-medium"
          >
            + Nova coluna
          </button>
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <KanbanCard card={activeCard} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
