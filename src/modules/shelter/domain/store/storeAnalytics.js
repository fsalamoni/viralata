/**
 * @fileoverview Domínio de analytics de vendas, variações de produto e
 * fulfillment da Loja do Abrigo (Loja v2 — SHELTER_STORE_V2). PURO (sem
 * Firebase/React): recebe pedidos/produtos já carregados e devolve números
 * prontos para a UI. Aditivo à Loja v1 — não altera nada quando não há
 * variações nem pedidos avançados.
 */
import {
  ORDER_STATUS,
  ORDER_STATUS_ORDER,
  isInStock,
} from './products';

// ─── Datas ──────────────────────────────────────────────────────────────────

/** Converte Timestamp Firestore | ISO | epoch(ms) | Date em Date (ou null). */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    if (Number.isFinite(value.seconds)) {
      const d = new Date(value.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** Chave YYYY-MM-DD (UTC) para agrupar por dia. */
function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

// ─── Variações ──────────────────────────────────────────────────────────────

/** O produto tem variações declaradas? */
export function hasVariants(product) {
  return Array.isArray(product?.variants) && product.variants.length > 0;
}

/**
 * Normaliza a lista de variações garantindo `id`/`label`. Usa o índice como
 * fallback estável de id para variações persistidas sem id.
 */
export function normalizeVariants(product) {
  const list = Array.isArray(product?.variants) ? product.variants : [];
  return list
    .map((v, i) => {
      const label = String(v?.label ?? '').trim();
      if (!label) return null;
      const id = String(v?.id ?? '').trim() || `v${i}`;
      const out = { id, label };
      if (Number.isFinite(v?.price_cents)) out.price_cents = Math.max(0, Math.round(v.price_cents));
      if (Number.isFinite(v?.stock_quantity)) out.stock_quantity = Math.max(0, Math.round(v.stock_quantity));
      const sku = String(v?.sku ?? '').trim();
      if (sku) out.sku = sku;
      return out;
    })
    .filter(Boolean);
}

/** Encontra a variação pelo id (ou null). */
export function findVariant(product, variantId) {
  if (!variantId) return null;
  return normalizeVariants(product).find((v) => v.id === variantId) || null;
}

/** Preço efetivo (centavos) da variação, com fallback para o preço do produto. */
export function variantPriceCents(product, variant) {
  if (variant && Number.isFinite(variant.price_cents)) return Math.max(0, Math.round(variant.price_cents));
  return Math.max(0, Math.round(Number(product?.price_cents) || 0));
}

/**
 * A variação (ou o produto, se sem variação) está disponível para venda?
 * Se o produto controla estoque e a variação tem `stock_quantity`, usa o
 * estoque da variação; caso contrário cai no estoque/lógica do produto.
 */
export function variantInStock(product, variant) {
  if (!product) return false;
  if (product.track_stock && variant && Number.isFinite(variant.stock_quantity)) {
    return Number(variant.stock_quantity) > 0;
  }
  return isInStock(product);
}

/** Faixa de preço do produto considerando variações: { min, max, varies }. */
export function productPriceRange(product) {
  const base = Math.max(0, Math.round(Number(product?.price_cents) || 0));
  const variants = normalizeVariants(product);
  if (variants.length === 0) return { min: base, max: base, varies: false };
  const prices = variants.map((v) => variantPriceCents(product, v));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, varies: min !== max };
}

/**
 * Variação inicial sugerida: a primeira disponível; se nenhuma disponível,
 * a primeira da lista. Null quando o produto não tem variações.
 */
export function defaultVariant(product) {
  const variants = normalizeVariants(product);
  if (variants.length === 0) return null;
  return variants.find((v) => variantInStock(product, v)) || variants[0];
}

// ─── Fulfillment ────────────────────────────────────────────────────────────

/** Resumo de fulfillment de um pedido (para UI). */
export function fulfillmentSummary(order) {
  const f = order?.fulfillment || {};
  const carrier = String(f.carrier ?? '').trim();
  const trackingCode = String(f.tracking_code ?? '').trim();
  const trackingUrl = String(f.tracking_url ?? '').trim();
  const shippedAt = toDate(f.shipped_at);
  return {
    carrier,
    trackingCode,
    trackingUrl,
    shippedAt,
    estimatedDelivery: String(f.estimated_delivery ?? '').trim(),
    notes: String(f.notes ?? '').trim(),
    hasTracking: Boolean(trackingCode || trackingUrl),
    hasAny: Boolean(carrier || trackingCode || trackingUrl || shippedAt),
  };
}

// ─── Analytics de vendas ────────────────────────────────────────────────────

/** Status que contam como receita realizada (dinheiro efetivamente entrando). */
export const REALIZED_STATUSES = Object.freeze([
  ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED,
]);
/** Status ainda em aberto (pipeline). */
export const PIPELINE_STATUSES = Object.freeze([
  ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED,
]);

function orderTotalCents(order) {
  if (Number.isFinite(order?.total_cents)) return Math.max(0, Math.round(order.total_cents));
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((acc, it) => acc + (Number(it?.price_cents) || 0) * (Number(it?.qty) || 0), 0);
}

function orderUnits(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((acc, it) => acc + (Number(it?.qty) || 0), 0);
}

/**
 * Métricas de vendas a partir dos pedidos do abrigo. Não faz I/O — recebe a
 * lista já carregada. Receita "realizada" = pedidos pagos/enviados/entregues;
 * "pipeline" = pendentes/confirmados. Cancelados entram só na contagem.
 *
 * @param {Array<object>} orders
 * @param {{topN?:number, days?:number, now?:Date}} [opts]
 */
export function computeSalesAnalytics(orders, opts = {}) {
  const list = Array.isArray(orders) ? orders : [];
  const topN = Number.isFinite(opts.topN) ? opts.topN : 5;
  const days = Number.isFinite(opts.days) ? opts.days : 30;
  const now = opts.now instanceof Date ? opts.now : new Date();

  const byStatus = {};
  for (const s of ORDER_STATUS_ORDER) byStatus[s] = 0;

  let revenueRealizedCents = 0;
  let revenuePipelineCents = 0;
  let realizedOrders = 0;
  let unitsSold = 0;
  let lastOrderAt = null;
  const productAgg = new Map(); // product_id -> { product_id, name, units, revenue_cents }

  // Janela diária de receita realizada (últimos `days` dias, incluindo hoje).
  const revenueByDayMap = new Map();
  const startWindow = new Date(now);
  startWindow.setUTCHours(0, 0, 0, 0);
  startWindow.setUTCDate(startWindow.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const d = new Date(startWindow);
    d.setUTCDate(startWindow.getUTCDate() + i);
    revenueByDayMap.set(dayKey(d), 0);
  }

  for (const order of list) {
    const status = order?.status || ORDER_STATUS.PENDING;
    if (Object.prototype.hasOwnProperty.call(byStatus, status)) byStatus[status] += 1;
    else byStatus[status] = (byStatus[status] || 0) + 1;

    const total = orderTotalCents(order);
    const created = toDate(order?.created_at) || toDate(order?.updated_at);
    if (created && (!lastOrderAt || created > lastOrderAt)) lastOrderAt = created;

    const isRealized = REALIZED_STATUSES.includes(status);
    const isPipeline = PIPELINE_STATUSES.includes(status);

    if (isRealized) {
      revenueRealizedCents += total;
      realizedOrders += 1;
      unitsSold += orderUnits(order);
      const items = Array.isArray(order?.items) ? order.items : [];
      for (const it of items) {
        const pid = String(it?.product_id ?? it?.name ?? 'produto');
        const prev = productAgg.get(pid) || { product_id: pid, name: it?.name || pid, units: 0, revenue_cents: 0 };
        prev.units += Number(it?.qty) || 0;
        prev.revenue_cents += (Number(it?.price_cents) || 0) * (Number(it?.qty) || 0);
        if (it?.name) prev.name = it.name;
        productAgg.set(pid, prev);
      }
      if (created) {
        const key = dayKey(created);
        if (revenueByDayMap.has(key)) revenueByDayMap.set(key, revenueByDayMap.get(key) + total);
      }
    } else if (isPipeline) {
      revenuePipelineCents += total;
    }
  }

  const totalOrders = list.length;
  const cancelledCount = byStatus[ORDER_STATUS.CANCELLED] || 0;
  const decidableOrders = totalOrders - cancelledCount;
  const avgOrderValueCents = realizedOrders > 0 ? Math.round(revenueRealizedCents / realizedOrders) : 0;
  const conversionPct = decidableOrders > 0 ? Math.round((realizedOrders / decidableOrders) * 100) : 0;

  const topProducts = [...productAgg.values()]
    .sort((a, b) => b.revenue_cents - a.revenue_cents || b.units - a.units)
    .slice(0, topN);

  const revenueByDay = [...revenueByDayMap.entries()].map(([date, cents]) => ({ date, cents }));

  return {
    totalOrders,
    byStatus,
    realizedOrders,
    cancelledCount,
    revenueRealizedCents,
    revenuePipelineCents,
    avgOrderValueCents,
    unitsSold,
    conversionPct,
    lastOrderAt,
    topProducts,
    revenueByDay,
  };
}
