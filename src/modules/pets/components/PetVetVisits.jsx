/**
 * @fileoverview PetVetVisits — lista de consultas veterinárias.
 *
 * TASK-V3-PET-DETAIL-FULL-09: lê pets/{petId}/vet_visits.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { Stethoscope, Building2, User, FileText, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

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

function formatCurrency(cents) {
  if (!cents) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  } catch {
    return `R$ ${(cents / 100).toFixed(2)}`;
  }
}

function VetVisitCard({ visit }) {
  return (
    <li
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      data-testid={`vet-visit-${visit.id}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
          <Stethoscope className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{visit.reason || 'Consulta'}</p>
            {visit.visit_date && (
              <Badge variant="outline" className="text-[10.5px]">
                {formatDate(visit.visit_date)}
              </Badge>
            )}
          </div>
          {visit.diagnosis && (
            <p className="mt-1 text-xs text-foreground/80">
              <span className="font-medium text-foreground">Diagnóstico:</span> {visit.diagnosis}
            </p>
          )}
          {visit.treatment && (
            <p className="mt-1 text-xs text-foreground/80">
              <span className="font-medium text-foreground">Tratamento:</span> {visit.treatment}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {visit.vet_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" aria-hidden="true" />
                {visit.vet_name}
              </span>
            )}
            {visit.vet_clinic && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                {visit.vet_clinic}
              </span>
            )}
            {visit.cost_cents && (
              <Badge variant="secondary" className="text-[10.5px]">
                {formatCurrency(visit.cost_cents)}
              </Badge>
            )}
          </div>
          {visit.notes && (
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              <FileText className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {visit.notes}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PetVetVisits({ visits, isLoading, canEdit = false, onAdd }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Stethoscope}
          title="Nenhuma consulta registrada"
          description={
            canEdit
              ? 'Registre consultas veterinárias para manter o histórico de saúde completo.'
              : 'Este pet não tem consultas veterinárias registradas.'
          }
        />
        {canEdit && onAdd && (
          <Button onClick={onAdd} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Registrar primeira consulta
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Consultas veterinárias do pet">
      {visits.map((visit) => (
        <VetVisitCard key={visit.id} visit={visit} />
      ))}
    </ul>
  );
}
