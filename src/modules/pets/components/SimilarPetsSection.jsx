/**
 * @fileoverview SimilarPetsSection — bloco "Pets similares" no PublicPet
 * (TASK-324).
 *
 * Mostra 4 cards de pets com mesma espécie/porte do pet atual.
 * Score: 5 espécie + 3 porte + 2 idade + 2 cidade + 1 abrigo.
 *
 * Flag: SHELTER_SIMILAR_PETS_V1 (default OFF).
 */

import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useSimilarPets } from '@/modules/pets/hooks/useSimilarPets';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { cn } from '@/core/lib/utils';

const SIZE_LABEL = {
  mini: 'Mini', small: 'Pequeno', medium: 'Médio', large: 'Grande', giant: 'Gigante',
};

const AGE_LABEL = {
  puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso',
};

function MiniCard({ pet }) {
  return (
    <Link
      to={`/pet/${pet.id}`}
      className="group block"
      data-testid={`similar-pet-${pet.id}`}
    >
      <Card className="h-full overflow-hidden hover:shadow-md transition-shadow hover:border-primary/40">
        <div className="relative aspect-square bg-muted overflow-hidden">
          {pet.photo_url ? (
            <img
              src={pet.photo_url}
              alt={pet.name || pet.title || 'Pet'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🐾</div>
          )}
        </div>
        <CardContent className="p-3 space-y-1">
          <h3 className="text-sm font-semibold truncate group-hover:text-primary">
            {pet.name || pet.title || 'Pet'}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {[pet.size && SIZE_LABEL[pet.size], pet.age_group && AGE_LABEL[pet.age_group], pet.city]
              .filter(Boolean)
              .join(' · ') || 'Disponível para adoção'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SimilarPetsSection({ pet }) {
  const flagEnabled = useFeatureFlag('SHELTER_SIMILAR_PETS_V1');
  const { items, loading, error } = useSimilarPets(pet, { max: 4 });

  if (!flagEnabled) return null;
  if (error) return null; // não exibe erro em bloco público

  return (
    <section className="space-y-3" data-testid="similar-pets-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Pets similares
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/feed">
            Ver mais <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum pet similar no momento"
          description="Quando aparecerem pets com as mesmas características, eles ficam aqui."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((p) => <MiniCard key={p.id} pet={p} />)}
        </div>
      )}
    </section>
  );
}

export default SimilarPetsSection;
