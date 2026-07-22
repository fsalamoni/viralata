/**
 * @fileoverview Hooks React Query para anotações do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): CRUD de /pets/{petId}/pet_notes.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listPetNotes, createPetNote, deletePetNote,
} from '../services/petNotesService';

const STALE_TIME_MS = 30_000;
const GC_TIME = 5 * 60_000;

function buildActor(user) {
  return {
    uid: user?.uid,
    displayName: user?.displayName,
    name: user?.displayName,
    email: user?.email,
    isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
  };
}

export function usePetNotes(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'pet_notes'],
    queryFn: () => listPetNotes(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreatePetNote(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text }) => createPetNote(petId, { text }, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'pet_notes'] });
      qc.invalidateQueries({ queryKey: ['pet', petId, 'pet_audit_log'] });
    },
  });
}

export function useDeletePetNote(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId) => deletePetNote(petId, noteId, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'pet_notes'] });
      qc.invalidateQueries({ queryKey: ['pet', petId, 'pet_audit_log'] });
    },
  });
}
