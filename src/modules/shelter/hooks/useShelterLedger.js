/**
 * useShelterLedger.js — TASK-791
 *
 * Hooks React Query para prestação de contas do abrigo.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listShelterLedgerEntries,
  createShelterLedgerEntry,
  deleteShelterLedgerEntry,
  listShelterLedgerCategories,
  createShelterLedgerCategory,
  updateShelterLedgerCategory,
  deleteShelterLedgerCategory,
} from '../services/shelterLedgerService';

export function useShelterLedger(clubId) {
  return useQuery({
    queryKey: ['shelter-ledger', clubId],
    queryFn: () => listShelterLedgerEntries(clubId),
    enabled: !!clubId,
  });
}

export function useCreateShelterLedgerEntry(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createShelterLedgerEntry(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-ledger', clubId] }),
  });
}

export function useDeleteShelterLedgerEntry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId) => deleteShelterLedgerEntry(entryId, user),
    onMutate: async (entryId) => {
      // Optimistic delete
      await qc.cancelQueries({ queryKey: ['shelter-ledger'] });
      return null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-ledger'] });
    },
  });
}

export function useShelterLedgerCategories(clubId) {
  return useQuery({
    queryKey: ['shelter-ledger-categories', clubId],
    queryFn: () => listShelterLedgerCategories(clubId),
    enabled: !!clubId,
  });
}

export function useCreateShelterLedgerCategory(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createShelterLedgerCategory(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-ledger-categories', clubId] }),
  });
}

export function useUpdateShelterLedgerCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, updates }) =>
      updateShelterLedgerCategory(categoryId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-ledger-categories'] }),
  });
}

export function useDeleteShelterLedgerCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId) => deleteShelterLedgerCategory(categoryId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-ledger-categories'] }),
  });
}
