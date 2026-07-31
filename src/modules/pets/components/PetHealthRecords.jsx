/**
 * @fileoverview PetHealthRecords — lista de gestão de vacinas/vermifugação
 * do pet (pets/{petId}/health_records), com badge de agendamento e ações
 * de editar/excluir para quem gerencia. A visão pública é PublicHealthRecord.
 */
import { Syringe, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { usePetHealthRecords, useDeleteHealthRecord } from '../hooks/usePetHealthRecords';
import { HEALTH_RECORD_TYPE_LABELS } from '@/modules/pets/services/petHealthRecordsService';
import { RecordStatusBadge } from './RecordStatusBadge';

function fmt(d) {
  if (!d) return '';
  try { return format(new Date(String(d).slice(0, 10)), 'dd/MM/yyyy'); } catch { return ''; }
}

export default function PetHealthRecords({ petId, canManage = false, onAdd, onEdit }) {
  const { data: records = [], isLoading } = usePetHealthRecords(petId);
  const del = useDeleteHealthRecord(petId);
  const { toast } = useToast();

  const handleDelete = async (r) => {
    if (!(await confirmDialog({ title: 'Excluir este registro?', description: 'Esta ação não pode ser desfeita.' }))) return;
    try {
      await del.mutateAsync({ recordId: r.id });
      toast.success('Registro excluído');
    } catch (err) {
      toast.error(err?.message || 'Erro ao excluir');
    }
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onAdd?.()}>
            <Plus className="mr-1.5 h-4 w-4" /> Vacina / vermifugação
          </Button>
        </div>
      )}
      {records.length === 0 ? (
        <EmptyState icon={Syringe} title="Sem vacinas/vermifugação" description="Nenhum registro de vacina ou vermifugação para este pet." />
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Syringe className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.name || 'Registro'}</p>
                    <Badge variant="outline" className="text-[10.5px]">{HEALTH_RECORD_TYPE_LABELS[r.type] || r.type}</Badge>
                    {r.application_date && <Badge variant="outline" className="text-[10.5px]">{fmt(r.application_date)}</Badge>}
                    <RecordStatusBadge record={r} className="text-[10.5px]" />
                  </div>
                  {(r.dose || r.vet_name) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[r.dose, r.vet_name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {r.notes && <p className="mt-1 text-xs text-foreground/80">{r.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit?.(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-700" aria-label="Excluir" onClick={() => handleDelete(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
