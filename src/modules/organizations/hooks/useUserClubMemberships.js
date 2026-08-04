/**
 * @fileoverview useUserClubMemberships — lista memberships do user em abrigos.
 *
 * V4 (2026-08-03): hook que retorna as memberships em club_members
 * do user, com join ao doc do clube. Usado pelo PetTransferDialog
 * e ShelterPicker.
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import { useQuery } from '@tanstack/react-query';
import {
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { getDoc } from 'firebase/firestore';
import { logger } from '@/core/lib/logger';

/**
 * Lista memberships do user em abrigos (com join ao doc do clube).
 * @param {string} uid
 * @returns {UseQueryResult<Array<{ club_id: string, role: string, club: object|null }>>}
 */
export function useUserClubMemberships(uid) {
  return useQuery({
    queryKey: ['user-club-memberships', uid],
    queryFn: async () => {
      if (!uid) return [];
      try {
        // 1. Busca memberships onde user_id === uid
        // Nota: club_members/{clubId_uid} → precisamos query por user_id
        const membershipsQ = query(
          collection(db, 'club_members'),
          where('user_id', '==', uid),
        );
        const membershipsSnap = await getDocs(membershipsQ);
        const memberships = membershipsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 2. Para cada membership, busca o clube (em paralelo)
        const clubs = await Promise.all(
          memberships.map(async (m) => {
            try {
              const clubDoc = await getDoc(
                // Tenta primeiro como subcoleção, depois como doc top-level
                // (estrutura legada pode variar)
                m.club_id ? (await import('firebase/firestore')).doc(db, 'clubs', m.club_id) : null,
              );
              return {
                ...m,
                club: clubDoc?.exists() ? { id: clubDoc.id, ...clubDoc.data() } : null,
              };
            } catch (err) {
              logger.warn('[useUserClubMemberships] club fetch failed:', err);
              return { ...m, club: null };
            }
          }),
        );

        return clubs.filter((c) => c.club); // só retorna memberships com clube válido
      } catch (err) {
        logger.error('[useUserClubMemberships] failed:', err);
        return [];
      }
    },
    enabled: Boolean(uid),
    staleTime: 30_000,
  });
}
