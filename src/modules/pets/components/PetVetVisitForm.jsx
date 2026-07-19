/**
 * @fileoverview PetVetVisitForm — dialog de criação/edição de consulta veterinária.
 *
 * TASK-V3-PET-DETAIL-FULL-FORMS: form para canManage (owner do pet ou
 * membro do abrigo) cadastrar consultas veterinárias.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React, { useState, useEffect } from 'react';
import { Stethoscope, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCreateVetVisit, useUpdateVetVisit } from '../hooks/usePetMedical';
import { format, parseISO } from 'date-fns';

const INITIAL = {
  visit_date: format(new Date(), 'yyyy-MM-dd'),
  vet_name: '',
  vet_clinic: '',
  reason: '',
  diagnosis: '',
  treatment: '',
  notes: '',
  cost_cents: '',
};

export default function PetVetVisitForm({ open, onOpenChange, petId, visit = null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const createMut = useCreateVetVisit(petId);
  const updateMut = useUpdateVetVisit(petId);
  const isEdit = Boolean(visit?.id);
  const loading = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      if (visit) {
        setData({
          visit_date: visit.visit_date
            ? (typeof visit.visit_date === 'string'
              ? visit.visit_date.substring(0, 10)
              : format(visit.visit_date.toDate?.() || new Date(visit.visit_date), 'yyyy-MM-dd'))
            : INITIAL.visit_date,
          vet_name: visit.vet_name || '',
          vet_clinic: visit.vet_clinic || '',
          reason: visit.reason || '',
          diagnosis: visit.diagnosis || '',
          treatment: visit.treatment || '',
          notes: visit.notes || '',
          cost_cents: visit.cost_cents ? String(visit.cost_cents / 100) : '',
        });
      } else {
        setData(INITIAL);
      }
      setErrors({});
    }
  }, [open, visit]);

  function setField(k, v) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const errs = {};
    if (!data.reason || data.reason.trim().length < 3) {
      errs.reason = 'Informe o motivo da consulta (≥ 3 caracteres)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    const payload = {
      ...data,
      cost_cents: data.cost_cents ? Math.round(parseFloat(data.cost_cents) * 100) : null,
      visit_date: data.visit_date || null,
    };
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ visitId: visit.id, updates: payload });
        toast.success('Consulta atualizada');
      } else {
        await createMut.mutateAsync({ data: payload, actor: user });
        toast.success('Consulta registrada');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar consulta');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-sky-600" aria-hidden="true" />
            {isEdit ? 'Editar consulta' : 'Nova consulta veterinária'}
          </DialogTitle>
          <DialogDescription>
            Registre uma consulta para o histórico de saúde do pet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="visit_date">Data</Label>
              <Input
                id="visit_date"
                type="date"
                value={data.visit_date}
                onChange={(e) => setField('visit_date', e.target.value)}
                aria-invalid={!!errors.visit_date}
              />
            </div>
            <div>
              <Label htmlFor="cost_cents">Custo (R$)</Label>
              <Input
                id="cost_cents"
                type="number"
                step="0.01"
                min="0"
                value={data.cost_cents}
                onChange={(e) => setField('cost_cents', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Motivo *</Label>
            <Input
              id="reason"
              value={data.reason}
              onChange={(e) => setField('reason', e.target.value)}
              placeholder="Ex: Check-up anual, Vacina, Coceira persistente"
              aria-invalid={!!errors.reason}
            />
            {errors.reason && <p className="mt-1 text-xs text-destructive">{errors.reason}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vet_name">Veterinário</Label>
              <Input
                id="vet_name"
                value={data.vet_name}
                onChange={(e) => setField('vet_name', e.target.value)}
                placeholder="Dr(a). Nome"
              />
            </div>
            <div>
              <Label htmlFor="vet_clinic">Clínica</Label>
              <Input
                id="vet_clinic"
                value={data.vet_clinic}
                onChange={(e) => setField('vet_clinic', e.target.value)}
                placeholder="Clínica Veterinária X"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="diagnosis">Diagnóstico</Label>
            <Textarea
              id="diagnosis"
              value={data.diagnosis}
              onChange={(e) => setField('diagnosis', e.target.value)}
              placeholder="Ex: Saudável, dermatite alérgica, etc"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="treatment">Tratamento prescrito</Label>
            <Textarea
              id="treatment"
              value={data.treatment}
              onChange={(e) => setField('treatment', e.target.value)}
              placeholder="Ex: Prednisolona 5mg 7 dias, banho com shampoo X"
              rows={2}
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
                <>{isEdit ? 'Salvar alterações' : 'Registrar consulta'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
