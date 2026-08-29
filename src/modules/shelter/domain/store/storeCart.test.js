import { describe, it, expect } from 'vitest';
import { PAYMENT_METHOD } from './products';
import {
  emptyCart, normalizeCart, addToCart, setCartQty, removeFromCart,
  clearShelterFromCart, cartCount, cartSubtotalCents, isCartEmpty,
  groupCartByShelter, cartToOrderPayloads, cartLineKey, maxQtyFor,
  listAvailablePaymentProviders, resolvePaymentInstructions,
  registerPaymentProvider, getPaymentProvider, PAYMENT_PROVIDER_KIND,
  CART_LIMITS,
} from './storeCart';

const itemA = { club_id: 'c1', club_name: 'Abrigo 1', product_id: 'p1', name: 'Coleira', price_cents: 1000, track_stock: true, stock_quantity: 3 };
const itemB = { club_id: 'c2', club_name: 'Abrigo 2', product_id: 'p9', name: 'Ração', price_cents: 2500, track_stock: false };

describe('store/storeCart — carrinho', () => {
  it('adiciona itens e soma quantidades da mesma linha', () => {
    let cart = emptyCart();
    cart = addToCart(cart, itemA, 1);
    cart = addToCart(cart, itemA, 1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].qty).toBe(2);
    expect(cartCount(cart)).toBe(2);
    expect(cartSubtotalCents(cart)).toBe(2000);
  });

  it('trata variações como linhas distintas', () => {
    let cart = emptyCart();
    cart = addToCart(cart, { ...itemA, variant_id: 'v1', variant_label: 'P' }, 1);
    cart = addToCart(cart, { ...itemA, variant_id: 'v2', variant_label: 'G' }, 1);
    expect(cart.items).toHaveLength(2);
    expect(cartLineKey(cart.items[0])).not.toBe(cartLineKey(cart.items[1]));
  });

  it('respeita o estoque ao adicionar (clamp) e não passa do disponível', () => {
    let cart = emptyCart();
    cart = addToCart(cart, itemA, 10); // estoque 3
    expect(cart.items[0].qty).toBe(3);
    expect(maxQtyFor(cart.items[0])).toBe(3);
  });

  it('não adiciona item esgotado (estoque 0)', () => {
    let cart = emptyCart();
    cart = addToCart(cart, { ...itemA, stock_quantity: 0 }, 1);
    expect(isCartEmpty(cart)).toBe(true);
  });

  it('atualiza quantidade e remove quando 0', () => {
    let cart = addToCart(emptyCart(), itemA, 2);
    const key = cart.items[0].key;
    cart = setCartQty(cart, key, 1);
    expect(cart.items[0].qty).toBe(1);
    cart = setCartQty(cart, key, 0);
    expect(isCartEmpty(cart)).toBe(true);
  });

  it('remove item por chave e limpa por abrigo', () => {
    let cart = emptyCart();
    cart = addToCart(cart, itemA, 1);
    cart = addToCart(cart, itemB, 1);
    expect(cart.items).toHaveLength(2);
    cart = removeFromCart(cart, cart.items[0].key);
    expect(cart.items).toHaveLength(1);
    cart = addToCart(cart, itemA, 1);
    cart = clearShelterFromCart(cart, 'c2');
    expect(cart.items.every((i) => i.club_id === 'c1')).toBe(true);
  });

  it('normaliza carrinho persistido inválido, descartando itens sem ids', () => {
    const cart = normalizeCart({ items: [{ name: 'x' }, itemA, null, 'nope'] });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].product_id).toBe('p1');
  });

  it('agrupa por abrigo com subtotal e contagem', () => {
    let cart = emptyCart();
    cart = addToCart(cart, itemA, 2); // 2000
    cart = addToCart(cart, itemB, 1); // 2500
    const groups = groupCartByShelter(cart);
    expect(groups).toHaveLength(2);
    const g1 = groups.find((g) => g.club_id === 'c1');
    expect(g1.subtotal_cents).toBe(2000);
    expect(g1.count).toBe(2);
  });

  it('converte carrinho em um payload de pedido por abrigo (formato Loja v1)', () => {
    let cart = emptyCart();
    cart = addToCart(cart, { ...itemA, variant_id: 'v1', variant_label: 'P' }, 1);
    cart = addToCart(cart, itemB, 1);
    const payloads = cartToOrderPayloads(
      cart,
      { buyer_name: 'Ana', contact: 'ana@x.com', message: 'oi' },
      { c1: { payment_method: PAYMENT_METHOD.PIX, shipping_address: 'Rua 1' } },
    );
    expect(payloads).toHaveLength(2);
    const p1 = payloads.find((p) => p.club_id === 'c1');
    expect(p1.payload.buyer_name).toBe('Ana');
    expect(p1.payload.payment_method).toBe(PAYMENT_METHOD.PIX);
    expect(p1.payload.shipping_address).toBe('Rua 1');
    expect(p1.payload.items[0].name).toContain('— P'); // rótulo da variação embutido
    expect(p1.payload.items[0].variant_id).toBe('v1');
  });

  it('limita o número de linhas do carrinho', () => {
    let cart = emptyCart();
    for (let i = 0; i < CART_LIMITS.MAX_LINES + 5; i += 1) {
      cart = addToCart(cart, { ...itemB, product_id: `p${i}` }, 1);
    }
    expect(cart.items.length).toBeLessThanOrEqual(CART_LIMITS.MAX_LINES);
  });
});

describe('store/storeCart — ponto de extensão de pagamento', () => {
  it('lista provedores off-platform disponíveis conforme settings', () => {
    const providers = listAvailablePaymentProviders({ accepts_pix: true, pix_key: 'x@y', accepts_cash_on_pickup: true });
    const ids = providers.map((p) => p.id);
    expect(ids).toContain(PAYMENT_METHOD.PIX);
    expect(ids).toContain(PAYMENT_METHOD.CASH_ON_PICKUP);
  });

  it('cai em "a combinar" quando nada está configurado', () => {
    const providers = listAvailablePaymentProviders({ accepts_to_arrange: false, accepts_pix: false });
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe(PAYMENT_METHOD.TO_ARRANGE);
  });

  it('resolve instruções de PIX quando disponível', () => {
    const instr = resolvePaymentInstructions({ accepts_pix: true, pix_key: 'chave@pix', pix_name: 'Abrigo' }, PAYMENT_METHOD.PIX);
    expect(instr.type).toBe(PAYMENT_METHOD.PIX);
    expect(instr.pix_key).toBe('chave@pix');
    expect(instr.title).toContain('Abrigo');
  });

  it('permite registrar um provedor (gateway) e recuperá-lo', () => {
    const p = registerPaymentProvider({ id: 'demo_gateway', kind: PAYMENT_PROVIDER_KIND.GATEWAY, label: 'Gateway Demo', isAvailable: () => true });
    expect(getPaymentProvider('demo_gateway')).toBe(p);
    const providers = listAvailablePaymentProviders({ accepts_to_arrange: true });
    expect(providers.map((x) => x.id)).toContain('demo_gateway');
  });
});
