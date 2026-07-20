/**
 * @fileoverview React Query hooks for Partner module.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  incrementPartnerCounters,
} from '../services/partnersService';
import {
  listBannersByPartner,
  listActiveBannersForPosition,
  getBanner,
  createBanner,
  updateBanner,
  setBannerStatus,
  deleteBanner,
  incrementBannerCounters,
} from '../services/bannersService';
import {
  trackView as trackViewSvc,
  trackClick as trackClickSvc,
  getBannerStats,
  listBannerEvents,
} from '../services/analyticsService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';

// ════════════════════════════════════════════════════════════════════════════
// PARTNERS
// ════════════════════════════════════════════════════════════════════════════

export function usePartners(filters = {}) {
  return useQuery({
    queryKey: ['partners', 'list', filters],
    queryFn: () => listPartners(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePartner(partnerId) {
  return useQuery({
    queryKey: ['partners', 'detail', partnerId],
    queryFn: () => getPartner(partnerId),
    enabled: !!partnerId,
    staleTime: 1000 * 60,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input) => createPartner(input, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ partnerId, input }) => updatePartner(partnerId, input, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', 'detail', vars.partnerId] });
    },
  });
}

export function useDeletePartner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (partnerId) => deletePartner(partnerId, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// BANNERS
// ════════════════════════════════════════════════════════════════════════════

export function useBannersByPartner(partnerId) {
  return useQuery({
    queryKey: ['banners', 'partner', partnerId],
    queryFn: () => listBannersByPartner(partnerId),
    enabled: !!partnerId,
    staleTime: 1000 * 60,
  });
}

export function useBanner(partnerId, bannerId) {
  return useQuery({
    queryKey: ['banners', 'detail', partnerId, bannerId],
    queryFn: () => getBanner(partnerId, bannerId),
    enabled: !!(partnerId && bannerId),
  });
}

export function useActiveBannersForPosition(position) {
  return useQuery({
    queryKey: ['banners', 'active', 'position', position],
    queryFn: () => listActiveBannersForPosition(position),
    enabled: !!position,
    staleTime: 1000 * 60 * 2, // 2min
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ partnerId, input }) => createBanner(partnerId, input, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      qc.invalidateQueries({ queryKey: ['banners', 'partner', vars.partnerId] });
      qc.invalidateQueries({ queryKey: ['partners', 'detail', vars.partnerId] });
    },
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ partnerId, bannerId, input }) => updateBanner(partnerId, bannerId, input, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      qc.invalidateQueries({ queryKey: ['banners', 'partner', vars.partnerId] });
    },
  });
}

export function useSetBannerStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ partnerId, bannerId, status }) => setBannerStatus(partnerId, bannerId, status, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      qc.invalidateQueries({ queryKey: ['banners', 'partner', vars.partnerId] });
    },
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ partnerId, bannerId }) => deleteBanner(partnerId, bannerId, { uid: user?.uid, displayName: user?.displayName }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['banners'] });
      qc.invalidateQueries({ queryKey: ['banners', 'partner', vars.partnerId] });
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════════════════════

export function useTrackView() {
  return useMutation({ mutationFn: trackViewSvc });
}

export function useTrackClick() {
  return useMutation({ mutationFn: trackClickSvc });
}

export function useBannerStats(partnerId, bannerId) {
  return useQuery({
    queryKey: ['banner-stats', partnerId, bannerId],
    queryFn: () => getBannerStats(partnerId, bannerId),
    enabled: !!(partnerId && bannerId),
    staleTime: 1000 * 30, // 30s
  });
}

export function useBannerEvents(partnerId, bannerId, maxEvents = 200) {
  return useQuery({
    queryKey: ['banner-events', partnerId, bannerId, maxEvents],
    queryFn: () => listBannerEvents(partnerId, bannerId, maxEvents),
    enabled: !!(partnerId && bannerId),
  });
}

// Re-export the increment counter helpers for backward compat
export { incrementPartnerCounters, incrementBannerCounters };
