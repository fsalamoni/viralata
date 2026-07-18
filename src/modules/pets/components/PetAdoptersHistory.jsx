/**
 * @fileoverview PetAdoptersHistory — histórico de adotantes do pet.
 *
 * TASK-V3-PET-DETAIL-FULL-13: lê pets/{petId}/adopters_history.
 * Mostra TODOS os adotantes (incluindo o atual) desde o cadastro do pet.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { Users, CheckCircle2, X, ArrowLeftRight, Heart, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/core/lib/utils';

const STATUS_META = {
  active: { label: 'Adotante atual', icon: Heart, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  returned: { label: 'Devolveu', icon: X, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  transferred: { label: 'Transferido', icon: ArrowLeftRight, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  deceased: { label: 'Pet faleceu', icon: CheckCircle2, color: 'bg-gray-100 text-gray-800 border-gray-300' },
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

function AdopterCard({ adopter }) {
  const meta = STATUS_META[adopter.status] || STATUS_META.active;
  const Icon = meta.icon;
  return (
    <li
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      data-testid={`adopter-${adopter.id}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {adopter.adopter_name || 'Adotante'}
            </p>
            <Badge className={cn('border text-[10.5px]', meta.color)}>
              {meta.label}
            </Badge>
          </div>
          {adopter.adopter_email && (
            <p className="mt-1 text-xs text-muted-foreground">
              📧 {adopter.adopter_email}
            </p>
          )}
          {adopter.adopter_phone && (
            <p className="text-xs text-muted-foreground">
              📱 {adopter.adopter_phone}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {adopter.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                Adotou em {formatDate(adopter.start_date)}
              </span>
            )}
            {adopter.end_date && (
              <span>· Encerrado em {formatDate(adopter.end_date)}</span>
            )}
          </div>
          {adopter.notes && (
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              {adopter.notes}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PetAdoptersHistory({ adopters, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!adopters || adopters.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum adotante no histórico"
        description="Este pet ainda não foi adotado. Quando uma adoção for concluída, o adotante aparecerá aqui."
      />
    );
  }

  return (
    <ul className="space-y-2" aria-label="Histórico de adotantes">
      {adopters.map((a) => (
        <AdopterCard key={a.id} adopter={a} />
      ))}
    </ul>
  );
}
