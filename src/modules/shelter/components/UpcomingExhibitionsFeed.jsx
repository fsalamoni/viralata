/**
 * @fileoverview UpcomingExhibitionsFeed — bloco "Próximas vitrines"
 * reutilizável em Home.jsx e no perfil público do abrigo
 * (TASK-149).
 *
 * Lista vitrines futuras/próximas com:
 * - Data, local, abrigo
 * - Contagem de animais
 * - Link para /vitrines/{id}
 *
 * Configurável:
 * - shelterClubId (opcional): filtra por abrigo
 * - limit (default 6)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, MapPin, Building2, ArrowRight, Sparkles, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { listPublicExhibitions } from '@/modules/shelter/services/exhibitionPublicService';
import { logger } from '@/core/lib/logger';

function formatDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDaysFromNow(iso) {
  if (!iso) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  if (!d) return null;
  const ms = d - new Date();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function ExhibitionMiniCard({ ex }) {
  const days = getDaysFromNow(ex.start_at);
  const isSoon = days !== null && days <= 7 && days >= 0;
  return (
    <Link
      to={`/vitrines/${ex.id}`}
      className="block group"
      data-testid={`upcoming-exhibition-${ex.id}`}
    >
      <Card className="h-full hover:shadow-md transition-shadow hover:border-primary/40">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">{formatDate(ex.start_at)}</span>
              {formatTime(ex.start_at) && (
                <span className="text-muted-foreground/70">· {formatTime(ex.start_at)}</span>
              )}
            </div>
            {isSoon && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                Em {days === 0 ? 'hoje' : days === 1 ? '1 dia' : `${days} dias`}
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {ex.title || 'Vitrine'}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{ex.shelter_name || ex.shelter_club_id || 'Abrigo'}</span>
          </div>
          {ex.city && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{ex.city}</span>
            </div>
          )}
          {ex.animals_count > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
              <Sparkles className="h-3 w-3" />
              <span>{ex.animals_count} {ex.animals_count === 1 ? 'animal' : 'animais'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function UpcomingExhibitionsFeed({ shelterClubId, limit = 6, title = 'Próximas vitrines' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const opts = {
          status: 'scheduled',
          limit: limit + 4, // pega mais e filtra client-side
          shelterClubId,
        };
        const all = await listPublicExhibitions(opts);
        if (cancelled) return;
        // Filtra apenas futuras
        const now = new Date();
        const upcoming = (all || [])
          .filter((ex) => {
            const start = typeof ex.start_at === 'string' ? new Date(ex.start_at) : ex.start_at?.toDate?.();
            return start && start >= now;
          })
          .slice(0, limit);
        setItems(upcoming);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('UpcomingExhibitionsFeed', { err: String(err) });
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [shelterClubId, limit]);

  if (loading) {
    return (
      <section className="space-y-3" data-testid="upcoming-exhibitions-feed">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return null; // não exibe erro em componente público
  }

  if (items.length === 0) {
    return (
      <section className="space-y-3" data-testid="upcoming-exhibitions-feed">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <EmptyState
          icon={Calendar}
          title="Nenhuma vitrine agendada"
          description="Quando os abrigos abrirem eventos de adoção, eles aparecerão aqui."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3" data-testid="upcoming-exhibitions-feed">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/vitrines">
            Ver todas <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((ex) => (
          <ExhibitionMiniCard key={ex.id} ex={ex} />
        ))}
      </div>
    </section>
  );
}

export default UpcomingExhibitionsFeed;
