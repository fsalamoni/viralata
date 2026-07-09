import React, { useMemo, useState } from 'react';
import { PawPrint, MapPin, Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { applyFeedFilters } from '@/modules/pets/domain/feedFilters';
import PetCard from '@/modules/pets/components/PetCard';

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

const RADIUS_OPTIONS = [10, 25, 50, 100];

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-bold transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-card text-foreground/75 hover:border-primary/40',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Aba PÚBLICA "Pets para Adoção" da ONG. Mostra os animais cadastrados
 * pela ONG no formato do feed (cards com foto, badge de prioridade,
 * cidade, porte, etc.), com os mesmos filtros do feed principal:
 *  - Espécie (cães / gatos / coelhos)
 *  - Porte
 *  - Cidade (texto livre) + raio
 *
 * A diferença em relação à aba interna do admin:
 *  - Público: vê somente "Disponíveis" (status === 'available') em formato
 *    de cards, com filtros de localização.
 *  - Admin: vê a planilha com TODOS os status e pode editar.
 */
export default function ClubPetsPublicTab({ clubId, clubName }) {
  const { data: pets = [], isLoading } = useMyPets(clubId);
  const [species, setSpecies] = useState('all');
  const [size, setSize] = useState('all');
  const [cityText, setCityText] = useState('');
  const [radius, setRadius] = useState(null);

  // Filtra antes para mostrar somente "Disponíveis" no público.
  const onlyAvailable = useMemo(
    () => pets.filter((p) => !p.status || p.status === 'available'),
    [pets],
  );

  const { pets: filtered, locationFallback } = useMemo(
    () => applyFeedFilters(onlyAvailable, {
      species: species === 'all' ? null : species,
      size: size === 'all' ? null : size,
      cityText,
      radiusKm: radius,
    }),
    [onlyAvailable, species, size, cityText, radius],
  );

  const hasFilters = species !== 'all' || size !== 'all' || !!cityText || !!radius;

  return (
    <div className="space-y-4">
      {/* Cabeçalho + filtros */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold sm:text-base">
              Pets para adoção {clubName && <span className="text-muted-foreground font-normal">· {clubName}</span>}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {filtered.length} de {onlyAvailable.length} {onlyAvailable.length === 1 ? 'pet disponível' : 'pets disponíveis'}
            </p>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSpecies('all');
                setSize('all');
                setCityText('');
                setRadius(null);
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Espécie</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {SPECIES_FILTERS.map((f) => (
                  <FilterChip key={f.value} active={species === f.value} onClick={() => setSpecies(f.value)}>
                    {f.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Porte</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {SIZE_FILTERS.map((f) => (
                  <FilterChip key={f.value} active={size === f.value} onClick={() => setSize(f.value)}>
                    {f.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Localização</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={cityText}
                    onChange={(e) => setCityText(e.target.value)}
                    placeholder="Sua cidade"
                    className="h-9 pl-9"
                  />
                </div>
                {cityText && (
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {RADIUS_OPTIONS.map((km) => (
                      <FilterChip
                        key={km}
                        active={radius === km}
                        onClick={() => setRadius((prev) => (prev === km ? null : km))}
                      >
                        {km} km
                      </FilterChip>
                    ))}
                  </div>
                )}
              </div>
              {locationFallback && (
                <p className="mt-2 text-[11px] text-amber-600">
                  Nenhum pet dentro do raio — mostrando todos os disponíveis da ONG.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={hasFilters ? 'Nenhum pet com esses filtros' : 'Nenhum pet disponível agora'}
          description={
            hasFilters
              ? 'Tente ajustar os filtros ou volte mais tarde.'
              : 'Esta ONG ainda não cadastrou pets para adoção.'
          }
          action={hasFilters ? (
            <Button
              variant="outline"
              onClick={() => {
                setSpecies('all');
                setSize('all');
                setCityText('');
                setRadius(null);
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((pet) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      )}
    </div>
  );
}
