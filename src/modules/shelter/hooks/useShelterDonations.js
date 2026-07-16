/**
 * useShelterDonations.js — TASK-790
 *
 * Hooks React Query para CRUD de campanhas de doação do abrigo.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listShelterDonations,
  getShelterDonation,
  createShelterDonation,
  updateShelterDonation,
  addShelterDonationFunds,
  deleteShelterDonation,
  listShelterDonationReceipts,
  listAllShelterDonationReceipts,
  createShelterDonationReceipt,
  updateShelterReceiptStatus,
  deleteShelterDonationReceipt,
} from '../services/shelterDonationService';

export function useShelterDonations(clubId) {
  return useQuery({
    queryKey: ['shelter-donations', clubId],
    queryFn: () => listShelterDonations(clubId),
    enabled: !!clubId,
  });
}

export function useShelterDonation(clubId, donationId) {
  return useQuery({
    queryKey: ['shelter-donation', clubId, donationId],
    queryFn: () => getShelterDonation(clubId, donationId),
    enabled: !!clubId && !!donationId,
  });
}

export function useCreateShelterDonation(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createShelterDonation(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-donations', clubId] }),
  });
}

export function useUpdateShelterDonation(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ donationId, updates }) =>
      updateShelterDonation(clubId, donationId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-donations', clubId] }),
  });
}

export function useAddShelterDonationFunds(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ donationId, amount }) =>
      addShelterDonationFunds(clubId, donationId, amount, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-donations', clubId] }),
  });
}

export function useDeleteShelterDonation(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (donationId) => deleteShelterDonation(clubId, donationId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shelter-donations', clubId] }),
  });
}

export function useShelterDonationReceipts(clubId, donationId) {
  return useQuery({
    queryKey: ['shelter-donation-receipts', clubId, donationId],
    queryFn: () => listShelterDonationReceipts(clubId, donationId),
    enabled: !!clubId && !!donationId,
  });
}

export function useAllShelterDonationReceipts(clubId) {
  return useQuery({
    queryKey: ['shelter-donation-receipts-all', clubId],
    queryFn: () => listAllShelterDonationReceipts(clubId),
    enabled: !!clubId,
  });
}

export function useCreateShelterReceipt(clubId, donationId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      createShelterDonationReceipt(clubId, donationId, input, user, userProfile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-donation-receipts', clubId, donationId] });
      qc.invalidateQueries({ queryKey: ['shelter-donations', clubId] });
    },
  });
}

export function useUpdateShelterReceiptStatus(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receiptId, status, adminNote }) =>
      updateShelterReceiptStatus(clubId, receiptId, status, adminNote, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-donation-receipts'] });
      qc.invalidateQueries({ queryKey: ['shelter-donation-receipts-all', clubId] });
    },
  });
}

export function useDeleteShelterDonationReceipt(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId) => deleteShelterDonationReceipt(clubId, receiptId, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-donation-receipts'] });
      qc.invalidateQueries({ queryKey: ['shelter-donation-receipts-all', clubId] });
      qc.invalidateQueries({ queryKey: ['shelter-donations', clubId] });
    },
  });
}
