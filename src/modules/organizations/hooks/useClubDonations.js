import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listClubDonations,
  getClubDonation,
  createClubDonation,
  updateClubDonation,
  addDonationFunds,
  deleteClubDonation,
  listDonationReceipts,
  listAllDonationReceipts,
  createDonationReceipt,
  updateReceiptStatus,
  deleteDonationReceipt,
} from '../services/clubDonationService';

export function useClubDonations(clubId) {
  return useQuery({
    queryKey: ['club-donations', clubId],
    queryFn: () => listClubDonations(clubId),
    enabled: !!clubId,
  });
}

export function useClubDonation(donationId) {
  return useQuery({
    queryKey: ['club-donation', donationId],
    queryFn: () => getClubDonation(donationId),
    enabled: !!donationId,
  });
}

export function useCreateClubDonation(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createClubDonation(clubId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-donations', clubId] }),
  });
}

export function useUpdateClubDonation(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ donationId, updates }) => updateClubDonation(donationId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-donations', clubId] }),
  });
}

export function useAddDonationFunds(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ donationId, amount }) => addDonationFunds(donationId, amount, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-donations', clubId] }),
  });
}

export function useDeleteClubDonation(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (donationId) => deleteClubDonation(donationId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['club-donations', clubId] }),
  });
}

export function useDonationReceipts(donationId) {
  return useQuery({
    queryKey: ['club-donation-receipts', donationId],
    queryFn: () => listDonationReceipts(donationId),
    enabled: !!donationId,
  });
}

export function useAllClubReceipts(clubId) {
  return useQuery({
    queryKey: ['club-donation-receipts-all', clubId],
    queryFn: () => listAllDonationReceipts(clubId),
    enabled: !!clubId,
  });
}

export function useCreateReceipt(donationId) {
  const { user, userProfile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => createDonationReceipt(donationId, input, user, userProfile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-donation-receipts', donationId] });
      qc.invalidateQueries({ queryKey: ['club-donations'] });
    },
  });
}

export function useUpdateReceiptStatus(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ receiptId, status, adminNote }) => updateReceiptStatus(receiptId, status, adminNote, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-donation-receipts'] });
      qc.invalidateQueries({ queryKey: ['club-donation-receipts-all', clubId] });
    },
  });
}

export function useDeleteReceipt(clubId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiptId) => deleteDonationReceipt(receiptId, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club-donation-receipts'] });
      qc.invalidateQueries({ queryKey: ['club-donation-receipts-all', clubId] });
    },
  });
}
