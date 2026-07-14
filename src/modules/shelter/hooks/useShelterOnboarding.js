/**
 * @fileoverview Hooks React Query para o ShelterOnboardingWizard (TASK-309).
 *
 * - `useOnboardingProgress(clubId)` — busca o doc
 *   `clubs/{clubId}/onboarding_progress` (ou null se não existir).
 * - `useSaveOnboardingProgress(clubId)` — mutation que faz setDoc (merge).
 * - `useCompleteOnboarding(clubId)` — mutation que marca completed=true
 *   e atualiza `clubs/{clubId}` com `onboarding_completed: true`.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';

const COLLECTION = 'clubs';
const SUBCOLLECTION = 'onboarding_progress';

export const DEFAULT_PROGRESS = {
  currentStep: 0,
  completedSteps: [],
  data: {},
  startedAt: null,
  completedAt: null,
};

/** Busca o progresso de onboarding do abrigo. */
export function useOnboardingProgress(clubId) {
  return useQuery({
    queryKey: ['shelter-onboarding', clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const ref = doc(db, COLLECTION, clubId, SUBCOLLECTION, 'progress');
      const snap = await getDoc(ref);
      if (!snap.exists()) return { ...DEFAULT_PROGRESS, startedAt: null };
      return { id: snap.id, ...snap.data() };
    },
    enabled: Boolean(clubId),
    staleTime: 10_000,
  });
}

/** Salva (merge) o progresso de onboarding. */
export function useSaveOnboardingProgress(clubId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ step, completedSteps, data }) => {
      if (!clubId) throw new Error('clubId required');
      const ref = doc(db, COLLECTION, clubId, SUBCOLLECTION, 'progress');
      const now = serverTimestamp();
      await setDoc(
        ref,
        {
          currentStep: step ?? 0,
          completedSteps: completedSteps ?? [],
          data: data ?? {},
          startedAt: now,
        },
        { merge: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelter-onboarding', clubId] });
    },
  });
}

/** Marca onboarding como completo e atualiza o doc do clube. */
export function useCompleteOnboarding(clubId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petData, inviteEmail }) => {
      if (!clubId) throw new Error('clubId required');

      // 1) Marca progresso completo
      const progressRef = doc(db, COLLECTION, clubId, SUBCOLLECTION, 'progress');
      await setDoc(
        progressRef,
        {
          currentStep: 4,
          completedSteps: [0, 1, 2, 3, 4],
          completedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2) Marca clube com onboarding_completed (via useUpdateClub no componente)
      // O componente pai (wizard) vai chamar updateClub separadamente.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelter-onboarding', clubId] });
    },
  });
}
