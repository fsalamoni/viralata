/**
 * @fileoverview SmartSearchResults — lista de resultados agrupados
 * por entity, com score visual (Fase 18).
 *
 * Recebe um `searchResponse` (shape de `searchResponseSchema`) e
 * renderiza os resultados agrupados por entity. Mostra snippet com
 * highlight do termo buscado.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 18
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Dog, Users, Building2, Home, CalendarDays, ChevronRight, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/lib/utils';
import { SEARCH_ENTITIES } from '@/modules/shelter/domain/search';

const ENTITY_ICONS = {
  pet: Dog,
  adopter: Users,
  shelter: Building2,
  foster: Home,
  exhibition: CalendarDays,
};

const ENTITY_ORDER = ['pet', 'adopter', 'foster', 'exhibition', 'shelter'];

/**
 * Destaca o termo buscado dentro do snippet (case + accent insensitive).
 */
function highlightSnippet(text, query) {
  if (!text) return null;
  if (!query) return text;
  // Normaliza ambos
  const normText = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normQuery = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normQuery.length === 0) return text;

  const out = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = normText.indexOf(normQuery, i);
    if (idx === -1) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      React.createElement(
        'mark',
        { key: `m-${key++}`, className: 'bg-yellow-200 dark:bg-yellow-900/40 rounded px-0.5' },
        text.slice(idx, idx + normQuery.length),
      ),
    );
    i = idx + normQuery.length;
  }
  return out;
}

function ResultItem({ result, query }) {
  const Icon = ENTITY_ICONS[result.entity] || ChevronRight;
  return (
    <Link
      to={result.url}
      className="flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors"
    >
      <div className="flex-shrink-0 h-9 w-9 rounded-md bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{result.title}</span>
          {result.score > 0.5 && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(result.score * 100)}%
            </Badge>
          )}
        </div>
        {result.subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {result.subtitle}
          </div>
        )}
        {result.snippet && (
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {highlightSnippet(result.snippet, query)}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-2" />
    </Link>
  );
}

function EntityGroup({ entity, results, query, defaultCollapsed = false }) {
  const cfg = SEARCH_ENTITIES[entity];
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed && results.length === 0);
  const Icon = ENTITY_ICONS[entity] || ChevronRight;

  if (results.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 mb-2 w-full text-left"
        aria-expanded={!collapsed}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{cfg.label}</span>
        <Badge variant="outline" className="text-xs">
          {results.length}
        </Badge>
      </button>
      {!collapsed && (
        <Card>
          <CardContent className="p-2">
            {results.map((r) => (
              <ResultItem key={`${r.entity}-${r.id}`} result={r} query={query} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {object|null} [props.data] searchResponse ou null
 * @param {boolean} [props.isLoading]
 * @param {boolean} [props.isFetching]
 * @param {string} [props.emptyMessage]
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
export function SmartSearchResults({
  data,
  isLoading = false,
  isFetching = false,
  emptyMessage = 'Nenhum resultado encontrado.',
  className,
}) {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)} aria-busy="true">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn('p-6', className)}>
        <EmptyState
          title="Busca inteligente"
          description="Use a barra acima para buscar em todas as entidades do abrigo."
          icon={Search}
        />
      </div>
    );
  }

  if (data.totalCount === 0) {
    return (
      <div className={cn('p-6', className)}>
        <EmptyState
          title="Sem resultados"
          description={data.query
            ? `Nenhum resultado para "${data.query}". ${emptyMessage}`
            : emptyMessage}
          icon={Search}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)} aria-busy={isFetching}>
      {ENTITY_ORDER.map((entity) => (
        <EntityGroup
          key={entity}
          entity={entity}
          results={data.byEntity[entity] || []}
          query={data.query}
        />
      ))}
      {data.durationMs != null && (
        <div className="text-xs text-muted-foreground text-right pt-2">
          {data.totalCount} resultado{data.totalCount !== 1 ? 's' : ''} ·{' '}
          {data.durationMs}ms
        </div>
      )}
    </div>
  );
}

export default SmartSearchResults;
