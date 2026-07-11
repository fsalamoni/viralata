/**
 * @fileoverview KanbanColumnEditor — modal de criar/editar coluna
 * (Fase 15).
 *
 * Campos: título, cor (8 cores pré-definidas + custom hex), WIP limit
 * (opcional), responsáveis (multi-select, simples por enquanto).
 *
 * Gated por `SHELTER_KANBAN`.
 */

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KANBAN_COLUMN_COLORS } from '@/modules/shelter/domain/operational/kanban';
import { cn } from '@/core/lib/utils';

export function KanbanColumnEditor({
  open,
  onOpenChange,
  initial = null,
  members = [],
  onSubmit,
  testId = 'kanban-column-editor',
}) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(KANBAN_COLUMN_COLORS[0]);
  const [wipLimit, setWipLimit] = useState('');
  const [responsibleUids, setResponsibleUids] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '');
      setColor(initial?.color || KANBAN_COLUMN_COLORS[0]);
      setWipLimit(initial?.wip_limit != null ? String(initial.wip_limit) : '');
      setResponsibleUids(Array.isArray(initial?.responsible_uids) ? initial.responsible_uids : []);
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    setSubmitting(true);
    try {
      const patch = {
        title: title.trim(),
        color,
        responsible_uids: responsibleUids,
        wip_limit: wipLimit === '' ? null : Math.max(0, parseInt(wipLimit, 10) || 0),
      };
      await onSubmit(patch);
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || 'Erro ao salvar coluna');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleUid(uid) {
    setResponsibleUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid],
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Editar coluna' : 'Nova coluna'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kanban-col-title">Título</Label>
            <Input
              id="kanban-col-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Em revisão"
              maxLength={80}
              required
              data-testid={`${testId}-title`}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2" data-testid={`${testId}-colors`}>
              {KANBAN_COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                  data-testid={`${testId}-color-${c}`}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kanban-col-wip">WIP Limit (opcional)</Label>
            <Input
              id="kanban-col-wip"
              type="number"
              min="0"
              max="1000"
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              placeholder="Sem limite"
              data-testid={`${testId}-wip`}
            />
            <p className="text-[11px] text-muted-foreground">
              Limite de cards simultâneos na coluna. Quando atingido, fica em alerta.
            </p>
          </div>

          {Array.isArray(members) && members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Responsáveis</Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1" data-testid={`${testId}-members`}>
                {members.map((m) => (
                  <label
                    key={m.uid}
                    className="flex items-center gap-2 text-sm py-1 px-1 hover:bg-muted/40 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={responsibleUids.includes(m.uid)}
                      onChange={() => toggleUid(m.uid)}
                      className="rounded"
                    />
                    <span className="flex-1 truncate">{m.displayName || m.uid}</span>
                    {responsibleUids.includes(m.uid) && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600" data-testid={`${testId}-error`}>{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button type="submit" disabled={submitting} data-testid={`${testId}-submit`}>
              {submitting ? 'Salvando…' : (initial?.id ? 'Salvar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default KanbanColumnEditor;
