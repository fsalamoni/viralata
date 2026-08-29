import { describe, it, expect } from 'vitest';
import {
  toDate,
  hasVariants,
  normalizeVariants,
  findVariant,
  variantPriceCents,
  variantInStock,
  productPriceRange,
  defaultVariant,
  fulfillmentSummary,
  computeSalesAnalytics,
  REALIZED_STATUSES,
} from './storeAnalytics';
import { ORDER_STATUS } from './products';

describe('storeAnalytics — datas', () => {
  it('toDate aceita Date, ISO, epoch e Timestamp Firestore', () => {
    expect(toDate(null)).toBe(null);
    const d = new Date('2026-08-01T00:00:00Z');
    expect(toDate(d)).toEqual(d);
    expect(toDate('2026-08-01T00:00:00Z')?.getUTCFullYear()).toBe(2026);
    expect(toDate({ seconds: 1_754_006_400 })?.getUTCFullYear()).toBe(2025);
    expect(toDate({ toDate: () => new Date('2026-01-02T00:00:00Z') })?.getUTCMonth()).toBe(0);
    expect(toDate('lixo')).toBe(null);
  });
});

describe('storeAnalytics — variações', () => {
  const product = {
    price_cents: 5000,
    track_stock: true,
    stock_quantity: 3,
    variants: [
      { label: 'P', stock_quantity: 0 },
      { id: 'm', label: 'M', price_cents: 6000, stock_quantity: 2 },
      { label: 'G', price_cents: 7000 },
    ],
  };

  it('hasVariants / normalizeVariants preenchem id e filtram inválidas', () => {
    expect(hasVariants(product)).toBe(true);
    expect(hasVariants({ price_cents: 100 })).toBe(false);
    const norm = normalizeVariants({ ...product, variants: [...product.variants, { label: '' }] });
    expect(norm).toHaveLength(3);
    expect(norm[0].id).toBe('v0');
    expect(norm[1].id).toBe('m');
  });

  it('findVariant / variantPriceCents usam preço próprio com fallback', () => {
    expect(findVariant(product, 'm')?.label).toBe('M');
    expect(findVariant(product, 'zzz')).toBe(null);
    expect(variantPriceCents(product, findVariant(product, 'm'))).toBe(6000);
    expect(variantPriceCents(product, findVariant(product, 'v0'))).toBe(5000); // sem preço → produto
    expect(variantPriceCents(product, null)).toBe(5000);
  });

  it('variantInStock respeita estoque próprio da variação', () => {
    expect(variantInStock(product, findVariant(product, 'v0'))).toBe(false); // stock 0
    expect(variantInStock(product, findVariant(product, 'm'))).toBe(true); // stock 2
    // variação sem stock_quantity cai no estoque do produto (3 > 0)
    expect(variantInStock(product, findVariant(product, 'v2'))).toBe(true);
  });

  it('productPriceRange e defaultVariant', () => {
    const range = productPriceRange(product);
    expect(range.min).toBe(5000);
    expect(range.max).toBe(7000);
    expect(range.varies).toBe(true);
    expect(productPriceRange({ price_cents: 5000 })).toEqual({ min: 5000, max: 5000, varies: false });
    // primeira DISPONÍVEL é 'M' (P está esgotada)
    expect(defaultVariant(product)?.id).toBe('m');
    expect(defaultVariant({ price_cents: 1 })).toBe(null);
  });
});

describe('storeAnalytics — fulfillment', () => {
  it('fulfillmentSummary resume campos e flags', () => {
    const empty = fulfillmentSummary({});
    expect(empty.hasAny).toBe(false);
    expect(empty.hasTracking).toBe(false);
    const full = fulfillmentSummary({
      fulfillment: { carrier: 'Correios', tracking_code: 'BR123', tracking_url: 'https://x/y', shipped_at: '2026-08-10T00:00:00Z' },
    });
    expect(full.hasTracking).toBe(true);
    expect(full.hasAny).toBe(true);
    expect(full.carrier).toBe('Correios');
    expect(full.shippedAt?.getUTCDate()).toBe(10);
  });
});

describe('storeAnalytics — computeSalesAnalytics', () => {
  const now = new Date('2026-08-28T12:00:00Z');
  const orders = [
    { status: ORDER_STATUS.DELIVERED, total_cents: 10000, created_at: '2026-08-28T09:00:00Z', items: [{ product_id: 'a', name: 'Camiseta', price_cents: 5000, qty: 2 }] },
    { status: ORDER_STATUS.PAID, total_cents: 3000, created_at: '2026-08-27T09:00:00Z', items: [{ product_id: 'b', name: 'Caneca', price_cents: 3000, qty: 1 }] },
    { status: ORDER_STATUS.PENDING, total_cents: 8000, created_at: '2026-08-28T10:00:00Z', items: [{ product_id: 'a', name: 'Camiseta', price_cents: 5000, qty: 1 }] },
    { status: ORDER_STATUS.CANCELLED, total_cents: 9999, created_at: '2026-08-20T10:00:00Z', items: [{ product_id: 'c', name: 'Boné', price_cents: 9999, qty: 1 }] },
  ];

  it('agrega receita, unidades, conversão e top produtos', () => {
    const a = computeSalesAnalytics(orders, { now });
    expect(a.totalOrders).toBe(4);
    expect(a.realizedOrders).toBe(2);
    expect(a.revenueRealizedCents).toBe(13000); // 10000 + 3000
    expect(a.revenuePipelineCents).toBe(8000); // pending
    expect(a.cancelledCount).toBe(1);
    expect(a.unitsSold).toBe(3); // 2 + 1
    expect(a.avgOrderValueCents).toBe(6500); // 13000/2
    // decidable = 4 - 1 cancelado = 3; realized 2 → 67%
    expect(a.conversionPct).toBe(67);
    expect(a.byStatus[ORDER_STATUS.DELIVERED]).toBe(1);
    expect(a.byStatus[ORDER_STATUS.CANCELLED]).toBe(1);
    expect(a.topProducts[0].product_id).toBe('a'); // 10000 > 3000
    expect(a.topProducts[0].units).toBe(2);
    expect(a.lastOrderAt?.getUTCDate()).toBe(28);
  });

  it('revenueByDay tem uma janela de N dias e soma no dia certo', () => {
    const a = computeSalesAnalytics(orders, { now, days: 7 });
    expect(a.revenueByDay).toHaveLength(7);
    const today = a.revenueByDay.find((d) => d.date === '2026-08-28');
    expect(today.cents).toBe(10000); // só o pedido realizado de hoje
    const last = a.revenueByDay[a.revenueByDay.length - 1];
    expect(last.date).toBe('2026-08-28');
  });

  it('lida com lista vazia sem quebrar', () => {
    const a = computeSalesAnalytics([], { now });
    expect(a.totalOrders).toBe(0);
    expect(a.avgOrderValueCents).toBe(0);
    expect(a.conversionPct).toBe(0);
    expect(a.topProducts).toEqual([]);
  });

  it('REALIZED_STATUSES cobre paid/shipped/delivered', () => {
    expect(REALIZED_STATUSES).toContain(ORDER_STATUS.PAID);
    expect(REALIZED_STATUSES).toContain(ORDER_STATUS.SHIPPED);
    expect(REALIZED_STATUSES).toContain(ORDER_STATUS.DELIVERED);
    expect(REALIZED_STATUSES).not.toContain(ORDER_STATUS.PENDING);
  });
});
