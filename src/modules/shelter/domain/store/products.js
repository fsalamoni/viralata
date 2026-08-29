/**
 * @fileoverview Domínio da Loja do Abrigo — produtos, configurações da loja,
 * pedidos, perguntas e avaliações. Puro (sem Firebase): enums, rótulos,
 * schemas zod, helpers de dinheiro/lucro e utilidades.
 *
 * Privacidade: custos, fornecedores e notas internas são dados de GESTÃO e
 * NÃO podem vazar para o público. Por isso o produto é dividido em:
 *   - doc público (`store_products/{id}`): nome, descrição, preço, mídias,
 *     entrega/frete, disponibilidade — o que a vitrine/marketplace mostram;
 *   - doc privado (`store_products/{id}/private/main`): custo, fornecedores,
 *     margem e notas internas — leitura só para gestores do abrigo (rules).
 * `PRODUCT_PRIVATE_FIELDS` marca quais campos o serviço move para o doc
 * privado ao gravar.
 */
import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────

/** Situação do produto na loja. */
export const PRODUCT_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  SOLD_OUT: 'sold_out',
  ARCHIVED: 'archived',
});

export const PRODUCT_STATUS_ORDER = Object.freeze([
  PRODUCT_STATUS.ACTIVE,
  PRODUCT_STATUS.PAUSED,
  PRODUCT_STATUS.SOLD_OUT,
  PRODUCT_STATUS.DRAFT,
  PRODUCT_STATUS.ARCHIVED,
]);

export const PRODUCT_STATUS_LABEL = Object.freeze({
  [PRODUCT_STATUS.DRAFT]: 'Rascunho',
  [PRODUCT_STATUS.ACTIVE]: 'À venda',
  [PRODUCT_STATUS.PAUSED]: 'Pausado',
  [PRODUCT_STATUS.SOLD_OUT]: 'Esgotado',
  [PRODUCT_STATUS.ARCHIVED]: 'Arquivado',
});

export const PRODUCT_STATUS_COLOR = Object.freeze({
  [PRODUCT_STATUS.DRAFT]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  [PRODUCT_STATUS.ACTIVE]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [PRODUCT_STATUS.PAUSED]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  [PRODUCT_STATUS.SOLD_OUT]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  [PRODUCT_STATUS.ARCHIVED]: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
});

/** Categorias de produto (loja de abrigo: brechó pet, artesanato, ração etc.). */
export const PRODUCT_CATEGORY = Object.freeze({
  ACCESSORIES: 'accessories',
  FOOD_TREATS: 'food_treats',
  TOYS: 'toys',
  HYGIENE: 'hygiene',
  APPAREL: 'apparel',
  BEDS_HOUSES: 'beds_houses',
  HANDMADE: 'handmade',
  HEALTH: 'health',
  BOOKS: 'books',
  OTHER: 'other',
});

export const PRODUCT_CATEGORY_ORDER = Object.freeze(Object.values(PRODUCT_CATEGORY));

export const PRODUCT_CATEGORY_LABEL = Object.freeze({
  [PRODUCT_CATEGORY.ACCESSORIES]: 'Acessórios',
  [PRODUCT_CATEGORY.FOOD_TREATS]: 'Ração e petiscos',
  [PRODUCT_CATEGORY.TOYS]: 'Brinquedos',
  [PRODUCT_CATEGORY.HYGIENE]: 'Higiene',
  [PRODUCT_CATEGORY.APPAREL]: 'Vestuário',
  [PRODUCT_CATEGORY.BEDS_HOUSES]: 'Camas e casinhas',
  [PRODUCT_CATEGORY.HANDMADE]: 'Artesanato',
  [PRODUCT_CATEGORY.HEALTH]: 'Saúde e cuidados',
  [PRODUCT_CATEGORY.BOOKS]: 'Livros',
  [PRODUCT_CATEGORY.OTHER]: 'Outros',
});

/** Formas de entrega oferecidas por produto. */
export const DELIVERY_METHOD = Object.freeze({
  PICKUP: 'pickup', // retirada no abrigo
  LOCAL_DELIVERY: 'local_delivery', // entrega local (motoboy/combinado)
  SHIPPING: 'shipping', // envio (Correios/transportadora)
  TO_ARRANGE: 'to_arrange', // a combinar
});

export const DELIVERY_METHOD_LABEL = Object.freeze({
  [DELIVERY_METHOD.PICKUP]: 'Retirada no abrigo',
  [DELIVERY_METHOD.LOCAL_DELIVERY]: 'Entrega local',
  [DELIVERY_METHOD.SHIPPING]: 'Envio (Correios/transportadora)',
  [DELIVERY_METHOD.TO_ARRANGE]: 'A combinar',
});

export const DELIVERY_METHOD_ORDER = Object.freeze(Object.values(DELIVERY_METHOD));

/**
 * Formas de pagamento — deliberadamente OFF-PLATFORM (a plataforma não
 * processa dinheiro). Configuradas por abrigo. Ver o guia de opções no PR.
 */
export const PAYMENT_METHOD = Object.freeze({
  PIX: 'pix', // chave PIX do abrigo (QR/copia-e-cola exibido ao comprador)
  TO_ARRANGE: 'to_arrange', // combinar diretamente com o abrigo
  EXTERNAL_LINK: 'external_link', // link de checkout externo do próprio abrigo
  CASH_ON_PICKUP: 'cash_on_pickup', // dinheiro/maquininha na retirada
});

export const PAYMENT_METHOD_LABEL = Object.freeze({
  [PAYMENT_METHOD.PIX]: 'PIX',
  [PAYMENT_METHOD.TO_ARRANGE]: 'A combinar com o abrigo',
  [PAYMENT_METHOD.EXTERNAL_LINK]: 'Link de pagamento do abrigo',
  [PAYMENT_METHOD.CASH_ON_PICKUP]: 'Dinheiro/cartão na retirada',
});

/** Situação de um pedido (intenção de compra registrada). */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending', // aguardando o abrigo confirmar/combinar
  CONFIRMED: 'confirmed', // abrigo confirmou, aguardando pagamento
  PAID: 'paid', // pagamento recebido (confirmado manualmente pelo abrigo)
  SHIPPED: 'shipped', // enviado/entregue em trânsito
  DELIVERED: 'delivered', // concluído
  CANCELLED: 'cancelled',
});

export const ORDER_STATUS_LABEL = Object.freeze({
  [ORDER_STATUS.PENDING]: 'Aguardando confirmação',
  [ORDER_STATUS.CONFIRMED]: 'Confirmado',
  [ORDER_STATUS.PAID]: 'Pago',
  [ORDER_STATUS.SHIPPED]: 'Enviado',
  [ORDER_STATUS.DELIVERED]: 'Entregue',
  [ORDER_STATUS.CANCELLED]: 'Cancelado',
});

export const ORDER_STATUS_ORDER = Object.freeze([
  ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PAID,
  ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED,
]);

/** Tipo de mídia de produto. */
export const MEDIA_TYPE = Object.freeze({ IMAGE: 'image', VIDEO: 'video' });

/**
 * Campos que vivem SÓ no doc privado do produto (gestão). O serviço os remove
 * do doc público ao gravar e os grava em `store_products/{id}/private/main`.
 */
export const PRODUCT_PRIVATE_FIELDS = Object.freeze([
  'cost_cents', 'suppliers', 'internal_notes',
]);

// ─── Helpers de dinheiro / lucro ────────────────────────────────────────────

/** Formata centavos (inteiro) em BRL. */
export function formatBRL(cents) {
  const v = Number.isFinite(cents) ? cents : 0;
  return (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte string "12,90" | "12.90" | 12.9 para centavos inteiros. */
export function toCents(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Math.round(value * 100);
  const normalized = String(value).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Converte centavos para string com vírgula (edição em formulário). */
export function centsToInput(cents) {
  if (!Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** Lucro unitário em centavos (preço − custo). Null se custo desconhecido. */
export function unitProfitCents(priceCents, costCents) {
  if (!Number.isFinite(costCents) || costCents <= 0) return null;
  return (Number(priceCents) || 0) - costCents;
}

/** Margem de lucro (%). Null se custo/preço inválidos. */
export function profitMarginPct(priceCents, costCents) {
  const price = Number(priceCents) || 0;
  if (!Number.isFinite(costCents) || costCents <= 0 || price <= 0) return null;
  return Math.round(((price - costCents) / price) * 100);
}

// ─── Disponibilidade / visibilidade ─────────────────────────────────────────

/** O produto está com estoque disponível para venda? */
export function isInStock(product) {
  if (!product) return false;
  if (!product.track_stock) return true;
  return Number(product.stock_quantity) > 0;
}

/**
 * O produto pode ser exposto ao público? Precisa: loja habilitada + pública,
 * produto ativo e (se controla estoque) com estoque. Fonte única usada pela
 * vitrine e pelo marketplace. `settings` pode ser omitido (checa só o produto).
 */
export function isProductPublic(product, settings) {
  if (!product) return false;
  if (product.status !== PRODUCT_STATUS.ACTIVE) return false;
  if (settings && !(settings.enabled && settings.public_visible)) return false;
  return true;
}

/** Nota média de avaliações e contagem. */
export function ratingSummary(reviews = []) {
  const list = Array.isArray(reviews) ? reviews : [];
  if (list.length === 0) return { average: 0, count: 0 };
  const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return { average: Math.round((sum / list.length) * 10) / 10, count: list.length };
}

/** Agregados da loja para o dashboard admin. */
export function computeStoreStats(products = []) {
  const list = Array.isArray(products) ? products : [];
  const stats = {
    total: list.length,
    active: 0,
    draft: 0,
    paused: 0,
    soldOut: 0,
    archived: 0,
    outOfStock: 0,
    inventoryUnits: 0,
    inventoryValueCents: 0, // valor de venda do estoque
    inventoryCostCents: 0, // custo do estoque (quando conhecido)
    potentialProfitCents: 0,
  };
  for (const p of list) {
    if (p.status === PRODUCT_STATUS.ACTIVE) stats.active += 1;
    else if (p.status === PRODUCT_STATUS.DRAFT) stats.draft += 1;
    else if (p.status === PRODUCT_STATUS.PAUSED) stats.paused += 1;
    else if (p.status === PRODUCT_STATUS.SOLD_OUT) stats.soldOut += 1;
    else if (p.status === PRODUCT_STATUS.ARCHIVED) stats.archived += 1;

    if (p.status !== PRODUCT_STATUS.ARCHIVED && !isInStock(p)) stats.outOfStock += 1;

    const qty = p.track_stock ? Math.max(0, Number(p.stock_quantity) || 0) : 0;
    const price = Number(p.price_cents) || 0;
    const cost = Number(p.cost_cents) || 0;
    stats.inventoryUnits += qty;
    stats.inventoryValueCents += qty * price;
    if (cost > 0) {
      stats.inventoryCostCents += qty * cost;
      stats.potentialProfitCents += qty * (price - cost);
    }
  }
  return stats;
}

// ─── Utilidades ──────────────────────────────────────────────────────────

let _seq = 0;
/** Gera um id curto para itens embutidos (fornecedor, item de pedido). */
export function genId(prefix = 'id') {
  _seq = (_seq + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

/** Slug amigável a partir do nome do produto. */
export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ─── Schemas (zod) ─────────────────────────────────────────────────────────

const centsSchema = z.number().int().min(0).max(1_000_000_00); // até R$ 1.000.000

export const mediaItemSchema = z.object({
  url: z.string().url(),
  path: z.string().optional(),
  type: z.enum([MEDIA_TYPE.IMAGE, MEDIA_TYPE.VIDEO]).default(MEDIA_TYPE.IMAGE),
  name: z.string().max(200).optional(),
});

export const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Nome do fornecedor é obrigatório').max(160),
  contact: z.string().trim().max(200).optional(),
  lead_time_days: z.number().int().min(0).max(3650).optional(),
  unit_cost_cents: centsSchema.optional(),
  notes: z.string().trim().max(500).optional(),
});

/**
 * Variação de um produto (Loja v2 — SHELTER_STORE_V2). Ex.: tamanho P/M/G ou
 * cor. Campo ADITIVO e opcional em `productBase.variants` — quando ausente, o
 * produto se comporta exatamente como na Loja v1 (preço/estoque únicos). Se
 * `price_cents` for definido, sobrepõe o preço do produto para aquela variação;
 * `stock_quantity` (quando o produto controla estoque) é o estoque próprio da
 * variação.
 */
export const variantSchema = z.object({
  id: z.string().trim().max(60).optional(),
  label: z.string().trim().min(1, 'Rótulo da variação é obrigatório').max(80),
  price_cents: centsSchema.optional(),
  stock_quantity: z.number().int().min(0).max(1_000_000).optional(),
  sku: z.string().trim().max(80).optional(),
});

/** Campos comuns de produto (create/edit compartilham). */
const productBase = {
  name: z.string().trim().min(2, 'Nome é obrigatório').max(160),
  description: z.string().trim().max(4000).optional().default(''),
  details: z.string().trim().max(4000).optional().default(''),
  material: z.string().trim().max(300).optional().default(''),
  category: z.enum(PRODUCT_CATEGORY_ORDER).default(PRODUCT_CATEGORY.OTHER),
  tags: z.array(z.string().trim().max(40)).max(20).optional().default([]),
  price_cents: centsSchema,
  compare_at_price_cents: centsSchema.optional(),
  // Gestão (privado):
  cost_cents: centsSchema.optional(),
  suppliers: z.array(supplierSchema).max(30).optional().default([]),
  internal_notes: z.string().trim().max(2000).optional().default(''),
  // Estoque:
  sku: z.string().trim().max(80).optional().default(''),
  track_stock: z.boolean().optional().default(true),
  stock_quantity: z.number().int().min(0).max(1_000_000).optional().default(0),
  // Entrega / frete:
  delivery_methods: z.array(z.enum(DELIVERY_METHOD_ORDER)).max(4).optional().default([]),
  shipping_cost_cents: centsSchema.optional(),
  lead_time_days: z.number().int().min(0).max(3650).optional(),
  ship_from_city: z.string().trim().max(120).optional().default(''),
  ship_from_state: z.string().trim().max(2).optional().default(''),
  weight_grams: z.number().int().min(0).max(1_000_000).optional(),
  dimensions_cm: z.string().trim().max(60).optional().default(''),
  // Mídia:
  images: z.array(mediaItemSchema).max(12).optional().default([]),
  videos: z.array(mediaItemSchema).max(4).optional().default([]),
  // Variações (Loja v2 — aditivo/opcional; vazio = produto simples da v1):
  variants: z.array(variantSchema).max(30).optional().default([]),
  status: z.enum(Object.values(PRODUCT_STATUS)).optional().default(PRODUCT_STATUS.DRAFT),
};

export const productCreateSchema = z.object(productBase);
export const productEditSchema = z.object(productBase).partial();

/** Configurações da loja do abrigo. */
export const storeSettingsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  public_visible: z.boolean().optional().default(false),
  headline: z.string().trim().max(160).optional().default(''),
  about: z.string().trim().max(2000).optional().default(''),
  // Pagamento (off-platform):
  accepts_pix: z.boolean().optional().default(false),
  pix_key: z.string().trim().max(200).optional().default(''),
  pix_name: z.string().trim().max(160).optional().default(''),
  accepts_to_arrange: z.boolean().optional().default(true),
  external_checkout_url: z.string().trim().url('URL inválida').max(500).optional().or(z.literal('')),
  accepts_cash_on_pickup: z.boolean().optional().default(false),
  // Políticas / contato:
  shipping_policy: z.string().trim().max(2000).optional().default(''),
  return_policy: z.string().trim().max(2000).optional().default(''),
  contact_whatsapp: z.string().trim().max(40).optional().default(''),
  contact_email: z.string().trim().max(160).optional().default(''),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Escolha de 1 a 5 estrelas').max(5),
  comment: z.string().trim().max(2000).optional().default(''),
});

export const questionSchema = z.object({
  question: z.string().trim().min(3, 'Escreva sua pergunta').max(1000),
});

export const answerSchema = z.object({
  answer: z.string().trim().min(1, 'Escreva a resposta').max(2000),
});

export const orderItemSchema = z.object({
  product_id: z.string().min(1),
  name: z.string().min(1),
  price_cents: centsSchema,
  qty: z.number().int().min(1).max(999).default(1),
  image_url: z.string().url().optional(),
  // Variação escolhida (Loja v2 — aditivo/opcional):
  variant_id: z.string().max(60).optional(),
  variant_label: z.string().max(120).optional(),
});

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Adicione ao menos um produto'),
  buyer_name: z.string().trim().min(2, 'Informe seu nome').max(160),
  contact: z.string().trim().min(3, 'Informe um contato (WhatsApp/e-mail)').max(200),
  message: z.string().trim().max(1000).optional().default(''),
  payment_method: z.enum(Object.values(PAYMENT_METHOD)).optional(),
  delivery_method: z.enum(DELIVERY_METHOD_ORDER).optional(),
  shipping_address: z.string().trim().max(500).optional().default(''),
  // Nome do abrigo no momento da compra — snapshot para exibição em "Meus
  // Pedidos" (o pedido não guarda o nome de outra forma). Opcional/aditivo.
  shelter_name: z.string().trim().max(160).optional(),
});

/**
 * Dados de fulfillment/envio de um pedido (Loja v2 — SHELTER_STORE_V2). Campo
 * ADITIVO gravado em `fulfillment` no doc do pedido; opcional e sem efeito na
 * Loja v1. Usado pelo admin ao marcar um pedido como enviado.
 */
export const orderFulfillmentSchema = z.object({
  carrier: z.string().trim().max(120).optional().default(''),
  tracking_code: z.string().trim().max(120).optional().default(''),
  tracking_url: z.union([z.string().trim().url('URL inválida').max(500), z.literal('')]).optional().default(''),
  shipped_at: z.string().trim().max(40).optional().default(''),
  estimated_delivery: z.string().trim().max(40).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
});

/** Divide o payload de produto em { publicData, privateData }. */
export function splitProductData(data) {
  const publicData = {};
  const privateData = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (PRODUCT_PRIVATE_FIELDS.includes(k)) privateData[k] = v;
    else publicData[k] = v;
  }
  return { publicData, privateData };
}
