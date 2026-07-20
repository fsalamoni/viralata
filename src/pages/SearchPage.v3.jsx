/**
 * @fileoverview SearchPage V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-SEARCH: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradiente sky→indigo→violet
 *  - 3 stat cards (entidades pesquisáveis: Animais, Abrigos, Adotantes, Voluntários)
 *  - Tabs de entity (Todos/Animais/Abrigos/Adotantes/Voluntários)
 *  - Smart search bar (reutiliza SmartSearchBar)
 *  - Sugestões de buscas populares (chips)
 *  - ResultCard enriquecido com foto, badges, ações
 *  - Empty states diferenciados
 *  - Error state com retry
 *  - Loading com skeleton
 *  - SEO + JSON-LD (SearchAction)
 *
 * Rota: /busca
 *
 * @see docs/REGENCY_SEARCH_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Search, Building2, PawPrint, Users, Heart, Sparkles,
  Filter, X, ChevronRight, AlertCircle, RefreshCw,
  MapPin, ArrowUpRight, TrendingUp, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import Seo from '@/components/Seo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useSmartSearch, useCountResultsByEntity, useSearchableEntities } from '@/modules/shelter/hooks/useSmartSearch';
import { SmartSearchBar } from '@/modules/shelter/components/SmartSearchBar';
import { cn } from '@/core/lib/utils';
import { useDebouncedQuery } from '@/modules/shelter/hooks/useSmartSearch';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const ENTITY_META = {
  pet: { label: 'Animais', icon: PawPrint, url: (r) => `/pet/${r.id}`, color: 'amber' },
  shelter: { label: 'Abrigos', icon: Building2, url: (r) => `/organizacoes/${r.id}`, color: 'sky' },
  adopter: { label: 'Adotantes', icon: Users, url: (r) => `/admin/adoption-applications/${r.id}`, color: 'rose' },
  volunteer: { label: 'Voluntários', icon: Heart, url: (r) => `/admin/volunteers/${r.id}`, color: 'emerald' },
};

const POPULAR_SEARCHES = [
  'Vira-lata',
  'Gato',
  'Filhote',
  'Idoso',
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Curitiba',
];

const ENTITY_STATS = [
  { id: 'pet', label: 'Animais cadastrados', icon: PawPrint, value: '5.000+' },
  { id: 'shelter', label: 'Abrigos parceiros', icon: Building2, value: '250+' },
  { id: 'adopter', label: 'Adotantes ativos', icon: Users, value: '1.200+' },
  { id: 'volunteer', label: 'Voluntários', icon: Heart, value: '800+' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function EntityStatCard({ icon: Icon, value, label, accent }) {
  const colorMap = {
    primary: 'text-primary',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
  };
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn('mt-1 text-2xl font-extrabold', colorMap[accent])}>
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            accent === 'primary' && 'bg-primary/10',
            accent === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
            accent === 'sky' && 'bg-sky-100 dark:bg-sky-900/30',
            accent === 'rose' && 'bg-rose-100 dark:bg-rose-900/30',
            accent === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
          )}
        >
          <Icon className={cn('h-4 w-4', colorMap[accent])} aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

function EntityTab({ id, label, icon: Icon, count, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50',
      )}
      aria-pressed={active}
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

function ResultCard({ result, reduce, onShelterClick }) {
  const meta = ENTITY_META[result.entity] || {};
  const Icon = meta.icon || Search;
  const to = meta.url ? meta.url(result) : '#';
  const color = meta.color || 'primary';

  const cardContent = (
    <article
      className="group rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
      data-testid={`result-${result.entity}-${result.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            color === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
            color === 'sky' && 'bg-sky-100 dark:bg-sky-900/30',
            color === 'rose' && 'bg-rose-100 dark:bg-rose-900/30',
            color === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
            !ENTITY_META[result.entity] && 'bg-primary/10',
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              color === 'amber' && 'text-amber-700 dark:text-amber-400',
              color === 'sky' && 'text-sky-700 dark:text-sky-400',
              color === 'rose' && 'text-rose-700 dark:text-rose-400',
              color === 'emerald' && 'text-emerald-700 dark:text-emerald-400',
              !ENTITY_META[result.entity] && 'text-primary',
            )}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {result.title || result.id}
            </p>
            <Badge
              variant="secondary"
              className={cn(
                'shrink-0 text-[10px]',
                color === 'amber' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                color === 'sky' && 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
                color === 'rose' && 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
                color === 'emerald' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                !ENTITY_META[result.entity] && 'bg-primary/10 text-primary',
              )}
            >
              {meta.label || result.entity}
            </Badge>
          </div>
          {result.snippet && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {result.snippet}
            </p>
          )}
          {result.metadata && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-muted-foreground">
              {result.metadata.city && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                  {result.metadata.city}
                </span>
              )}
              {result.metadata.species && (
                <span>• {result.metadata.species}</span>
              )}
              {result.metadata.breed && (
                <span>• {result.metadata.breed}</span>
              )}
              {result.metadata.status && (
                <Badge variant="outline" className="text-[9px]">
                  {result.metadata.status}
                </Badge>
              )}
            </div>
          )}
        </div>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
    </article>
  );

  // Para abrigos sem abrigo selecionado: o card é selecionável (não link direto)
  if (result.entity === 'shelter' && onShelterClick) {
    return (
      <button
        type="button"
        className="block w-full text-left"
        onClick={onShelterClick}
        aria-label={`Selecionar abrigo ${result.title || result.id}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link to={to} className="block">
      {cardContent}
    </Link>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function SearchPageV3() {
  const reduce = useReducedMotion();
  const location = useLocation();
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH);
  const initialQuery = location.state?.q || '';

  // State
  const [query, setQuery] = useState(initialQuery);
  const [selectedEntity, setSelectedEntity] = useState('all'); // 'all' | 'pet' | 'shelter' | 'adopter' | 'volunteer'
  const [selectedShelter, setSelectedShelter] = useState(null);

  // Debounce da query
  const { value: debouncedQuery } = useDebouncedQuery(query, 250);

  // Filters para o hook
  const filters = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return null;
    if (selectedShelter) {
      return { entity: 'pet', query: debouncedQuery.trim(), shelterId: selectedShelter.id };
    }
    if (selectedEntity !== 'all') {
      return { entity: selectedEntity, query: debouncedQuery.trim() };
    }
    return { query: debouncedQuery.trim() }; // global multi-entity
  }, [debouncedQuery, selectedEntity, selectedShelter]);

  // Hook
  const { data, isLoading, hasError, refetch } = useSmartSearch(filters || {}, {}, {});
  const results = filters ? (data?.results || []) : [];

  // Contagem por entity (para os chips de filtro mostrarem totais)
  const countFilters = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return null;
    return { query: debouncedQuery.trim() };
  }, [debouncedQuery]);
  const { data: countsData } = useCountResultsByEntity(countFilters || {}, {});
  const counts = countsData?.byEntity || {};

  // Entities
  const entities = useSearchableEntities();

  // Group results por entity
  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((r) => {
      if (!groups[r.entity]) groups[r.entity] = [];
      groups[r.entity].push(r);
    });
    return groups;
  }, [results]);

  // Filtra por entity selecionada (se não 'all')
  const filteredResults = useMemo(() => {
    if (selectedEntity === 'all') return results;
    return results.filter((r) => r.entity === selectedEntity);
  }, [results, selectedEntity]);

  // Handlers
  const handleShelterSelect = (shelter) => {
    setSelectedShelter({ id: shelter.id, title: shelter.title });
    setQuery('');
  };

  const handleEntityChange = (entityId) => {
    setSelectedEntity(entityId);
    if (entityId !== 'pet') {
      setSelectedShelter(null);
    }
  };

  const handlePopularClick = (term) => {
    setQuery(term);
  };

  const showInitialState = !filters || debouncedQuery.trim().length < 2;
  const showNoResults = !isLoading && !hasError && filters && filteredResults.length === 0;

  // JSON-LD: SearchAction schema
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://viralata.web.app/busca?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }), []);

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="search-page">
      <Seo
        title="Buscar — Viralata"
        description="Encontre abrigos, animais para adoção, adotantes e voluntários no Viralata. Busca inteligente em toda a plataforma."
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-600 p-6 text-white shadow-lg sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <motion.div variants={ANIM}>
              <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Busca inteligente
              </Badge>
            </motion.div>
            <motion.h1
              variants={ANIM}
              className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
            >
              Encontre o que procura
            </motion.h1>
            <motion.p
              variants={ANIM}
              className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg"
            >
              Busque em abrigos, animais para adoção, adotantes e
              voluntários — tudo num só lugar, com busca tolerante a
              acentos e partial match.
            </motion.p>
            <motion.div variants={ANIM} className="mt-5">
              <div className="rounded-xl border border-white/20 bg-white/95 p-1 shadow-lg">
                <SmartSearchBar
                  initialValue={query}
                  onSearch={setQuery}
                  onChange={setQuery}
                  placeholder="Buscar abrigos, animais, adotantes..."
                  autoFocus
                />
              </div>
            </motion.div>
            <motion.div variants={ANIM} className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/80">
                <TrendingUp className="mr-1 inline h-3 w-3" aria-hidden="true" />
                Em alta:
              </span>
              {POPULAR_SEARCHES.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handlePopularClick(s)}
                  className="rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-[10.5px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={ANIM}
            className="hidden lg:flex lg:flex-col lg:gap-2"
          >
            {ENTITY_STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold leading-none">{s.value}</p>
                      <p className="mt-0.5 text-[10.5px] text-white/80">{s.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* STATS MOBILE */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-2 gap-3 lg:hidden"
      >
        {ENTITY_STATS.map((s) => (
          <EntityStatCard
            key={s.id}
            icon={s.icon}
            value={s.value}
            label={s.label}
            accent={s.id === 'pet' ? 'amber' : s.id === 'shelter' ? 'sky' : s.id === 'adopter' ? 'rose' : 'emerald'}
          />
        ))}
      </motion.section>

      {/* FILTROS POR ENTITY */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" aria-hidden="true" />
            Filtrar por
          </h2>
          {selectedShelter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedShelter(null)}
              className="h-7 text-xs"
            >
              <X className="mr-1 h-3 w-3" aria-hidden="true" />
              Limpar abrigo: {selectedShelter.title}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <EntityTab
            id="all"
            label="Todos"
            icon={Sparkles}
            count={Object.values(counts).reduce((a, b) => a + b, 0)}
            active={selectedEntity === 'all'}
            onClick={() => handleEntityChange('all')}
            color="primary"
          />
          {entities.map((e) => {
            const meta = ENTITY_META[e.id];
            if (!meta) return null;
            return (
              <EntityTab
                key={e.id}
                id={e.id}
                label={meta.label}
                icon={meta.icon}
                count={counts[e.id] || 0}
                active={selectedEntity === e.id}
                onClick={() => handleEntityChange(e.id)}
                color={meta.color}
              />
            );
          })}
        </div>
      </motion.section>

      {/* CONTEXTO SELECIONADO */}
      {selectedShelter && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Buscando animais em {selectedShelter.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Os resultados são restritos aos animais deste abrigo.
            </p>
          </div>
        </motion.section>
      )}

      {/* ESTADO INICIAL (sem query) */}
      {showInitialState && (
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Search className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-foreground">
              Comece a digitar para buscar
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Use pelo menos 2 caracteres. A busca é tolerante a acentos
              e aceita partes de palavras.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
              {POPULAR_SEARCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handlePopularClick(s)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                >
                  <Hash className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button asChild variant="outline">
                <Link to="/feed">
                  <PawPrint className="mr-2 h-4 w-4" aria-hidden="true" />
                  Ver todos os pets
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/organizacoes">
                  <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Ver todos os abrigos
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* LOADING */}
      {!showInitialState && isLoading && <SearchSkeleton />}

      {/* ERROR */}
      {!showInitialState && hasError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            A busca falhou
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Não conseguimos consultar o servidor. Verifique sua conexão e tente novamente.
          </p>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tentar de novo
          </Button>
        </div>
      )}

      {/* NO RESULTS */}
      {showNoResults && (
        <EmptyState
          icon={Search}
          title="Nenhum resultado encontrado"
          description={`Não encontramos nada para "${debouncedQuery}". Tente outro termo ou selecione outra categoria.`}
          action={
            <Button asChild variant="outline">
              <Link to="/organizacoes">
                <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Ver abrigos
              </Link>
            </Button>
          }
        />
      )}

      {/* RESULTS */}
      {!showInitialState && !isLoading && !hasError && filteredResults.length > 0 && (
        <motion.section
          initial="hidden"
          animate="show"
          variants={reduce ? undefined : stagger}
          className="space-y-6"
        >
          {/* Resumo */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{filteredResults.length}</span>{' '}
              resultado{filteredResults.length !== 1 ? 's' : ''} para{' '}
              <span className="font-semibold text-foreground">"{debouncedQuery}"</span>
            </p>
            {selectedEntity === 'all' && (
              <p>
                {Object.keys(grouped).length} categoria{Object.keys(grouped).length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Lista agrupada (se "all") OU flat (se filtrou) */}
          {selectedEntity === 'all' ? (
            Object.entries(grouped).map(([entity, items]) => {
              const meta = ENTITY_META[entity] || {};
              const Icon = meta.icon || Search;
              return (
                <div key={entity} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {meta.label || entity}
                    <Badge variant="secondary" className="text-[10px]">
                      {items.length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {items.map((r) => (
                      <ResultCard
                        key={`${r.entity}-${r.id}`}
                        result={r}
                        reduce={reduce}
                        onShelterClick={
                          r.entity === 'shelter' && !selectedShelter
                            ? () => handleShelterSelect(r)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredResults.map((r) => (
                <ResultCard
                  key={`${r.entity}-${r.id}`}
                  result={r}
                  reduce={reduce}
                  onShelterClick={
                    r.entity === 'shelter' && !selectedShelter
                      ? () => handleShelterSelect(r)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* FLAG DESLIGADA */}
      {!enabled && (
        <EmptyState
          icon={Search}
          title="Busca inteligente em breve"
          description="Este recurso está em rollout gradual. Enquanto isso, navegue pelo feed de pets e pelo diretório de organizações."
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/feed">
                  <PawPrint className="mr-2 h-4 w-4" aria-hidden="true" />
                  Ver pets
                </Link>
              </Button>
              <Button asChild>
                <Link to="/organizacoes">
                  <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Ver organizações
                </Link>
              </Button>
            </div>
          }
        />
      )}

      {/* CTA FINAL */}
      {!showInitialState && !isLoading && !hasError && filteredResults.length > 0 && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-50 via-indigo-50 to-violet-50 p-6 text-center sm:p-10 dark:from-sky-950/20 dark:via-indigo-950/10 dark:to-violet-950/20"
        >
          <Search className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
            Não encontrou o que procurava?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/80">
            Navegue por toda a plataforma — temos abrigos, animais, adotantes
            e voluntários esperando por você.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="lg">
              <Link to="/feed">
                <PawPrint className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ver feed de pets
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/comunidade">
                <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Ver comunidades
              </Link>
            </Button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
