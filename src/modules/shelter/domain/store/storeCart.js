/**
 * @fileoverview Domínio do CARRINHO da Loja do Abrigo (Fase 7 · Loja v2).
 * Puro (sem Firebase/React). Modela um carrinho multi-abrigo (o comprador pode
 * juntar produtos de lojas diferentes) e transforma o carrinho em um payload de
 * pedido POR abrigo — cada loja recebe um pedido próprio (as coleções de pedido
 * são por clube). Também define o PONTO DE EXTENSÃO de pagamento: hoje só
 * provedores off-platform (PIX, combinar, link externo, dinheiro na retirada),
 * mas com um registro extensível para plugar um processador (gateway) no
 * futuro sem tocar no fluxo de checkout.
 *
 * Aditivo e não-breaking: o carrinho vive no cliente (localStorage) e o checkout
 * reutiliza `createOrder` da Loja v1 (um por abrigo). Nada aqui muda o schema de
 * produtos/pedidos existente.
 */
import {
  PAYMENT_METHOD, PAYMENT_METHOD_LABEL, DELIVERY_METHOD_ORDER,
} from './products';

/** Teto de segurança para itens/quantidades (evita payloads absurdos). */
export const CART_LIMITS = Object.freeze({
  MAX_LINES: 60, // linhas distintas no carrinho
  MAX_QTY_PER_LINE: 99, // unidades por linha
  MAX_SHELTERS: 20, // abrigos distintos por checkout
});

// ─── Identidade / normalização de item ──────────────────────────────────────

/**
 * Chave estável de uma linha do carrinho: mesmo produto + mesma variação de um
 * mesmo abrigo é a MESMA linha (soma quantidades).
 */
export function cartLineKey({ club_id, product_id, variant_id } = {}) {
  return `${club_id || ''}::${product_id || ''}::${variant_id || ''}`;
}

function clampInt(n, min, max) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/** Quantidade máxima vendável de uma linha (respeita estoque, se controlado). */
export function maxQtyFor(item) {
  const cap = CART_LIMITS.MAX_QTY_PER_LINE;
  if (!item) return cap;
  if (item.track_stock && Number.isFinite(Number(item.stock_quantity))) {
    return clampInt(Math.min(cap, Math.max(0, Number(item.stock_quantity))), 0, cap);
  }
  return cap;
}

/** Normaliza um item recebido da UI em uma linha de carrinho canônica. */
export function normalizeCartItem(raw = {}) {
  const item = {
    club_id: String(raw.club_id || ''),
    club_name: String(raw.club_name || 'Abrigo'),
    product_id: String(raw.product_id || raw.id || ''),
    name: String(raw.name || 'Produto'),
    price_cents: Math.max(0, Math.trunc(Number(raw.price_cents) || 0)),
    image_url: raw.image_url || raw.images?.[0]?.url || null,
    variant_id: raw.variant_id ? String(raw.variant_id) : null,
    variant_label: raw.variant_label ? String(raw.variant_label) : null,
    track_stock: Boolean(raw.track_stock),
    stock_quantity: Number.isFinite(Number(raw.stock_quantity)) ? Math.max(0, Math.trunc(Number(raw.stock_quantity))) : null,
    qty: clampInt(raw.qty ?? 1, 1, CART_LIMITS.MAX_QTY_PER_LINE),
  };
  item.key = cartLineKey(item);
  return item;
}

// ─── Estado do carrinho ─────────────────────────────────────────────────────

export function emptyCart() {
  return { items: [] };
}

/** Garante a forma `{ items: [...] }` a partir de qualquer valor persistido. */
export function normalizeCart(value) {
  const items = Array.isArray(value?.items) ? value.items : [];
  const seen = new Map();
  for (const raw of items) {
    if (!raw || !raw.product_id || !raw.club_id) continue;
    const it = normalizeCartItem(raw);
    if (!it.product_id || !it.club_id) continue;
    // Mescla duplicatas (mesma chave) somando quantidades.
    const prev = seen.get(it.key);
    if (prev) {
      prev.qty = clampInt(prev.qty + it.qty, 1, Math.max(1, maxQtyFor(prev)));
    } else if (seen.size < CART_LIMITS.MAX_LINES) {
      seen.set(it.key, it);
    }
  }
  return { items: Array.from(seen.values()) };
}

/** Adiciona (ou soma) uma linha, respeitando estoque e limites. Retorna NOVO carrinho. */
export function addToCart(cart, rawItem, qty = 1) {
  const base = normalizeCart(cart);
  const incoming = normalizeCartItem({ ...rawItem, qty: 1 });
  if (!incoming.product_id || !incoming.club_id) return base;
  const addQty = clampInt(qty, 1, CART_LIMITS.MAX_QTY_PER_LINE);
  const items = [...base.items];
  const idx = items.findIndex((i) => i.key === incoming.key);
  if (idx >= 0) {
    const merged = { ...items[idx] };
    const cap = maxQtyFor(merged);
    if (cap <= 0) return base; // sem estoque: mantém como está
    merged.qty = clampInt(merged.qty + addQty, 1, cap);
    items[idx] = merged;
  } else {
    if (items.length >= CART_LIMITS.MAX_LINES) return base;
    const cap = maxQtyFor(incoming);
    if (cap <= 0) return base; // sem estoque: não adiciona
    incoming.qty = clampInt(addQty, 1, cap);
    items.push(incoming);
  }
  return { items };
}

/** Define a quantidade de uma linha (remove se <= 0). Retorna NOVO carrinho. */
export function setCartQty(cart, key, qty) {
  const base = normalizeCart(cart);
  const items = [];
  for (const it of base.items) {
    if (it.key !== key) { items.push(it); continue; }
    const cap = maxQtyFor(it);
    const next = clampInt(qty, 0, cap);
    if (next > 0) items.push({ ...it, qty: next });
    // next === 0 → remove
  }
  return { items };
}

export function removeFromCart(cart, key) {
  const base = normalizeCart(cart);
  return { items: base.items.filter((i) => i.key !== key) };
}

export function clearCart() {
  return emptyCart();
}

/** Remove todas as linhas de um abrigo (usado após checkout daquele abrigo). */
export function clearShelterFromCart(cart, clubId) {
  const base = normalizeCart(cart);
  return { items: base.items.filter((i) => i.club_id !== clubId) };
}

// ─── Totais / agrupamento ───────────────────────────────────────────────────

export function lineTotalCents(item) {
  return Math.max(0, Math.trunc(Number(item?.price_cents) || 0)) * clampInt(item?.qty ?? 0, 0, CART_LIMITS.MAX_QTY_PER_LINE);
}

export function cartCount(cart) {
  return normalizeCart(cart).items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
}

export function cartSubtotalCents(cart) {
  return normalizeCart(cart).items.reduce((acc, i) => acc + lineTotalCents(i), 0);
}

export function isCartEmpty(cart) {
  return normalizeCart(cart).items.length === 0;
}

/** Agrupa o carrinho por abrigo → [{ club_id, club_name, items, subtotal_cents, count }]. */
export function groupCartByShelter(cart) {
  const base = normalizeCart(cart);
  const groups = new Map();
  for (const it of base.items) {
    if (!groups.has(it.club_id)) {
      groups.set(it.club_id, { club_id: it.club_id, club_name: it.club_name, items: [], subtotal_cents: 0, count: 0 });
    }
    const g = groups.get(it.club_id);
    g.items.push(it);
    g.subtotal_cents += lineTotalCents(it);
    g.count += Number(it.qty) || 0;
  }
  return Array.from(groups.values());
}

/**
 * Converte cada grupo de abrigo em um payload aceito por `orderCreateSchema`
 * (Loja v1). `perShelter[clubId]` pode trazer { payment_method, delivery_method,
 * shipping_address } específico daquele abrigo.
 */
export function cartToOrderPayloads(cart, buyer = {}, perShelter = {}) {
  const groups = groupCartByShelter(cart).slice(0, CART_LIMITS.MAX_SHELTERS);
  return groups.map((g) => {
    const extra = perShelter[g.club_id] || {};
    const payload = {
      items: g.items.map((it) => {
        const item = {
          product_id: it.product_id,
          name: it.variant_label ? `${it.name} — ${it.variant_label}` : it.name,
          price_cents: it.price_cents,
          qty: it.qty,
        };
        if (it.image_url) item.image_url = it.image_url;
        if (it.variant_id) item.variant_id = it.variant_id;
        if (it.variant_label) item.variant_label = it.variant_label;
        return item;
      }),
      buyer_name: String(buyer.buyer_name || buyer.name || '').trim(),
      contact: String(buyer.contact || '').trim(),
      message: String(buyer.message || '').trim(),
      shelter_name: g.club_name,
    };
    if (extra.payment_method) payload.payment_method = extra.payment_method;
    if (extra.delivery_method && DELIVERY_METHOD_ORDER.includes(extra.delivery_method)) {
      payload.delivery_method = extra.delivery_method;
    }
    if (extra.shipping_address) payload.shipping_address = String(extra.shipping_address).trim();
    return { club_id: g.club_id, club_name: g.club_name, subtotal_cents: g.subtotal_cents, payload };
  });
}

// ─── Ponto de extensão de pagamento (off-platform + seam p/ gateway) ─────────

export const PAYMENT_PROVIDER_KIND = Object.freeze({
  OFFLINE: 'offline', // combinado fora da plataforma (a plataforma NÃO processa)
  GATEWAY: 'gateway', // processador externo (extensão futura)
});

/**
 * Provedores off-platform embutidos. Cada provedor sabe se está disponível para
 * uma loja (com base nas `settings`) e como montar as instruções que o
 * comprador vê na confirmação. `buildCheckoutSession` fica reservado para um
 * gateway futuro (retorna null aqui).
 */
const BUILTIN_PROVIDERS = [
  {
    id: PAYMENT_METHOD.PIX,
    kind: PAYMENT_PROVIDER_KIND.OFFLINE,
    label: PAYMENT_METHOD_LABEL[PAYMENT_METHOD.PIX],
    isAvailable: (s) => Boolean(s?.accepts_pix && s?.pix_key),
    buildInstructions: (s) => ({
      type: PAYMENT_METHOD.PIX,
      title: `PIX${s?.pix_name ? ` — ${s.pix_name}` : ''}`,
      pix_key: s?.pix_key || '',
      copyable: s?.pix_key || '',
      note: 'Envie o comprovante ao abrigo pelo contato informado.',
    }),
  },
  {
    id: PAYMENT_METHOD.EXTERNAL_LINK,
    kind: PAYMENT_PROVIDER_KIND.OFFLINE,
    label: PAYMENT_METHOD_LABEL[PAYMENT_METHOD.EXTERNAL_LINK],
    isAvailable: (s) => Boolean(s?.external_checkout_url),
    buildInstructions: (s) => ({
      type: PAYMENT_METHOD.EXTERNAL_LINK,
      title: 'Pagamento no link do abrigo',
      url: s?.external_checkout_url || '',
      note: 'Você será direcionado ao checkout externo do abrigo.',
    }),
  },
  {
    id: PAYMENT_METHOD.CASH_ON_PICKUP,
    kind: PAYMENT_PROVIDER_KIND.OFFLINE,
    label: PAYMENT_METHOD_LABEL[PAYMENT_METHOD.CASH_ON_PICKUP],
    isAvailable: (s) => Boolean(s?.accepts_cash_on_pickup),
    buildInstructions: () => ({
      type: PAYMENT_METHOD.CASH_ON_PICKUP,
      title: 'Dinheiro/cartão na retirada',
      note: 'Combine a retirada com o abrigo e pague na entrega.',
    }),
  },
  {
    id: PAYMENT_METHOD.TO_ARRANGE,
    kind: PAYMENT_PROVIDER_KIND.OFFLINE,
    label: PAYMENT_METHOD_LABEL[PAYMENT_METHOD.TO_ARRANGE],
    isAvailable: (s) => s == null || s.accepts_to_arrange !== false,
    buildInstructions: () => ({
      type: PAYMENT_METHOD.TO_ARRANGE,
      title: 'A combinar com o abrigo',
      note: 'O abrigo entrará em contato para combinar o pagamento e a entrega.',
    }),
  },
];

const _providerRegistry = new Map(BUILTIN_PROVIDERS.map((p) => [p.id, p]));

/**
 * Registra/pluga um provedor de pagamento (ex.: gateway futuro). Idempotente por
 * `id`. Retorna o provedor efetivo. Esta é a "porta" de extensão — o restante do
 * checkout não muda ao adicionar um novo provedor.
 */
export function registerPaymentProvider(provider) {
  if (!provider?.id) throw new Error('Provider precisa de um id');
  const normalized = {
    kind: PAYMENT_PROVIDER_KIND.OFFLINE,
    label: provider.id,
    isAvailable: () => true,
    buildInstructions: () => ({ type: provider.id, title: provider.label || provider.id }),
    buildCheckoutSession: null,
    ...provider,
  };
  _providerRegistry.set(provider.id, normalized);
  return normalized;
}

export function getPaymentProvider(id) {
  return _providerRegistry.get(id) || null;
}

/** Provedores disponíveis para uma loja, na ordem canônica de exibição. */
export function listAvailablePaymentProviders(settings) {
  const order = [
    PAYMENT_METHOD.PIX, PAYMENT_METHOD.EXTERNAL_LINK,
    PAYMENT_METHOD.CASH_ON_PICKUP, PAYMENT_METHOD.TO_ARRANGE,
  ];
  const known = order
    .map((id) => _providerRegistry.get(id))
    .filter((p) => p && p.isAvailable(settings));
  // Provedores extras (gateways registrados) entram depois.
  const extras = Array.from(_providerRegistry.values())
    .filter((p) => !order.includes(p.id) && p.isAvailable(settings));
  const all = [...known, ...extras];
  return all.length ? all : [_providerRegistry.get(PAYMENT_METHOD.TO_ARRANGE)];
}

/**
 * Instruções de pagamento para a tela de confirmação, dado o método escolhido.
 * Cai no "a combinar" quando o método é desconhecido/indisponível.
 */
export function resolvePaymentInstructions(settings, methodId) {
  const provider = _providerRegistry.get(methodId);
  if (provider && provider.isAvailable(settings)) return provider.buildInstructions(settings);
  return _providerRegistry.get(PAYMENT_METHOD.TO_ARRANGE).buildInstructions(settings);
}
