/**
 * KanbanCard — card arrastável com prioridade, tipo e assignee
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CARD_PRIORITY_COLORS, CARD_PRIORITY_LABELS, CARD_TYPE_LABELS } from '../domain/operational/kanban';

const TYPE_ICONS = {
  medication: '💊',
  spay_neuter: '✂️',
  vaccine: '💉',
  post_adoption_contact: '📞',
  process: '📋',
  other: '📌',
};

export function KanbanCard({ card, onClick, isOverlay }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: isOverlay });

  const style = isOverlay
    ? { boxShadow: '0 8px 24px rgba(0,0,0,0.18)', transform: 'rotate(2deg)' }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const done = card.status === 'resolved' || card.status === 'cancelled';
  const priorityColor = CARD_PRIORITY_COLORS[card.priority] || '#6B7280';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        bg-white rounded-lg p-3 shadow-sm border border-gray-100
        hover:shadow-md hover:border-blue-200 cursor-pointer
        transition-all duration-150 select-none
        ${isDragging ? 'ring-2 ring-blue-400' : ''}
        ${done ? 'opacity-60' : ''}
      `}
    >
      {/* Tags: tipo + prioridade */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 flex items-center gap-1">
          <span>{TYPE_ICONS[card.type] || '📌'}</span>
          <span>{CARD_TYPE_LABELS[card.type] || card.type}</span>
        </span>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: priorityColor }}
          title={CARD_PRIORITY_LABELS[card.priority]}
        />
      </div>

      {/* Título */}
      <p className={`text-sm font-medium text-gray-800 leading-snug ${done ? 'line-through' : ''}`}>
        {card.title}
      </p>

      {/* Meta row */}
      {(card.due_at || card.assignees?.length > 0 || card.checklist?.length > 0) && (
        <div className="flex items-center gap-3 mt-2">
          {card.due_at && (
            <span className={`text-xs ${isOverdue(card.due_at) ? 'text-red-500' : 'text-gray-400'}`}>
              {new Date(card.due_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {card.assignees?.length > 0 && (
            <span className="text-xs text-gray-400">
              👤 {card.assignees.length}
            </span>
          )}
          {card.checklist?.length > 0 && (
            <span className="text-xs text-gray-400">
              ☑ {card.checklist.filter((i) => i.done).length}/{card.checklist.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function isOverdue(dueAt) {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}
