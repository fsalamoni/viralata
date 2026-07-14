/**
 * @fileoverview fosterPublicService — Lares Temporários PÚBLICOS (TASK-131).
 *
 * Lista lares temporários ativos de todos os abrigos para visitantes
 * que querem se voluntariar. NÃO expõe dados sensíveis (clinic_notes,
 * email/telefone do tutor, localização exata).
 *
 * **Coleção**:
 *   `foster_placements_public/{placementId}` (TASK-XXX: doc espelho público)
 *   ou `clubs/{clubId}/foster_placements/{placementId}` filtrado
 *
 * **Schema público**:
 *   - pet_name, pet_species, pet_photo_url
 *   - shelter_club_id, shelter_name, shelter_city, shelter_state
 *   - status: 'pending' | 'active' | 'ended' | 'cancelled'
 *   - duration_days
 *   - description (opcional, público)
 *   - required_skills: ['patience', 'large_dogs', etc.]
 *
 * **Multi-tenant**: collectionGroup query.
 */

import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

const MAX_RESULTS = 100;

/**
 * Lista lares temporários públicos (com pet).
 * @param {object} options
 * @param {string} [options.status] — 'pending' (precisa de LT) | 'active' (em curso)
 * @param {string} [options.city]
 * @param {boolean} [options.openOnly] — só os que precisam de LT
 * @param {number} [options.max=50]
 */
export async function listPublicFosterPlacements(options = {}) {
  if (!db) return [];
  const { status, openOnly, max = 50 } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(Math.min(max, MAX_RESULTS)));

  try {
    const q = query(collection(db, 'foster_placements_public'), ...constraints);
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (openOnly) {
      items = items.filter((it) => it.status === 'pending' || it.accepted_at === null);
    }

    return items;
  } catch (err) {
    logger.warn('fosterPublicService.listPublicFosterPlacements', {
      msg: 'fallback to empty',
      err: String(err),
    });
    return [];
  }
}
