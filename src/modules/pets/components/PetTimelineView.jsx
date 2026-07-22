/**
 * @fileoverview PetTimelineView — visualização cronológica de TODOS os
 * eventos do pet (criação, mudanças, saúde, cuidados, histórico, anotações).
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): combina todas as fontes em ordem
 * cronológica reversa (mais recente primeiro).
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Stethoscope, Pill, Bath, RotateCcw, Users, MessageSquare,
  Circle, Edit, Trash2, Clock, PawPrint,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { usePetTimeline } from '../hooks/usePetTimeline';
import { cn } from '@/core/lib/utils';

const ICON_MAP = { Sparkles, Stethoscope, Pill, Bath, RotateCcw, Users, MessageSquare, Circle, Edit, Trash2, Clock, PawPrint };
const COLOR_CLASSES = {
  primary: 'bg-primary/10 text-primary ring-primary/20',
  rose: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:ring-rose-900/40',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-900/40',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:ring-emerald-900/40',
  sky: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:ring-sky-900/40',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:ring-slate-800',
};

function formatDateTime(d) {
  if (!d) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDay(d) {
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function PetTimelineView({ petId, pet }) {
  const { data: events = [], isLoading } = usePetTimeline(petId, pet);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhum evento registrado ainda"
        description="A timeline é preenchida conforme o pet é gerenciado."
      />
    );
  }

  // Agrupa por dia
  const byDay = new Map();
  events.forEach((e) => {
    const day = formatDay(e.date);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  });

  return (
    <div className="relative" data-testid="pet-timeline-list">
      {/* Linha vertical do timeline */}
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />
      <div className="space-y-6">
        {Array.from(byDay.entries()).map(([day, dayEvents]) => (
          <div key={day}>
            <div className="relative mb-3 flex items-center gap-3 pl-12">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{day}</h3>
            </div>
            <ul className="space-y-2">
              {dayEvents.map((e) => {
                const Icon = ICON_MAP[e.icon] || Circle;
                const color = COLOR_CLASSES[e.color] || COLOR_CLASSES.primary;
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative flex items-start gap-3 pl-0"
                  >
                    <span
                      className={cn(
                        'z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4',
                        color,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="flex-1 rounded-2xl border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">{e.title}</p>
                        <span className="shrink-0 text-[10.5px] text-muted-foreground">
                          {e.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {e.description && (
                        <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{e.description}</p>
                      )}
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        por <span className="font-semibold text-foreground">{e.actor}</span>
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
