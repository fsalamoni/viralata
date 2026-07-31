/**
 * @fileoverview PetHealthRecordForm — dialog de criação/edição de vacina/
 * vermifugação (pets/{petId}/health_records). Inclui agendamento.
 */
import { useEffect, useState } from 'react';
import { Syringe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useCreateHealthRecord, useUpdateHealthRecord } from '../hooks/usePetHealthRecords';
import { HEALTH_RECORD_TYPE_LABELS, HEALTH_RECORD_TYPES } from '@/modules/pets/services/petHealthRecordsService';
import { SchedulingFields } from './SchedulingFields';
import { initScheduled, applyScheduling } from '@/modules/shelter/domain/operational/petOpsScheduling';

const INITIAL = {
  type: HEALTH_RECORD_TYPES.VACCINE,
  name: '',
  application_date: format(new Date(), 'yyyy-MM-dd'),
  dose: '',
  vet_name: '',
  notes: '',
};

export default function PetHealthRecordForm({ open, onOpenChange, petId, record = null }) {
  const { toast } = useToast();
  const [data, setData] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [scheduled, setScheduled] = useState(false);

  const createMut = useCreateHealthRecord(petId);
  const updateMut = useUpdateHealthRecord(petId);
  const isEdit = Boolean(record?.id);
  const loading = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (!open) return;
    if (record) {
      setData({
        type: record.type || HEALTH_RECORD_TYPES.VACCINE,
        name: record.name || '',
        application_date: record.application_date
          ? String(record.application_date).slice(0, 10)
          : INITIAL.application_date,
        dose: record.dose || '',
        vet_name: record.vet_name || '',
        notes: record.notes || '',
      });
    } else {
      setData(INITIAL);
    }
    setScheduled(initScheduled(record));
    setErrors({});
  }, [open, record]);

  const setField = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
  };

  function validate() {
    const errs = {};
    if (!data.name || data.name.trim().length < 2) errs.name = 'Informe a vacina/produto.';
    if (!data.application_date) errs.application_date = 'Informe a data.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    const payload = applyScheduling({ ...data }, scheduled, 'application_date', isEdit);
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ recordId: record.id, updates: payload });
        toast.success('Registro atualizado');
      } else {
        await createMut.mutateAsync({ data: payload });
        toast.success('Registro criado');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            {isEdit ? 'Editar registro' : 'Vacina / vermifugação'}
          </DialogTitle>
          <DialogDescription>Registre uma vacina ou vermifugação do pet. Você pode agendar para uma data futura.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hr-type">Tipo</Label>
              <Select value={data.type} onValueChange={(v) => setField('type', v)}>
                <SelectTrigger id="hr-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(HEALTH_RECORD_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hr-date">Aplicação *</Label>
              <Input id="hr-date" type="date" value={data.application_date} onChange={(e) => setField('application_date', e.target.value)} aria-invalid={!!errors.application_date} />
              {errors.application_date && <p className="mt-1 text-xs text-destructive">{errors.application_date}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="hr-name">Vacina/Produto *</Label>
            <Input id="hr-name" value={data.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ex.: V10, Vermífugo" aria-invalid={!!errors.name} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="hr-dose">Dose</Label>
              <Input id="hr-dose" value={data.dose} onChange={(e) => setField('dose', e.target.value)} placeholder="Ex.: 1ª dose" />
            </div>
            <div>
              <Label htmlFor="hr-vet">Aplicado por</Label>
              <Input id="hr-vet" value={data.vet_name} onChange={(e) => setField('vet_name', e.target.value)} placeholder="Dr(a). / Clínica" />
            </div>
          </div>
          <div>
            <Label htmlFor="hr-notes">Observações</Label>
            <Textarea id="hr-notes" value={data.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} />
          </div>
          <SchedulingFields scheduled={scheduled} onScheduledChange={setScheduled} dateLabel="data de aplicação" disabled={loading} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Salvando…</>) : (isEdit ? 'Salvar' : 'Registrar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
