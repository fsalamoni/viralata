/**
 * KanbanCard — card arrastável com prioridade, tipo e assignee.
 * Drag handle visível (grip) separado do conteúdo clicável.
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { CARD_PRIORITY_COLORS, CARD_PRIORITY_LABELS, CARD_TYPE_LABELS } from '../domain/operational/kanban';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

const TYPE_ICONS = {
  medication: '💊',
  spay_neuter: '✂️',
  vaccine: '💉',
  post_adoption_contact: '📞',
  process: '📋',
  other: '📌',
};

export function KanbanCard({ card, onClick, isOverlay }) {
  const a11yEnabled = useFeatureFlag(FEATURE_FLAG.A11Y_IMPROVEMENTS_V1);
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

  const ariaLabel = a11yEnabled
    ? [
        CARD_TYPE_LABELS[card.type] || card.type,
        CARD_PRIORITY_LABELS[card.priority],
        card.title,
        done ? 'concluído' : null,
        card.due_at ? `vencimento ${new Date(card.due_at).toLocaleDateString('pt-BR')}` : null,
        card.assignees?.length > 0 ? `${card.assignees.length} responsável(s)` : null,
      ]
        .filter(Boolean)
        .join(', ')
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-100
        hover:shadow-md hover:border-blue-200
        transition-all duration-150 select-none
        flex items-stretch gap-0
        ${isDragging ? 'ring-2 ring-blue-400' : ''}
        ${done ? 'opacity-60' : ''}
      `}
      aria-label={ariaLabel}
      {...(a11yEnabled ? { role: 'option' } : {})}
      tabIndex={a11yEnabled ? 0 : undefined}
    >
      {/* Drag handle visível */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center px-2 py-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 rounded-l-lg flex-shrink-0"
        aria-label="Arrastar card"
        title="Arrastar para mover"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Conteúdo clicável */}
      <div
        className="flex-1 min-w-0 p-3 cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      >
        {/* Tags: tipo + prioridade */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
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
        <p className={`text-sm font-medium text-foreground leading-snug ${done ? 'line-through text-muted-foreground' : ''}`}>
          {card.title}
        </p>

        {/* Meta row */}
        {(card.due_at || card.assignees?.length > 0 || card.checklist?.length > 0) && (
          <div className="flex items-center gap-3 mt-1.5">
            {card.due_at && (
              <span className={`text-xs ${isOverdue(card.due_at) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {new Date(card.due_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            )}
            {card.assignees?.length > 0 && (
              <span className="text-xs text-muted-foreground">
                👤 {card.assignees.length}
              </span>
            )}
            {card.checklist?.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ☑ {card.checklist.filter((i) => i.done).length}/{card.checklist.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function isOverdue(dueAt) {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}
