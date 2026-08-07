/**
 * @fileoverview TaskDetailDialog — detalhe da tarefa: informações principais,
 * terceiros, anexos, timeline das atividades, edição, log de auditoria e
 * exclusão (conforme atribuição).
 */
import React, { useState, useEffect } from 'react';
import {
  User, Clock, CalendarClock, AlertTriangle, Pencil, Trash2, ScrollText,
  Plus, Loader2, CheckCircle2, Archive, ArrowRightLeft, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/core/lib/utils';
import {
  TASK_PHASE, TASK_PHASE_LABEL, isThirdPartyOverdue, isTaskOverdue,
} from '@/modules/shelter/domain/operational/tasks';
import { useTaskMutations, useTaskLogs } from '@/modules/shelter/hooks/useShelterTasks';
import { TaskAttachmentsList } from './TaskAttachmentsField';
import { TaskTransitionDialog } from './TaskDialogs';

function fmtDate(value) {
  if (!value) return null;
  try {
    const d = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
  } catch { return null; }
}
function fmtDateTime(value) {
  if (!value) return null;
  try {
    const d = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR');
  } catch { return null; }
}

const ACTIVITY_ICON = {
  created: Plus,
  moved: ArrowRightLeft,
  responsible_set: User,
  third_party_added: Users,
  completed: CheckCircle2,
  archived: Archive,
  edited: Pencil,
  attachment_added: Plus,
};

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-foreground">{children}</span>
      </div>
    </div>
  );
}

export default function TaskDetailDialog({ open, onOpenChange, task, clubId, actor, canManage }) {
  const { editTask, deleteTask, addThirdParty } = useTaskMutations(clubId);
  const [editing, setEditing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [addTpOpen, setAddTpOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueAt((task.due_at || '').slice(0, 10));
    }
    if (!open) { setEditing(false); setShowLog(false); }
  }, [task, open]);

  const { data: logs = [], isLoading: loadingLogs } = useTaskLogs(clubId, task?.id, showLog && canManage);

  if (!task) return null;

  const overdue = isTaskOverdue(task);
  const activity = Array.isArray(task.activity) ? [...task.activity].reverse() : [];
  const thirdParties = Array.isArray(task.third_parties) ? task.third_parties : [];

  async function saveEdit() {
    if (title.trim().length < 2) { toast.error('Título muito curto.'); return; }
    try {
      await editTask.mutateAsync({ taskId: task.id, actor, updates: { title: title.trim(), description: description.trim(), due_at: dueAt || null } });
      toast.success('Tarefa atualizada');
      setEditing(false);
    } catch (err) { toast.error(err?.message || 'Erro ao salvar'); }
  }

  async function handleDelete() {
    try {
      await deleteTask.mutateAsync({ taskId: task.id, actor });
      toast.success('Tarefa excluída');
      setConfirmDel(false);
      onOpenChange(false);
    } catch (err) { toast.error(err?.message || 'Erro ao excluir'); }
  }

  async function handleAddThirdParty(data) {
    try {
      await addThirdParty.mutateAsync({ taskId: task.id, actor, data });
      toast.success('Terceiro adicionado');
      setAddTpOpen(false);
    } catch (err) { toast.error(err?.message || 'Erro ao adicionar terceiro'); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{TASK_PHASE_LABEL[task.phase] || task.phase}</Badge>
              {overdue && (
                <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Prazo vencido
                </Badge>
              )}
            </div>
            <DialogTitle className="mt-1 pr-6">{task.title}</DialogTitle>
          </DialogHeader>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {canManage && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
            )}
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowLog((s) => !s)}><ScrollText className="mr-1.5 h-3.5 w-3.5" />{showLog ? 'Ocultar log' : 'Ver log'}</Button>
            )}
            {task.phase === TASK_PHASE.AWAITING_THIRD_PARTY && (
              <Button size="sm" variant="outline" onClick={() => setAddTpOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar terceiro</Button>
            )}
            {canManage && (
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDel(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>
            )}
          </div>

          {/* Edição inline */}
          {editing ? (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-title">Título</Label>
                <Input id="ed-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-desc">Descrição</Label>
                <Textarea id="ed-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-due">Prazo</Label>
                <Input id="ed-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveEdit} disabled={editTask.isPending}>
                  {editTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {task.description && <p className="whitespace-pre-wrap text-sm text-foreground/90">{task.description}</p>}
              <InfoRow icon={User} label="Criada por">{task.created_by_name || 'Membro'}{fmtDate(task.created_at) ? ` · ${fmtDate(task.created_at)}` : ''}</InfoRow>
              {task.responsible_name && <InfoRow icon={User} label="Responsável">{task.responsible_name}{fmtDate(task.in_development_at) ? ` · desde ${fmtDate(task.in_development_at)}` : ''}</InfoRow>}
              {task.due_at && <InfoRow icon={CalendarClock} label="Prazo"><span className={cn(overdue && 'font-semibold text-rose-600')}>{fmtDate(task.due_at)}</span></InfoRow>}
              {task.completion_note && <InfoRow icon={CheckCircle2} label="Conclusão">{task.completion_note}</InfoRow>}
              {task.archive_reason && <InfoRow icon={Archive} label="Arquivamento">{task.archive_reason}</InfoRow>}
            </div>
          )}

          {/* Anexos */}
          {(task.attachments?.length > 0 || task.completion_attachments?.length > 0) && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anexos</p>
              <TaskAttachmentsList items={[...(task.attachments || []), ...(task.completion_attachments || [])]} className="flex flex-wrap gap-2" />
            </div>
          )}

          {/* Terceiros */}
          {thirdParties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Terceiros</p>
              {thirdParties.map((tp) => {
                const od = isThirdPartyOverdue(tp);
                return (
                  <div key={tp.id} className={cn('rounded-xl border p-3 text-sm', od ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20' : 'border-border bg-card')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{tp.name}</span>
                      {od && <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"><AlertTriangle className="mr-1 h-3 w-3" />vencido</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Remessa: {tp.delivery_method}</p>
                    <p className="text-xs text-muted-foreground">Espera-se: {tp.expectation}</p>
                    <p className="text-xs text-muted-foreground">Retorno até: {fmtDate(tp.expected_return_at) || '—'}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</p>
            <ol className="space-y-2">
              {activity.length === 0 && <li className="text-sm text-muted-foreground">Sem atividades.</li>}
              {activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.type] || Clock;
                return (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{a.message}</p>
                      <p className="text-[10.5px] text-muted-foreground">{a.by_name || 'Membro'} · {fmtDateTime(a.at) || ''}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Log de auditoria (atribuição maior) */}
          {showLog && canManage && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"><ScrollText className="h-3.5 w-3.5" /> Log de auditoria</p>
              {loadingLogs ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <ul className="space-y-1.5">
                  {logs.map((l) => (
                    <li key={l.id} className="text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground">{l.action}</span> · {l.by_name || l.by_uid || '—'} · {fmtDateTime(l.at) || ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TaskTransitionDialog
        open={addTpOpen}
        onOpenChange={setAddTpOpen}
        toPhase={TASK_PHASE.AWAITING_THIRD_PARTY}
        taskTitle={task.title}
        uid={actor?.uid}
        saving={addThirdParty.isPending}
        onConfirm={handleAddThirdParty}
      />

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Excluir tarefa"
        description="Esta ação remove a tarefa e seu histórico permanentemente. Deseja continuar?"
        confirmLabel="Excluir"
        destructive
        loading={deleteTask.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
