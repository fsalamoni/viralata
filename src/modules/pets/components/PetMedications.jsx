/**
 * @fileoverview PetMedications — lista de medicações contínuas.
 *
 * TASK-V3-PET-DETAIL-FULL-08: usa usePetMedications (V1 hook) que
 * lê pets/{petId}/medications com sub-doses.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { Pill, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/core/lib/utils';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso?.toDate?.();
    if (!d) return '—';
    return format(d, "dd 'de' MMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '—';
  }
}

function nextDoseStatus(med) {
  const next = med?.next_dose_at;
  if (!next) return null;
  try {
    const d = typeof next === 'string' ? parseISO(next) : next?.toDate?.();
    if (!d) return null;
    const now = new Date();
    if (isBefore(d, now)) return { status: 'overdue', days: 0 };
    if (isBefore(d, addDays(now, 7))) return { status: 'soon', days: Math.ceil((d - now) / (1000 * 60 * 60 * 24)) };
    return { status: 'future', days: Math.ceil((d - now) / (1000 * 60 * 60 * 24)) };
  } catch {
    return null;
  }
}

function MedicationCard({ med }) {
  const next = nextDoseStatus(med);
  return (
    <li
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      data-testid={`medication-${med.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Pill className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{med.name}</p>
              {med.dosage && (
                <p className="text-xs text-muted-foreground">{med.dosage}</p>
              )}
            </div>
          </div>
          {med.frequency && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Frequência:</span> {med.frequency}
            </p>
          )}
          {med.start_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Início:</span> {formatDate(med.start_date)}
            </p>
          )}
          {med.end_date && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Fim:</span> {formatDate(med.end_date)}
            </p>
          )}
        </div>
        {next && (
          <Badge
            className={cn(
              'shrink-0 border text-[10.5px]',
              next.status === 'overdue' && 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
              next.status === 'soon' && 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
              next.status === 'future' && 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
            )}
          >
            {next.status === 'overdue' && (
              <>
                <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                Próxima dose atrasada
              </>
            )}
            {next.status === 'soon' && (
              <>
                <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
                Em {next.days} {next.days === 1 ? 'dia' : 'dias'}
              </>
            )}
            {next.status === 'future' && (
              <>
                <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
                Em {next.days} dias
              </>
            )}
          </Badge>
        )}
      </div>
      {med.notes && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {med.notes}
        </p>
      )}
    </li>
  );
}

export default function PetMedications({ medications, isLoading, canEdit = false }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!medications || medications.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title="Nenhuma medicação registrada"
        description={
          canEdit
            ? 'Quando você registrar uma medicação contínua (ex: vermífugo mensal), ela aparecerá aqui.'
            : 'Este pet não tem medicação contínua registrada no momento.'
        }
      />
    );
  }

  return (
    <ul className="space-y-2" aria-label="Medicações do pet">
      {medications.map((med) => (
        <MedicationCard key={med.id} med={med} />
      ))}
    </ul>
  );
}
