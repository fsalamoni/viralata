/**
 * @fileoverview PetSimilar — carrossel "Outros pets deste responsável" (V3).
 *
 * TASK-V3-PET-DETAIL-7: 4 pets do mesmo `owner_id`, exclui o atual,
 * status === 'available'. Scroll horizontal.
 *
 * Hook: `useAvailablePets({ owner_id })` reaproveitado.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Pets similares"
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { ChevronRight, PawPrint } from 'lucide-react';
import PetCard from './PetCard';
import { Skeleton } from '@/components/ui/skeleton';

// Normaliza um pet record do Firestore (igual ao getPetById do petService)
function normalizePetRecord(id, data) {
  if (!data) return null;
  return {
    id,
    title: data.title || data.name || 'Sem título',
    name: data.name || data.title || '',
    species: data.species || null,
    size: data.size || null,
    age_group: data.age_group || null,
    gender: data.gender || null,
    breed: data.breed || null,
    city: data.city || '',
    state: data.state || '',
    photos: Array.isArray(data.photos) ? data.photos.filter(Boolean) : [],
    status: data.status || 'available',
    neutered: Boolean(data.neutered),
    vaccinated: data.vaccinated || null,
    dewormed: Boolean(data.dewormed),
    priority_score: data.priority_score || 0,
    created_at: data.created_at || null,
    owner_id: data.owner_id || null,
    owner_type: data.owner_type || 'user',
  };
}

const PETS_COLLECTION = 'pets';

function useSimilarPets({ ownerId, excludeId, max = 4 }) {
  return useQuery({
    queryKey: ['similar-pets', ownerId, excludeId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const q = query(
        collection(db, PETS_COLLECTION),
        where('owner_id', '==', ownerId),
        where('status', '==', 'available'),
        orderBy('created_at', 'desc'),
        limit(max + 1),
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => normalizePetRecord(d.id, d.data()))
        .filter((p) => p.id !== excludeId)
        .slice(0, max);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function PetSimilar({ ownerId, excludePetId, className }) {
  const navigate = useNavigate();
  const { data: pets = [], isLoading } = useSimilarPets({ ownerId, excludeId: excludePetId });

  if (isLoading) {
    return (
      <section className={className} aria-labelledby="pet-similar-title">
        <h2 id="pet-similar-title" className="mb-4 text-[17px] font-bold text-foreground">
          Outros pets deste responsável
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-56 shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (pets.length === 0) {
    return null;
  }

  return (
    <section className={className} aria-labelledby="pet-similar-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="pet-similar-title" className="text-[17px] font-bold text-foreground">
          Outros pets deste responsável
        </h2>
        {pets.length >= 4 && (
          <button
            type="button"
            onClick={() => navigate(`/organizacoes/${ownerId}`)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
          >
            Ver todos
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div
        className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:thin]"
        role="list"
      >
        {pets.map((p) => (
          <div key={p.id} role="listitem" className="w-56 shrink-0">
            <PetCard pet={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
