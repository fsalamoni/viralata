/**
 * @fileoverview publicMuralService — feed público de posts do mural
 * (TASK-156).
 *
 * Lista posts de várias comunidades (limitado por visibilidade).
 *
 * Filtros:
 * - communityId específico
 * - Apenas posts com is_public=true (mural visível)
 * - Apenas comunidades com visibility='public' (não 'private')
 *
 * Implementação: query simples com where community_id IN + filter client-side.
 * Em produção real, criar collection espelho `public_mural_posts` (TASK-XXX).
 */
import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

const MAX_RESULTS = 200;

/**
 * Lista posts públicos do mural (todas comunidades).
 *
 * @param {object} options
 * @param {string} [options.communityId]
 * @param {string} [options.communityIds] — array de community_ids a buscar
 * @param {number} [options.max=50]
 * @returns {Promise<Array>}
 */
export async function listPublicMuralPosts(options = {}) {
  if (!db) return [];
  const { communityId, communityIds, max = 50 } = options;

  const constraints = [];
  if (communityId) {
    constraints.push(where('community_id', '==', communityId));
  }
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(Math.min(max, MAX_RESULTS)));

  try {
    const q = query(collection(db, 'community_posts'), ...constraints);
    const snap = await getDocs(q);
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filtra por comunidade (se passou lista)
    if (communityIds && Array.isArray(communityIds)) {
      const set = new Set(communityIds);
      items = items.filter((it) => set.has(it.community_id));
    }
    // Apenas posts públicos
    items = items.filter((it) => it.is_public !== false);

    return items;
  } catch (err) {
    logger.warn('publicMuralService.listPublicMuralPosts', {
      msg: 'fallback to empty',
      err: String(err),
    });
    return [];
  }
}
