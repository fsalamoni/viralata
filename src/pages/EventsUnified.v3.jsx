/**
 * @fileoverview EventsUnified V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-EVENTS: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradiente violet→fuchsia→rose
 *  - 3 stat cards (Total, Hoje, Próximos 7 dias)
 *  - Filtros: tipo (Todos/Vitrines/Comunidades) + quando (Próximos/Hoje/Todos) + cidade + estado/UF
 *  - Cidades populares (chips clicáveis)
 *  - 6 sub-componentes: StatCard, EventCard, EventsSkeleton, TypeChip, DateChip, Hero, Filters, FeaturedEvent
 *  - Empty states diferenciados
 *  - Error state com retry
 *  - Loading com skeleton
 *  - SEO + JSON-LD (Event schema)
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first (1/2/3 colunas)
 *  - A11y WCAG AA
 *
 * Rota: /eventos
 *
 * @see docs/REGENCY_EVENTS_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Building2, Users, Filter, Sparkles, ArrowRight,
  Clock, Heart, Search, X, AlertCircle, RefreshCw, ChevronRight,
  CalendarDays, PartyPopper, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import Seo from '@/components/Seo';
import { cn } from '@/core/lib/utils';
import { logger } from '@/core/lib/logger';
import { listPublicExhibitions } from '@/modules/shelter/services/exhibitionPublicService';
import { listPublicMuralPosts } from '@/modules/communities/services/publicMuralService';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_META = {
  exhibition: { label: 'Vitrine', icon: Heart, color: 'emerald' },
  community_event: { label: 'Comunidade', icon: PartyPopper, color: 'violet' },
};

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos', icon: Sparkles },
  { value: 'exhibition', label: 'Vitrines', icon: Heart },
  { value: 'community_event', label: 'Comunidades', icon: PartyPopper },
];

const DATE_FILTERS = [
  { value: 'upcoming', label: 'Próximos', icon: Clock },
  { value: 'today', label: 'Hoje', icon: CalendarDays },
  { value: 'all', label: 'Todos', icon: Calendar },
];

const POPULAR_CITIES = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba',
  'Porto Alegre', 'Salvador', 'Brasília', 'Florianópolis',
];

const POPULAR_STATES = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'DF', 'SC'];

// ============================================================================
// UTILS
// ============================================================================

function getDateForItem(item, type) {
  if (type === 'exhibition') return item.datetime_start;
  return item.event_date;
}

function toDate(iso) {
  if (!iso) return null;
  if (typeof iso === 'string') return new Date(iso);
  if (iso?.toDate) return iso.toDate();
  return null;
}

function formatDate(iso) {
  const d = toDate(iso);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  const d = toDate(iso);
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLong(iso) {
  const d = toDate(iso);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function isFuture(iso) {
  const d = toDate(iso);
  return d && d >= new Date();
}

function isToday(iso) {
  const d = toDate(iso);
  if (!d) return false;
  return d.toDateString() === new Date().toDateString();
}

function daysFromNow(iso) {
  const d = toDate(iso);
  if (!d) return Infinity;
  const ms = d.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, accent }) {
  const colorMap = {
    primary: 'text-primary',
    emerald: 'text-emerald-600',
    violet: 'text-violet-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  };
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn('mt-1 text-2xl font-extrabold sm:text-3xl', colorMap[accent])}>
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10',
            accent === 'primary' && 'bg-primary/10',
            accent === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
            accent === 'violet' && 'bg-violet-100 dark:bg-violet-900/30',
            accent === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
            accent === 'rose' && 'bg-rose-100 dark:bg-rose-900/30',
          )}
        >
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', colorMap[accent])} aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

function TypeChip({ value, label, icon: Icon, count, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      {count > 0 && (
        <span
          className={cn(
            'rounded-full px-1.5 text-[10px]',
            active ? 'bg-white/20' : 'bg-muted',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EventCard({ item, type, reduce }) {
  const meta = TYPE_META[type] || TYPE_META.exhibition;
  const Icon = meta.icon;
  const startKey = getDateForItem(item, type);
  const title = item.title || item.name || 'Evento';
  const link = type === 'exhibition'
    ? `/vitrines/${item.id}`
    : `/comunidades/${item.community_id}/eventos/${item.id}`;
  const days = daysFromNow(startKey);
  const today = isToday(startKey);

  return (
    <motion.div variants={ANIM} className="group">
      <Link
        to={link}
        className="block h-full"
        data-testid={`event-${type}-${item.id}`}
      >
        <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-md">
          {/* Header gradiente baseado no tipo */}
          <div
            className={cn(
              'flex h-2 w-full',
              meta.color === 'emerald' && 'bg-gradient-to-r from-emerald-400 to-teal-500',
              meta.color === 'violet' && 'bg-gradient-to-r from-violet-400 to-fuchsia-500',
            )}
            aria-hidden="true"
          />

          <div className="flex flex-1 flex-col p-4">
            {/* Badges */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  'gap-1 text-[10.5px] font-medium',
                  meta.color === 'emerald' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                  meta.color === 'violet' && 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
                )}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {meta.label}
              </Badge>
              {today && (
                <Badge className="bg-amber-100 text-[10.5px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  <Sparkles className="mr-0.5 h-3 w-3" aria-hidden="true" />
                  Hoje
                </Badge>
              )}
              {days >= 0 && days <= 7 && !today && (
                <Badge variant="outline" className="text-[10px]">
                  Em {days === 1 ? '1 dia' : `${days} dias`}
                </Badge>
              )}
            </div>

            {/* Título */}
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
              {title}
            </h3>

            {/* Description (opcional) */}
            {item.description && (
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            )}

            {/* Spacer para empurrar o footer para baixo */}
            <div className="flex-1" />

            {/* Footer com metadados */}
            <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{formatDate(startKey)}</span>
                {formatTime(startKey) && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span>{formatTime(startKey)}</span>
                  </>
                )}
              </div>
              {item.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.city}{item.state ? ` / ${item.state}` : ''}</span>
                </div>
              )}
              {(item.shelter_name || item.community_name) && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.shelter_name || item.community_name}</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-3 flex items-center justify-end text-[10.5px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Ver detalhes
              <ArrowRight className="ml-0.5 h-3 w-3" aria-hidden="true" />
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

function FeaturedEvent({ item, type }) {
  const meta = TYPE_META[type] || TYPE_META.exhibition;
  const Icon = meta.icon;
  const startKey = getDateForItem(item, type);
  const title = item.title || item.name || 'Evento em destaque';
  const link = type === 'exhibition'
    ? `/vitrines/${item.id}`
    : `/comunidades/${item.community_id}/eventos/${item.id}`;

  return (
    <Link
      to={link}
      className="group block overflow-hidden rounded-3xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.4fr_1fr]">
        {/* Coluna 1: Imagem (placeholder gradient) */}
        <div className="relative h-44 overflow-hidden lg:h-auto">
          <div
            className={cn(
              'absolute inset-0',
              meta.color === 'emerald' && 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
              meta.color === 'violet' && 'bg-gradient-to-br from-violet-400 via-fuchsia-500 to-rose-500',
            )}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_60%)]" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2 p-6 text-white">
            <Icon className="h-10 w-10" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-90">
              {meta.label} em destaque
            </p>
            <p className="text-center text-2xl font-extrabold">
              {formatDateLong(startKey)}
            </p>
            {formatTime(startKey) && (
              <p className="text-sm opacity-90">às {formatTime(startKey)}</p>
            )}
          </div>
        </div>

        {/* Coluna 2: Info */}
        <div className="flex flex-col justify-between p-6">
          <div>
            <Badge variant="secondary" className="mb-2 gap-1 text-[10.5px]">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Destaque da semana
            </Badge>
            <h3 className="line-clamp-2 text-xl font-extrabold text-foreground transition-colors group-hover:text-primary sm:text-2xl">
              {title}
            </h3>
            {item.description && (
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {item.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {item.city}{item.state ? ` / ${item.state}` : ''}
              </div>
            )}
            {(item.shelter_name || item.community_name) && (
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {item.shelter_name || item.community_name}
              </div>
            )}
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Ver detalhes
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function EventsUnifiedV3() {
  const reduce = useReducedMotion();

  // Data
  const [exhibitions, setExhibitions] = useState([]);
  const [communityEvents, setCommunityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Load
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [exhs, comms] = await Promise.all([
        listPublicExhibitions({ max: 200 }),
        listPublicMuralPosts({ max: 200 }).catch(() => []),
      ]);
      setExhibitions(exhs || []);
      // Filtrar posts: só os que têm event_date ou type='event'
      const events = (comms || []).filter((p) => p.type === 'event' || p.event_date);
      setCommunityEvents(events);
    } catch (err) {
      logger.warn('EventsV3.load', { err: String(err) });
      setError(err.message || 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Combinar todos
  const allItems = useMemo(() => {
    const ex = (exhibitions || []).map((e) => ({ ...e, _type: 'exhibition' }));
    const ce = (communityEvents || []).map((p) => ({ ...p, _type: 'community_event' }));
    return [...ex, ...ce];
  }, [exhibitions, communityEvents]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayItems = allItems.filter((i) => isToday(getDateForItem(i, i._type)));
    const upcomingItems = allItems.filter((i) => {
      const d = toDate(getDateForItem(i, i._type));
      return d && d >= now;
    });
    const weekItems = upcomingItems.filter((i) => {
      const days = daysFromNow(getDateForItem(i, i._type));
      return days >= 0 && days <= 7;
    });
    return {
      total: allItems.length,
      today: todayItems.length,
      upcoming: upcomingItems.length,
      week: weekItems.length,
    };
  }, [allItems]);

  // Contagem por tipo
  const typeCount = useMemo(() => {
    const counts = { all: allItems.length, exhibition: 0, community_event: 0 };
    allItems.forEach((i) => {
      counts[i._type] = (counts[i._type] || 0) + 1;
    });
    return counts;
  }, [allItems]);

  // Featured (próximo evento futuro)
  const featured = useMemo(() => {
    const upcoming = allItems
      .filter((i) => isFuture(getDateForItem(i, i._type)))
      .sort((a, b) => {
        const da = toDate(getDateForItem(a, a._type)) || 0;
        const db = toDate(getDateForItem(b, b._type)) || 0;
        return da - db;
      });
    return upcoming[0] || null;
  }, [allItems]);

  // Filtros aplicados
  const filtered = useMemo(() => {
    return allItems
      .filter((item) => {
        if (typeFilter !== 'all' && item._type !== typeFilter) return false;
        const date = getDateForItem(item, item._type);
        if (dateFilter === 'upcoming' && !isFuture(date)) return false;
        if (dateFilter === 'today' && !isToday(date)) return false;
        if (cityFilter && !(item.city || '').toLowerCase().includes(cityFilter.toLowerCase())) return false;
        if (stateFilter && item.state !== stateFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const da = toDate(getDateForItem(a, a._type)) || 0;
        const db = toDate(getDateForItem(b, b._type)) || 0;
        return da - db;
      });
  }, [allItems, typeFilter, dateFilter, cityFilter, stateFilter]);

  // Cidades/estados disponíveis (para popular chips)
  const availableCities = useMemo(() => {
    const set = new Set();
    allItems.forEach((i) => i.city && set.add(i.city));
    return Array.from(set).slice(0, 12);
  }, [allItems]);

  const availableStates = useMemo(() => {
    const set = new Set();
    allItems.forEach((i) => i.state && set.add(i.state));
    return Array.from(set);
  }, [allItems]);

  // JSON-LD para SEO (ItemList de Events)
  const jsonLd = useMemo(() => {
    if (!filtered.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: filtered.slice(0, 10).map((item, idx) => {
        const date = toDate(getDateForItem(item, item._type));
        return {
          '@type': 'ListItem',
          position: idx + 1,
          item: {
            '@type': 'Event',
            name: item.title || item.name,
            description: item.description,
            startDate: date ? date.toISOString() : undefined,
            location: item.city ? {
              '@type': 'Place',
              name: item.city,
              address: item.state ? `${item.city} / ${item.state}` : item.city,
            } : undefined,
            organizer: {
              '@type': 'Organization',
              name: item.shelter_name || item.community_name || 'Viralata',
            },
          },
        };
      }),
    };
  }, [filtered]);

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="events-page">
      <Seo
        title="Eventos da comunidade — Viralata"
        description="Vitrines de abrigos e eventos de comunidades em um só lugar. Encontre feiras de adoção, mutirões de castração e eventos pet friendly."
      />
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-600 to-rose-600 p-6 text-white shadow-lg sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                <CalendarDays className="mr-1 h-3 w-3" aria-hidden="true" />
                Agenda colaborativa
              </Badge>
            </motion.div>
            <motion.h1
              variants={ANIM}
              className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            >
              Eventos da comunidade
            </motion.h1>
            <motion.p
              variants={ANIM}
              className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg"
            >
              Vitrines de abrigos e eventos de comunidades em um só lugar.
              Encontre feiras de adoção, mutirões de castração, eventos
              pet friendly e ações perto de você.
            </motion.p>
            <motion.div variants={ANIM} className="mt-5 flex flex-wrap items-center gap-2">
              <Button asChild size="lg" className="border-0 bg-white text-violet-700 hover:bg-white/90">
                <Link to="/comunidade">
                  <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Ver comunidades
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15">
                <Link to="/organizacoes">
                  <Building2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Ver abrigos
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            variants={ANIM}
            className="hidden lg:flex lg:flex-col lg:gap-2"
          >
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <Calendar className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none">{stats.upcoming}</p>
                  <p className="text-xs text-white/80">eventos futuros</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <p className="text-lg font-extrabold leading-none">{stats.today}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/80">hoje</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <p className="text-lg font-extrabold leading-none">{stats.week}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/80">próx 7 dias</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* STATS mobile */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-3 gap-3 lg:hidden"
      >
        <StatCard icon={Calendar} value={stats.upcoming} label="Futuros" accent="primary" />
        <StatCard icon={Sparkles} value={stats.today} label="Hoje" accent="amber" />
        <StatCard icon={Clock} value={stats.week} label="7 dias" accent="rose" />
      </motion.section>

      {/* FEATURED EVENT */}
      {featured && !loading && !error && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
        >
          <FeaturedEvent item={featured} type={featured._type} />
        </motion.section>
      )}

      {/* FILTROS */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Filtros
          </h2>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tipo */}
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold text-muted-foreground">Tipo</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map((f) => (
                <TypeChip
                  key={f.value}
                  value={f.value}
                  label={f.label}
                  icon={f.icon}
                  count={typeCount[f.value] || 0}
                  active={typeFilter === f.value}
                  onClick={() => setTypeFilter(f.value)}
                  color={f.value === 'exhibition' ? 'emerald' : 'violet'}
                />
              ))}
            </div>
          </div>

          {/* Quando */}
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold text-muted-foreground">Quando</p>
            <div className="flex flex-wrap gap-1.5">
              {DATE_FILTERS.map((f) => (
                <TypeChip
                  key={f.value}
                  value={f.value}
                  label={f.label}
                  icon={f.icon}
                  active={dateFilter === f.value}
                  onClick={() => setDateFilter(f.value)}
                />
              ))}
            </div>
          </div>

          {/* Cidade */}
          <div>
            <label htmlFor="city-filter" className="mb-1.5 block text-[10.5px] font-semibold text-muted-foreground">
              Cidade
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                id="city-filter"
                placeholder="Ex: São Paulo"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="h-9 pl-9 pr-9 text-sm"
                data-testid="city-filter"
              />
              {cityFilter && (
                <button
                  type="button"
                  onClick={() => setCityFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar cidade"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Estado */}
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold text-muted-foreground">UF</p>
            <div className="flex flex-wrap gap-1.5">
              {availableStates.length > 0 ? availableStates.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStateFilter(stateFilter === s ? '' : s)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[10.5px] font-medium transition-colors',
                    stateFilter === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                  )}
                >
                  {s}
                </button>
              )) : POPULAR_STATES.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="inline-flex h-7 items-center rounded-full border border-dashed border-border bg-muted/30 px-2.5 text-[10.5px] font-medium text-muted-foreground/60"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Cidades populares */}
        {!cityFilter && availableCities.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Cidades:
            </span>
            {availableCities.slice(0, 8).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCityFilter(c)}
                className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Contador */}
        {!loading && !error && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground" role="status" aria-live="polite">
            <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
            {typeFilter !== 'all' && ` (${TYPE_META[typeFilter]?.label.toLowerCase()})`}
            {dateFilter === 'upcoming' && ' • futuros'}
            {dateFilter === 'today' && ' • hoje'}
            {cityFilter && ` • em ${cityFilter}`}
            {stateFilter && ` • ${stateFilter}`}
          </p>
        )}
      </motion.section>

      {/* LOADING */}
      {loading && <EventsSkeleton count={6} />}

      {/* ERROR */}
      {!loading && error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            Não foi possível carregar os eventos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error}. Verifique sua conexão e tente novamente.
          </p>
          <Button onClick={load} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tentar de novo
          </Button>
        </div>
      )}

      {/* NO RESULTS */}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Nenhum evento encontrado"
          description={
            typeFilter !== 'all' || dateFilter !== 'upcoming' || cityFilter || stateFilter
              ? 'Tente ajustar os filtros para ver mais resultados.'
              : 'Ainda não temos eventos cadastrados. Volte mais tarde!'
          }
          action={
            (typeFilter !== 'all' || dateFilter !== 'upcoming' || cityFilter || stateFilter) && (
              <Button
                onClick={() => {
                  setTypeFilter('all');
                  setDateFilter('upcoming');
                  setCityFilter('');
                  setStateFilter('');
                }}
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Limpar filtros
              </Button>
            )
          }
        />
      )}

      {/* RESULTS */}
      {!loading && !error && filtered.length > 0 && (
        <motion.section
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((item) => (
            <EventCard
              key={`${item._type}-${item.id}`}
              item={item}
              type={item._type}
              reduce={reduce}
            />
          ))}
        </motion.section>
      )}

      {/* CTA FINAL */}
      {!loading && !error && filtered.length > 0 && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 p-6 text-center sm:p-10 dark:from-violet-950/20 dark:via-fuchsia-950/10 dark:to-rose-950/20"
        >
          <PartyPopper className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
            Organize um evento na sua cidade
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/80">
            Você é de um abrigo ou comunidade? Crie eventos para divulgar
            feiras de adoção, mutirões de castração, eventos pet friendly
            e ações de arrecadação.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="lg">
              <Link to="/comunidade">
                <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ver comunidades
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/organizacoes">
                <Building2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ver abrigos
              </Link>
            </Button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
