/**
 * @fileoverview PetCareLogForm — dialog de criação de cuidado (banho, tosa, etc).
 *
 * TASK-V3-PET-DETAIL-FULL-FORMS: form para canManage.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React, { useState, useEffect } from 'react';
import { Bath, Loader2 } from 'lucide-react';
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
import { useCreateCareLog } from '../hooks/usePetMedical';
import { format } from 'date-fns';

const CARE_TYPES = [
  { value: 'bath', label: 'Banho' },
  { value: 'grooming', label: 'Tosa' },
  { value: 'brushing', label: 'Escovação' },
  { value: 'dental', label: 'Limpeza dental' },
  { value: 'nails', label: 'Corte de unhas' },
  { value: 'exercise', label: 'Exercícios' },
  { value: 'other', label: 'Outro' },
];

const INITIAL = {
  care_type: 'bath',
  care_date: format(new Date(), 'yyyy-MM-dd'),
  next_due_date: '',
  frequency_days: '',
  performed_by: '',
  notes: '',
};

export default function PetCareLogForm({ open, onOpenChange, petId, defaultType = 'bath' }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const createMut = useCreateCareLog(petId);
  const loading = createMut.isPending;

  useEffect(() => {
    if (open) {
      setData({ ...INITIAL, care_type: defaultType });
      setErrors({});
    }
  }, [open, defaultType]);

  function setField(k, v) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const errs = {};
    if (!data.care_date) {
      errs.care_date = 'Informe a data do cuidado';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    const payload = {
      ...data,
      frequency_days: data.frequency_days ? Number(data.frequency_days) : null,
      next_due_date: data.next_due_date || null,
    };
    try {
      await createMut.mutateAsync({ data: payload });
      toast.success('Cuidado registrado');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar cuidado');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bath className="h-5 w-5 text-cyan-600" aria-hidden="true" />
            Registrar cuidado
          </DialogTitle>
          <DialogDescription>
            Registre um cuidado (banho, tosa, escovação, etc) para manter a rotina em dia.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="care_type">Tipo de cuidado</Label>
            <Select value={data.care_type} onValueChange={(v) => setField('care_type', v)}>
              <SelectTrigger id="care_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARE_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="care_date">Data *</Label>
              <Input
                id="care_date"
                type="date"
                value={data.care_date}
                onChange={(e) => setField('care_date', e.target.value)}
                aria-invalid={!!errors.care_date}
              />
              {errors.care_date && <p className="mt-1 text-xs text-destructive">{errors.care_date}</p>}
            </div>
            <div>
              <Label htmlFor="frequency_days">Frequência (dias)</Label>
              <Input
                id="frequency_days"
                type="number"
                min="1"
                value={data.frequency_days}
                onChange={(e) => setField('frequency_days', e.target.value)}
                placeholder="Ex: 30 (mensal)"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="next_due_date">Próximo (calculado se vazio)</Label>
            <Input
              id="next_due_date"
              type="date"
              value={data.next_due_date}
              onChange={(e) => setField('next_due_date', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="performed_by">Realizado por</Label>
            <Input
              id="performed_by"
              value={data.performed_by}
              onChange={(e) => setField('performed_by', e.target.value)}
              placeholder="Nome do pet shop, voluntário, ou você mesmo"
            />
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={data.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Notas adicionais"
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
                <>Registrar cuidado</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
