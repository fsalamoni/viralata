/**
 * KanbanColumn — coluna ordenável com cards dentro
 */
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { KanbanCreateCard } from './KanbanCreateCard';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

export function KanbanColumn({ column, cards, boardId, clubId, onCardClick }) {
  const [addingCard, setAddingCard] = useState(false);
  const a11yEnabled = useFeatureFlag(FEATURE_FLAG.A11Y_IMPROVEMENTS_V1);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-72 flex flex-col bg-gray-50 rounded-xl"
      {...(a11yEnabled
        ? { role: 'list', 'aria-label': `Coluna: ${column.title}` }
        : {})}
    >
      {/* Header da coluna */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: column.color || '#6B7280' }}
        />
        <span className="text-sm font-semibold text-gray-700 truncate">{column.title}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[2rem]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              clubId={clubId}
              onClick={() => onCardClick?.(card)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && !addingCard && (
          <p
            className="text-xs text-gray-400 text-center py-4"
            {...(a11yEnabled ? { role: 'status' } : {})}
          >
            Sem cards
          </p>
        )}
      </div>

      {/* Adicionar card */}
      <div className="px-2 pb-2">
        {addingCard ? (
          <KanbanCreateCard
            boardId={boardId}
            columnId={column.id}
            clubId={clubId}
            onClose={() => setAddingCard(false)}
          />
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full py-1.5 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            + Card
          </button>
        )}
      </div>
    </div>
  );
}
