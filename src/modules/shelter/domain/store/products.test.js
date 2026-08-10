import { describe, it, expect } from 'vitest';
import {
  PRODUCT_STATUS, PAYMENT_METHOD,
  formatBRL, toCents, centsToInput, unitProfitCents, profitMarginPct,
  isInStock, isProductPublic, ratingSummary, computeStoreStats,
  slugify, splitProductData, productCreateSchema, storeSettingsSchema,
  orderCreateSchema, reviewSchema,
} from './products';

describe('store/products domain', () => {
  it('formata e converte dinheiro (centavos ↔ BRL)', () => {
    expect(formatBRL(1290)).toMatch(/12,90/);
    expect(toCents('12,90')).toBe(1290);
    expect(toCents('1.234,56')).toBe(123456);
    expect(toCents(9.9)).toBe(990);
    expect(centsToInput(1290)).toBe('12,90');
  });

  it('calcula lucro e margem', () => {
    expect(unitProfitCents(1000, 600)).toBe(400);
    expect(unitProfitCents(1000, 0)).toBeNull();
    expect(profitMarginPct(1000, 600)).toBe(40);
    expect(profitMarginPct(1000, 0)).toBeNull();
  });

  it('determina estoque e visibilidade pública', () => {
    expect(isInStock({ track_stock: false })).toBe(true);
    expect(isInStock({ track_stock: true, stock_quantity: 0 })).toBe(false);
    expect(isInStock({ track_stock: true, stock_quantity: 3 })).toBe(true);

    const active = { status: PRODUCT_STATUS.ACTIVE };
    expect(isProductPublic(active)).toBe(true);
    expect(isProductPublic(active, { enabled: true, public_visible: true })).toBe(true);
    expect(isProductPublic(active, { enabled: true, public_visible: false })).toBe(false);
    expect(isProductPublic({ status: PRODUCT_STATUS.DRAFT })).toBe(false);
  });

  it('resume avaliações', () => {
    expect(ratingSummary([])).toEqual({ average: 0, count: 0 });
    expect(ratingSummary([{ rating: 5 }, { rating: 4 }])).toEqual({ average: 4.5, count: 2 });
  });

  it('agrega estatísticas da loja', () => {
    const stats = computeStoreStats([
      { status: PRODUCT_STATUS.ACTIVE, track_stock: true, stock_quantity: 2, price_cents: 1000, cost_cents: 600 },
      { status: PRODUCT_STATUS.DRAFT, track_stock: false },
      { status: PRODUCT_STATUS.ACTIVE, track_stock: true, stock_quantity: 0, price_cents: 500 },
    ]);
    expect(stats.total).toBe(3);
    expect(stats.active).toBe(2);
    expect(stats.draft).toBe(1);
    expect(stats.outOfStock).toBe(1);
    expect(stats.inventoryUnits).toBe(2);
    expect(stats.inventoryValueCents).toBe(2000);
    expect(stats.inventoryCostCents).toBe(1200);
    expect(stats.potentialProfitCents).toBe(800);
  });

  it('gera slug amigável', () => {
    expect(slugify('Coleira Antipulgas Nº 3')).toBe('coleira-antipulgas-n-3');
    expect(slugify('  Ração Premium  ')).toBe('racao-premium');
  });

  it('separa dados públicos dos privados', () => {
    const { publicData, privateData } = splitProductData({
      name: 'X', price_cents: 100, cost_cents: 50, suppliers: [{ name: 'F' }], internal_notes: 'oi',
    });
    expect(publicData).toEqual({ name: 'X', price_cents: 100 });
    expect(privateData).toEqual({ cost_cents: 50, suppliers: [{ name: 'F' }], internal_notes: 'oi' });
  });

  it('valida schema de produto (create) com defaults', () => {
    const parsed = productCreateSchema.parse({ name: 'Coleira', price_cents: 2500 });
    expect(parsed.status).toBe(PRODUCT_STATUS.DRAFT);
    expect(parsed.track_stock).toBe(true);
    expect(parsed.images).toEqual([]);
    expect(() => productCreateSchema.parse({ name: 'x' })).toThrow(); // price faltando
  });

  it('valida configurações da loja e URL externa', () => {
    const s = storeSettingsSchema.parse({ enabled: true, public_visible: true });
    expect(s.accepts_to_arrange).toBe(true);
    expect(() => storeSettingsSchema.parse({ external_checkout_url: 'not-a-url' })).toThrow();
    expect(storeSettingsSchema.parse({ external_checkout_url: '' }).external_checkout_url).toBe('');
  });

  it('valida pedido e avaliação', () => {
    const order = orderCreateSchema.parse({
      items: [{ product_id: 'p1', name: 'X', price_cents: 1000, qty: 2 }],
      buyer_name: 'Ana', contact: 'ana@x.com', payment_method: PAYMENT_METHOD.PIX,
    });
    expect(order.items[0].qty).toBe(2);
    expect(() => orderCreateSchema.parse({ items: [], buyer_name: 'Ana', contact: 'x' })).toThrow();
    expect(() => reviewSchema.parse({ rating: 9 })).toThrow();
    expect(reviewSchema.parse({ rating: 5 }).comment).toBe('');
  });
});
