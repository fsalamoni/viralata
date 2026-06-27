import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  createOpenGame,
  listOpenGames,
  listMyOpenGames,
  closeOpenGame,
  deleteOpenGame,
} from '../services/openGameService.js';

/** Mural de convites abertos. */
export function useOpenGames() {
  return useQuery({ queryKey: ['open-games'], queryFn: listOpenGames, staleTime: 30_000 });
}

/** Convites do próprio usuário. */
export function useMyOpenGames() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['open-games', 'mine', user?.uid],
    queryFn: () => (user?.uid ? listMyOpenGames(user.uid) : Promise.resolve([])),
    enabled: !!user?.uid,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['open-games'] });
}

export function useCreateOpenGame() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input) => createOpenGame(input, user), onSuccess: invalidate });
}

export function useCloseOpenGame() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id) => closeOpenGame(id, user), onSuccess: invalidate });
}

export function useDeleteOpenGame() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id) => deleteOpenGame(id, user), onSuccess: invalidate });
}
