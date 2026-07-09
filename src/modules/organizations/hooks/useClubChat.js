import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  getClubChatThread,
  openOrCreateChatThread,
  listClubChatMessages,
  sendClubChatMessage,
  updateClubChatMessage,
  deleteClubChatMessage,
  setClubChatThreadStatus,
  listClubChatThreads,
  listMyClubChatThreads,
} from '../services/clubChatService';

/** Hook que retorna a thread do usuário com uma ONG. Cria se não existir. */
export function useMyClubChatThread(club, { autoCreate = false } = {}) {
  const { user, userProfile } = useAuth();
  return useQuery({
    queryKey: ['club-chat-thread', club?.id, user?.uid],
    queryFn: async () => {
      if (!club?.id || !user?.uid) return null;
      const existing = await getClubChatThread(club.id, user.uid);
      if (existing) return existing;
      if (autoCreate) return openOrCreateChatThread(club, user, userProfile);
      return null;
    },
    enabled: !!club?.id && !!user?.uid,
    staleTime: 30_000,
  });
}

/** Cria (ou retorna) a thread atual. Mutação. */
export function useOpenClubChatThread(club) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => openOrCreateChatThread(club, user, userProfile),
    onSuccess: (thread) => {
      qc.setQueryData(['club-chat-thread', club?.id, user?.uid], thread);
      qc.invalidateQueries({ queryKey: ['my-club-chat-threads'] });
    },
  });
}

export function useClubChatMessages(threadId) {
  return useQuery({
    queryKey: ['club-chat-messages', threadId],
    queryFn: () => listClubChatMessages(threadId),
    enabled: !!threadId,
    refetchInterval: 8000,
  });
}

export function useSendClubChatMessage(threadId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text, role = 'user' }) => {
      const profile = { ...(userProfile || {}), __role: role };
      return sendClubChatMessage(threadId, { text }, user, profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-chat-messages', threadId] });
      qc.invalidateQueries({ queryKey: ['club-chat-threads'] });
      qc.invalidateQueries({ queryKey: ['my-club-chat-threads'] });
    },
  });
}

export function useUpdateClubChatMessage(threadId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text }) => updateClubChatMessage(threadId, messageId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-chat-messages', threadId] }),
  });
}

export function useDeleteClubChatMessage(threadId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => deleteClubChatMessage(threadId, messageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-chat-messages', threadId] }),
  });
}

export function useSetClubChatThreadStatus(threadId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status) => setClubChatThreadStatus(threadId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-chat-thread'] }),
  });
}

/** Threads abertas com a ONG (uso da equipe). Faz polling a cada 12s. */
export function useClubChatThreads(clubId) {
  return useQuery({
    queryKey: ['club-chat-threads', clubId],
    queryFn: () => listClubChatThreads(clubId),
    enabled: !!clubId,
    refetchInterval: 12000,
  });
}

export function useMyClubChatThreads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-club-chat-threads', user?.uid],
    queryFn: () => (user?.uid ? listMyClubChatThreads(user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
    refetchInterval: 20000,
  });
}

/** Polling reativo: refetch a cada 10s enquanto a janela estiver aberta. */
export function useChatPolling(threadId) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!threadId) return undefined;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['club-chat-messages', threadId] });
    }, 10000);
    return () => clearInterval(t);
  }, [threadId, qc]);
}
