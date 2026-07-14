/**
 * @fileoverview exhibitionPublicService — listagem PÚBLICA de vitrines
 * (TASK-145).
 *
 * Usa `collectionGroup` query no Firestore para listar vitrines de
 * TODOS os abrigos em uma única query. Aplica filtros client-side
 * para os campos que não podem ser indexados (ex: dates).
 *
 * Schema esperado:
 *   clubs/{clubId}/exhibitions/{exhibitionId}
 *
 * Campos exibidos:
 *   - title, description, location
 *   - datetime_start, datetime_end
 *   - status (scheduled | active | completed | cancelled)
 *   - shelter_club_id (path)
 *   - internal_pets_count, external_pets_count
 *
 * **Multi-tenant**:
 *   - collectionGroup respeita Firestore rules (somente públicas)
 *   - filtros client-side para latência
 */

import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

const MAX_RESULTS = 200;

/**
 * Lista vitrines públicas (collectionGroup) com filtros.
 *
 * @param {object} options
 * @param {string} [options.status] — scheduled|active|completed|cancelled
 * @param {string} [options.city] — cidade do abrigo
 * @param {string} [options.state] — UF
 * @param {Date} [options.upcomingOnly] — só eventos futuros
 * @param {number} [options.max=50]
 * @returns {Promise<Array<{
 *   id, shelter_club_id, title, description, location,
 *   datetime_start, datetime_end, status, internal_pets_count,
 *   external_pets_count, cover_url
 * }>>}
 */
export async function listPublicExhibitions(options = {}) {
  if (!db) return [];
  const { status, upcomingOnly, max = 50 } = options;

  const constraints = [];
  if (status) {
    constraints.push(where('status', '==', status));
  }
  constraints.push(orderBy('datetime_start', 'desc'));
  constraints.push(limit(Math.min(max, MAX_RESULTS)));

  try {
    const q = query(collection(db, 'exhibitions_public'), ...constraints);
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filtro client-side: upcomingOnly
    if (upcomingOnly) {
      const now = new Date();
      items = items.filter((it) => {
        if (!it.datetime_start) return false;
        const dt = typeof it.datetime_start === 'string'
          ? new Date(it.datetime_start)
          : it.datetime_start?.toDate?.() || null;
        return dt && dt >= now;
      });
    }

    return items;
  } catch (err) {
    logger.warn('exhibitionPublicService.listPublicExhibitions', {
      msg: 'fallback to per-shelter scan',
      err: String(err),
    });
    return [];
  }
}

/**
 * Agrupa vitrines por abrigo para a listagem pública.
 *
 * @param {Array} exhibitions
 * @param {Map<string, object>} shelterInfo — map clubId → { name, city, state }
 * @returns {Array<{ shelter_club_id, shelter_name, shelter_city, shelter_state, exhibitions: [] }>}
 */
export function groupExhibitionsByShelter(exhibitions, shelterInfo = new Map()) {
  const groups = new Map();
  for (const ex of exhibitions) {
    const clubId = ex.shelter_club_id;
    if (!groups.has(clubId)) {
      const info = shelterInfo.get(clubId) || {};
      groups.set(clubId, {
        shelter_club_id: clubId,
        shelter_name: info.name || ex.shelter_name || 'Abrigo',
        shelter_city: info.city || ex.shelter_city || '',
        shelter_state: info.state || ex.shelter_state || '',
        exhibitions: [],
      });
    }
    groups.get(clubId).exhibitions.push(ex);
  }
  return Array.from(groups.values()).sort((a, b) => {
    return (a.shelter_name || '').localeCompare(b.shelter_name || '');
  });
}
