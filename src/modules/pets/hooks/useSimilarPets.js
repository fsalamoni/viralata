/**
 * @fileoverview useSimilarPets — lista pets similares (TASK-324).
 *
 * Query: `pets` collection
 *  - mesma espécie + mesmo porte + status=available
 *  - exclui o pet atual
 *  - ordena por rescue_date (mais antigos primeiro = mais tempo esperando)
 *  - client-side: aplica score de similaridade e pega top 4
 *
 * Score de similaridade (cliente-side, definido aqui):
 *  - mesma espécie: +5
 *  - mesmo porte: +3
 *  - mesma idade: +2
 *  - mesma cidade (case-insensitive): +2
 *  - mesmo abrigo: +1
 *
 * Sem dependência de novos índices. Em produção (100+ pets), mover
 * score para Cloud Function ou Algolia/Typesense.
 */

import { useState, useEffect } from 'react';
import { db } from '@/core/config/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { logger } from '@/core/lib/logger';

const MAX_RESULTS = 30;

/**
 * Calcula score de similaridade entre 2 pets (exportado para tests).
 */
export function scoreSimilarity(pet, ref) {
  if (!ref || !pet) return 0;
  let score = 0;
  if (pet.species && pet.species === ref.species) score += 5;
  if (pet.size && pet.size === ref.size) score += 3;
  if (pet.age_group && pet.age_group === ref.age_group) score += 2;
  if (pet.city && ref.city && String(pet.city).toLowerCase() === String(ref.city).toLowerCase()) score += 2;
  if (pet.shelter_club_id && pet.shelter_club_id === ref.shelter_club_id) score += 1;
  return score;
}

export function useSimilarPets(refPet, { max = 4 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!refPet?.id || !refPet?.species) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Query simples: mesma espécie + available, excluindo self via .where('__name__', '!=', refPet.id)
        // Firestore não suporta != no __name__ — filtro client-side
        const q = query(
          collection(db, 'pets'),
          where('species', '==', refPet.species),
          where('status', '==', 'available'),
          orderBy('rescue_date', 'asc'),
          limit(MAX_RESULTS),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.id !== refPet.id);
        // Aplica score e ordena
        const scored = all
          .map((p) => ({ ...p, _score: scoreSimilarity(p, refPet) }))
          .sort((a, b) => b._score - a._score)
          .slice(0, max);
        setItems(scored);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('useSimilarPets', { err: String(err) });
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [refPet?.id, refPet?.species, refPet?.size, refPet?.age_group, refPet?.city, refPet?.shelter_club_id, max]);

  return { items, loading, error };
}
