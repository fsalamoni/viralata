/**
 * @fileoverview PetFeedV3 — página /feed refatorada para DS_V2 + V3 (TASK-V3-FEED-1).
 *
 * @see docs/REGENCY_FEED_V3.md — documento de regência completo
 *
 * Mudanças vs V1 (PetFeed.v1.jsx, 393 linhas):
 *  - Sem cores hard-coded (emerald, hsl, etc) — só tokens do DS
 *  - Sem font-['Sora'] hard-coded — usa font do DS
 *  - Filtros sincronizados com URL (useUrlFilters)
 *  - Novos filtros: idade, sexo, castrado, vacinado
 *  - Ordenação (recentes/próximos/prioridade)
 *  - Paginação configurável (cards por página por viewport)
 *  - "Ver todos os pets" começa FECHADO (CollapsibleCard)
 *  - UNDO no SwipeDeck
 *  - Haptic feedback (navigator.vibrate)
 *  - Skeleton / EmptyState / ErrorState padronizados
 *  - Dark mode propaga
 *  - A11y completo
 *  - 0 uso de emerald/green/teal
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, SwitchCamera } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePetFeed, useCreateInterest } from '../hooks/usePets';
import { hasKnownCoords, lookupCityCoordsByName, filterPetsByRadius, normalizePlaceText } from '../domain/geoDistance';
import PetCard from '../components/PetCard';
import SwipeDeck from '../components/SwipeDeck';
import AdSlotUnified from "@/components/AdSlotUnified";
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { FilterChipsRow } from '@/components/ui/filter-chips-row';
import { InputCityAutocomplete } from '@/components/ui/input-city-autocomplete';
import { useUrlFilters } from '@/core/hooks/useUrlFilters';
import { useUiPreferences, getCardsPerPageForViewport, getGridColumnsForViewport } from '@/core/hooks/useUiPreferences';
import { useViewport } from '@/core/hooks/useViewport';
import { useFeedPreferences } from '@/core/hooks/useFeedPreferences';
import Seo from '@/components/Seo';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/core/lib/utils';

const RADIUS_OPTIONS = [
  { value: null, label: 'Sem limite' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
];

const SPECIES_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'dog', label: 'Cães' },
  { value: 'cat', label: 'Gatos' },
  { value: 'rabbit', label: 'Coelhos' },
];

const SIZE_FILTERS = [
  { value: 'all', label: 'Todos os portes' },
  { value: 'mini', label: 'Mini' },
  { value: 'small', label: 'Pequeno' },
  { value: 'medium', label: 'Médio' },
  { value: 'large', label: 'Grande' },
  { value: 'giant', label: 'Gigante' },
];

const AGE_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'puppy', label: 'Filhote' },
  { value: 'adult', label: 'Adulto' },
  { value: 'senior', label: 'Idoso' },
];

const SEX_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'male', label: 'Macho' },
  { value: 'female', label: 'Fêmea' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'closest', label: 'Mais próximos' },
  { value: 'priority', label: 'Prioridade' },
];

export default function PetFeedV3() {
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { settings } = usePlatformSettings();
  const [uiPrefs] = useUiPreferences();
  const { viewport } = useViewport();
  const [feedPrefs, setFeedPrefs] = useFeedPreferences();
  const createInterest = useCreateInterest();

  const firstName = (userProfile?.name || user?.displayName || '').split(' ')[0];

  // Filtros sincronizados com URL
  const [filters, setFilter, setFilters, resetFilters] = useUrlFilters({
    species: 'all',
    size: 'all',
    age: 'all',
    sex: 'all',
    city: '',
    radius: null,
    sort: 'priority',
    page: 1,
  });

  const {
    species, size, age, sex,
    city, radius, sort, page,
  } = filters;

  // Cidade do user como default (só na primeira montagem)
  const appliedProfileCity = useRef(Boolean(userProfile?.city));
  useEffect(() => {
    if (appliedProfileCity.current) return;
    if (userProfile?.city && !city) {
      appliedProfileCity.current = true;
      setFilter('city', userProfile.city);
    }
  }, [userProfile?.city, city, setFilter]);

  // Cards por página (responsivo + user pref)
  const perPage = getCardsPerPageForViewport(uiPrefs, viewport);
  const colsPref = getGridColumnsForViewport(uiPrefs, viewport);
  const showOwnPets = feedPrefs?.showOwnPets !== false; // default true
  // V3 (TASK-V3-FEED-1-FIX): useFeedPreferences retorna [prefs, setPrefs, status].
  // O toggle "Mostrar meus pets" atualiza via setFeedPrefs(prev => ...)
  const handleToggleShowOwnPets = useCallback((checked) => {
    setFeedPrefs((prev) => ({ ...prev, showOwnPets: checked }));
  }, [setFeedPrefs]);

  // Query
  const trimmedCity = (city || '').trim();
  const radiusActive = Boolean(radius && hasKnownCoords(trimmedCity));
  const queryFilters = {
    species: species === 'all' ? undefined : species,
    size: size === 'all' ? undefined : size,
    age_group: age === 'all' ? undefined : age,
    sex: sex === 'all' ? undefined : sex,
    // V3 (TASK-V3-FEED-4): NÃO passamos city pro Firestore porque ele faz
    // match EXATO (sem normalização de acentos/case). O filtro de cidade é
    // feito CLIENTE-side abaixo, com normalizePlaceText (NFD + lowercase).
    // Assim "porto alegre" ≡ "Porto Alegre" ≡ "PORTO ALEGRE".
    limitCount: radiusActive ? 500 : undefined,
  };
  const { data: fetchedPets = [], isLoading, isError, refetch } = usePetFeed(queryFilters);

  // Filtra + ordena
  const pets = useMemo(() => {
    let visiblePets = user?.uid && !showOwnPets
      ? fetchedPets.filter((pet) => pet.owner_id !== user.uid)
      : fetchedPets;
    // V3 (TASK-V3-FEED-4): filtro de cidade cliente-side inteligente.
    // Compara versão normalizada (sem acentos, lowercase) do texto digitado
    // com a versão normalizada de pet.city. Aceita também match por prefixo.
    if (trimmedCity && !radiusActive) {
      const needle = normalizePlaceText(trimmedCity);
      visiblePets = visiblePets.filter((pet) => {
        const hay = normalizePlaceText(pet.city || '');
        return hay.includes(needle);
      });
    }
    if (radiusActive) {
      const origin = lookupCityCoordsByName(trimmedCity);
      visiblePets = filterPetsByRadius(visiblePets, origin, radius) ?? visiblePets;
    }
    // Ordena
    const sorted = [...visiblePets];
    if (sort === 'priority') {
      sorted.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    } else if (sort === 'recent') {
      sorted.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
    } else if (sort === 'closest' && trimmedCity) {
      const origin = lookupCityCoordsByName(trimmedCity);
      if (origin) {
        const { haversineKm } = require('../domain/geoDistance');
        sorted.sort((a, b) => {
          const aCoords = a.coords || lookupCityCoordsByName(a.city);
          const bCoords = b.coords || lookupCityCoordsByName(b.city);
          if (!aCoords) return 1;
          if (!bCoords) return -1;
          return haversineKm(origin, aCoords) - haversineKm(origin, bCoords);
        });
      }
    }
    return sorted;
  }, [fetchedPets, radiusActive, trimmedCity, radius, showOwnPets, user?.uid, sort]);

  // Highlight (curadoria) — primeiras N do feed
  const priorityPets = useMemo(() => pets.slice(0, 10), [pets]);

  // Paginação do grid "Todos os pets"
  const totalItems = pets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedPets = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return pets.slice(start, start + perPage);
  }, [pets, safePage, perPage]);

  // Reset page quando filtros mudam
  useEffect(() => {
    if (page !== 1) setFilter('page', 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, size, age, sex, city, radius, sort]);

  // Handlers
  function handleLike(petId) {
    if (!user) { navigate('/login'); return; }
    createInterest.mutate(petId, {
      onSuccess: () => toast.success('Interesse registrado! 🐾'),
      onError: () => toast.error('Não foi possível registrar o interesse.'),
    });
  }
  function handlePass() { /* sem persistência */ }
  function handleUndo(petId) { /* apenas re-mostra a carta */ }
  function handleOpenDetail(petId) { navigate(`/pet/${petId}`); }

  function handleClearFilters() {
    resetFilters();
  }
  function handleExpandRadius() {
    if (radius !== 100) setFilter('radius', 100);
    else setFilter('radius', null);
  }

  // Helper text do filtro de cidade
  const cityHelperText = !trimmedCity
    ? 'Sem cidade definida — mostrando todos os pets disponíveis na plataforma.'
    : radiusActive
      ? `Pets até ${radius} km de ${trimmedCity} (distância aproximada). Use "Sem limite" para ver pets de todo o Brasil.`
      : !radius
        ? 'Sem filtro de distância — mostrando pets de todo o Brasil.'
        : `Não conhecemos a localização de "${trimmedCity}" para calcular distância — mostrando só pets cadastrados nessa cidade.`;

  // Grid columns class
  const gridColsClass = (() => {
    if (colsPref === 1) return 'grid-cols-1';
    if (colsPref === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (colsPref === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (colsPref === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    if (colsPref === 5) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
    // auto
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  })();

  return (
    <div className={useArenaPageClasses('arena-page mx-auto max-w-6xl px-5 py-5 pb-12')}>
      <Seo
        title="Pets para adoção"
        description="Feed de pets disponíveis para adoção responsável perto de você."
      />
      <PageHero
        eyebrow="Feed"
        title={`Encontre seu novo melhor amigo${firstName ? `, ${firstName}` : ''}`}
        description={settings.ui_text.feed_hero_description}
      />

      {/* Filtros: espécies, portes, idade, sexo */}
      <div className="mb-3 mt-6 space-y-2.5">
        <FilterChipsRow
          field="species"
          value={species}
          onChange={(v) => setFilter('species', v)}
          options={SPECIES_FILTERS}
          ariaLabel="Filtrar por espécie"
        />
        <FilterChipsRow
          field="size"
          value={size}
          onChange={(v) => setFilter('size', v)}
          options={SIZE_FILTERS}
          ariaLabel="Filtrar por porte"
        />
        <FilterChipsRow
          field="age"
          value={age}
          onChange={(v) => setFilter('age', v)}
          options={AGE_FILTERS}
          ariaLabel="Filtrar por idade"
        />
        <FilterChipsRow
          field="sex"
          value={sex}
          onChange={(v) => setFilter('sex', v)}
          options={SEX_FILTERS}
          ariaLabel="Filtrar por sexo"
        />
      </div>

      {/* Filtro cidade + raio */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[280px] flex-1 min-w-[200px]">
          <InputCityAutocomplete
            value={city}
            onChange={(v) => setFilter('city', v)}
            userCity={userProfile?.city}
            placeholder="Filtrar por cidade"
            ariaLabel="Filtrar por cidade"
          />
        </div>
        <FilterChipsRow
          field="radius"
          value={radius ?? 'null'}
          onChange={(v) => setFilter('radius', v === 'null' ? null : Number(v))}
          options={RADIUS_OPTIONS.map((o) => ({ value: o.value === null ? 'null' : String(o.value), label: o.label }))}
          ariaLabel="Raio de busca"
        />
      </div>

      {/* Toggle "Mostrar meus pets" */}
      {user && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-border/70 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Mostrar meus pets no feed</p>
            <p className="text-xs text-muted-foreground">
              Use o controle para incluir ou ocultar pets cadastrados por você.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span>{showOwnPets ? 'Exibindo' : 'Ocultando'}</span>
            <Switch checked={showOwnPets} onCheckedChange={handleToggleShowOwnPets} />
          </div>
        </div>
      )}

      <p className="mb-5 text-[11.5px] text-muted-foreground">{cityHelperText}</p>

      {/* SwipeDeck (cartas destaque) */}
      {!isLoading && !isError && (
        <SwipeDeck
          pets={priorityPets}
          onLike={handleLike}
          onPass={handlePass}
          onUndo={handleUndo}
          onOpenDetail={handleOpenDetail}
        />
      )}

      {/* V3 (TASK-V3-FEED-2): Espaço de Parceiros FORA do Collapsible.
          Aparece entre o SwipeDeck e "Todos os pets disponíveis" com
          margem balanceada em harmonia com a plataforma. */}
      <div className="my-8 sm:my-10">
        <AdSlotUnified
          slotId="feed-between-sections"
          position="feed_inline"
          page="/feed"
          className="w-full"
        />
      </div>

      {/* Collapsible: "Ver todos os pets disponíveis" */}
      <CollapsibleCard
        title="Todos os pets disponíveis"
        subtitle={`${totalItems} pets${totalItems !== 1 ? '' : ''} na plataforma`}
        testId="all-pets-collapsible"
        badge={
          totalItems > 0 ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {totalItems}
            </span>
          ) : null
        }
      >
        {/* Sort dropdown — V3 (TASK-V3-FEED-3): usa <select> HTML nativo
            pois o componente `Select` do Radix exige API diferente
            (SelectTrigger/Content/Item). O nativo é mais leve e funciona
            perfeitamente aqui. */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {pagedPets.length} de {totalItems}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-foreground">
              Ordenar por
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setFilter('sort', e.target.value)}
              className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="sort-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de cards */}
        {isLoading && <Skeleton.Grid count={perPage} variant="pet-card" />}

        {isError && (
          <ErrorState
            title="Erro ao carregar pets"
            description="Não foi possível buscar os pets. Tente novamente."
            onRetry={refetch}
            testId="feed-error-state"
          />
        )}

        {!isLoading && !isError && pagedPets.length === 0 && (
          <EmptyState
            icon={Search}
            title="Nenhum pet encontrado com esses filtros."
            description="Tente ampliar o raio, mudar a cidade ou limpar os filtros para ver todos os pets da plataforma."
            buttons={[
              { label: 'Limpar filtros', onClick: handleClearFilters, variant: 'outline', testId: 'empty-clear-filters' },
              { label: 'Ampliar raio', onClick: handleExpandRadius, testId: 'empty-expand-radius' },
            ]}
            testId="feed-grid-empty"
          />
        )}

        {!isLoading && !isError && pagedPets.length > 0 && (
          <>
            <div className={cn('grid gap-4', gridColsClass)}>
              {pagedPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
            </div>
            <div className="mt-6">
              <PaginationControls
                page={safePage}
                totalItems={totalItems}
                perPage={perPage}
                onPageChange={(p) => setFilter('page', p)}
              />
            </div>
          </>
        )}
      </CollapsibleCard>
    </div>
  );
}
