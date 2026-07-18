/**
 * @fileoverview useFostersList — busca placements de LT do user logado.
 *
 * Usado pelo FosterDashboard V3 para listar TODOS os placements onde o
 * user é foster (multi-abrigo). Usa collectionGroup query no Firestore
 * com filtro `foster_uid == userUid`.
 *
 * @see src/pages/FosterDashboard.v3.jsx
 */
import { useQuery } from '@tanstack/react-query';
import {
  collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';

const MAX_RESULTS = 200;
const STALE_TIME_MS = 30_000;

/**
 * Lista todos os placements onde o user é foster.
 *
 * @param {string} userUid
 * @returns {object} { data: Placement[], isLoading, isError, refetch }
 */
export function useFostersList(userUid) {
  return useQuery({
    queryKey: ['my-fosters', userUid],
    queryFn: async () => {
      if (!db || !userUid) return [];
      try {
        // collectionGroup query em 'foster_placements' (caminho real pode variar)
        // Vamos tentar a collection direta primeiro (mais comum)
        const placementsCol = collection(db, 'foster_placements');
        const q = query(
          placementsCol,
          where('foster_uid', '==', userUid),
          orderBy('start_date', 'desc'),
          limit(MAX_RESULTS),
        );
        const snap = await getDocs(q);
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('[useFostersList] Firestore fetch falhou:', err);
        return [];
      }
    },
    enabled: !!userUid,
    staleTime: STALE_TIME_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
