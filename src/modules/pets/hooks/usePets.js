/**
 * @fileoverview Hooks React Query para o módulo de Pets
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  getAvailablePets, getPetById, getPetsByOwner,
  createPet, updatePet, deletePet, completePetAdoption,
} from '../services/petService';
import {
  createInterest, getInterestsByPet, getInterestsByUser, hasInterest, updateInterestStatus,
} from '../services/interestService';
import { getMyRadar, setRadarActive } from '../services/petRadarService';
import { createRating, getMyRatingForPet } from '../services/ratingService';
import { filterCompatiblePets, sortByRelevance } from '../domain/matching';

// ─── Pets ────────────────────────────────────────────────────────────────────

export function useAvailablePets(filters = {}) {
  return useQuery({
    queryKey: ['pets', 'available', filters],
    queryFn: () => getAvailablePets(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePetFeed(filters = {}) {
  const { userProfile } = useAuth();
  const query = useAvailablePets(filters);
  const compatible = query.data && userProfile
    ? sortByRelevance(filterCompatiblePets(query.data, userProfile))
    : [];
  return { ...query, data: compatible };
}

export function usePet(petId) {
  return useQuery({
    queryKey: ['pets', petId],
    queryFn: () => getPetById(petId),
    enabled: Boolean(petId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyPets(ownerId) {
  return useQuery({
    queryKey: ['pets', 'owner', ownerId],
    queryFn: () => getPetsByOwner(ownerId),
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreatePet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (petData) => createPet(petData, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pets'] }),
  });
}

export function useUpdatePet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, updates }) => updatePet(petId, updates, user),
    onSuccess: (_, { petId }) => {
      qc.invalidateQueries({ queryKey: ['pets', petId] });
      qc.invalidateQueries({ queryKey: ['pets', 'available'] });
    },
  });
}

export function useDeletePet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (petId) => deletePet(petId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pets'] }),
  });
}

export function useCompleteAdoption() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, adoptedByUid }) => completePetAdoption(petId, adoptedByUid, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pets'] }),
  });
}

// ─── Interesses ──────────────────────────────────────────────────────────────

export function useInterestsByPet(petId) {
  return useQuery({
    queryKey: ['interests', 'pet', petId],
    queryFn: () => getInterestsByPet(petId),
    enabled: Boolean(petId),
    staleTime: 1000 * 30,
  });
}

export function useInterestsByUser(userId) {
  return useQuery({
    queryKey: ['interests', 'user', userId],
    queryFn: () => getInterestsByUser(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
}

export function useHasInterest(petId, userId) {
  return useQuery({
    queryKey: ['interests', 'has', petId, userId],
    queryFn: () => hasInterest(petId, userId),
    enabled: Boolean(petId && userId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateInterest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (petId) => createInterest(petId, user.uid, user),
    onSuccess: (_, petId) => {
      qc.invalidateQueries({ queryKey: ['interests', 'pet', petId] });
      qc.invalidateQueries({ queryKey: ['interests', 'has', petId, user?.uid] });
    },
  });
}

export function useUpdateInterestStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ petId, userId, status }) => updateInterestStatus(petId, userId, status, user),
    onSuccess: (_, { petId }) => qc.invalidateQueries({ queryKey: ['interests', 'pet', petId] }),
  });
}

// ─── Radar de Pets ───────────────────────────────────────────────────────────

export function useMyRadar(uid) {
  return useQuery({
    queryKey: ['pet_radar', uid],
    queryFn: () => getMyRadar(uid),
    enabled: Boolean(uid),
    staleTime: 1000 * 60,
  });
}

export function useSetRadarActive() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (active) => setRadarActive(user.uid, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pet_radar', user?.uid] }),
  });
}

// ─── Avaliações pós-adoção ───────────────────────────────────────────────────

export function useMyRatingForPet(petId, raterUid) {
  return useQuery({
    queryKey: ['adoption_ratings', 'mine', petId, raterUid],
    queryFn: () => getMyRatingForPet(petId, raterUid),
    enabled: Boolean(petId && raterUid),
    staleTime: 1000 * 60,
  });
}

export function useCreateRating() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => createRating(input, user),
    onSuccess: (_, { petId, ratedUid }) => {
      qc.invalidateQueries({ queryKey: ['adoption_ratings', 'mine', petId, user?.uid] });
      qc.invalidateQueries({ queryKey: ['adoption_ratings', 'user', ratedUid] });
    },
  });
}
