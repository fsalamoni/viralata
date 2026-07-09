import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listLedgerCategories,
  createLedgerCategory,
  updateLedgerCategory,
  deleteLedgerCategory,
} from '../services/clubLedgerCategoryService';

export function useClubLedgerCategories(clubId) {
  return useQuery({
    queryKey: ['club-ledger-categories', clubId],
    queryFn: () => listLedgerCategories(clubId),
    enabled: !!clubId,
  });
}

export function useCreateLedgerCategory(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createLedgerCategory(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-ledger-categories', clubId] }),
  });
}

export function useUpdateLedgerCategory(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, updates }) => updateLedgerCategory(categoryId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-ledger-categories', clubId] }),
  });
}

export function useDeleteLedgerCategory(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId) => deleteLedgerCategory(categoryId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-ledger-categories', clubId] }),
  });
}
