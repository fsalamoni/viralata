/**
 * @fileoverview useSimilarPets — hook que retorna pets similares a um pet de referência.
 *
 * Score de similaridade por atributos em comum:
 *   - Espécie:       +5  (mesmo valor)
 *   - Porte:        +3  (mesmo valor)
 *   - Faixa etária:  +2  (mesmo age_group)
 *   - Cidade:        +2  (mesma cidade)
 *   - Mesmo abrigo:  +1  (mesmo shelter_club_id)
 *
 * Retorna até `limit` pets ordenados por score descrescente,
 * excluindo o pet de referência e pets já adotados.
 *
 * Requer `SHELTER_SIMILAR_PETS` (default OFF) — fora da flag, o hook
 * retorna array vazio sem fazer query.
 */
import { useQuery } from '@tanstack/react-query';
import { collection, where, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

const MAX_SIMILAR = 6;

function scoreSimilarity(pet, ref) {
  if (!ref || !pet) return 0;
  let score = 0;
  if (pet.species === ref.species) score += 5;
  if (pet.size === ref.size) score += 3;
  if (pet.age_group === ref.age_group) score += 2;
  if (pet.city && ref.city && pet.city.toLowerCase() === ref.city.toLowerCase()) score += 2;
  if (pet.shelter_club_id && pet.shelter_club_id === ref.shelter_club_id) score += 1;
  return score;
}

/**
 * Busca candidatos: pets disponíveis da mesma espécie, ordenados por
 * created_at desc. Limitamos a 50 candidatos para o scoring client-side.
 * O Firestore composite index necessário é: species + status + created_at.
 * Se não existir, o índice automático será criado (pode demorar ~1 min).
 */
async function fetchCandidates(pet) {
  if (!pet?.id || !pet?.species) return [];
  const q = query(
    collection(db, 'pets'),
    where('species', '==', pet.species),
    where('status', '==', 'available'),
    orderBy('created_at', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.id !== pet.id);
}

export function useSimilarPets(pet) {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_SIMILAR_PETS);

  return useQuery({
    queryKey: ['pets', 'similar', pet?.id],
    queryFn: async () => {
      const candidates = await fetchCandidates(pet);
      return candidates
        .map((p) => ({ ...p, _score: scoreSimilarity(p, pet) }))
        .filter((p) => p._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, MAX_SIMILAR);
    },
    enabled: Boolean(pet?.id) && Boolean(enabled),
    staleTime: 1000 * 60 * 5,
  });
}
