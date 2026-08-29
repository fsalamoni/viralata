/**
 * @fileoverview Camada de "view" da Loja v2 (SHELTER_STORE_V2). PURA — compõe
 * os domínios `products`, `storeAnalytics` e `storeCart` em estruturas prontas
 * para renderizar (rótulos, valores em BRL, ordenação), sem I/O nem React.
 */
import {
  ORDER_STATUS,
  ORDER_STATUS_ORDER,
  ORDER_STATUS_LABEL,
  PRODUCT_STATUS_COLOR,
  formatBRL,
  computeStoreStats,
} from './products';
import {
  computeSalesAnalytics,
  fulfillmentSummary,
  toDate,
} from './storeAnalytics';
import {
  groupCartByShelter,
  cartCount,
  cartSubtotalCents,
  isCartEmpty,
  listAvailablePaymentProviders,
} from './storeCart';

// ─── Cores de status de pedido (para badges) ────────────────────────────────

export const ORDER_STATUS_COLOR = Object.freeze({
  [ORDER_STATUS.PENDING]: 'amber',
  [ORDER_STATUS.CONFIRMED]: 'blue',
  [ORDER_STATUS.PAID]: 'emerald',
  [ORDER_STATUS.SHIPPED]: 'violet',
  [ORDER_STATUS.DELIVERED]: 'green',
  [ORDER_STATUS.CANCELLED]: 'rose',
});

// ─── Dashboard de analytics (admin) ─────────────────────────────────────────

/**
 * Compila a visão de analytics do admin: métricas de vendas + estatísticas de
 * catálogo + séries já formatadas.
 *
 * @param {Array<object>} orders
 * @param {Array<object>} products
 * @param {{now?:Date, days?:number, topN?:number}} [opts]
 */
export function buildAnalyticsView(orders, products, opts = {}) {
  const sales = computeSalesAnalytics(orders, opts);
  const catalog = computeStoreStats(products);

  const statusBreakdown = ORDER_STATUS_ORDER
    .map((status) => ({
      status,
      label: ORDER_STATUS_LABEL[status] || status,
      color: ORDER_STATUS_COLOR[status] || 'gray',
      count: sales.byStatus[status] || 0,
    }))
    .filter((row) => row.count > 0);

  const topProducts = sales.topProducts.map((p) => ({
    ...p,
    revenue_label: formatBRL(p.revenue_cents),
  }));

  const maxDayCents = sales.revenueByDay.reduce((m, d) => Math.max(m, d.cents), 0);
  const revenueByDay = sales.revenueByDay.map((d) => ({
    ...d,
    label: formatBRL(d.cents),
    pct: maxDayCents > 0 ? Math.round((d.cents / maxDayCents) * 100) : 0,
  }));

  return {
    sales,
    catalog,
    statusBreakdown,
    topProducts,
    revenueByDay,
    cards: {
      revenueRealized: formatBRL(sales.revenueRealizedCents),
      revenuePipeline: formatBRL(sales.revenuePipelineCents),
      avgOrderValue: formatBRL(sales.avgOrderValueCents),
      totalOrders: sales.totalOrders,
      realizedOrders: sales.realizedOrders,
      unitsSold: sales.unitsSold,
      conversionPct: sales.conversionPct,
    },
    isEmpty: sales.totalOrders === 0,
  };
}

// ─── Meus pedidos (comprador) ───────────────────────────────────────────────

/** Estados em que o pedido ainda não é "final" (comprador acompanha). */
const OPEN_ORDER_STATUSES = new Set([
  ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED,
]);

/** Monta a linha de um pedido para a página "Meus Pedidos". */
export function buildMyOrderRow(order) {
  const status = order?.status || ORDER_STATUS.PENDING;
  const items = Array.isArray(order?.items) ? order.items : [];
  const units = items.reduce((acc, it) => acc + (Number(it?.qty) || 0), 0);
  const total = Number.isFinite(order?.total_cents)
    ? order.total_cents
    : items.reduce((acc, it) => acc + (Number(it?.price_cents) || 0) * (Number(it?.qty) || 0), 0);
  const createdAt = toDate(order?.created_at) || toDate(order?.updated_at);
  const fulfillment = fulfillmentSummary(order);
  return {
    id: order?.id || '',
    club_id: order?.shelter_club_id || order?.club_id || '',
    club_name: order?.shelter_name || order?.club_name || 'Abrigo',
    status,
    status_label: ORDER_STATUS_LABEL[status] || status,
    status_color: ORDER_STATUS_COLOR[status] || 'gray',
    items,
    item_count: items.length,
    units,
    total_cents: total,
    total_label: formatBRL(total),
    created_at: createdAt,
    is_open: OPEN_ORDER_STATUSES.has(status),
    is_cancelled: status === ORDER_STATUS.CANCELLED,
    fulfillment,
  };
}

/**
 * Ordena os pedidos do comprador (mais recentes primeiro) e separa em abertos e
 * concluídos. `orders` já vem carregado pelo serviço.
 */
export function buildMyOrdersView(orders) {
  const rows = (Array.isArray(orders) ? orders : []).map(buildMyOrderRow);
  rows.sort((a, b) => {
    const ta = a.created_at ? a.created_at.getTime() : 0;
    const tb = b.created_at ? b.created_at.getTime() : 0;
    return tb - ta;
  });
  const open = rows.filter((r) => r.is_open);
  const closed = rows.filter((r) => !r.is_open);
  return { rows, open, closed, total: rows.length, isEmpty: rows.length === 0 };
}

// ─── Checkout (comprador) ───────────────────────────────────────────────────

/**
 * Monta a visão de checkout a partir do carrinho, agrupando por abrigo e
 * anexando as opções de pagamento disponíveis (derivadas das settings de cada
 * loja). `settingsByClub` é um mapa clubId → settings da loja.
 *
 * @param {object} cart
 * @param {Record<string, object>} [settingsByClub]
 */
export function buildCheckoutView(cart, settingsByClub = {}) {
  const groups = groupCartByShelter(cart).map((g) => {
    const settings = settingsByClub[g.club_id] || null;
    const paymentOptions = listAvailablePaymentProviders(settings);
    return {
      ...g,
      subtotal_label: formatBRL(g.subtotal_cents),
      settings,
      paymentOptions,
    };
  });
  return {
    groups,
    count: cartCount(cart),
    subtotal_cents: cartSubtotalCents(cart),
    subtotal_label: formatBRL(cartSubtotalCents(cart)),
    shelter_count: groups.length,
    isEmpty: isCartEmpty(cart),
  };
}

// Reexport util de cor de produto para conveniência das telas de analytics.
export { PRODUCT_STATUS_COLOR };
