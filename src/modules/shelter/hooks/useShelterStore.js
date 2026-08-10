/**
 * @fileoverview Hooks React Query para a Loja do Abrigo (produtos, config,
 * pedidos, avaliações, perguntas) e para o marketplace da plataforma.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '../services/shelterStoreService';

// ─── Configurações ───────────────────────────────────────────────────────
export function useStoreSettings(clubId) {
  return useQuery({
    queryKey: ['store-settings', clubId],
    queryFn: () => svc.getStoreSettings(clubId),
    enabled: Boolean(clubId),
    staleTime: 30_000,
  });
}

// ─── Produtos (gestão) ─────────────────────────────────────────────────────
export function useStoreProducts(clubId) {
  return useQuery({
    queryKey: ['store-products', clubId],
    queryFn: () => svc.listProducts(clubId),
    enabled: Boolean(clubId),
    staleTime: 15_000,
  });
}

// ─── Produtos públicos (vitrine de um abrigo) ───────────────────────────────
export function usePublicStoreProducts(clubId, enabled = true) {
  return useQuery({
    queryKey: ['store-products-public', clubId],
    queryFn: () => svc.listPublicProducts(clubId),
    enabled: Boolean(clubId) && Boolean(enabled),
    staleTime: 30_000,
  });
}

export function useProductForEdit(clubId, productId, enabled = true) {
  return useQuery({
    queryKey: ['store-product-edit', clubId, productId],
    queryFn: () => svc.getProductForEdit(clubId, productId),
    enabled: Boolean(clubId) && Boolean(productId) && Boolean(enabled),
  });
}

// ─── Pedidos ──────────────────────────────────────────────────────────────
export function useStoreOrders(clubId, enabled = true) {
  return useQuery({
    queryKey: ['store-orders', clubId],
    queryFn: () => svc.listOrders(clubId),
    enabled: Boolean(clubId) && Boolean(enabled),
    staleTime: 15_000,
  });
}

// ─── Avaliações / perguntas de um produto ───────────────────────────────────
export function useProductReviews(clubId, productId, enabled = true) {
  return useQuery({
    queryKey: ['store-reviews', clubId, productId],
    queryFn: () => svc.listReviews(clubId, productId),
    enabled: Boolean(clubId) && Boolean(productId) && Boolean(enabled),
  });
}

export function useProductQuestions(clubId, productId, enabled = true) {
  return useQuery({
    queryKey: ['store-questions', clubId, productId],
    queryFn: () => svc.listQuestions(clubId, productId),
    enabled: Boolean(clubId) && Boolean(productId) && Boolean(enabled),
  });
}

// ─── Marketplace da plataforma (agregado) ───────────────────────────────────
export function useMarketplaceProducts(enabled = true, { max = 200 } = {}) {
  return useQuery({
    queryKey: ['marketplace-products', max],
    queryFn: () => svc.listMarketplaceProducts({ max }),
    enabled: Boolean(enabled),
    staleTime: 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────
export function useStoreMutations(clubId) {
  const qc = useQueryClient();
  const invProducts = () => qc.invalidateQueries({ queryKey: ['store-products', clubId] });
  const invSettings = () => qc.invalidateQueries({ queryKey: ['store-settings', clubId] });
  const invOrders = () => qc.invalidateQueries({ queryKey: ['store-orders', clubId] });

  const saveSettings = useMutation({
    mutationFn: ({ actor, payload }) => svc.saveStoreSettings(clubId, actor, payload),
    onSuccess: invSettings,
  });
  const createProduct = useMutation({
    mutationFn: ({ actor, payload }) => svc.createProduct(clubId, actor, payload),
    onSuccess: invProducts,
  });
  const updateProduct = useMutation({
    mutationFn: ({ productId, actor, updates }) => svc.updateProduct(clubId, productId, actor, updates),
    onSuccess: (_d, vars) => {
      invProducts();
      qc.invalidateQueries({ queryKey: ['store-product-edit', clubId, vars?.productId] });
    },
  });
  const setProductStatus = useMutation({
    mutationFn: ({ productId, actor, status }) => svc.setProductStatus(clubId, productId, actor, status),
    onSuccess: invProducts,
  });
  const deleteProduct = useMutation({
    mutationFn: ({ productId, actor }) => svc.deleteProduct(clubId, productId, actor),
    onSuccess: invProducts,
  });
  const setOrderStatus = useMutation({
    mutationFn: ({ orderId, actor, status }) => svc.setOrderStatus(clubId, orderId, actor, status),
    onSuccess: invOrders,
  });

  return { saveSettings, createProduct, updateProduct, setProductStatus, deleteProduct, setOrderStatus };
}

/** Mutations de avaliação/pergunta (comprador + gestão). */
export function useProductInteractions(clubId, productId) {
  const qc = useQueryClient();
  const invReviews = () => qc.invalidateQueries({ queryKey: ['store-reviews', clubId, productId] });
  const invQuestions = () => qc.invalidateQueries({ queryKey: ['store-questions', clubId, productId] });

  const addReview = useMutation({
    mutationFn: ({ actor, payload }) => svc.addReview(clubId, productId, actor, payload),
    onSuccess: invReviews,
  });
  const deleteReview = useMutation({
    mutationFn: ({ reviewId }) => svc.deleteReview(clubId, productId, reviewId),
    onSuccess: invReviews,
  });
  const askQuestion = useMutation({
    mutationFn: ({ actor, payload }) => svc.askQuestion(clubId, productId, actor, payload),
    onSuccess: invQuestions,
  });
  const answerQuestion = useMutation({
    mutationFn: ({ questionId, actor, payload }) => svc.answerQuestion(clubId, productId, questionId, actor, payload),
    onSuccess: invQuestions,
  });
  const deleteQuestion = useMutation({
    mutationFn: ({ questionId }) => svc.deleteQuestion(clubId, productId, questionId),
    onSuccess: invQuestions,
  });

  return { addReview, deleteReview, askQuestion, answerQuestion, deleteQuestion };
}
