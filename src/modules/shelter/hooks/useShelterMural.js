/**
 * Hooks do Mural V2 do abrigo (Fase 4 · SHELTER_MURAL_V2).
 *
 * Envolvem `shelterMuralService` com React Query, invalidando as mesmas
 * chaves usadas pelo mural atual (`['club-posts', clubId]`) para que as
 * superfícies V1 e V2 fiquem coerentes. Listagem/comentários continuam
 * reaproveitando os hooks existentes de `useClubFeed`.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  createMuralPost,
  updateMuralPost,
  setPostPinned,
  setPostStatus,
  archivePost,
  publishPost,
  hideComment,
  unhideComment,
} from '@/modules/shelter/services/shelterMuralService';

function useInvalidatePosts(clubId) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['club-posts', clubId] });
}

export function useCreateMuralPost(clubId) {
  const { user, userProfile } = useAuth();
  const invalidate = useInvalidatePosts(clubId);
  return useMutation({
    mutationFn: (input) => createMuralPost(clubId, input, user, userProfile),
    onSuccess: invalidate,
  });
}

export function useUpdateMuralPost(clubId) {
  const { user } = useAuth();
  const invalidate = useInvalidatePosts(clubId);
  return useMutation({
    mutationFn: ({ postId, input }) => updateMuralPost(postId, input, user),
    onSuccess: invalidate,
  });
}

export function useSetPostPinned(clubId) {
  const { user } = useAuth();
  const invalidate = useInvalidatePosts(clubId);
  return useMutation({
    mutationFn: ({ postId, pinned }) => setPostPinned(postId, pinned, user),
    onSuccess: invalidate,
  });
}

export function useSetPostStatus(clubId) {
  const { user } = useAuth();
  const invalidate = useInvalidatePosts(clubId);
  return useMutation({
    mutationFn: ({ postId, status }) => setPostStatus(postId, status, user),
    onSuccess: invalidate,
  });
}

export function useArchivePost(clubId) {
  const { user } = useAuth();
  const invalidate = useInvalidatePosts(clubId);
  return useMutation({
    mutationFn: (postId) => archivePost(postId, user),
    onSuccess: invalidate,
  });
}

export function usePublishPost(clubId) {
  const { user } = useAuth();
  const invalidate = useInvalidatePosts(clubId);
  return useMutation({
    mutationFn: (postId) => publishPost(postId, user),
    onSuccess: invalidate,
  });
}

export function useHideComment(clubId, postId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => hideComment(postId, commentId, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-posts', clubId] });
      qc.invalidateQueries({ queryKey: ['club-post-comments', postId] });
    },
  });
}

export function useUnhideComment(clubId, postId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => unhideComment(postId, commentId, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-posts', clubId] });
      qc.invalidateQueries({ queryKey: ['club-post-comments', postId] });
    },
  });
}
