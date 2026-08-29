/**
 * @fileoverview Serviço da Loja v2 (SHELTER_STORE_V2). Estende ADITIVAMENTE a
 * Loja v1 sem tocar em `firestore.rules`/`firestore.indexes.json`:
 *   - pedidos do comprador (acompanhamento): collectionGroup por `buyer_uid`,
 *     sem orderBy (índice de campo único é automático) + ordenação no cliente;
 *   - checkout a partir do carrinho: reusa `createOrder` da v1 (1 pedido por
 *     abrigo);
 *   - fulfillment: grava `fulfillment` no doc do pedido + log de atividade
 *     (regras já permitem update por gestores; sem hasOnly());
 *   - variações de produto: reusa `updateProduct` (campo público aditivo).
 *
 * Firestore sem ignoreUndefinedProperties → nunca persistir undefined.
 */
import {
  collectionGroup, doc, getDoc, getDocs, updateDoc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  ORDER_STATUS, orderFulfillmentSchema, genId,
} from '@/modules/shelter/domain/store/products';
import { cartToOrderPayloads } from '@/modules/shelter/domain/store/storeCart';
import { createOrder, updateProduct } from './shelterStoreService';

const ORDERS = 'store_orders';

function orderRef(clubId, id) { return doc(db, 'clubs', clubId, ORDERS, id); }

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * Todos os pedidos feitos por um comprador (em qualquer abrigo). Usa
 * collectionGroup filtrando por `buyer_uid` (campo único → índice automático);
 * a ordenação por data é feita no cliente para não exigir índice composto.
 */
export async function listMyOrders(uid) {
  if (!db || !uid) return [];
  const q = query(collectionGroup(db, ORDERS), where('buyer_uid', '==', uid));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      club_id: data.shelter_club_id || d.ref?.parent?.parent?.id || '',
      ...data,
    };
  });
  rows.sort((a, b) => _ts(b.created_at) - _ts(a.created_at));
  return rows;
}

function _ts(v) {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (Number.isFinite(v?.seconds)) return v.seconds * 1000;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Um pedido específico (comprador dono ou gestor — controlado pelas rules). */
export async function getOrder(clubId, orderId) {
  if (!db || !clubId || !orderId) return null;
  const snap = await getDoc(orderRef(clubId, orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, club_id: clubId, ...snap.data() };
}

/**
 * Cria um pedido por abrigo a partir do carrinho. Reusa `createOrder` da v1
 * (mesma validação/auditoria). Retorna a lista de resultados por abrigo; erros
 * individuais não abortam os demais (best-effort por loja).
 *
 * @param {{uid:string, name?:string}} actor
 * @param {object} cart
 * @param {{buyer:object, perShelter?:Record<string,object>}} meta
 */
export async function createOrdersFromCart(actor, cart, meta = {}) {
  if (!db) return [];
  if (!actor?.uid) throw new Error('É preciso estar autenticado para finalizar a compra');
  const payloads = cartToOrderPayloads(cart, meta.buyer || {}, meta.perShelter || {});
  if (payloads.length === 0) throw new Error('Carrinho vazio');
  const results = [];
  for (const group of payloads) {
    try {
      const res = await createOrder(group.club_id, actor, group.payload);
      results.push({ club_id: group.club_id, club_name: group.club_name, order_id: res?.id || '', ok: true });
    } catch (err) {
      logger.error('createOrdersFromCart: falha ao criar pedido', { clubId: group.club_id, error: err?.message });
      results.push({ club_id: group.club_id, club_name: group.club_name, ok: false, error: err?.message || 'Falha ao criar pedido' });
    }
  }
  return results;
}

/**
 * Grava dados de envio/fulfillment de um pedido (aditivo) e registra atividade.
 * Não altera o status por si só; o admin pode marcar "Enviado" à parte. Se
 * `markShipped` for true, também move o status para SHIPPED.
 */
export async function setOrderFulfillment(clubId, orderId, actor, fulfillment, { markShipped = false } = {}) {
  if (!db) return;
  if (!clubId || !orderId) throw new Error('clubId e orderId são obrigatórios');
  const parsed = orderFulfillmentSchema.parse(fulfillment || {});
  const snap = await getDoc(orderRef(clubId, orderId));
  const current = snap.exists() ? snap.data() : {};
  const activity = [
    ...(Array.isArray(current.activity) ? current.activity : []),
    {
      id: genId('act'), type: 'fulfillment', at: new Date().toISOString(),
      by_name: actor?.name || actor?.displayName || 'Gestor',
      message: parsed.tracking_code
        ? `Envio: ${parsed.carrier || 'transportadora'} · ${parsed.tracking_code}`
        : 'Dados de envio atualizados',
    },
  ];
  const patch = stripUndefined({
    fulfillment: stripUndefined(parsed),
    activity,
    updated_at: serverTimestamp(),
  });
  if (markShipped) patch.status = ORDER_STATUS.SHIPPED;
  await updateDoc(orderRef(clubId, orderId), patch);
  createAuditLog({ action: 'store_order_fulfillment', clubId, uid: actor?.uid, metadata: { orderId, markShipped } }).catch(() => {});
}

/**
 * Salva as variações de um produto (campo público aditivo). Reusa
 * `updateProduct` da v1 — `variants` faz parte de `productBase`, então passa
 * pela validação e vai ao doc público.
 */
export async function saveProductVariants(clubId, productId, actor, variants) {
  if (!db) return;
  const list = Array.isArray(variants) ? variants : [];
  await updateProduct(clubId, productId, actor, { variants: list });
}
