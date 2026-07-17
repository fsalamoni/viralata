/**
 * @fileoverview Componente: MedicationsList (Fase 9).
 *
 * Lista de medicações do animal. Filtros por status, badges com cores
 * por estado, ações contextuais (pausar/retomar/cancelar/concluir).
 *
 * Feature flag: `shelter_medication` (default OFF).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import {
  MEDICATION_FREQUENCIES,
  MEDICATION_FREQUENCY_LABELS,
  MEDICATION_STATUS,
  MEDICATION_STATUS_LABELS,
  describeMedication,
  frequencyHours,
} from '@/modules/shelter/domain/clinical/medication';
import {
  useMedications,
  useCreateMedication,
  usePauseMedication,
  useResumeMedication,
  useCancelMedication,
  useCompleteMedication,
} from '@/modules/shelter/hooks/useMedications';
import { MedicationForm } from './MedicationForm';
import { confirmDialog } from '@/components/ui/confirm-provider';

const STATUS_TONES = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function MedicationsList({ petId, shelterClubId, canEdit = false, actor }) {
  const [statusFilter, setStatusFilter] = useState('active');
  const { data: meds = [], isLoading } = useMedications(petId, shelterClubId, {
    status: statusFilter,
  });
  const createMutation = useCreateMedication(petId, shelterClubId);
  const pauseMutation = usePauseMedication(petId, shelterClubId);
  const resumeMutation = useResumeMedication(petId, shelterClubId);
  const cancelMutation = useCancelMedication(petId, shelterClubId);
  const completeMutation = useCompleteMedication(petId, shelterClubId);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

  if (!petId || !shelterClubId) {
    return <p className="text-sm text-muted-foreground">Pet/abrigo não definidos.</p>;
  }
  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  const handleCreate = async (input) => {
    try {
      await createMutation.mutateAsync({ input, actor });
      toast({ title: 'Medicação registrada.' });
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handlePause = async (medId) => {
    const reason = window.prompt('Motivo da pausa:');
    if (!reason) return;
    try {
      await pauseMutation.mutateAsync({ medId, reason, actor });
      toast({ title: 'Medicação pausada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleResume = async (medId) => {
    try {
      await resumeMutation.mutateAsync({ medId, actor });
      toast({ title: 'Medicação retomada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async (medId) => {
    if (!(await confirmDialog({ title: 'Cancelar medicação?' }))) return;
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason) return;
    try {
      await cancelMutation.mutateAsync({ medId, reason, actor });
      toast({ title: 'Medicação cancelada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleComplete = async (medId) => {
    if (!(await confirmDialog({ title: 'Marcar como concluída (ciclo finalizado)?' }))) return;
    try {
      await completeMutation.mutateAsync({ medId, actor });
      toast({ title: 'Medicação concluída.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="arena-section-card-title">Medicações</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {meds.length} medicação(ões) {statusFilter ? `(${MEDICATION_STATUS_LABELS[statusFilter]})` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm" variant={statusFilter === null ? 'default' : 'outline'}
              onClick={() => setStatusFilter(null)}
            >
              Todas
            </Button>
            {MEDICATION_STATUS.map((s) => (
              <Button
                key={s} size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {MEDICATION_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="arena-section-card-body">
        {canEdit && (
          <div className="mb-4">
            <Button size="sm" onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'}>
              {showForm ? 'Cancelar' : '+ Nova medicação'}
            </Button>
            {showForm && (
              <div className="mt-3">
                <MedicationForm
                  onSubmit={handleCreate}
                  onCancel={() => setShowForm(false)}
                  isSubmitting={createMutation.isPending}
                />
              </div>
            )}
          </div>
        )}

        {meds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma medicação {statusFilter ? `(${MEDICATION_STATUS_LABELS[statusFilter]})` : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-3">
            {meds.map((m) => {
              const interval = frequencyHours(m.frequency, m.custom_frequency_hours);
              return (
                <li key={m.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={STATUS_TONES[m.status] || ''}>
                          {MEDICATION_STATUS_LABELS[m.status] || m.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {MEDICATION_FREQUENCY_LABELS[m.frequency] || m.frequency}
                          {interval != null && ` (${interval}h)`}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        <strong>{m.medication}</strong>
                        {m.dosage && ` — ${m.dosage}`}
                      </p>
                      {m.times?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Horários: {m.times.join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Início: {m.start_date?.slice(0, 10)}
                        {m.end_date && ` • Fim: ${m.end_date.slice(0, 10)}`}
                        {m.duration_days && ` (${m.duration_days} dias)`}
                      </p>
                      {(m.administered_count != null || m.skipped_count != null) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ✓ {m.administered_count || 0} administradas
                          {(m.skipped_count || 0) > 0 && ` • ⏭ ${m.skipped_count} puladas`}
                        </p>
                      )}
                      {m.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{m.notes}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        {m.status === 'active' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handlePause(m.id)}>
                              Pausar
                            </Button>
                            <Button size="sm" onClick={() => handleComplete(m.id)}>
                              Concluir
                            </Button>
                          </>
                        )}
                        {m.status === 'paused' && (
                          <Button size="sm" onClick={() => handleResume(m.id)}>
                            Retomar
                          </Button>
                        )}
                        {(m.status === 'active' || m.status === 'paused') && (
                          <Button size="sm" variant="ghost" onClick={() => handleCancel(m.id)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
