/**
 * @fileoverview PetDevolutionForm — dialog de registro de devolução.
 *
 * TASK-V3-PET-DETAIL-FULL-FORMS: form para canManage OU adotante.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React, { useState, useEffect } from 'react';
import { Undo2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCreateDevolution } from '../hooks/usePetHistory';
import { format } from 'date-fns';

const REASONS = [
  { value: 'allergy', label: 'Alergia' },
  { value: 'behavior', label: 'Comportamento' },
  { value: 'housing', label: 'Mudança de moradia' },
  { value: 'health', label: 'Saúde do pet' },
  { value: 'family_change', label: 'Mudança familiar' },
  { value: 'other', label: 'Outro' },
];

const CONDITIONS = [
  { value: 'excellent', label: 'Excelente' },
  { value: 'good', label: 'Bom' },
  { value: 'fair', label: 'Regular' },
  { value: 'poor', label: 'Ruim' },
];

const INITIAL = {
  devolution_date: format(new Date(), 'yyyy-MM-dd'),
  reason: '',
  reason_category: 'other',
  pet_condition: 'good',
  returned_by_name: '',
  foster_to_shelter: false,
  notes: '',
};

export default function PetDevolutionForm({ open, onOpenChange, petId, isAdopter = false }) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const createMut = useCreateDevolution(petId);
  const loading = createMut.isPending;

  useEffect(() => {
    if (open) {
      setData({
        ...INITIAL,
        returned_by_name: userProfile?.name || user?.displayName || '',
      });
      setErrors({});
    }
  }, [open, user, userProfile]);

  function setField(k, v) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const errs = {};
    if (!data.reason || data.reason.trim().length < 10) {
      errs.reason = 'Motivo deve ter ao menos 10 caracteres';
    }
    if (!data.returned_by_name) {
      errs.returned_by_name = 'Informe quem está devolvendo';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    const payload = {
      ...data,
      returned_by_uid: user?.uid || null,
    };
    try {
      await createMut.mutateAsync({ data: payload, actor: user });
      toast.success('Devolução registrada. Obrigado pelo retorno.');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao registrar devolução');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Registrar devolução
          </DialogTitle>
          <DialogDescription>
            {isAdopter
              ? 'Informe o motivo da devolução. Sua transparência ajuda o abrigo a melhorar.'
              : 'Registre uma devolução. Use a empatia — abrigos lidam com isso frequentemente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="devolution_date">Data da devolução</Label>
            <Input
              id="devolution_date"
              type="date"
              value={data.devolution_date}
              onChange={(e) => setField('devolution_date', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="reason_category">Categoria</Label>
              <Select value={data.reason_category} onValueChange={(v) => setField('reason_category', v)}>
                <SelectTrigger id="reason_category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pet_condition">Estado do pet</Label>
              <Select value={data.pet_condition} onValueChange={(v) => setField('pet_condition', v)}>
                <SelectTrigger id="pet_condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Motivo detalhado * (≥ 10 chars)</Label>
            <Textarea
              id="reason"
              value={data.reason}
              onChange={(e) => setField('reason', e.target.value)}
              placeholder="Ex: Alergia do filho ao pelo do gato descoberta após 2 meses"
              rows={3}
              aria-invalid={!!errors.reason}
            />
            {errors.reason && <p className="mt-1 text-xs text-destructive">{errors.reason}</p>}
          </div>
          <div>
            <Label htmlFor="returned_by_name">Devolvido por *</Label>
            <Input
              id="returned_by_name"
              value={data.returned_by_name}
              onChange={(e) => setField('returned_by_name', e.target.value)}
              placeholder="Seu nome"
              aria-invalid={!!errors.returned_by_name}
            />
            {errors.returned_by_name && <p className="mt-1 text-xs text-destructive">{errors.returned_by_name}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={data.foster_to_shelter}
              onChange={(e) => setField('foster_to_shelter', e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Veio via Lar Temporário</span>
          </label>
          <div>
            <Label htmlFor="notes">Observações adicionais</Label>
            <Textarea
              id="notes"
              value={data.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Estado de saúde, comportamento, recomendações para o abrigo"
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Salvando…
                </>
              ) : (
                <>Registrar devolução</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
