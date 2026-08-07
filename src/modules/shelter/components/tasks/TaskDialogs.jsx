/**
 * @fileoverview Diálogos de Tarefas: criação (Pendentes) e transições de fase
 * (responsável; terceiro; conclusão; arquivamento). Validação alinhada aos
 * schemas do domínio.
 */
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { TASK_PHASE, TASK_PHASE_LABEL } from '@/modules/shelter/domain/operational/tasks';
import TaskAttachmentsField from './TaskAttachmentsField';

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Diálogo de criação de tarefa (fase Pendentes). */
export function TaskCreateDialog({ open, onOpenChange, onCreate, uid, saving }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setTitle(''); setDescription(''); setDueAt(''); setAttachments([]); setErr(''); }
  }, [open]);

  function submit(e) {
    e?.preventDefault();
    if (title.trim().length < 2) { setErr('Informe um título (mín. 2 caracteres).'); return; }
    onCreate({ title: title.trim(), description: description.trim(), due_at: dueAt || null, attachments });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>A tarefa entra em <strong>Pendentes</strong>. Você é registrado como criador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{err}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Levar a Luna ao veterinário" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Descrição</Label>
            <Textarea id="task-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Prazo para conclusão (opcional)</Label>
            <Input id="task-due" type="date" min={todayStr()} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Anexos (opcional)</Label>
            <TaskAttachmentsField value={attachments} onChange={setAttachments} uid={uid} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando…</> : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Diálogo genérico de transição de fase. Renderiza os campos exigidos por
 * `toPhase` e devolve os dados via onConfirm(data).
 */
export function TaskTransitionDialog({ open, onOpenChange, toPhase, taskTitle, onConfirm, saving, uid }) {
  const [data, setData] = useState({});
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setData({}); setErr(''); } }, [open, toPhase]);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  function validate() {
    if (toPhase === TASK_PHASE.IN_DEVELOPMENT) {
      if (!String(data.responsible_name || '').trim()) return 'Informe o responsável.';
    } else if (toPhase === TASK_PHASE.AWAITING_THIRD_PARTY) {
      if (!String(data.name || '').trim()) return 'Informe o nome/título do terceiro.';
      if (!String(data.delivery_method || '').trim()) return 'Informe a forma de remessa.';
      if (!String(data.expectation || '').trim()) return 'Descreva o que se espera do terceiro.';
      if (!String(data.expected_return_at || '').trim()) return 'Informe o prazo de retorno.';
    } else if (toPhase === TASK_PHASE.DONE) {
      if (!String(data.completion_note || '').trim()) return 'Descreva o que foi realizado.';
    } else if (toPhase === TASK_PHASE.ARCHIVED) {
      if (!String(data.archive_reason || '').trim()) return 'Justifique o arquivamento.';
    }
    return '';
  }

  function submit(e) {
    e?.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    onConfirm(data);
  }

  const label = TASK_PHASE_LABEL[toPhase] || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover para “{label}”</DialogTitle>
          <DialogDescription className="truncate">{taskTitle}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{err}</p>}

          {toPhase === TASK_PHASE.IN_DEVELOPMENT && (
            <div className="space-y-1.5">
              <Label htmlFor="tr-resp">Responsável *</Label>
              <Input id="tr-resp" value={data.responsible_name || ''} onChange={(e) => set('responsible_name', e.target.value)} placeholder="Nome do responsável" autoFocus />
              <p className="text-[10.5px] text-muted-foreground">Será registrado junto com a data de início do desenvolvimento.</p>
            </div>
          )}

          {toPhase === TASK_PHASE.AWAITING_THIRD_PARTY && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="tr-tp-name">Nome/título do terceiro *</Label>
                <Input id="tr-tp-name" value={data.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Clínica VetX, Cartório" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-tp-method">Forma de remessa *</Label>
                <Input id="tr-tp-method" value={data.delivery_method || ''} onChange={(e) => set('delivery_method', e.target.value)} placeholder="Ex.: E-mail, correio, entrega presencial" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-tp-exp">O que se espera do terceiro *</Label>
                <Textarea id="tr-tp-exp" rows={2} value={data.expectation || ''} onChange={(e) => set('expectation', e.target.value)} placeholder="Ex.: Emissão de laudo, retorno de documento assinado" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-tp-due">Prazo esperado para retorno *</Label>
                <Input id="tr-tp-due" type="date" min={todayStr()} value={data.expected_return_at || ''} onChange={(e) => set('expected_return_at', e.target.value)} />
              </div>
            </>
          )}

          {toPhase === TASK_PHASE.DONE && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="tr-done-note">O que foi realizado *</Label>
                <Textarea id="tr-done-note" rows={3} value={data.completion_note || ''} onChange={(e) => set('completion_note', e.target.value)} placeholder="Descreva a conclusão" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Anexos (opcional)</Label>
                <TaskAttachmentsField value={data.attachments || []} onChange={(v) => set('attachments', v)} uid={uid} folder="task-completion" />
              </div>
            </>
          )}

          {toPhase === TASK_PHASE.ARCHIVED && (
            <div className="space-y-1.5">
              <Label htmlFor="tr-arch">Justificativa do arquivamento *</Label>
              <Textarea id="tr-arch" rows={3} value={data.archive_reason || ''} onChange={(e) => set('archive_reason', e.target.value)} placeholder="Por que está sendo arquivada?" autoFocus />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
