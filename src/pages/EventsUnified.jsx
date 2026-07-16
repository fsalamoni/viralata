/**
 * @fileoverview EventsUnified — feed unificado de eventos
 * (TASK-181).
 *
 * Combina:
 *  - Eventos de comunidades (community_events)
 *  - Vitrines de abrigos (exhibitions_public)
 *
 * Filtros:
 *  - Cidade
 *  - Data (futuro, hoje, passado)
 *  - Tipo (comunidade, vitrine)
 *
 * Cards padronizados com badge de tipo.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, MapPin, Building2, Users, Filter, Sparkles, ArrowRight,
  Clock, Heart, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import PageHero from '@/components/PageHero';
import { listPublicExhibitions } from '@/modules/shelter/services/exhibitionPublicService';
import { listPublicMuralPosts } from '@/modules/communities/services/publicMuralService';
import { cn } from '@/core/lib/utils';
import { logger } from '@/core/lib/logger';

const TYPE_LABELS = {
  exhibition: { label: 'Vitrine', icon: Heart, color: 'emerald' },
  community_event: { label: 'Comunidade', icon: Users, color: 'blue' },
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isFuture(iso) {
  if (!iso) return false;
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  return d && d >= new Date();
}

function isToday(iso) {
  if (!iso) return false;
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  if (!d) return false;
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function UnifiedCard({ item, type }) {
  const meta = TYPE_LABELS[type] || TYPE_LABELS.exhibition;
  const Icon = meta.icon;
  const startKey = type === 'exhibition' ? item.datetime_start : item.event_date;
  const title = item.title || item.name || 'Evento';
  const link = type === 'exhibition'
    ? `/vitrines/${item.id}`
    : `/comunidades/${item.community_id}/eventos/${item.id}`;

  return (
    <Link
      to={link}
      className="block group"
      data-testid={`unified-event-${type}-${item.id}`}
    >
      <section className="arena-section-card h-full hover:shadow-md transition-shadow hover:border-primary/40">
        <div className="arena-section-card-body p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Badge
              className={cn(
                'text-[10px] gap-1',
                meta.color === 'emerald' && 'bg-emerald-100 text-emerald-800 border-emerald-200',
                meta.color === 'blue' && 'bg-blue-100 text-blue-800 border-blue-200',
              )}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </Badge>
            {isToday(startKey) && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                Hoje
              </Badge>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(startKey)}</span>
            {formatTime(startKey) && (
              <span className="text-muted-foreground/70">· {formatTime(startKey)}</span>
            )}
          </div>
          {item.city && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{item.city}</span>
            </div>
          )}
          {(item.shelter_name || item.community_name) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{item.shelter_name || item.community_name}</span>
            </div>
          )}
        </div>
      </section>
    </Link>
  );
}

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'exhibition', label: 'Vitrines' },
  { value: 'community_event', label: 'Comunidades' },
];

const DATE_FILTERS = [
  { value: 'upcoming', label: 'Próximos' },
  { value: 'today', label: 'Hoje' },
  { value: 'all', label: 'Todos' },
];

export default function EventsUnified() {
  const [exhibitions, setExhibitions] = useState([]);
  const [communityEvents, setCommunityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [exhs, comms] = await Promise.all([
          listPublicExhibitions({ max: 100 }),
          listPublicMuralPosts({ max: 100 }).catch(() => []),
        ]);
        if (cancelled) return;
        setExhibitions(exhs || []);
        setCommunityEvents(comms || []);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('EventsUnified', { err: String(err) });
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allItems = useMemo(() => {
    const ex = (exhibitions || []).map((e) => ({ ...e, _type: 'exhibition' }));
    const ce = (communityEvents || [])
      .filter((p) => p.type === 'event' || p.event_date)
      .map((p) => ({ ...p, _type: 'community_event' }));
    return [...ex, ...ce];
  }, [exhibitions, communityEvents]);

  const filtered = useMemo(() => {
    return allItems
      .filter((item) => {
        if (typeFilter !== 'all' && item._type !== typeFilter) return false;
        if (dateFilter === 'upcoming' && !isFuture(item.datetime_start || item.event_date)) return false;
        if (dateFilter === 'today' && !isToday(item.datetime_start || item.event_date)) return false;
        if (cityFilter && !((item.city || '').toLowerCase().includes(cityFilter.toLowerCase()))) return false;
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.datetime_start || a.event_date || 0);
        const db_ = new Date(b.datetime_start || b.event_date || 0);
        return da - db_;
      });
  }, [allItems, typeFilter, dateFilter, cityFilter]);

  return (
    <main className="container py-8 max-w-6xl" data-testid="events-unified-page">
      <PageHero
        icon={Sparkles}
        title="Eventos da comunidade"
        subtitle="Vitrines de abrigos e eventos de comunidades em um só lugar."
      />

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tipo */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <div className="flex flex-wrap gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  'text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                  typeFilter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Quando</label>
          <div className="flex flex-wrap gap-1">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setDateFilter(f.value)}
                className={cn(
                  'text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                  dateFilter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cidade */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Cidade</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Ex: São Paulo"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="city-filter"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhum evento encontrado"
          description="Ajuste os filtros ou volte mais tarde para conferir."
          className="mt-8"
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'evento' : 'eventos'} encontrados
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item) => (
              <UnifiedCard key={`${item._type}-${item.id}`} item={item} type={item._type} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
