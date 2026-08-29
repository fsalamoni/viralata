import { describe, it, expect } from 'vitest';
import {
  buildAnalyticsView,
  buildMyOrdersView,
  buildMyOrderRow,
  buildCheckoutView,
  ORDER_STATUS_COLOR,
} from './storeOpsView';
import { ORDER_STATUS, PRODUCT_STATUS } from './products';
import { emptyCart, addToCart } from './storeCart';

const now = new Date('2026-08-28T12:00:00Z');

const orders = [
  { id: 'o1', status: ORDER_STATUS.DELIVERED, total_cents: 10000, created_at: '2026-08-28T09:00:00Z', shelter_name: 'Abrigo A', items: [{ product_id: 'a', name: 'Camiseta', price_cents: 5000, qty: 2 }] },
  { id: 'o2', status: ORDER_STATUS.PENDING, total_cents: 3000, created_at: '2026-08-27T09:00:00Z', shelter_name: 'Abrigo A', items: [{ product_id: 'b', name: 'Caneca', price_cents: 3000, qty: 1 }] },
  { id: 'o3', status: ORDER_STATUS.CANCELLED, total_cents: 9999, created_at: '2026-08-20T09:00:00Z', shelter_name: 'Abrigo A', items: [{ product_id: 'c', name: 'Boné', price_cents: 9999, qty: 1 }] },
];

const products = [
  { status: PRODUCT_STATUS.ACTIVE, price_cents: 5000, track_stock: true, stock_quantity: 4 },
  { status: PRODUCT_STATUS.DRAFT, price_cents: 3000 },
];

describe('storeOpsView — analytics', () => {
  it('buildAnalyticsView compõe vendas + catálogo + cards formatados', () => {
    const v = buildAnalyticsView(orders, products, { now, days: 7 });
    expect(v.cards.revenueRealized).toContain('100,00');
    expect(v.cards.totalOrders).toBe(3);
    expect(v.catalog.total).toBe(2);
    expect(v.catalog.active).toBe(1);
    // status breakdown só inclui status com contagem > 0
    const statuses = v.statusBreakdown.map((s) => s.status);
    expect(statuses).toContain(ORDER_STATUS.DELIVERED);
    expect(statuses).toContain(ORDER_STATUS.PENDING);
    expect(statuses).toContain(ORDER_STATUS.CANCELLED);
    expect(statuses).not.toContain(ORDER_STATUS.SHIPPED);
    // topProducts formatado
    expect(v.topProducts[0].revenue_label).toContain('100,00');
    // revenueByDay tem pct e a barra do dia com receita = 100%
    expect(v.revenueByDay).toHaveLength(7);
    const today = v.revenueByDay.find((d) => d.date === '2026-08-28');
    expect(today.pct).toBe(100);
    expect(v.isEmpty).toBe(false);
  });

  it('isEmpty quando não há pedidos', () => {
    const v = buildAnalyticsView([], products, { now });
    expect(v.isEmpty).toBe(true);
    expect(v.cards.totalOrders).toBe(0);
  });
});

describe('storeOpsView — meus pedidos', () => {
  it('buildMyOrderRow deriva rótulos, contagem e flags', () => {
    const row = buildMyOrderRow(orders[0]);
    expect(row.status_label).toBeTruthy();
    expect(row.units).toBe(2);
    expect(row.total_label).toContain('100,00');
    expect(row.is_open).toBe(false); // delivered não é aberto
    expect(row.club_name).toBe('Abrigo A');
  });

  it('buildMyOrdersView ordena desc e separa abertos/concluídos', () => {
    const v = buildMyOrdersView(orders);
    expect(v.total).toBe(3);
    expect(v.rows[0].id).toBe('o1'); // 28/08 é o mais recente
    expect(v.open.map((r) => r.id)).toEqual(['o2']); // pending
    expect(v.closed.map((r) => r.id).sort()).toEqual(['o1', 'o3']);
    expect(buildMyOrdersView([]).isEmpty).toBe(true);
  });
});

describe('storeOpsView — checkout', () => {
  const item = { club_id: 'A', club_name: 'Abrigo A', product_id: 'p1', name: 'Ração', price_cents: 4500 };
  it('buildCheckoutView agrupa por abrigo e anexa opções de pagamento', () => {
    let cart = emptyCart();
    cart = addToCart(cart, item, 2);
    const v = buildCheckoutView(cart, { A: { accepts_pix: true, pix_key: 'x@y', accepts_to_arrange: true } });
    expect(v.count).toBe(2);
    expect(v.shelter_count).toBe(1);
    expect(v.subtotal_label).toContain('90,00'); // 4500 * 2
    const grp = v.groups[0];
    expect(grp.subtotal_label).toContain('90,00');
    const ids = grp.paymentOptions.map((p) => p.id);
    expect(ids).toContain('pix');
    expect(ids).toContain('to_arrange');
  });

  it('carrinho vazio → isEmpty', () => {
    const v = buildCheckoutView(emptyCart(), {});
    expect(v.isEmpty).toBe(true);
    expect(v.groups).toEqual([]);
  });
});

describe('storeOpsView — cores', () => {
  it('ORDER_STATUS_COLOR cobre todos os status', () => {
    for (const s of Object.values(ORDER_STATUS)) {
      expect(ORDER_STATUS_COLOR[s]).toBeTruthy();
    }
  });
});
