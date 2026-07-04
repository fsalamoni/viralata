import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  createCommunity,
  deleteCommunity,
  getCommunity,
  listCommunities,
  updateCommunity,
} from '@/modules/communities/services/communityService';

export function useCommunities() {
  return useQuery({ queryKey: ['communities'], queryFn: () => listCommunities() });
}

export function useAdminCommunities() {
  return useQuery({ queryKey: ['admin-communities'], queryFn: () => listCommunities({ includeHidden: true }) });
}

export function useCommunity(id) {
  return useQuery({ queryKey: ['community', id], queryFn: () => getCommunity(id), enabled: !!id });
}

export function useCreateCommunity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data) => createCommunity(data, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      qc.invalidateQueries({ queryKey: ['admin-communities'] });
      qc.invalidateQueries({ queryKey: ['admin-clubs'] });
    },
  });
}

export function useUpdateCommunity(id) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (data) => updateCommunity(id, data, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', id] });
      qc.invalidateQueries({ queryKey: ['communities'] });
      qc.invalidateQueries({ queryKey: ['admin-communities'] });
      qc.invalidateQueries({ queryKey: ['admin-clubs'] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });
}

export function useDeleteCommunity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id) => deleteCommunity(id, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      qc.invalidateQueries({ queryKey: ['admin-communities'] });
      qc.invalidateQueries({ queryKey: ['admin-clubs'] });
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['my-clubs'] });
    },
  });
}
