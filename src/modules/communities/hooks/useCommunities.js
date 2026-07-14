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

import {
  getCommunityMembership,
  listCommunityMembers,
  setCommunityMemberRole,
  setCommunityMemberPermissions,
  removeCommunityMember,
  getCommunityEvent,
  getCommunityEventRsvps,
  setCommunityEventRsvp,
  removeCommunityEventRsvp,
} from '../services/communityService';

export function useMyCommunityMembership(communityId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['communityMembership', communityId, user?.uid],
    queryFn: () => getCommunityMembership(communityId, user?.uid),
    enabled: !!communityId && !!user?.uid,
  });
}

export function useCommunityMembers(communityId) {
  return useQuery({
    queryKey: ['communityMembers', communityId],
    queryFn: () => listCommunityMembers(communityId),
    enabled: !!communityId,
  });
}

export function useSetCommunityMemberRole(communityId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ targetUserId, role }) => setCommunityMemberRole(communityId, targetUserId, role, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityMembers', communityId] });
    },
  });
}

export function useSetCommunityMemberPermissions(communityId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ targetUserId, permissions }) => setCommunityMemberPermissions(communityId, targetUserId, permissions, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityMembers', communityId] });
    },
  });
}

export function useRemoveCommunityMember(communityId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (targetUserId) => removeCommunityMember(communityId, targetUserId, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityMembers', communityId] });
    },
  });
}

// ─── Community Event ──────────────────────────────────────────────────────────

export function useCommunityEvent(communityId, eventId) {
  return useQuery({
    queryKey: ['communityEvent', communityId, eventId],
    queryFn: () => getCommunityEvent(communityId, eventId),
    enabled: !!communityId && !!eventId,
  });
}

export function useCommunityEventRsvps(eventId) {
  return useQuery({
    queryKey: ['communityEventRsvps', eventId],
    queryFn: () => getCommunityEventRsvps(eventId),
    enabled: !!eventId,
  });
}

export function useSetCommunityEventRsvp(eventId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (status) =>
      setCommunityEventRsvp(
        eventId,
        user.uid,
        user.displayName || user.email || 'Membro',
        user.photoURL || '',
        status,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityEventRsvps', eventId] });
    },
  });
}

export function useRemoveCommunityEventRsvp(eventId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => removeCommunityEventRsvp(eventId, user.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityEventRsvps', eventId] });
    },
  });
}
