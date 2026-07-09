import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listClubPosts,
  getClubPost,
  createClubPost,
  updateClubPost,
  deleteClubPost,
  listMyLikedPostIds,
  toggleClubPostLike,
  listClubPostComments,
  addClubPostComment,
  updateClubPostComment,
  deleteClubPostComment,
} from '../services/clubFeedService';

export function useClubPosts(clubId) {
  return useQuery({
    queryKey: ['club-posts', clubId],
    queryFn: () => listClubPosts(clubId),
    enabled: !!clubId,
  });
}

export function useClubPost(postId) {
  return useQuery({
    queryKey: ['club-post', postId],
    queryFn: () => getClubPost(postId),
    enabled: !!postId,
  });
}

export function useCreateClubPost(clubId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => createClubPost(clubId, input, user, userProfile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-posts', clubId] }),
  });
}

export function useUpdateClubPost(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, input }) => updateClubPost(postId, input, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-posts', clubId] }),
  });
}

export function useDeleteClubPost(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId) => deleteClubPost(postId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-posts', clubId] }),
  });
}

export function useMyLikedPostIds(clubId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-liked-club-posts', user?.uid, clubId],
    queryFn: () => (user?.uid ? listMyLikedPostIds(clubId, user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
  });
}

export function useToggleClubPostLike(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (post) => toggleClubPostLike(post, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-posts', clubId] });
      qc.invalidateQueries({ queryKey: ['my-liked-club-posts'] });
    },
  });
}

export function useClubPostComments(postId) {
  return useQuery({
    queryKey: ['club-post-comments', postId],
    queryFn: () => listClubPostComments(postId),
    enabled: !!postId,
  });
}

export function useAddClubPostComment(postId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ post, text }) => addClubPostComment(post, text, user, userProfile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-post-comments', postId] });
      qc.invalidateQueries({ queryKey: ['club-posts'] });
    },
  });
}

export function useUpdateClubPostComment(postId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, text }) => updateClubPostComment(postId, commentId, text, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-post-comments', postId] }),
  });
}

export function useDeleteClubPostComment(postId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => deleteClubPostComment(postId, commentId, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-post-comments', postId] });
      qc.invalidateQueries({ queryKey: ['club-posts'] });
    },
  });
}
