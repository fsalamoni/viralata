/**
 * @fileoverview useVolunteerMetrics — hook que busca participações
 * do voluntário em todos os abrigos e computa métricas (TASK-126).
 */
import { useQuery } from '@tanstack/react-query';
import { fetchUserParticipations, computeVolunteerMetrics } from '../services/volunteerMetricsService';

const METRICS_KEY = (uid) => ['volunteer-metrics', uid];

export function useVolunteerMetrics(uid) {
  return useQuery({
    queryKey: METRICS_KEY(uid),
    queryFn: async () => {
      if (!uid) return { participations: [], metrics: computeVolunteerMetrics([]) };
      const participations = await fetchUserParticipations(uid);
      const metrics = computeVolunteerMetrics(participations);
      return { participations, metrics };
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
