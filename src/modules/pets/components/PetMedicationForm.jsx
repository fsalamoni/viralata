/**
 * @fileoverview PetMedicationForm — dialog de criação de medicação contínua.
 *
 * TASK-V3-PET-DETAIL-FULL-FORMS: form para canManage.
 * Reusa o hook useCreateMedication do módulo shelter.
 */
import React, { useState, useEffect } from 'react';
import { Pill, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useCreateMedication } from '@/modules/shelter/hooks/useMedications';
import { format } from 'date-fns';

const INITIAL = {
  name: '',
  dosage: '',
  frequency: '24/24h',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  notes: '',
};

export default function PetMedicationForm({ open, onOpenChange, petId, shelterClubId }) {
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const createMut = useCreateMedication(petId, shelterClubId);
  const loading = createMut.isPending;

  useEffect(() => {
    if (open) {
      setData(INITIAL);
      setErrors({});
    }
  }, [open]);

  function setField(k, v) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const errs = {};
    if (!data.name || data.name.trim().length < 2) {
      errs.name = 'Informe o nome do medicamento';
    }
    if (!data.dosage) {
      errs.dosage = 'Informe a dosagem';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    try {
      await createMut.mutateAsync({
        input: {
          name: data.name,
          dosage: data.dosage,
          frequency: data.frequency,
          start_date: data.start_date,
          end_date: data.end_date || null,
          notes: data.notes,
          status: 'active',
        },
      });
      toast.success('Medicação registrada');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao registrar medicação');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            Nova medicação
          </DialogTitle>
          <DialogDescription>
            Registre uma medicação contínua para o pet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="med-name">Nome do medicamento *</Label>
            <Input
              id="med-name"
              value={data.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Ex: Prednisolona, Vermífugo X"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="med-dosage">Dosagem *</Label>
              <Input
                id="med-dosage"
                value={data.dosage}
                onChange={(e) => setField('dosage', e.target.value)}
                placeholder="Ex: 5mg 2x/dia"
                aria-invalid={!!errors.dosage}
              />
              {errors.dosage && <p className="mt-1 text-xs text-destructive">{errors.dosage}</p>}
            </div>
            <div>
              <Label htmlFor="med-frequency">Frequência</Label>
              <Input
                id="med-frequency"
                value={data.frequency}
                onChange={(e) => setField('frequency', e.target.value)}
                placeholder="Ex: 24/24h, 1x semana"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="med-start">Início</Label>
              <Input
                id="med-start"
                type="date"
                value={data.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="med-end">Fim (opcional)</Label>
              <Input
                id="med-end"
                type="date"
                value={data.end_date}
                onChange={(e) => setField('end_date', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="med-notes">Observações</Label>
            <Textarea
              id="med-notes"
              value={data.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Notas sobre aplicação, efeitos, etc"
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
                <>Registrar medicação</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
