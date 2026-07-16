/**
 * @fileoverview PublicPetTimeline — timeline pública do pet (TASK-135).
 *
 * Read-only. Mostra os eventos relevantes para o público:
 * - Resgate, primeiro cuidado, vacinação, castração
 * - Transição para adoção
 * - NÃO mostra: medical_records completas, clinical_notes, localização exata
 *
 * Critérios de visibilidade pública (cada evento respeita isPublic):
 * - rescue: sempre público
 * - medical_care: público (genérico), privado (detalhes)
 * - adoption: público
 * - transfer: público
 * - other: depende de isPublic flag
 */
import { useState, useEffect } from 'react';
import {
  Clock, Heart, Stethoscope, Home, ArrowRight, PawPrint,
  Calendar, MapPin, AlertCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { listTimelineEvents } from '@/modules/shelter/services/timelineService';

const TYPE_ICONS = {
  rescue: Heart,
  medical_care: Stethoscope,
  adoption: Home,
  transfer: ArrowRight,
  other: PawPrint,
};

const TYPE_LABELS = {
  rescue: 'Resgate',
  medical_care: 'Cuidado médico',
  adoption: 'Adoção',
  transfer: 'Transferência',
  other: 'Outro',
};

const TYPE_TONES = {
  rescue: 'bg-rose-100 text-rose-800 border-rose-200',
  medical_care: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  adoption: 'bg-amber-100 text-amber-800 border-amber-200',
  transfer: 'bg-blue-100 text-blue-800 border-blue-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isPublicVisible(event) {
  // Eventos com isPublic explicit = false são privados
  if (event.isPublic === false) return false;
  // Por default, todos os tipos são públicos (exceto medical_care com detalhes)
  if (event.type === 'medical_care' && event.data?.clinical_notes) return false;
  return true;
}

function summarizeEvent(event) {
  const data = event.data || {};
  switch (event.type) {
    case 'rescue':
      return data.location || data.circumstances || null;
    case 'medical_care':
      return data.summary || data.treatment_type || null;
    case 'adoption':
      return data.adopter_name ? `Adotado por ${data.adopter_name}` : 'Adotado';
    case 'transfer':
      return data.destination_name || data.reason || null;
    default:
      return data.notes || data.description || null;
  }
}

export function PublicPetTimeline({ petId, shelterClubId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!petId || !shelterClubId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listTimelineEvents(petId, shelterClubId, { maxResults: 50 })
      .then((data) => {
        if (cancelled) return;
        setEvents(data.filter(isPublicVisible));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [petId, shelterClubId]);

  if (!petId || !shelterClubId) return null;

  if (loading) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            História do pet
          </h3>
        </div>
        <div className="arena-section-card-body space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            História do pet
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={AlertCircle}
            title="Não foi possível carregar a história"
            description="Tente recarregar a página."
          />
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            História do pet
          </h3>
        </div>
        <div className="arena-section-card-body">
          <EmptyState
            icon={Clock}
            title="História em construção"
            description="A história deste pet será atualizada em breve."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          História do pet
        </h3>
      </div>
      <div className="arena-section-card-body">
        <ol
          className="relative border-l-2 border-border ml-2 space-y-4"
          aria-label="Eventos da história do pet"
        >
          {events.map((event) => {
            const Icon = TYPE_ICONS[event.type] || PawPrint;
            const tone = TYPE_TONES[event.type] || TYPE_TONES.other;
            const summary = summarizeEvent(event);
            return (
              <li key={event.id} className="ml-6 relative">
                <span
                  className={`absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${tone}`}
                  aria-hidden="true"
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <Badge className={tone}>
                    {TYPE_LABELS[event.type] || event.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.event_date)}
                  </span>
                </div>
                {summary && (
                  <p className="text-sm mt-1.5 text-foreground">{summary}</p>
                )}
                {event.recorded_by_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Registrado por {event.recorded_by_name}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default PublicPetTimeline;
