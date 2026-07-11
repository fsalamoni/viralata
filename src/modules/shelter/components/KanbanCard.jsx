/**
 * @fileoverview KanbanCard — card visual de uma tarefa no board (Fase 15).
 *
 * Mostra: tipo, prioridade, título, descrição preview, due date
 * (com cor se overdue), assignees (avatares).
 *
 * Click abre o modal de detalhes. Drag é via HTML5 DnD nativo
 * (`draggable` + `onDragStart`).
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useMemo } from 'react';
import { Calendar, GripVertical, MoreVertical, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  KANBAN_CARD_TYPE_LABELS,
  KANBAN_CARD_TYPE_TONES,
  KANBAN_PRIORITY_LABELS,
  KANBAN_PRIORITY_TONES,
  toMillis,
  isCardOverdue,
} from '@/modules/shelter/domain/operational/kanban';

const PRIORITY_DOT = {
  low: 'bg-zinc-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

function formatDueDate(dueMs) {
  if (!dueMs) return null;
  const d = new Date(dueMs);
  const now = new Date();
  const isSameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...(isSameYear ? {} : { year: 'numeric' }),
  });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function KanbanCard({
  card,
  isDragging = false,
  onClick,
  onDragStart,
  onDragEnd,
  onMenuClick,
  testId = 'kanban-card',
  concludedColumnSlug = 'concluida',
}) {
  const overdue = useMemo(
    () => isCardOverdue(card, concludedColumnSlug),
    [card, concludedColumnSlug],
  );
  const dueMs = toMillis(card?.due_at);
  const dueLabel = formatDueDate(dueMs);
  const typeTone = KANBAN_CARD_TYPE_TONES[card?.type] || KANBAN_CARD_TYPE_TONES.other;
  const priorityTone = KANBAN_PRIORITY_TONES[card?.priority] || KANBAN_PRIORITY_TONES.medium;
  const typeLabel = KANBAN_CARD_TYPE_LABELS[card?.type] || 'Outro';
  const priorityLabel = KANBAN_PRIORITY_LABELS[card?.priority] || 'Média';

  const assignees = Array.isArray(card?.assignees) ? card.assignees : [];
  const checklistTotal = Array.isArray(card?.checklist) ? card.checklist.length : 0;
  const checklistDone = Array.isArray(card?.checklist)
    ? card.checklist.filter((c) => c.done).length
    : 0;
  const attachments = Array.isArray(card?.attachments) ? card.attachments.length : 0;

  function handleDragStart(e) {
    if (typeof onDragStart === 'function') onDragStart(e, card);
    try { e.dataTransfer.setData('text/plain', card?.id || ''); } catch { /* noop */ }
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      data-testid={testId}
      data-card-id={card?.id}
      data-overdue={overdue ? 'true' : 'false'}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none',
        'p-3 flex flex-col gap-2',
        isDragging && 'opacity-50 ring-2 ring-primary',
        overdue && 'border-red-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', typeTone)}>
            {typeLabel}
          </Badge>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityTone)}>
            <span className={cn('h-1.5 w-1.5 rounded-full mr-1', PRIORITY_DOT[card?.priority] || PRIORITY_DOT.medium)} />
            {priorityLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMenuClick && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMenuClick(card); }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground"
              aria-label="Ações do card"
              data-testid={`${testId}-menu`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="p-0.5 text-muted-foreground cursor-grab" aria-hidden="true">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {card?.pet_name && (
          <p className="text-[11px] text-muted-foreground font-medium">🐾 {card.pet_name}</p>
        )}
        <h4 className="text-sm font-medium leading-snug line-clamp-2">
          {card?.title || '(sem título)'}
        </h4>
        {card?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {dueLabel && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px]',
                overdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
              )}
              data-testid={`${testId}-due`}
            >
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {dueLabel}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="text-[11px] text-muted-foreground" data-testid={`${testId}-checklist`}>
              ✓ {checklistDone}/{checklistTotal}
            </span>
          )}
          {attachments > 0 && (
            <span className="text-[11px] text-muted-foreground">📎 {attachments}</span>
          )}
        </div>

        {assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5" data-testid={`${testId}-assignees`}>
            {assignees.slice(0, 3).map((uid) => (
              <Avatar key={uid} className="h-5 w-5 border border-background">
                <AvatarFallback className="text-[9px]">{getInitials(uid)}</AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 3 && (
              <span className="text-[10px] text-muted-foreground ml-1.5">
                <Users className="h-3 w-3 inline" /> +{assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanCard;
