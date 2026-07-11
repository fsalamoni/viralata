/**
 * @fileoverview KanbanCardModal — modal de detalhes de um card (Fase 15).
 *
 * Tabs: Detalhes, Checklist, Anexos, Log, Comentários.
 * Edição inline dos campos principais.
 * Movimentação manual entre colunas (dropdown).
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useEffect, useState } from 'react';
import { X, Trash2, Calendar, UserPlus, MessageSquare, ListChecks, Paperclip, History } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  KANBAN_CARD_TYPES, KANBAN_CARD_TYPE_LABELS, KANBAN_CARD_TYPE_TONES,
  KANBAN_PRIORITIES, KANBAN_PRIORITY_LABELS, KANBAN_PRIORITY_TONES,
  toMillis, formatKanbanLogEntry, emptyChecklistItem, defaultChecklistItem,
} from '@/modules/shelter/domain/operational/kanban';
import { cn } from '@/core/lib/utils';

let _localCkIdCounter = 0;
function nextLocalId() {
  _localCkIdCounter += 1;
  return `local-${Date.now()}-${_localCkIdCounter}`;
}

function formatDateTime(v) {
  const ms = toMillis(v);
  if (!ms) return '—';
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function dateTimeLocalValue(v) {
  // Para input[type=datetime-local] precisa de "YYYY-MM-DDTHH:mm"
  const ms = toMillis(v);
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function KanbanCardModal({
  open,
  onOpenChange,
  card,
  columns = [],
  members = [],
  onUpdate,
  onDelete,
  onMove,
  testId = 'kanban-card-modal',
}) {
  const [draft, setDraft] = useState(card);
  const [tab, setTab] = useState('details');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setDraft(card);
      setTab('details');
      setError(null);
    }
  }, [open, card]);

  if (!card) return null;

  async function save(patch) {
    setSubmitting(true);
    setError(null);
    try {
      const merged = { ...draft, ...patch };
      setDraft(merged);
      if (typeof onUpdate === 'function') {
        await onUpdate(merged);
      }
    } catch (err) {
      setError(err?.message || 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  }

  function setField(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function addChecklistItem() {
    setDraft((d) => ({
      ...d,
      checklist: [...(d.checklist || []), { ...defaultChecklistItem(), uid: nextLocalId() }],
    }));
  }

  function updateChecklistItem(uid, patch) {
    setDraft((d) => ({
      ...d,
      checklist: (d.checklist || []).map((it) => it.uid === uid ? { ...it, ...patch } : it),
    }));
  }

  function removeChecklistItem(uid) {
    setDraft((d) => ({
      ...d,
      checklist: (d.checklist || []).filter((it) => it.uid !== uid),
    }));
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja deletar este card?')) return;
    if (typeof onDelete === 'function') {
      setSubmitting(true);
      try {
        await onDelete(card);
        onOpenChange(false);
      } catch (err) {
        setError(err?.message || 'Erro ao deletar');
      } finally {
        setSubmitting(false);
      }
    }
  }

  async function handleMove(toColumnId) {
    if (typeof onMove === 'function') {
      setSubmitting(true);
      try {
        await onMove(card, toColumnId);
        onOpenChange(false);
      } catch (err) {
        setError(err?.message || 'Erro ao mover');
      } finally {
        setSubmitting(false);
      }
    }
  }

  const typeTone = KANBAN_CARD_TYPE_TONES[draft?.type] || KANBAN_CARD_TYPE_TONES.other;
  const priorityTone = KANBAN_PRIORITY_TONES[draft?.priority] || KANBAN_PRIORITY_TONES.medium;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Badge variant="outline" className={cn('text-xs', typeTone)}>
              {KANBAN_CARD_TYPE_LABELS[draft?.type] || 'Outro'}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', priorityTone)}>
              {KANBAN_PRIORITY_LABELS[draft?.priority] || 'Média'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="details" data-testid={`${testId}-tab-details`}>
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="checklist" data-testid={`${testId}-tab-checklist`}>
              <ListChecks className="h-3.5 w-3.5 mr-1" /> {draft?.checklist?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="attachments" data-testid={`${testId}-tab-attachments`}>
              <Paperclip className="h-3.5 w-3.5 mr-1" /> {draft?.attachments?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="log" data-testid={`${testId}-tab-log`}>
              <History className="h-3.5 w-3.5 mr-1" /> {draft?.log?.length || 0}
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid={`${testId}-tab-comments`}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" /> 0
            </TabsTrigger>
          </TabsList>

          {/* Detalhes */}
          <TabsContent value="details" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label htmlFor="kanban-card-title">Título</Label>
              <Input
                id="kanban-card-title"
                value={draft?.title || ''}
                onChange={(e) => setField('title', e.target.value)}
                onBlur={() => save({ title: draft?.title })}
                maxLength={200}
                data-testid={`${testId}-title`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kanban-card-desc">Descrição</Label>
              <Textarea
                id="kanban-card-desc"
                value={draft?.description || ''}
                onChange={(e) => setField('description', e.target.value)}
                onBlur={() => save({ description: draft?.description })}
                rows={3}
                maxLength={5000}
                data-testid={`${testId}-description`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={draft?.type} onValueChange={(v) => { setField('type', v); save({ type: v }); }}>
                  <SelectTrigger data-testid={`${testId}-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_CARD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{KANBAN_CARD_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={draft?.priority} onValueChange={(v) => { setField('priority', v); save({ priority: v }); }}>
                  <SelectTrigger data-testid={`${testId}-priority`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{KANBAN_PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kanban-card-due">Vencimento</Label>
                <Input
                  id="kanban-card-due"
                  type="datetime-local"
                  value={dateTimeLocalValue(draft?.due_at)}
                  onChange={(e) => {
                    const v = e.target.value;
                    const newDue = v ? new Date(v) : null;
                    setField('due_at', newDue);
                    save({ due_at: newDue });
                  }}
                  data-testid={`${testId}-due`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kanban-card-pet">Pet (opcional)</Label>
                <Input
                  id="kanban-card-pet"
                  value={draft?.pet_name || ''}
                  onChange={(e) => setField('pet_name', e.target.value)}
                  onBlur={() => save({ pet_name: draft?.pet_name })}
                  placeholder="Ex.: Rex"
                  maxLength={120}
                  data-testid={`${testId}-pet-name`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Coluna</Label>
              <Select value={draft?.column_id} onValueChange={(v) => handleMove(v)}>
                <SelectTrigger data-testid={`${testId}-column`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-2"
                        style={{ backgroundColor: c.color || '#94a3b8' }}
                      />
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Checklist */}
          <TabsContent value="checklist" className="space-y-2 mt-3">
            {(draft?.checklist || []).map((item) => (
              <div key={item.uid} className="flex items-center gap-2">
                <Checkbox
                  checked={!!item.done}
                  onCheckedChange={(v) => {
                    updateChecklistItem(item.uid, { done: !!v });
                    save({ checklist: (draft.checklist || []).map((it) => it.uid === item.uid ? { ...it, done: !!v } : it) });
                  }}
                  data-testid={`${testId}-checklist-${item.uid}`}
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateChecklistItem(item.uid, { text: e.target.value })}
                  onBlur={() => save({ checklist: draft.checklist })}
                  className={cn('flex-1', item.done && 'line-through text-muted-foreground')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    removeChecklistItem(item.uid);
                    save({ checklist: (draft.checklist || []).filter((it) => it.uid !== item.uid) });
                  }}
                  className="h-7 w-7"
                  aria-label="Remover item"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} data-testid={`${testId}-add-checklist`}>
              <ListChecks className="h-3.5 w-3.5 mr-1" /> Adicionar item
            </Button>
          </TabsContent>

          {/* Anexos */}
          <TabsContent value="attachments" className="mt-3">
            <div className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-muted rounded-md">
              Upload de anexos será habilitado em uma fase futura.
            </div>
          </TabsContent>

          {/* Log */}
          <TabsContent value="log" className="mt-3">
            {(draft?.log || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem movimentações ainda.</p>
            ) : (
              <ul className="space-y-2" data-testid={`${testId}-log`}>
                {(draft.log || []).slice().reverse().map((entry, idx) => (
                  <li key={idx} className="text-xs border-l-2 border-muted pl-3 py-1">
                    <div className="font-medium">{formatKanbanLogEntry(entry, columns)}</div>
                    <div className="text-muted-foreground">
                      {entry.by_name || entry.by_uid} · {formatDateTime(entry.at)}
                    </div>
                    {entry.comment && <div className="mt-1 italic">&ldquo;{entry.comment}&rdquo;</div>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* Comentários (placeholder) */}
          <TabsContent value="comments" className="mt-3">
            <div className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-muted rounded-md">
              Comentários serão habilitados em uma fase futura.
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-red-600 mt-2" data-testid={`${testId}-error`}>{error}</p>
        )}

        <DialogFooter className="mt-4 flex justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={handleDelete}
            disabled={submitting}
            data-testid={`${testId}-delete`}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Deletar
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default KanbanCardModal;
