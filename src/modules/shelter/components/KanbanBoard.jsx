/**
 * KanbanBoard — container drag-and-drop com colunas
 */
import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
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

export function KanbanBoard({ columns = [], cards = [], boardId, clubId, onCardClick, onAddColumn }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(({ active }) => setActiveId(active.id), []);
  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    // TODO: reorder — disparado pelo useCardMutations.reorder via KanbanPage
  }, []);

  const cardsByColumn = columns.reduce((acc, col) => {
    acc[col.id] = cards.filter((c) => c.column_id === col.id).sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] || []}
              boardId={boardId}
              clubId={clubId}
              onCardClick={onCardClick}
            />
          ))}
        </SortableContext>

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
