/**
 * @fileoverview PetTreatmentForm — dialog de criação/edição de tratamento.
 *
 * TASK-V3-PET-DETAIL-FULL-FORMS: form para canManage.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React, { useState, useEffect } from 'react';
import { Activity, Loader2 } from 'lucide-react';
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
import { useCreateTreatment, useUpdateTreatment } from '../hooks/usePetMedical';
import { format } from 'date-fns';

const TYPES = [
  { value: 'parasitic', label: 'Parasitário' },
  { value: 'injury', label: 'Ferida' },
  { value: 'infection', label: 'Infecção' },
  { value: 'chronic', label: 'Crônico' },
  { value: 'rehab', label: 'Reabilitação' },
  { value: 'other', label: 'Outro' },
];

const STATUSES = [
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'paused', label: 'Pausado' },
];

const INITIAL = {
  name: '',
  type: 'other',
  status: 'in_progress',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  description: '',
  medication: '',
  dosage: '',
  vet_name: '',
};

export default function PetTreatmentForm({ open, onOpenChange, petId, treatment = null }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const createMut = useCreateTreatment(petId);
  const updateMut = useUpdateTreatment(petId);
  const isEdit = Boolean(treatment?.id);
  const loading = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      if (treatment) {
        setData({
          name: treatment.name || '',
          type: treatment.type || 'other',
          status: treatment.status || 'in_progress',
          start_date: treatment.start_date
            ? (typeof treatment.start_date === 'string'
              ? treatment.start_date.substring(0, 10)
              : format(treatment.start_date.toDate?.() || new Date(treatment.start_date), 'yyyy-MM-dd'))
            : INITIAL.start_date,
          end_date: treatment.end_date
            ? (typeof treatment.end_date === 'string'
              ? treatment.end_date.substring(0, 10)
              : format(treatment.end_date.toDate?.() || new Date(treatment.end_date), 'yyyy-MM-dd'))
            : '',
          description: treatment.description || '',
          medication: treatment.medication || '',
          dosage: treatment.dosage || '',
          vet_name: treatment.vet_name || '',
        });
      } else {
        setData(INITIAL);
      }
      setErrors({});
    }
  }, [open, treatment]);

  function setField(k, v) {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  }

  function validate() {
    const errs = {};
    if (!data.name || data.name.trim().length < 3) {
      errs.name = 'Informe o nome do tratamento (≥ 3 caracteres)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    const payload = {
      ...data,
      end_date: data.end_date || null,
    };
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ treatmentId: treatment.id, updates: payload });
        toast.success('Tratamento atualizado');
      } else {
        await createMut.mutateAsync({ data: payload, actor: user });
        toast.success('Tratamento registrado');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar tratamento');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-600" aria-hidden="true" />
            {isEdit ? 'Editar tratamento' : 'Novo tratamento'}
          </DialogTitle>
          <DialogDescription>
            Registre um tratamento em curso para o pet.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Ex: Sarna, Ferida pata, Otite"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={data.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={data.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">Início</Label>
              <Input
                id="start_date"
                type="date"
                value={data.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Fim (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={data.end_date}
                onChange={(e) => setField('end_date', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="vet_name">Veterinário</Label>
            <Input
              id="vet_name"
              value={data.vet_name}
              onChange={(e) => setField('vet_name', e.target.value)}
              placeholder="Dr(a). Nome"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="medication">Medicação</Label>
              <Input
                id="medication"
                value={data.medication}
                onChange={(e) => setField('medication', e.target.value)}
                placeholder="Nome do medicamento"
              />
            </div>
            <div>
              <Label htmlFor="dosage">Dosagem</Label>
              <Input
                id="dosage"
                value={data.dosage}
                onChange={(e) => setField('dosage', e.target.value)}
                placeholder="Ex: 5mg 2x/dia"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Detalhes do tratamento"
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
                <>{isEdit ? 'Salvar alterações' : 'Registrar tratamento'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
