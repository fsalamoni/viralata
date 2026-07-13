/**
 * @fileoverview useMyPostAdoptionTasks — hook para dashboard pós-adoção
 * do adotante (TASK-289).
 *
 * Cross-shelter via collectionGroup em `kanban_cards`. Filtra por
 * `assignees` (array-contains uid) e tags `post-adoption` (Fase 6) —
 * mas aceita qualquer card que tenha `assignees` (a separação visual
 * fica na UI).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 6 (Pós-adoção)
 */
import { useQuery } from '@tanstack/react-query';
import { getMyCardsAll } from '@/modules/shelter/services/kanbanService';
import { logger } from '@/core/lib/logger';

const STALE_TIME_MS = 30_000;

export function useMyPostAdoptionTasks(uid, { includeNonPostAdoption = false } = {}) {
  return useQuery({
    queryKey: ['postAdoption', 'tasks', uid, includeNonPostAdoption],
    queryFn: async () => {
      try {
        const cards = await getMyCardsAll(uid);
        if (!Array.isArray(cards)) return [];
        // Filtra: tasks de pós-adoção têm tag 'post-adoption' no card.
        // Se includeNonPostAdoption=true, mostra todos (debug).
        if (includeNonPostAdoption) return cards;
        return cards.filter((c) =>
          Array.isArray(c.tags) && c.tags.includes('post-adoption'),
        );
      } catch (err) {
        logger.warn('useMyPostAdoptionTasks', { uid, err: String(err) });
        return [];
      }
    },
    enabled: Boolean(uid),
    staleTime: STALE_TIME_MS,
  });
}
