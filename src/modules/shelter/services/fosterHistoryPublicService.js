/**
 * @fileoverview fosterHistoryPublicService — Histórico público do LT (TASK-326).
 *
 * Página pública /lares-temporarios/:uid/historico.
 * Lista pets que passaram por um LT específico, com consentimento explícito.
 *
 * **Fluxo**:
 * 1. Lê `users/{uid}` → verifica `consent_to_show_history === true`
 *    Se false → retorna { denied: true }
 * 2. collectionGroup('fosters') com where('foster_uid', '==', uid)
 *    + where('status', 'in', ['ended_adopted','ended_returned','ended'])
 * 3. Para cada placement, monta card público: pet_name + pet_photo_url + status final
 *
 * Flag: SHELTER_FOSTER_PUBLIC_HISTORY_V1 (default OFF).
 *
 * @see TASK-326
 */

import {
  doc, getDoc, collection, query, where,
  orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

const MAX_RESULTS = 100;

/**
 * Retorna o histórico público de um LT (foster).
 *
 * @param {string} fosterUid — users/{uid} do LT
 * @returns {Promise<{denied: true}|{denied: false, fullName: string, placements: PlacementPublic[]}>}
 */
export async function getFosterPublicHistory(fosterUid) {
  if (!db) return { denied: true };
  if (!fosterUid) return { denied: true };

  // 1. Verificar consentimento
  let consentGiven = false;
  let fosterFullName = 'Lar Temporário';
  try {
    const userSnap = await getDoc(doc(db, 'users', fosterUid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      consentGiven = data.consent_to_show_history === true;
      fosterFullName = data.full_name || data.displayName || 'Lar Temporário';
    }
  } catch (err) {
    logger.warn('fosterHistoryPublicService.getFosterPublicHistory', {
      fosterUid,
      msg: 'could not read user doc',
      error: err.message,
    });
    return { denied: true };
  }

  if (!consentGiven) {
    return { denied: true };
  }

  // 2. Buscar placements finalizados deste LT via collectionGroup
  let placements = [];
  try {
    const TERMINAL_STATUSES = ['ended_adopted', 'ended_returned', 'ended', 'cancelled_by_foster', 'cancelled_by_shelter'];
    const placementsRef = collection(db, 'fosters');
    const q = query(
      placementsRef,
      where('foster_uid', '==', fosterUid),
      where('status', 'in', TERMINAL_STATUSES),
      orderBy('ended_at', 'desc'),
      limit(MAX_RESULTS),
    );
    const snap = await getDocs(q);
    placements = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        shelter_club_id: data.shelter_club_id,
        pet_id: data.pet_id,
        pet_name: data.pet_name || 'Pet',
        pet_photo_url: data.pet_photo_url || null,
        pet_species: data.pet_species || null,
        status: data.status,
        ended_at: data.ended_at || null,
        foster_rating: data.foster_rating || null,
      };
    });
  } catch (err) {
    logger.warn('fosterHistoryPublicService.getFosterPublicHistory', {
      fosterUid,
      msg: 'could not query placements',
      error: err.message,
    });
    placements = [];
  }

  return { denied: false, fullName: fosterFullName, placements };
}
