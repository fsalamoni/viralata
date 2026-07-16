/**
 * @fileoverview MedicationsDueCard — card "Medicações" no dashboard
 * do abrigo (TASK-138).
 *
 * Mostra: medicações ativas, doses devidas agora e doses atrasadas
 * (calculadas em runtime via domain: nextDoseAt/isDoseDue/isDoseOverdue).
 * Botão "Marcar administrada" chama recordDose e recalcula.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Pill, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listShelterActiveMedications,
  recordDose,
} from '@/modules/shelter/services/medicationService';
import {
  nextDoseAt,
  isDoseDue,
  isDoseOverdue,
} from '@/modules/shelter/domain/clinical/medication';

export function MedicationsDueCard({ shelterClubId }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: medications = [], isLoading, isError } = useQuery({
    queryKey: ['shelter', 'medications-due', shelterClubId],
    queryFn: () => listShelterActiveMedications(shelterClubId),
    enabled: Boolean(shelterClubId),
    staleTime: 60_000,
  });

  const now = Date.now();
  const rows = useMemo(() => medications.map((med) => {
    const scheduledAt = nextDoseAt(med, new Date(now));
    return {
      med,
      scheduledAt,
      due: scheduledAt ? isDoseDue(scheduledAt, now) : false,
      overdue: scheduledAt ? isDoseOverdue(scheduledAt, now) : false,
    };
  }), [medications, now]);

  const dueRows = rows.filter((r) => r.due || r.overdue);
  const overdueCount = rows.filter((r) => r.overdue).length;

  const doseMutation = useMutation({
    mutationFn: ({ med, scheduledAt }) => recordDose(
      med.pet_id, med.id, shelterClubId,
      { scheduled_at: scheduledAt?.toISOString?.() || new Date().toISOString() },
      { uid: user?.uid, email: user?.email, displayName: user?.displayName },
    ),
    onSuccess: () => {
      toast.success('Dose registrada.');
      qc.invalidateQueries({ queryKey: ['shelter', 'medications-due', shelterClubId] });
    },
    onError: (err) => toast.error(err?.message || 'Não foi possível registrar a dose.'),
  });

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2 text-base">
          <Pill className="h-4.5 w-4.5 text-primary" /> Medicações
        </h3>
        <p className="arena-section-card-description">
          {medications.length} ativa(s) · {dueRows.length} dose(s) pendente(s)
          {overdueCount > 0 && (
            <span className="ml-1 font-semibold text-destructive">· {overdueCount} atrasada(s)</span>
          )}
        </p>
      </div>
      <div className="arena-section-card-body space-y-2">
        {isLoading && <Skeleton className="h-16 w-full rounded-lg" />}
        {isError && (
          <p className="text-sm text-muted-foreground">Não foi possível carregar as medicações.</p>
        )}
        {!isLoading && !isError && dueRows.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Nenhuma dose pendente agora.
          </p>
        )}
        {dueRows.slice(0, 6).map(({ med, scheduledAt, overdue }) => (
          <div key={`${med.pet_id}-${med.id}`} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {med.name || med.medication_name || 'Medicação'}
                <Link to={`/pet/${med.pet_id}`} className="ml-2 text-xs text-primary underline">ver pet</Link>
              </p>
              <p className="text-xs text-muted-foreground">
                {scheduledAt ? `Dose ${new Date(scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Dose'}
                {overdue && (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    <AlertTriangle className="mr-0.5 h-3 w-3" /> atrasada
                  </Badge>
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={doseMutation.isPending}
              onClick={() => doseMutation.mutate({ med, scheduledAt })}
            >
              Marcar administrada
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MedicationsDueCard;
