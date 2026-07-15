/**
 * @fileoverview useAdopterDashboard — hook para o dashboard unificado do adotante
 * (TASK-339).
 *
 * Agrega dados de múltiplas fontes:
 *  - Applications (adoções) via listMyApplications
 *  - Perfil do adotante + completeness via getAdopterProfile
 *  - Tasks de pós-adoção via getMyCardsAll (tag post-adoption)
 *  - Notificações não lidas via useNotifications
 *  - Favoritos via users/{uid}/favorites
 *
 * Flag-gated por SHELTER_ADOPTER_DASHBOARD_V1.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-339
 */
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useAdopterProfile } from '@/modules/shelter/hooks/useAdopterProfile';
import { useNotifications } from '@/modules/notifications/hooks/useNotifications';
import { useQuery } from '@tanstack/react-query';
import { listMyApplications } from '@/modules/shelter/services/adoptionService';
import { getMyCardsAll } from '@/modules/shelter/services/kanbanService';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

const STALE_TIME_MS = 30_000;

async function getFavoritePets(uid) {
  if (!db || !uid) return [];
  try {
    const q = query(collection(db, 'users', uid, 'favorites'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('getFavoritePets', { uid, err: String(err) });
    return [];
  }
}

async function getMyAdoptionsSummary(uid) {
  if (!uid) return { total: 0, concluded: 0, inProgress: 0, pending: 0, byStatus: {} };
  try {
    const apps = await listMyApplications(uid, { maxResults: 100 });
    const byStatus = {};
    apps.forEach((a) => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });
    const concluded =
      (byStatus.concluded || 0) +
      (byStatus.completed || 0) +
      (byStatus.closed || 0);
    const inProgress = (byStatus.approved || 0) + (byStatus.in_review || 0);
    const pending = (byStatus.applied || 0);
    return { total: apps.length, concluded, inProgress, pending, byStatus };
  } catch (err) {
    logger.warn('getMyAdoptionsSummary', { uid, err: String(err) });
    return { total: 0, concluded: 0, inProgress: 0, pending: 0, byStatus: {} };
  }
}

async function getUpcomingMilestones(uid) {
  if (!uid) return [];
  try {
    const cards = await getMyCardsAll(uid);
    const now = Date.now();
    // Próximas 30 dias
    const cutoff = now + 30 * 24 * 60 * 60 * 1000;
    return cards
      .filter((c) => {
        if (!Array.isArray(c.tags) || !c.tags.includes('post-adoption')) return false;
        if (c.column_name === 'done' || c.column_name === 'closed') return false;
        const due = c.due_at?.toMillis ? c.due_at.toMillis() : new Date(c.due_at).getTime();
        return due <= cutoff && due >= now - 7 * 24 * 60 * 60 * 1000; // inclui até 7d overdue
      })
      .sort((a, b) => {
        const aTime = a.due_at?.toMillis ? a.due_at.toMillis() : 0;
        const bTime = b.due_at?.toMillis ? b.due_at.toMillis() : 0;
        return aTime - bTime;
      })
      .slice(0, 5);
  } catch (err) {
    logger.warn('getUpcomingMilestones', { uid, err: String(err) });
    return [];
  }
}

export function useAdopterDashboard() {
  const { user } = useAuth();
  const uid = user?.uid;

  const { data: profile, isLoading: profileLoading } = useAdopterProfile(uid);
  const { unreadCount, isLoading: notifLoading } = useNotifications();

  const { data: adoptions = {}, isLoading: adoptionsLoading } = useQuery({
    queryKey: ['adopter-dashboard', 'adoptions', uid],
    queryFn: () => getMyAdoptionsSummary(uid),
    enabled: Boolean(uid),
    staleTime: STALE_TIME_MS,
  });

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['adopter-dashboard', 'milestones', uid],
    queryFn: () => getUpcomingMilestones(uid),
    enabled: Boolean(uid),
    staleTime: STALE_TIME_MS,
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['adopter-dashboard', 'favorites', uid],
    queryFn: () => getFavoritePets(uid),
    enabled: Boolean(uid),
    staleTime: STALE_TIME_MS,
  });

  const isLoading = profileLoading || notifLoading || adoptionsLoading || milestonesLoading || favoritesLoading;

  return {
    isLoading,
    profile,
    profileCompleteness: profile?.profile_completeness ?? 0,
    adoptions,
    milestones,
    favoritesCount: favorites.length,
    unreadCount,
  };
}
