/**
 * @fileoverview PublicFosterPrograms — listagem PÚBLICA de Lares Temporários
 * (TASK-131).
 *
 * Mostra pets que precisam de um lar temporário.
 * Visitante pode:
 * - Ver detalhes do pet + abrigo
 * - Se candidatar (botão leva a /login)
 *
 * Rota: /lares-temporarios
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Home, Heart, MapPin, Clock, Calendar, User, ChevronRight,
  Sparkles, Filter, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHero from '@/components/PageHero';
import { listPublicFosterPlacements } from '@/modules/shelter/services/fosterPublicService';

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ended: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const STATUS_LABELS = {
  pending: 'Precisa de LT',
  active: 'Em curso',
  ended: 'Encerrado',
  cancelled: 'Cancelado',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function PublicFosterPrograms() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cityFilter, setCityFilter] = useState('');
  const [openOnly, setOpenOnly] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listPublicFosterPlacements({
      status: 'pending',
      openOnly: true,
      max: 50,
    }).then((data) => {
      if (!cancelled) {
        setPlacements(data);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Filtro client-side
  const filtered = useMemo(() => {
    if (!cityFilter) return placements;
    const lower = cityFilter.toLowerCase();
    return placements.filter((p) => {
      const city = (p.shelter_city || '').toLowerCase();
      return city.includes(lower);
    });
  }, [placements, cityFilter]);

  return (
    <div className="space-y-6">
      <PageHero
        title="Lares Temporários"
        subtitle="Ajude um pet a se preparar para adoção oferecendo um lar temporário. Procure por pets perto de você."
        icon={Home}
        kicker="VOLUNTARIADO"
      />

      <section className="arena-section-card">
        <div className="arena-section-card-body p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  checked={openOnly}
                  onChange={(e) => setOpenOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                Somente vagas abertas
              </label>
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? 'vaga' : 'vagas'} encontrada{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={Home}
          title="Erro ao carregar vagas"
          description={error}
        />
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Home}
          title="Nenhuma vaga aberta no momento"
          description="Volte mais tarde ou cadastre seu abrigo para oferecer lar temporário."
          action={
            <Button asChild>
              <a href="/cadastro">Cadastrar como voluntário</a>
            </Button>
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <FosterCard key={p.id} placement={p} />
          ))}
        </div>
      )}

      <section className="arena-section-card bg-emerald-50/50 border-emerald-200">
        <div className="arena-section-card-body p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 mt-1 shrink-0" />
            <div className="text-sm">
              <h2 className="font-semibold text-emerald-900 mb-1">
                Por que ser lar temporário?
              </h2>
              <ul className="space-y-1 text-emerald-800 text-xs">
                <li>• Ajuda pets a se socializarem antes da adoção definitiva</li>
                <li>• Alivia o abrigo, que tem superlotação</li>
                <li>• Você recebe suporte do abrigo (ração, veterinário, orientação)</li>
                <li>• Não há custo: o abrigo cobre todas as despesas</li>
                <li>• Experiência gratificante — você faz diferença real</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FosterCard({ placement }) {
  const tone = STATUS_TONE[placement.status] || STATUS_TONE.pending;
  return (
    <section className="hover:shadow-md transition-shadow overflow-hidden" data-testid={`foster-${placement.id}`}>
      {placement.pet_photo_url ? (
        <img
          src={placement.pet_photo_url}
          alt={placement.pet_name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-amber-100 to-rose-100 flex items-center justify-center">
          <Heart className="h-12 w-12 text-rose-400" aria-hidden="true" />
        </div>
      )}
      <div className="arena-section-card-body p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base line-clamp-1 flex-1">
            {placement.pet_name || 'Pet'}
          </h3>
          <Badge className={tone}>
            {STATUS_LABELS[placement.status] || placement.status}
          </Badge>
        </div>

        {placement.pet_species && (
          <p className="text-sm text-muted-foreground">
            {placement.pet_species}
            {placement.pet_age ? ` · ${placement.pet_age}` : ''}
            {placement.pet_size ? ` · Porte ${placement.pet_size}` : ''}
          </p>
        )}

        {placement.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {placement.description}
          </p>
        )}

        <div className="space-y-1 text-xs text-muted-foreground pt-1">
          {placement.shelter_name && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">{placement.shelter_name}</span>
            </div>
          )}
          {placement.shelter_city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span>{placement.shelter_city}{placement.shelter_state ? `/${placement.shelter_state}` : ''}</span>
            </div>
          )}
          {placement.duration_days && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>Até {placement.duration_days} dias</span>
            </div>
          )}
        </div>

        {placement.required_skills && placement.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {placement.required_skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline" className="text-[10px]">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <Button asChild className="w-full mt-2" size="sm">
          <a href={`/cadastro?ref=foster&placement=${placement.id}`}>
            <Heart className="h-4 w-4 mr-2" />
            Quero ser LT
          </a>
        </Button>
      </div>
    </section>
  );
}
