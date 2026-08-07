/**
 * @fileoverview TasksBoard — painel Kanban de Tarefas do abrigo (Operacional).
 * 5 fases fixas; criação em Pendentes; drag-and-drop com diálogos de transição.
 */
import React, { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  useDroppable, closestCorners,
} from '@dnd-kit/core';
import { Plus, ListTodo, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/lib/utils';
import {
  TASK_PHASE, TASK_PHASE_ORDER, TASK_PHASE_LABEL,
} from '@/modules/shelter/domain/operational/tasks';
import { useShelterTasks, useTaskMutations } from '@/modules/shelter/hooks/useShelterTasks';
import TaskCard from './TaskCard';
import TaskDetailDialog from './TaskDetailDialog';
import { TaskCreateDialog, TaskTransitionDialog } from './TaskDialogs';

const COLUMN_ACCENT = {
  [TASK_PHASE.PENDING]: 'border-t-slate-400',
  [TASK_PHASE.IN_DEVELOPMENT]: 'border-t-sky-500',
  [TASK_PHASE.AWAITING_THIRD_PARTY]: 'border-t-amber-500',
  [TASK_PHASE.DONE]: 'border-t-emerald-500',
  [TASK_PHASE.ARCHIVED]: 'border-t-zinc-400',
};

/** Fases que exigem dados de transição (abrem diálogo). */
function needsTransitionData(phase) {
  return phase !== TASK_PHASE.PENDING;
}

function Column({ phase, tasks, onOpenTask, onAddNew }) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className={cn('mb-2 flex items-center justify-between rounded-t-lg border-t-4 bg-card px-3 py-2', COLUMN_ACCENT[phase])}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{TASK_PHASE_LABEL[phase]}</span>
          <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">{tasks.length}</span>
        </div>
        {phase === TASK_PHASE.PENDING && onAddNew && (
          <button type="button" onClick={onAddNew} className="text-muted-foreground hover:text-primary" aria-label="Nova tarefa">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        data-testid={`task-col-${phase}`}
        className={cn(
          'flex min-h-[140px] flex-1 flex-col gap-2 rounded-b-lg border border-dashed border-transparent bg-muted/30 p-2 transition-colors',
          isOver && 'border-primary/60 bg-primary/5',
        )}
      >
        {tasks.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">Arraste tarefas para cá</p>
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpenTask} />)
        )}
      </div>
    </div>
  );
}

export default function TasksBoard({ clubId, actor, canManage = false }) {
  const { data: tasks = [], isLoading } = useShelterTasks(clubId);
  const { createTask, moveTask } = useTaskMutations(clubId);

  const [activeId, setActiveId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transition, setTransition] = useState(null); // { taskId, toPhase }
  const [detailId, setDetailId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const tasksById = useMemo(() => {
    const m = new Map();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  const byPhase = useMemo(() => {
    const acc = {};
    TASK_PHASE_ORDER.forEach((p) => { acc[p] = []; });
    tasks.forEach((t) => { (acc[t.phase] || acc[TASK_PHASE.PENDING]).push(t); });
    return acc;
  }, [tasks]);

  const activeTask = activeId ? tasksById.get(activeId) : null;
  const detailTask = detailId ? tasksById.get(detailId) : null;
  const transitionTask = transition ? tasksById.get(transition.taskId) : null;

  function resolveTargetPhase(overId) {
    if (!overId) return null;
    if (TASK_PHASE_ORDER.includes(overId)) return overId;
    const t = tasksById.get(overId);
    return t ? t.phase : null;
  }

  function handleDragEnd(event) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const task = tasksById.get(active.id);
    const toPhase = resolveTargetPhase(over.id);
    if (!task || !toPhase || toPhase === task.phase) return;

    if (needsTransitionData(toPhase)) {
      setTransition({ taskId: task.id, toPhase });
    } else {
      // → Pendentes (sem dados)
      moveTask.mutate(
        { taskId: task.id, actor, toPhase, data: {} },
        { onError: (err) => toast.error(err?.message || 'Erro ao mover tarefa') },
      );
    }
  }

  async function handleCreate(payload) {
    try {
      await createTask.mutateAsync({ actor, payload });
      toast.success('Tarefa criada');
      setCreateOpen(false);
    } catch (err) { toast.error(err?.message || 'Erro ao criar tarefa'); }
  }

  async function handleTransitionConfirm(data) {
    if (!transition) return;
    try {
      await moveTask.mutateAsync({ taskId: transition.taskId, actor, toPhase: transition.toPhase, data });
      toast.success('Tarefa movida');
      setTransition(null);
    } catch (err) { toast.error(err?.message || 'Erro ao mover tarefa'); }
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto">
        {TASK_PHASE_ORDER.map((p) => <Skeleton key={p} className="h-64 w-72 shrink-0 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListTodo className="h-4 w-4 text-primary" />
          Arraste os cards entre as fases. Ao mudar de fase, os dados necessários são solicitados.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={createTask.isPending}>
          {createTask.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Nova tarefa
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TASK_PHASE_ORDER.map((phase) => (
            <Column
              key={phase}
              phase={phase}
              tasks={byPhase[phase] || []}
              onOpenTask={(t) => setDetailId(t.id)}
              onAddNew={() => setCreateOpen(true)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        uid={actor?.uid}
        saving={createTask.isPending}
        onCreate={handleCreate}
      />

      {transition && (
        <TaskTransitionDialog
          open={Boolean(transition)}
          onOpenChange={(o) => { if (!o) setTransition(null); }}
          toPhase={transition.toPhase}
          taskTitle={transitionTask?.title || ''}
          uid={actor?.uid}
          saving={moveTask.isPending}
          onConfirm={handleTransitionConfirm}
        />
      )}

      <TaskDetailDialog
        open={Boolean(detailId)}
        onOpenChange={(o) => { if (!o) setDetailId(null); }}
        task={detailTask}
        clubId={clubId}
        actor={actor}
        canManage={canManage}
      />
    </div>
  );
}
