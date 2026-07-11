/**
 * @fileoverview Hooks React Query para Termos & Aceites (Fase 19).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAcceptances,
  getCurrentAcceptances,
  hasAccepted,
  getPendingTypes,
  recordAcceptance,
  recordBulkAcceptances,
} from '@/modules/shelter/services/termsAcceptanceService';
import {
  computeDocumentHash,
  getCurrentTermsVersion,
  getRequiredTermsForRoles,
  getTermsDocument,
} from '@/modules/shelter/domain/legal/terms';

const STALE_TIME_MS = 60_000;

// ─── Queries ──────────────────────────────────────────────────────────

/** Lista todos os aceites do usuário (qualquer versão). */
export function useAcceptances(userId) {
  return useQuery({
    queryKey: ['terms-acceptances', userId],
    queryFn: () => getAcceptances(userId),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

/** Apenas aceites da versão atual (um por tipo). */
export function useCurrentAcceptances(userId) {
  return useQuery({
    queryKey: ['terms-acceptances-current', userId],
    queryFn: () => getCurrentAcceptances(userId),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

/** Hook gating: o usuário aceitou o tipo X na versão atual? */
export function useHasAccepted(userId, type) {
  return useQuery({
    queryKey: ['terms-acceptances', userId, type, getCurrentTermsVersion(type)],
    queryFn: () => hasAccepted(userId, type),
    enabled: Boolean(userId && type),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Retorna os tipos de termo pendentes para os roles do usuário.
 * Usado para saber se o modal de aceite precisa aparecer.
 *
 * @param {string} userId
 * @param {string|string[]} roles
 */
export function usePendingTerms(userId, roles) {
  const required = Array.isArray(roles)
    ? getRequiredTermsForRoles(roles)
    : getRequiredTermsForRoles(roles || 'adopter');

  return useQuery({
    queryKey: ['terms-pending', userId, ...required.sort()],
    queryFn: () => getPendingTypes(userId, required),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────

/** Registra 1 aceite. */
export function useRecordAcceptance(userId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => recordAcceptance(userId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terms-acceptances', userId] });
      qc.invalidateQueries({ queryKey: ['terms-acceptances-current', userId] });
      qc.invalidateQueries({ queryKey: ['terms-pending', userId] });
    },
  });
}

/** Registra múltiplos aceites (fluxo de signup). */
export function useRecordBulkAcceptances(userId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ items, actor, ctx }) =>
      recordBulkAcceptances(userId, items, actor, ctx),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terms-acceptances', userId] });
      qc.invalidateQueries({ queryKey: ['terms-acceptances-current', userId] });
      qc.invalidateQueries({ queryKey: ['terms-pending', userId] });
    },
  });
}

// ─── Helpers client-side (sem I/O) ───────────────────────────────────

/**
 * Hook de conveniência: dado um tipo, retorna a versão canônica e
 * o caminho do documento. Útil para abrir o termo no modal.
 */
export function useTermsDocument(type) {
  return {
    ...getTermsDocument(type),
    version: getCurrentTermsVersion(type),
  };
}

/**
 * Helper para calcular o hash do conteúdo exibido no client (modal).
 * Retorna uma função memoizada.
 */
export function useDocumentHash() {
  return computeDocumentHash;
}
