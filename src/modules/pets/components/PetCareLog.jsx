/**
 * @fileoverview PetCareLog — registro de cuidados (banho, tosa, escovação, etc).
 *
 * TASK-V3-PET-DETAIL-FULL-11: lê pets/{petId}/care_log.
 * Mostra próxima data calculada (se frequency_days).
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import React from 'react';
import { Bath, Scissors, Brush, Sparkles, Footprints, Dumbbell, Plus, Calendar } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

const TYPE_META = {
  bath: { label: 'Banho', icon: Bath, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  grooming: { label: 'Tosa', icon: Scissors, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  brushing: { label: 'Escovação', icon: Brush, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  dental: { label: 'Limpeza dental', icon: Sparkles, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  nails: { label: 'Corte de unhas', icon: Footprints, color: 'bg-violet-100 text-violet-700 border-violet-300' },
  exercise: { label: 'Exercícios', icon: Dumbbell, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  other: { label: 'Outro', icon: Sparkles, color: 'bg-gray-100 text-gray-700 border-gray-300' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso?.toDate?.();
    if (!d) return '—';
    return format(d, "dd 'de' MMM", { locale: ptBR });
  } catch {
    return '—';
  }
}

function nextDueStatus(care) {
  if (!care.frequency_days || !care.care_date) return null;
  try {
    const d = typeof care.care_date === 'string' ? parseISO(care.care_date) : care.care_date?.toDate?.();
    if (!d) return null;
    const next = addDays(d, Number(care.frequency_days));
    const now = new Date();
    if (isBefore(next, now)) return { status: 'overdue', days: 0, date: next };
    if (isBefore(next, addDays(now, 7))) return { status: 'soon', days: Math.ceil((next - now) / (1000 * 60 * 60 * 24)), date: next };
    return { status: 'future', days: Math.ceil((next - now) / (1000 * 60 * 60 * 24)), date: next };
  } catch {
    return null;
  }
}

function CareCard({ care }) {
  const meta = TYPE_META[care.care_type] || TYPE_META.other;
  const Icon = meta.icon;
  const next = nextDueStatus(care);
  return (
    <li
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      data-testid={`care-${care.id}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{meta.label}</p>
            <Badge variant="outline" className="text-[10.5px]">
              <Calendar className="mr-1 h-3 w-3" aria-hidden="true" />
              {formatDate(care.care_date)}
            </Badge>
            {next && (
              <Badge
                className={cn(
                  'border text-[10.5px]',
                  next.status === 'overdue' && 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
                  next.status === 'soon' && 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
                  next.status === 'future' && 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
                )}
              >
                {next.status === 'overdue' && 'Atrasado'}
                {next.status === 'soon' && `Próximo em ${next.days}d`}
                {next.status === 'future' && `Próximo em ${next.days}d`}
              </Badge>
            )}
          </div>
          {care.performed_by && (
            <p className="mt-1 text-xs text-muted-foreground">
              Realizado por: <span className="font-medium">{care.performed_by}</span>
            </p>
          )}
          {care.frequency_days && (
            <p className="mt-1 text-xs text-muted-foreground">
              Frequência: a cada {care.frequency_days} dias
            </p>
          )}
          {care.notes && (
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              {care.notes}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PetCareLog({ careLogs, isLoading, canEdit = false, onAdd }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!careLogs || careLogs.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Bath}
          title="Nenhum cuidado registrado"
          description={
            canEdit
              ? 'Registre banho, tosa, escovação e outros cuidados para manter a rotina em dia.'
              : 'Este pet não tem registro de cuidados ainda.'
          }
        />
        {canEdit && onAdd && (
          <Button onClick={onAdd} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Registrar primeiro cuidado
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Cuidados do pet">
      {careLogs.map((c) => (
        <CareCard key={c.id} care={c} />
      ))}
    </ul>
  );
}
