/**
 * @fileoverview TaskCard — card arrastável de uma tarefa no board Kanban.
 * Clique abre o detalhe; arrastar (>8px) move entre fases.
 */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { User, Clock, AlertTriangle, Paperclip, CalendarClock } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import {
  TASK_PHASE, isTaskOverdue, taskHasOverdueThirdParty,
} from '@/modules/shelter/domain/operational/tasks';

function fmtDate(value) {
  if (!value) return null;
  try {
    const d = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
  } catch { return null; }
}

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;

  const overdueTask = isTaskOverdue(task);
  const overdueThird = task.phase === TASK_PHASE.AWAITING_THIRD_PARTY && taskHasOverdueThirdParty(task);
  const attachCount = (task.attachments?.length || 0) + (task.completion_attachments?.length || 0);
  const createdStr = fmtDate(task.created_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen?.(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(task); }}
      data-testid={`task-card-${task.id}`}
      className={cn(
        'cursor-grab touch-none rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        isDragging && 'opacity-60 ring-2 ring-primary',
        (overdueTask || overdueThird) && 'border-rose-300 dark:border-rose-800',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-foreground">{task.title}</p>
        {(overdueTask || overdueThird) && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" title="Prazo vencido">
            <AlertTriangle className="h-3 w-3" /> vencido
          </span>
        )}
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{task.created_by_name || 'Membro'}</span>
        {createdStr && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{createdStr}</span>}
        {task.responsible_name && (
          <span className="inline-flex items-center gap-1 text-foreground/80"><User className="h-3 w-3 text-primary" />{task.responsible_name}</span>
        )}
        {task.due_at && (
          <span className={cn('inline-flex items-center gap-1', overdueTask && 'font-semibold text-rose-600')}>
            <CalendarClock className="h-3 w-3" />{fmtDate(task.due_at)}
          </span>
        )}
        {attachCount > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3 w-3" />{attachCount}</span>}
      </div>
    </div>
  );
}
