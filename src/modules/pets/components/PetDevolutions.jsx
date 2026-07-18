/**
 * @fileoverview PetDevolutions — lista de devoluções do pet.
 *
 * TASK-V3-PET-DETAIL-FULL-12: lê pets/{petId}/devolutions.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { Undo2, User, Calendar, FileText, AlertCircle, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

const REASON_META = {
  allergy: { label: 'Alergia', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  behavior: { label: 'Comportamento', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  housing: { label: 'Mudança de moradia', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  health: { label: 'Saúde do pet', color: 'bg-red-100 text-red-800 border-red-300' },
  family_change: { label: 'Mudança familiar', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  other: { label: 'Outro', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

const CONDITION_META = {
  excellent: { label: 'Excelente', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  good: { label: 'Bom', color: 'bg-green-100 text-green-800 border-green-300' },
  fair: { label: 'Regular', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  poor: { label: 'Ruim', color: 'bg-red-100 text-red-800 border-red-300' },
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

function DevolutionCard({ devolution }) {
  const reasonMeta = REASON_META[devolution.reason_category] || REASON_META.other;
  const conditionMeta = CONDITION_META[devolution.pet_condition] || CONDITION_META.good;
  return (
    <li
      className="rounded-xl border border-amber-300/50 bg-amber-50/30 p-4 dark:border-amber-700/40 dark:bg-amber-900/10"
      data-testid={`devolution-${devolution.id}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Devolução</p>
            <Badge className={cn('border text-[10.5px]', reasonMeta.color)}>
              {reasonMeta.label}
            </Badge>
            <Badge className={cn('border text-[10.5px]', conditionMeta.color)}>
              Estado: {conditionMeta.label}
            </Badge>
            {devolution.devolution_date && (
              <Badge variant="outline" className="text-[10.5px]">
                <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
                {formatDate(devolution.devolution_date)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground/85">
            <AlertCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            {devolution.reason}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {devolution.returned_by_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" aria-hidden="true" />
                Devolvido por {devolution.returned_by_name}
              </span>
            )}
            {devolution.foster_to_shelter && (
              <Badge variant="secondary" className="text-[10.5px]">
                Via Lar Temporário
              </Badge>
            )}
          </div>
          {devolution.notes && (
            <p className="mt-2 border-t border-amber-300/40 pt-2 text-xs text-muted-foreground dark:border-amber-700/40">
              <FileText className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {devolution.notes}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PetDevolutions({ devolutions, isLoading, canEdit = false, onAdd }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!devolutions || devolutions.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Undo2}
          title="Nenhuma devolução registrada"
          description={
            canEdit
              ? 'Quando o pet for devolvido, registre aqui para manter o histórico completo.'
              : 'Este pet não tem devoluções registradas — sinal de uma adoção bem-sucedida.'
          }
        />
        {canEdit && onAdd && (
          <Button onClick={onAdd} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Registrar devolução
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Devoluções do pet">
      {devolutions.map((d) => (
        <DevolutionCard key={d.id} devolution={d} />
      ))}
    </ul>
  );
}
