import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePetFeed } from '../hooks/usePets';
import { hasKnownCoords, lookupCityCoordsByName, filterPetsByRadius } from '../domain/geoDistance';
import PetCard from '../components/PetCard';
import AdSlot from '@/components/AdSlot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/core/lib/utils';
import { PlusCircle, SlidersHorizontal } from 'lucide-react';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function PetFeed() {
  const { userProfile } = useAuth();
  const [filters, setFilters] = useState({});
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(null);

  const trimmedCity = city.trim();
  // Com raio ativo e a cidade digitada conhecida (tabela de coordenadas
  // aproximadas — ver domain/geoDistance.js), busca sem o filtro exato de
  // cidade no Firestore e filtra por distância real no client. Sem raio, ou
  // cidade fora da tabela, mantém o filtro de texto exato de sempre.
  const radiusActive = radius && hasKnownCoords(trimmedCity);
  const queryFilters = { ...filters, city: radiusActive ? undefined : (trimmedCity || undefined) };
  const { data: fetchedPets = [], isLoading, isError } = usePetFeed(queryFilters);

  const pets = useMemo(() => {
    if (!radiusActive) return fetchedPets;
    const origin = lookupCityCoordsByName(trimmedCity);
    return filterPetsByRadius(fetchedPets, origin, radius) ?? fetchedPets;
  }, [fetchedPets, radiusActive, trimmedCity, radius]);

  function handleFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value === 'all' ? undefined : value }));
  }

  return (
    <div className="arena-page max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Encontrar um Pet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mostrando apenas pets compatíveis com o seu perfil
          </p>
        </div>
        <Button asChild>
          <Link to="/pets/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            Cadastrar Pet
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
        <Select onValueChange={(v) => handleFilter('species', v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Espécie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="dog">Cachorro</SelectItem>
            <SelectItem value="cat">Gato</SelectItem>
            <SelectItem value="rabbit">Coelho</SelectItem>
            <SelectItem value="bird">Pássaro</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => handleFilter('size', v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Porte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="mini">Mini</SelectItem>
            <SelectItem value="small">Pequeno</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="large">Grande</SelectItem>
            <SelectItem value="giant">Gigante</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Localização */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Filtrar por cidade"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRadius((prev) => (prev === km ? null : km))}
              disabled={!city.trim()}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                radius === km ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-secondary/60',
              )}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>
      {trimmedCity && (
        <p className="-mt-3 text-xs text-muted-foreground">
          {radiusActive
            ? `Pets até ${radius} km de ${trimmedCity} (distância aproximada pelo centro da cidade, sem geolocalização precisa)`
            : radius
              ? `Não conhecemos a localização de "${trimmedCity}" para calcular distância — mostrando só pets cadastrados exatamente nessa cidade.`
              : `Pets em ${trimmedCity}`}
        </p>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-destructive">
          Erro ao carregar pets. Tente novamente.
        </div>
      )}

      {!isLoading && !isError && pets.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground text-lg">Nenhum pet compatível encontrado no momento.</p>
          <p className="text-muted-foreground/80 text-sm">
            Tente ajustar os filtros ou{' '}
            <Link to="/perfil" className="text-primary underline">atualize seu perfil</Link>.
          </p>
        </div>
      )}

      {!isLoading && pets.length > 0 && (
        <>
          <AdSlot className="mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
