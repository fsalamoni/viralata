/**
 * @fileoverview FosterActionDialog — modal shadcn para ações de Foster (TASK-328).
 *
 * Substitui os `window.prompt` em FostersList.jsx. Suporta 3 ações:
 *  - 'extend' — prorrogar prazo (data + motivo)
 *  - 'end' — finalizar (motivo + retornou saudável?)
 *  - 'cancel' — cancelar (motivo)
 *
 * Validação client-side com Zod. a11y: focus trap do Dialog, aria-labels.
 * Mobile-first: input + textarea + checkbox com touch >= 44px.
 */

import React, { useState } from 'react';
import { z } from 'zod';
import { Calendar, FileText, Heart, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { isAfter, parseISO, addDays } from 'date-fns';

// ─── Schemas de validação ─────────────────────────────────────────────

const extendSchema = z.object({
  new_end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  reason: z.string()
    .min(3, 'Motivo deve ter no mínimo 3 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

const endSchema = z.object({
  reason: z.string()
    .min(3, 'Motivo deve ter no mínimo 3 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
  pet_returned_healthy: z.boolean(),
});

const cancelSchema = z.object({
  reason: z.string()
    .min(3, 'Motivo deve ter no mínimo 3 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
});

// ─── Sub-forms ────────────────────────────────────────────────────────

function ExtendForm({ currentEndDate, onSubmit, submitting }) {
  // Sugere data atual + 14 dias como default
  const minDate = (() => {
    try {
      const d = currentEndDate ? new Date(currentEndDate) : new Date();
      return addDays(d, 1).toISOString().slice(0, 10);
    } catch { return ''; }
  })();
  const defaultDate = (() => {
    try {
      const d = currentEndDate ? new Date(currentEndDate) : new Date();
      return addDays(d, 14).toISOString().slice(0, 10);
    } catch { return ''; }
  })();

  const [newEnd, setNewEnd] = useState(defaultDate);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const parsed = extendSchema.safeParse({ new_end_date: newEnd, reason });
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.issues.forEach((i) => { fieldErrors[i.path[0]] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    // Validação adicional: data > currentEndDate
    if (currentEndDate) {
      try {
        const cur = parseISO(currentEndDate.slice(0, 10));
        const next = parseISO(newEnd);
        if (!isAfter(next, cur)) {
          setErrors({ new_end_date: 'A nova data deve ser posterior à data atual' });
          return;
        }
      } catch { /* ignore */ }
    }
    onSubmit({ new_end_date: `${newEnd}T00:00:00.000Z`, reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="extend-date">Nova data final</Label>
        <Input
          id="extend-date"
          type="date"
          value={newEnd}
          min={minDate}
          onChange={(e) => setNewEnd(e.target.value)}
          className="min-h-[44px]"
          required
          aria-describedby={errors.new_end_date ? 'extend-date-err' : undefined}
        />
        {errors.new_end_date && (
          <p id="extend-date-err" className="mt-1 text-xs text-destructive">
            {errors.new_end_date}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="extend-reason">Motivo da prorrogação</Label>
        <Textarea
          id="extend-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ex.: Animal ainda está se adaptando, precisa de mais 2 semanas..."
          className="min-h-[88px]"
          required
          aria-describedby={errors.reason ? 'extend-reason-err' : undefined}
        />
        {errors.reason && (
          <p id="extend-reason-err" className="mt-1 text-xs text-destructive">
            {errors.reason}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onSubmit(null)} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="min-h-[44px]">
          <Calendar className="mr-2 h-4 w-4" /> Prorrogar
        </Button>
      </DialogFooter>
    </form>
  );
}

function EndForm({ onSubmit, submitting }) {
  const [reason, setReason] = useState('');
  const [healthy, setHealthy] = useState(true);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const parsed = endSchema.safeParse({ reason, pet_returned_healthy: healthy });
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.issues.forEach((i) => { fieldErrors[i.path[0]] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    onSubmit({ reason, pet_returned_healthy: healthy });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="end-reason">Motivo do término</Label>
        <Textarea
          id="end-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ex.: Animal já está adaptado à família adotante..."
          className="min-h-[88px]"
          required
          aria-describedby={errors.reason ? 'end-reason-err' : undefined}
        />
        {errors.reason && (
          <p id="end-reason-err" className="mt-1 text-xs text-destructive">
            {errors.reason}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          id="end-healthy"
          type="checkbox"
          checked={healthy}
          onChange={(e) => setHealthy(e.target.checked)}
          className="h-5 w-5 rounded border-input accent-primary"
        />
        <Label htmlFor="end-healthy" className="cursor-pointer">
          Animal voltou saudável
        </Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onSubmit(null)} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="min-h-[44px]">
          <Heart className="mr-2 h-4 w-4" /> Finalizar placement
        </Button>
      </DialogFooter>
    </form>
  );
}

function CancelForm({ onSubmit, submitting }) {
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const parsed = cancelSchema.safeParse({ reason });
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.issues.forEach((i) => { fieldErrors[i.path[0]] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    onSubmit({ reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="cancel-reason">Motivo do cancelamento</Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ex.: Família mudou de cidade..."
          className="min-h-[88px]"
          required
          aria-describedby={errors.reason ? 'cancel-reason-err' : undefined}
        />
        {errors.reason && (
          <p id="cancel-reason-err" className="mt-1 text-xs text-destructive">
            {errors.reason}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onSubmit(null)} disabled={submitting}>
          Voltar
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={submitting}
          className="min-h-[44px]"
        >
          <X className="mr-2 h-4 w-4" /> Cancelar placement
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {'extend' | 'end' | 'cancel' | null} props.action
 * @param {string} [props.currentEndDate] — ISO date (apenas para extend)
 * @param {object} [props.foster] — info do foster (apenas para UX)
 * @param {(result: object | null) => Promise<void>} props.onSubmit
 * @param {boolean} [props.submitting]
 */
export function FosterActionDialog({
  open,
  onOpenChange,
  action,
  currentEndDate,
  foster,
  onSubmit,
  submitting = false,
}) {
  if (!action) return null;

  const titles = {
    extend: 'Prorrogar prazo do placement',
    end: 'Finalizar placement',
    cancel: 'Cancelar placement',
  };
  const descriptions = {
    extend: `Defina a nova data final e o motivo da prorrogação${foster?.pet_name ? ` do pet ${foster.pet_name}` : ''}.`,
    end: `Registre o motivo do término e indique se o animal voltou saudável${foster?.pet_name ? ` (${foster.pet_name})` : ''}.`,
    cancel: `Tem certeza que deseja cancelar este placement${foster?.pet_name ? ` (${foster.pet_name})` : ''}? Esta ação é definitiva.`,
  };

  const handleSubmit = async (result) => {
    if (result === null) {
      onOpenChange(false);
      return;
    }
    try {
      await onSubmit(result);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Erro',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {titles[action]}
          </DialogTitle>
          <DialogDescription>{descriptions[action]}</DialogDescription>
        </DialogHeader>
        {action === 'extend' && (
          <ExtendForm
            currentEndDate={currentEndDate}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
        {action === 'end' && (
          <EndForm onSubmit={handleSubmit} submitting={submitting} />
        )}
        {action === 'cancel' && (
          <CancelForm onSubmit={handleSubmit} submitting={submitting} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FosterActionDialog;
