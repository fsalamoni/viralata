/**
 * @fileoverview Testes do store de carrinho (Loja v2). Exercita mutações,
 * persistência em localStorage e emissão para assinantes. Roda em jsdom.
 */
import {
  describe, it, expect, beforeEach, vi,
} from 'vitest';

async function freshStore() {
  vi.resetModules();
  window.localStorage.clear();
  return import('./cartStore');
}

const ITEM = { club_id: 'A', club_name: 'Abrigo A', product_id: 'p1', name: 'Ração', price_cents: 5000 };

describe('cartStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('add/set/remove/clear atualizam o snapshot e o localStorage', async () => {
    const s = await freshStore();
    expect(s.getCartSnapshot().items).toHaveLength(0);

    s.cartAddItem(ITEM, 2);
    let snap = s.getCartSnapshot();
    expect(snap.items).toHaveLength(1);
    expect(snap.items[0].qty).toBe(2);
    expect(JSON.parse(window.localStorage.getItem('viralata_store_cart_v2')).items).toHaveLength(1);

    const key = snap.items[0].key;
    s.cartSetQty(key, 5);
    expect(s.getCartSnapshot().items[0].qty).toBe(5);

    s.cartSetQty(key, 0); // 0 remove a linha
    expect(s.getCartSnapshot().items).toHaveLength(0);

    s.cartAddItem(ITEM, 1);
    s.cartRemove(s.getCartSnapshot().items[0].key);
    expect(s.getCartSnapshot().items).toHaveLength(0);

    s.cartAddItem(ITEM, 1);
    s.cartClear();
    expect(s.getCartSnapshot().items).toHaveLength(0);
  });

  it('cartClearShelter remove só o abrigo alvo', async () => {
    const s = await freshStore();
    s.cartAddItem(ITEM, 1);
    s.cartAddItem({ ...ITEM, club_id: 'B', club_name: 'Abrigo B', product_id: 'p2' }, 1);
    expect(s.getCartSnapshot().items).toHaveLength(2);
    s.cartClearShelter('A');
    const items = s.getCartSnapshot().items;
    expect(items).toHaveLength(1);
    expect(items[0].club_id).toBe('B');
  });

  it('notifica assinantes e permite desinscrever', async () => {
    const s = await freshStore();
    const cb = vi.fn();
    const unsub = s.subscribeCart(cb);
    s.cartAddItem(ITEM, 1);
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    s.cartAddItem(ITEM, 1);
    expect(cb).toHaveBeenCalledTimes(1); // não chamou de novo
  });

  it('hidrata do localStorage existente ao importar', async () => {
    window.localStorage.setItem('viralata_store_cart_v2', JSON.stringify({
      items: [{ club_id: 'A', club_name: 'Abrigo A', product_id: 'p1', name: 'Ração', price_cents: 5000, qty: 3 }],
    }));
    vi.resetModules();
    const s = await import('./cartStore');
    expect(s.getCartSnapshot().items[0].qty).toBe(3);
  });
});
