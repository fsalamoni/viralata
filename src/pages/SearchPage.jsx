/**
 * @fileoverview SearchPage — página pública /busca (TASK-082, Fase 18).
 *
 * Usa a infra Smart Search já existente (domain Fase 18 +
 * searchService + useSmartSearch + SmartSearchBar). Gated pela flag
 * `shelter_smart_search` (default OFF — quando desligada, a página
 * mostra aviso "em breve" e não executa queries).
 *
 * Escopo público v1:
 *   - Abrigos (entity `shelter`) — busca pública, sem tenant.
 *   - Animais (entity `pet`) — exige um abrigo selecionado
 *     (multi-tenant: `shelter_club_id` obrigatório nas rules).
 */

import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Search, Building2, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { SmartSearchBar } from '@/modules/shelter/components/SmartSearchBar';
import { useSmartSearch } from '@/modules/shelter/hooks/useSmartSearch';
import Seo from '@/components/Seo';

const ENTITY_META = {
  shelter: { label: 'Abrigos', icon: Building2, url: (r) => `/organizacoes/${r.id}` },
  pet: { label: 'Animais', icon: PawPrint, url: (r) => `/pet/${r.id}` },
};

function ResultCard({ result }) {
  const meta = ENTITY_META[result.entity] || {};
  const Icon = meta.icon || Search;
  const to = meta.url ? meta.url(result) : '#';
  return (
    <Link to={to} className="block">
      <section className="arena-section-card transition-colors hover:bg-secondary/30">
        <div className="arena-section-card-body flex items-center gap-3 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{result.title || result.id}</p>
            {result.snippet && (
              <p className="truncate text-xs text-muted-foreground">{result.snippet}</p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">{meta.label || result.entity}</Badge>
        </div>
      </section>
    </Link>
  );
}

export default function SearchPage() {
  const wrapperClass = useArenaPageClasses('arena-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6');
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH);
  // TASK-083: o CommandPalette navega para /busca passando o texto
  // digitado em location.state.q — usado como query inicial.
  const location = useLocation();
  const [query, setQuery] = useState(location.state?.q || '');
  const [selectedShelter, setSelectedShelter] = useState(null); // {id, title}

  const filters = useMemo(() => {
    if (!query || query.trim().length < 2) return null;
    if (selectedShelter) {
      return { entity: 'pet', query: query.trim(), shelterId: selectedShelter.id };
    }
    return { entity: 'shelter', query: query.trim() };
  }, [query, selectedShelter]);

  const { data, isLoading, hasError, refetch } = useSmartSearch(filters || {}, {}, {});
  const results = filters ? (data?.results || []) : [];

  return (
    <div className={wrapperClass}>
      <Seo title="Busca" description="Busque abrigos e animais para adoção no Viralata." />
      <h1 className="mb-1 text-xl font-bold">Busca</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {selectedShelter
          ? <>Buscando animais em <strong>{selectedShelter.title}</strong>.</>
          : 'Encontre abrigos parceiros. Selecione um abrigo para buscar os animais dele.'}
      </p>

      {!enabled ? (
        <EmptyState
          icon={Search}
          title="Busca inteligente em breve"
          description="Este recurso está em rollout gradual. Enquanto isso, navegue pelo feed de pets e pelo diretório de organizações."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/feed">Ver pets</Link></Button>
              <Button asChild><Link to="/organizacoes">Ver organizações</Link></Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <SmartSearchBar
              initialValue={query}
              onSearch={setQuery}
              placeholder={selectedShelter ? 'Buscar animais neste abrigo…' : 'Buscar abrigos…'}
              autoFocus
              className="flex-1"
            />
            {selectedShelter && (
              <Button variant="outline" size="sm" onClick={() => setSelectedShelter(null)}>
                Limpar abrigo
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {isLoading && filters && (
              <>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </>
            )}
            {hasError && (
              <p className="text-sm text-muted-foreground">
                A busca falhou.{' '}
                <button type="button" className="underline" onClick={() => refetch()}>Tentar de novo</button>
              </p>
            )}
            {!isLoading && !hasError && filters && results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum resultado para “{query}”.
              </p>
            )}
            {!isLoading && !hasError && results.map((r) => (
              r.entity === 'shelter' && !selectedShelter ? (
                <button
                  key={`${r.entity}-${r.id}`}
                  type="button"
                  className="w-full text-left"
                  onClick={() => { setSelectedShelter({ id: r.id, title: r.title }); setQuery(''); }}
                >
                  <ResultCard result={r} />
                </button>
              ) : (
                <ResultCard key={`${r.entity}-${r.id}`} result={r} />
              )
            ))}
          </div>
        </>
      )}
    </div>
  );
}
