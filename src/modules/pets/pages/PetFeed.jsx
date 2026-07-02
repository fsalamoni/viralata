import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePetFeed } from '../hooks/usePets';
import PetCard from '../components/PetCard';
import AdSlot from '@/components/AdSlot';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, SlidersHorizontal } from 'lucide-react';

export default function PetFeed() {
  const { userProfile } = useAuth();
  const [filters, setFilters] = useState({});
  const { data: pets = [], isLoading, isError } = usePetFeed(filters);

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
