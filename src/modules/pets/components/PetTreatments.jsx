/**
 * @fileoverview PetTreatments — lista de tratamentos em curso.
 *
 * TASK-V3-PET-DETAIL-FULL-10: lê pets/{petId}/treatments.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { Activity, Pill, Plus, Clock, CheckCircle2, Pause } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

const TYPE_META = {
  parasitic: { label: 'Parasitário', color: 'text-orange-700 bg-orange-100 border-orange-300' },
  injury: { label: 'Ferida', color: 'text-red-700 bg-red-100 border-red-300' },
  infection: { label: 'Infecção', color: 'text-rose-700 bg-rose-100 border-rose-300' },
  chronic: { label: 'Crônico', color: 'text-purple-700 bg-purple-100 border-purple-300' },
  rehab: { label: 'Reabilitação', color: 'text-sky-700 bg-sky-100 border-sky-300' },
  other: { label: 'Outro', color: 'text-gray-700 bg-gray-100 border-gray-300' },
};

const STATUS_META = {
  in_progress: { label: 'Em andamento', icon: Clock, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  suspended: { label: 'Suspenso', icon: Pause, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  paused: { label: 'Pausado', icon: Pause, color: 'bg-amber-100 text-amber-800 border-amber-300' },
};

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

function TreatmentCard({ treatment, canEdit, onEdit }) {
  const typeMeta = TYPE_META[treatment.type] || TYPE_META.other;
  const statusMeta = STATUS_META[treatment.status] || STATUS_META.in_progress;
  const StatusIcon = statusMeta.icon;
  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm',
        canEdit && onEdit && 'cursor-pointer',
      )}
      onClick={() => canEdit && onEdit && onEdit(treatment)}
      data-testid={`treatment-${treatment.id}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <Activity className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{treatment.name || 'Tratamento'}</p>
            <Badge className={cn('border text-[10.5px]', typeMeta.color)}>
              {typeMeta.label}
            </Badge>
            <Badge className={cn('border text-[10.5px]', statusMeta.color)}>
              <StatusIcon className="mr-1 h-3 w-3" aria-hidden="true" />
              {statusMeta.label}
            </Badge>
          </div>
          {treatment.description && (
            <p className="text-xs text-foreground/80">{treatment.description}</p>
          )}
          {(treatment.medication || treatment.dosage) && (
            <p className="text-xs text-muted-foreground">
              <Pill className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {treatment.medication}
              {treatment.dosage && ` — ${treatment.dosage}`}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {treatment.start_date && (
              <span>Início: {formatDate(treatment.start_date)}</span>
            )}
            {treatment.end_date && (
              <span>Fim: {formatDate(treatment.end_date)}</span>
            )}
            {treatment.vet_name && <span>· {treatment.vet_name}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function PetTreatments({ treatments, isLoading, canEdit = false, onAdd, onEdit }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!treatments || treatments.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Activity}
          title="Nenhum tratamento registrado"
          description={
            canEdit
              ? 'Quando o pet tiver um tratamento em curso (sarna, ferida, etc), registre aqui.'
              : 'Este pet não tem tratamentos registrados no momento.'
          }
        />
        {canEdit && onAdd && (
          <Button onClick={onAdd} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Registrar primeiro tratamento
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Tratamentos do pet">
      {treatments.map((t) => (
        <TreatmentCard key={t.id} treatment={t} canEdit={canEdit} onEdit={onEdit} />
      ))}
    </ul>
  );
}
