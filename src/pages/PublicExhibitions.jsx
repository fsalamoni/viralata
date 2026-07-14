/**
 * @fileoverview PublicExhibitions — listagem pública de vitrines (TASK-145).
 *
 * Mostra vitrines de todos os abrigos, agrupadas por abrigo.
 * Filtros: status, cidade, upcoming.
 * Rota: /vitrines
 */

import { useState, useMemo, useEffect } from 'react';
import { Calendar, MapPin, Building2, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHero from '@/components/PageHero';
import {
  EXHIBITION_STATUS, EXHIBITION_STATUS_LABELS,
} from '@/modules/shelter/domain/operational/exhibition';
import {
  listPublicExhibitions, groupExhibitionsByShelter,
} from '@/modules/shelter/services/exhibitionPublicService';

const STATUS_TONE = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ExhibitionCard({ ex }) {
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`exhibition-${ex.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base line-clamp-2 flex-1">
            {ex.title || 'Vitrinha'}
          </h3>
          <Badge className={STATUS_TONE[ex.status] || 'bg-slate-100'}>
            {EXHIBITION_STATUS_LABELS[ex.status] || ex.status}
          </Badge>
        </div>

        {ex.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {ex.description}
          </p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(ex.datetime_start)}</span>
            {ex.datetime_start && (
              <span className="ml-1 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(ex.datetime_start)}
              </span>
            )}
          </div>
          {ex.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{ex.location}</span>
            </div>
          )}
          {ex.internal_pets_count > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{ex.internal_pets_count} pets do abrigo</span>
            </div>
          )}
        </div>

        {ex.shelter_club_id && (
          <Button
            variant="link"
            size="sm"
            asChild
            className="mt-2 p-0 h-auto"
          >
            <a href={`/abrigos/${ex.shelter_club_id}`}>
              Ver abrigo <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ShelterGroup({ group }) {
  return (
    <section className="space-y-3" data-testid={`shelter-group-${group.shelter_club_id}`}>
      <header className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">
            {group.shelter_name}
          </h2>
          {group.shelter_city && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {group.shelter_city}{group.shelter_state ? `/${group.shelter_state}` : ''}
            </span>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {group.exhibitions.length} {group.exhibitions.length === 1 ? 'evento' : 'eventos'}
        </Badge>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.exhibitions.map((ex) => (
          <ExhibitionCard key={ex.id} ex={ex} />
        ))}
      </div>
    </section>
  );
}

export default function PublicExhibitions() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublicExhibitions({
      status: statusFilter === 'all' ? undefined : statusFilter,
      upcomingOnly,
    }).then((data) => {
      if (!cancelled) {
        setExhibitions(data);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [statusFilter, upcomingOnly]);

  // Filter by city (client-side)
  const filtered = useMemo(() => {
    if (!cityFilter) return exhibitions;
    const lower = cityFilter.toLowerCase();
    return exhibitions.filter((ex) => {
      const city = (ex.shelter_city || ex.location_city || '').toLowerCase();
      return city.includes(lower);
    });
  }, [exhibitions, cityFilter]);

  const groups = useMemo(() => groupExhibitionsByShelter(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <PageHero
        title="Vitrines de adoção"
        subtitle="Encontre eventos de adoção perto de você. Cada vitrine é organizada por um abrigo parceiro."
        icon={Calendar}
        kicker="EVENTOS"
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">Todos</option>
                {EXHIBITION_STATUS.map((s) => (
                  <option key={s} value={s}>{EXHIBITION_STATUS_LABELS[s] || s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                placeholder="Ex: São Paulo"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm h-10">
                <input
                  type="checkbox"
                  checked={upcomingOnly}
                  onChange={(e) => setUpcomingOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                Somente eventos futuros
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={Calendar}
          title="Erro ao carregar vitrines"
          description={error}
        />
      )}

      {!loading && !error && groups.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Nenhuma vitrine encontrada"
          description="Tente ajustar os filtros ou volte mais tarde para conferir eventos novos."
        />
      )}

      {!loading && !error && groups.map((g) => (
        <ShelterGroup key={g.shelter_club_id} group={g} />
      ))}
    </div>
  );
}
