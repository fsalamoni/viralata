/**
 * @fileoverview PetTimeline — histórico de eventos do pet (V3).
 *
 * TASK-V3-PET-DETAIL-11: renderiza eventos importantes do pet.
 * Baseado em `pet.events: [{type, date, description}]` no Firestore.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Timeline"
 */
import { Calendar, Syringe, Scissors, Home, CheckCircle2, Heart } from 'lucide-react';
import { cn } from '@/core/lib/utils';

const ICON_MAP = {
  registered: Calendar,
  rescued: Home,
  vaccinated: Syringe,
  dewormed: Syringe,
  neutered: Scissors,
  health_check: CheckCircle2,
  status_change: Heart,
};

const LABEL_MAP = {
  registered: 'Cadastrado na plataforma',
  rescued: 'Resgatado',
  vaccinated: 'Vacinação',
  dewormed: 'Vermifugação',
  neutered: 'Castração',
  health_check: 'Check-up de saúde',
  status_change: 'Mudança de status',
};

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = iso.toDate ? iso.toDate() : new Date(iso);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return '';
  }
}

export function PetTimeline({ events = [], className }) {
  if (!Array.isArray(events) || events.length === 0) return null;

  const sorted = [...events].sort((a, b) => {
    const ad = a.date?.toMillis ? a.date.toMillis() : new Date(a.date || 0).getTime();
    const bd = b.date?.toMillis ? b.date.toMillis() : new Date(b.date || 0).getTime();
    return bd - ad; // mais recente primeiro
  });

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="pet-timeline-title">
      <h2 id="pet-timeline-title" className="text-[15px] font-bold text-foreground">
        Histórico do pet
      </h2>
      <ol
        className="relative space-y-3 border-l-2 border-border pl-5"
        role="list"
        data-testid="pet-timeline"
      >
        {sorted.map((ev, i) => {
          const Icon = ICON_MAP[ev.type] || Calendar;
          const label = ev.label || LABEL_MAP[ev.type] || ev.type;
          return (
            <li key={i} role="listitem" className="relative">
              <div className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-secondary text-secondary-foreground">
                <Icon className="h-3 w-3" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-foreground">{label}</span>
                {ev.description && (
                  <span className="text-[12px] text-muted-foreground">{ev.description}</span>
                )}
                {ev.date && (
                  <span className="text-[11px] text-muted-foreground/80">
                    {formatDate(ev.date)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
