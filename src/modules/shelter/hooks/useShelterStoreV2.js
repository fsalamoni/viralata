/**
 * @fileoverview Hooks React da Loja v2 (SHELTER_STORE_V2): carrinho (via store
 * de módulo em localStorage), checkout a partir do carrinho, acompanhamento de
 * pedidos do comprador ("Meus Pedidos"), analytics de vendas do abrigo,
 * fulfillment e variações. Todos os call-sites são condicionados à flag; este
 * módulo em si não decide flag (quem importa é que gate-eia).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ops from '../services/shelterStoreOpsService';
import {
  getCartSnapshot, subscribeCart,
  cartAddItem, cartSetQty, cartRemove, cartClear, cartClearShelter,
} from './cartStore';
import {
  cartCount, cartSubtotalCents, groupCartByShelter, isCartEmpty,
} from '@/modules/shelter/domain/store/storeCart';
import { buildMyOrdersView, buildAnalyticsView } from '@/modules/shelter/domain/store/storeOpsView';

// ─── Carrinho (cliente) ──────────────────────────────────────────────────────

/**
 * Assina o carrinho local. Retorna o carrinho + derivados + ações. Seguro para
 * SSR (server snapshot é um carrinho vazio estável).
 */
export function useCart() {
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartSnapshot);
  const add = useCallback((item, qty = 1) => cartAddItem(item, qty), []);
  const setQty = useCallback((key, qty) => cartSetQty(key, qty), []);
  const remove = useCallback((key) => cartRemove(key), []);
  const clear = useCallback(() => cartClear(), []);
  const clearShelter = useCallback((clubId) => cartClearShelter(clubId), []);
  return {
    cart,
    count: cartCount(cart),
    subtotalCents: cartSubtotalCents(cart),
    groups: groupCartByShelter(cart),
    isEmpty: isCartEmpty(cart),
    add,
    setQty,
    remove,
    clear,
    clearShelter,
  };
}

// ─── Meus Pedidos (comprador) ────────────────────────────────────────────────

export function useMyOrders(uid, enabled = true) {
  return useQuery({
    queryKey: ['store-my-orders', uid],
    queryFn: () => ops.listMyOrders(uid),
    enabled: Boolean(uid) && Boolean(enabled),
    staleTime: 15_000,
    select: (orders) => buildMyOrdersView(orders),
  });
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export function useCheckoutMutation() {
  return useMutation({
    mutationFn: ({ actor, cart, meta }) => ops.createOrdersFromCart(actor, cart, meta),
  });
}

// ─── Analytics de vendas (admin) ──────────────────────────────────────────────

/** Deriva a visão de analytics a partir de pedidos+produtos já carregados. */
export function useStoreAnalytics(orders, products, opts) {
  return buildAnalyticsView(orders || [], products || [], opts || {});
}

// ─── Fulfillment / variações (admin) ──────────────────────────────────────────

export function useStoreOpsMutations(clubId) {
  const qc = useQueryClient();
  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ['store-orders', clubId] });

  const setFulfillment = useMutation({
    mutationFn: ({ orderId, actor, fulfillment, markShipped }) =>
      ops.setOrderFulfillment(clubId, orderId, actor, fulfillment, { markShipped }),
    onSuccess: invalidateOrders,
  });

  const saveVariants = useMutation({
    mutationFn: ({ productId, actor, variants }) =>
      ops.saveProductVariants(clubId, productId, actor, variants),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-products', clubId] });
      qc.invalidateQueries({ queryKey: ['store-product-edit', clubId] });
    },
  });

  return { setFulfillment, saveVariants };
}
