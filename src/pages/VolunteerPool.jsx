/**
 * @fileoverview VolunteerPool — pool de voluntários da plataforma (V4, Q26).
 *
 * D-PERSONA-VOLUNTEER-POOL (Q26): voluntários sem abrigo entram
 * no POOL DA PLATAFORMA. Abrigos podem buscar/browse para convidar.
 *
 * Esta página é a entrada do voluntário no pool (visão do voluntário).
 * Mostra:
 *  - Status do voluntário (no pool, vinculado, etc)
 *  - Filtros para abrigos buscarem (região, raio, espécies)
 *  - Lista de abrigos com vagas abertas
 *  - Como configurar perfil para ser encontrado
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Building2, Search, Filter, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHero from '@/components/PageHero';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE } from '@/core/domain/personas';
import { logger } from '@/core/lib/logger';

const SPECIES_OPTIONS = [
  { value: 'dogs', label: 'Cães' },
  { value: 'cats', label: 'Gatos' },
  { value: 'rabbits', label: 'Coelhos' },
  { value: 'birds', label: 'Pássaros' },
  { value: 'other', label: 'Outros' },
];

export function VolunteerPool() {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_VOLUNTEER_POOL);
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { active } = useActivePersona();

  const [filters, setFilters] = useState({
    city: userProfile?.city || '',
    state: userProfile?.state || '',
    radius_km: 20,
    species: [],
    available_weekdays: [],
  });
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  if (!v4Enabled) {
    navigate('/perfil/voluntario', { replace: true });
    return null;
  }

  if (!user) {
    navigate('/login', { replace: true, state: { from: '/voluntarios/pool' } });
    return null;
  }

  if (active && active.type !== PERSONA_TYPE.VOLUNTEER) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 text-center">
        <p className="text-muted-foreground">
          O pool de voluntários é exclusivo da persona "Voluntário".
        </p>
        <Button onClick={() => navigate('/acesso')} className="mt-4">
          Trocar de persona
        </Button>
      </div>
    );
  }

  const toggleSpecies = (value) => {
    setFilters((prev) => ({
      ...prev,
      species: prev.species.includes(value)
        ? prev.species.filter((v) => v !== value)
        : [...prev.species, value],
    }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearched(true);
    try {
      // TODO: implementar busca real (query com filtros de região/raio/espécies)
      // Por enquanto mock — em produção real, query no Firestore com where
      // + getCountFromServer + ordenação por proximidade
      logger.info('[VolunteerPool] search with filters:', filters);
      setResults([]); // sem resultados até a integração real
    } catch (err) {
      logger.error('[VolunteerPool] search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 sm:py-8" data-testid="volunteer-pool">
      <PageHero
        title="Pool de Voluntários"
        subtitle="Abrigos com vagas abertas. Configure seu perfil para ser encontrado."
        icon={Heart}
      />

      {/* Card explicativo */}
      <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4" aria-label="Sobre o pool">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-violet-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-violet-900">Como funciona o pool?</h2>
            <p className="mt-1 text-sm text-violet-800">
              Você fica disponível para ser encontrado por abrigos que precisam
              de voluntários. Configure os filtros abaixo para refinar sua
              busca. Os abrigos podem te convidar diretamente.
            </p>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5" aria-label="Filtros de busca">
        <h2 className="text-sm font-bold uppercase text-muted-foreground">
          Filtros
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={filters.city}
              onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
              placeholder="Sua cidade"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              value={filters.state}
              onChange={(e) => setFilters((p) => ({ ...p, state: e.target.value }))}
              placeholder="UF"
              maxLength={2}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="radius">Raio de atuação (km)</Label>
          <Input
            id="radius"
            type="number"
            min="1"
            max="200"
            value={filters.radius_km}
            onChange={(e) => setFilters((p) => ({ ...p, radius_km: Number(e.target.value) || 20 }))}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Espécies de interesse</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SPECIES_OPTIONS.map((opt) => {
              const checked = filters.species.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSpecies(opt.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm transition ${
                    checked ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full sm:w-auto"
          data-testid="volunteer-pool-search"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Buscar abrigos
            </>
          )}
        </Button>
      </section>

      {/* Resultados */}
      {searched && (
        <section className="mt-6" aria-label="Resultados">
          <h2 className="mb-3 text-lg font-bold">Abrigos com vagas abertas</h2>
          {results.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold">Em breve</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                A busca do pool de voluntários será ativada nas próximas
                semanas. Por enquanto, mantenha seu perfil atualizado e os
                abrigos podem te encontrar.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {results.map((shelter) => (
                <li key={shelter.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-semibold">{shelter.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shelter.city}, {shelter.state}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <a href={`/organizacoes/${shelter.id}`}>Ver</a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Call to action: configurar perfil */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5" aria-label="Configurar perfil">
        <h2 className="text-sm font-bold uppercase text-muted-foreground">
          Seu perfil
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Mantenha seu perfil de voluntário atualizado para aumentar suas chances
          de ser encontrado por abrigos.
        </p>
        <Button asChild className="mt-3" variant="outline">
          <a href="/perfil/voluntario">Editar perfil</a>
        </Button>
      </section>
    </div>
  );
}

export default VolunteerPool;
