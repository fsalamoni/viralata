/**
 * @fileoverview Hooks React Query para a Central de Documentos do Abrigo
 * (Fase 6 · SHELTER_DOCUMENTS_V1). Envolvem `shelterDocumentsService` e
 * invalidam a query do clube (`['club', shelterClubId]`) a cada mutação, de
 * modo que a central reflita o novo registry `documents` sem recarregar a
 * página. O registry é derivado do doc do clube via `getRegistry`.
 *
 * As mutações são declaradas explicitamente (uma `useMutation` por ação) para
 * respeitar as regras dos hooks do React.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClub } from '@/modules/organizations/hooks/useClubs';
import { getRegistry, buildCentralView, summarizeRegistry } from '@/modules/shelter/domain/documents/shelterDocumentsView';
import {
  createDocument,
  updateDocumentMeta,
  saveBody,
  saveFormSchema,
  publishDocument,
  archiveDocument,
  restoreDocument,
  deleteDocument,
  getAcceptanceAnalytics,
} from '@/modules/shelter/services/shelterDocumentsService';

/**
 * Registry de documentos + visão da central, derivados do doc do clube.
 */
export function useShelterDocuments(shelterClubId) {
  const clubQuery = useClub(shelterClubId);
  const registry = useMemo(() => getRegistry(clubQuery.data), [clubQuery.data]);
  const central = useMemo(() => buildCentralView({ registry }), [registry]);
  const summary = useMemo(() => summarizeRegistry(registry), [registry]);
  return {
    registry,
    central,
    summary,
    isLoading: clubQuery.isLoading,
    isError: clubQuery.isError,
    error: clubQuery.error,
  };
}

/** Analytics de aceite (leitura best-effort de coleções legíveis pelo abrigo). */
export function useAcceptanceAnalytics(shelterClubId) {
  return useQuery({
    queryKey: ['shelter-doc-analytics', shelterClubId],
    queryFn: () => getAcceptanceAnalytics(shelterClubId),
    enabled: !!shelterClubId,
    staleTime: 60_000,
  });
}

/** Mutações da central, já vinculadas ao abrigo. */
export function useShelterDocumentMutations(shelterClubId) {
  const qc = useQueryClient();
  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['club', shelterClubId] });
  };

  const mCreate = useMutation({
    mutationFn: ({ input, actor }) => createDocument(shelterClubId, input, actor),
    onSuccess,
  });
  const mUpdateMeta = useMutation({
    mutationFn: ({ docId, patch, actor }) => updateDocumentMeta(shelterClubId, docId, patch, actor),
    onSuccess,
  });
  const mSaveBody = useMutation({
    mutationFn: ({ docId, body, actor }) => saveBody(shelterClubId, docId, body, actor),
    onSuccess,
  });
  const mSaveForm = useMutation({
    mutationFn: ({ docId, formSchema, actor }) => saveFormSchema(shelterClubId, docId, formSchema, actor),
    onSuccess,
  });
  const mPublish = useMutation({
    mutationFn: ({ docId, options, actor }) => publishDocument(shelterClubId, docId, options, actor),
    onSuccess,
  });
  const mArchive = useMutation({
    mutationFn: ({ docId, actor }) => archiveDocument(shelterClubId, docId, actor),
    onSuccess,
  });
  const mRestore = useMutation({
    mutationFn: ({ docId, actor }) => restoreDocument(shelterClubId, docId, actor),
    onSuccess,
  });
  const mDelete = useMutation({
    mutationFn: ({ docId, actor }) => deleteDocument(shelterClubId, docId, actor),
    onSuccess,
  });

  return {
    createDocument: mCreate,
    updateDocumentMeta: mUpdateMeta,
    saveBody: mSaveBody,
    saveFormSchema: mSaveForm,
    publishDocument: mPublish,
    archiveDocument: mArchive,
    restoreDocument: mRestore,
    deleteDocument: mDelete,
  };
}
