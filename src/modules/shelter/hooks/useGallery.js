/**
 * @fileoverview Hooks React Query para Galeria (Fase 10).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listPetPhotos,
  listDeletedPhotos,
  getPetPhoto,
  createPetPhoto,
  updatePetPhoto,
  softDeletePetPhoto,
  restorePetPhoto,
} from '@/modules/shelter/services/galleryService';

const STALE_TIME_MS = 60_000;

export function usePetPhotos(petId, shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['pet-photos', petId, shelterClubId, options],
    queryFn: () => listPetPhotos(petId, shelterClubId, options),
    enabled: Boolean(petId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useDeletedPetPhotos(petId, shelterClubId) {
  return useQuery({
    queryKey: ['deleted-pet-photos', petId, shelterClubId],
    queryFn: () => listDeletedPhotos(petId, shelterClubId),
    enabled: Boolean(petId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function usePetPhoto(photoId, shelterClubId) {
  return useQuery({
    queryKey: ['pet-photo', photoId],
    queryFn: () => getPetPhoto(photoId, shelterClubId),
    enabled: Boolean(photoId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreatePetPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createPetPhoto(input, actor),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pet-photos', vars.input.pet_id, vars.input.shelter_club_id] });
    },
  });
}

export function useUpdatePetPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, shelterClubId, updates, actor }) =>
      updatePetPhoto(photoId, shelterClubId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet-photos'] });
      qc.invalidateQueries({ queryKey: ['deleted-pet-photos'] });
    },
  });
}

export function useSoftDeletePetPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, shelterClubId, actor }) =>
      softDeletePetPhoto(photoId, shelterClubId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet-photos'] });
      qc.invalidateQueries({ queryKey: ['deleted-pet-photos'] });
    },
  });
}

export function useRestorePetPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, shelterClubId, actor }) =>
      restorePetPhoto(photoId, shelterClubId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet-photos'] });
      qc.invalidateQueries({ queryKey: ['deleted-pet-photos'] });
    },
  });
}
