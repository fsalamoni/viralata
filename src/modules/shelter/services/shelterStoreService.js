/**
 * @fileoverview Serviço: Loja do Abrigo (produtos, configurações, pedidos,
 * perguntas e avaliações) + agregação para o marketplace da plataforma.
 *
 * Coleções (multi-tenant, `shelter_club_id` duplicado + validado):
 *   clubs/{clubId}/store_settings/main            — config da loja (1 doc)
 *   clubs/{clubId}/store_products/{id}            — produto (dados PÚBLICOS)
 *   clubs/{clubId}/store_products/{id}/private/main — custo/fornecedores (gestão)
 *   clubs/{clubId}/store_products/{id}/reviews/{id}   — avaliações (público)
 *   clubs/{clubId}/store_products/{id}/questions/{id} — perguntas + respostas
 *   clubs/{clubId}/store_orders/{id}              — pedidos (intenção de compra)
 *
 * Privacidade: custo/fornecedor/notas ficam SÓ no doc `private/main` (rules
 * restringem leitura a gestores). A vitrine e o marketplace leem apenas o doc
 * público. Firestore sem ignoreUndefinedProperties → nunca persistir undefined.
 */
import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit as fbLimit,
  serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { getClub } from '@/modules/organizations/services/clubService';
import {
  PRODUCT_STATUS, ORDER_STATUS,
  productCreateSchema, productEditSchema, storeSettingsSchema,
  reviewSchema, questionSchema, answerSchema, orderCreateSchema,
  splitProductData, slugify, genId,
} from '@/modules/shelter/domain/store/products';

const CLUBS = 'clubs';
const SETTINGS = 'store_settings';
const PRODUCTS = 'store_products';
const ORDERS = 'store_orders';
const PRIVATE = 'private';
const REVIEWS = 'reviews';
const QUESTIONS = 'questions';

function settingsRef(clubId) { return doc(db, CLUBS, clubId, SETTINGS, 'main'); }
function productsCol(clubId) { return collection(db, CLUBS, clubId, PRODUCTS); }
function productRef(clubId, id) { return doc(db, CLUBS, clubId, PRODUCTS, id); }
function productPrivateRef(clubId, id) { return doc(db, CLUBS, clubId, PRODUCTS, id, PRIVATE, 'main'); }
function reviewsCol(clubId, id) { return collection(db, CLUBS, clubId, PRODUCTS, id, REVIEWS); }
function questionsCol(clubId, id) { return collection(db, CLUBS, clubId, PRODUCTS, id, QUESTIONS); }
function ordersCol(clubId) { return collection(db, CLUBS, clubId, ORDERS); }
function orderRef(clubId, id) { return doc(db, CLUBS, clubId, ORDERS, id); }

/** Remove chaves com valor undefined (Firestore rejeita undefined). */
function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function _verifyTenant(clubId, id) {
  if (!clubId || !id) throw new Error('clubId e id são obrigatórios');
  const snap = await getDoc(productRef(clubId, id));
  if (!snap.exists()) throw new Error('Produto não encontrado nesta loja');
  const data = snap.data();
  if (data.shelter_club_id && data.shelter_club_id !== clubId) {
    throw new Error('Acesso negado: produto pertence a outro abrigo');
  }
  return { id: snap.id, ...data };
}

// ─── Configurações da loja ──────────────────────────────────────────────────

export async function getStoreSettings(clubId) {
  if (!db || !clubId) return null;
  const snap = await getDoc(settingsRef(clubId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveStoreSettings(clubId, actor, payload) {
  if (!db) return null;
  if (!clubId) throw new Error('clubId é obrigatório');
  const parsed = storeSettingsSchema.parse(payload);
  const data = stripUndefined({
    ...parsed,
    shelter_club_id: clubId,
    updated_at: serverTimestamp(),
    updated_by_uid: actor?.uid || null,
    updated_by_name: actor?.name || actor?.displayName || 'Gestor',
  });
  await setDoc(settingsRef(clubId), data, { merge: true });
  createAuditLog({ action: 'store_settings_saved', clubId, uid: actor?.uid, metadata: { enabled: parsed.enabled, public_visible: parsed.public_visible } }).catch(() => {});
  return getStoreSettings(clubId);
}

// ─── Produtos ────────────────────────────────────────────────────────────

export async function listProducts(clubId) {
  if (!db || !clubId) return [];
  const q = query(productsCol(clubId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Produtos públicos (ativos) de UM abrigo — para a vitrine pública. */
export async function listPublicProducts(clubId) {
  if (!db || !clubId) return [];
  const q = query(
    productsCol(clubId),
    where('status', '==', PRODUCT_STATUS.ACTIVE),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProduct(clubId, id) {
  if (!db) return null;
  return _verifyTenant(clubId, id);
}

/** Lê os dados privados (custo/fornecedores) — só gestores (rules). */
export async function getProductPrivate(clubId, id) {
  if (!db || !clubId || !id) return null;
  const snap = await getDoc(productPrivateRef(clubId, id));
  return snap.exists() ? snap.data() : null;
}

/** Produto + dados privados combinados (para o formulário de edição). */
export async function getProductForEdit(clubId, id) {
  const [product, priv] = await Promise.all([
    getProduct(clubId, id),
    getProductPrivate(clubId, id).catch(() => null),
  ]);
  return { ...(product || {}), ...(priv || {}) };
}

export async function createProduct(clubId, actor, payload) {
  if (!db) return { id: 'mock-product-id' };
  if (!clubId) throw new Error('clubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  const parsed = productCreateSchema.parse(payload);
  const { publicData, privateData } = splitProductData(parsed);
  const now = serverTimestamp();

  const publicDoc = stripUndefined({
    ...publicData,
    shelter_club_id: clubId,
    slug: slugify(parsed.name),
    created_by_uid: actor.uid,
    created_by_name: actor.name || actor.displayName || 'Gestor',
    created_at: now,
    updated_at: now,
  });

  const ref = await addDoc(productsCol(clubId), publicDoc);
  await setDoc(productPrivateRef(clubId, ref.id), stripUndefined({
    ...privateData,
    shelter_club_id: clubId,
    updated_at: now,
  }), { merge: true });

  createAuditLog({ action: 'store_product_created', clubId, uid: actor?.uid, metadata: { productId: ref.id, name: parsed.name } }).catch(() => {});
  logger.info('[shelterStoreService] produto criado', { productId: ref.id, clubId });
  return { id: ref.id };
}

export async function updateProduct(clubId, id, actor, updates) {
  if (!db) return;
  await _verifyTenant(clubId, id);
  const parsed = productEditSchema.parse(updates);
  const { publicData, privateData } = splitProductData(parsed);

  const patch = stripUndefined({ ...publicData, updated_at: serverTimestamp() });
  if (publicData.name) patch.slug = slugify(publicData.name);
  if (Object.keys(patch).length > 1) {
    await updateDoc(productRef(clubId, id), patch);
  }
  if (Object.keys(privateData).length > 0) {
    await setDoc(productPrivateRef(clubId, id), stripUndefined({
      ...privateData, shelter_club_id: clubId, updated_at: serverTimestamp(),
    }), { merge: true });
  }
  createAuditLog({ action: 'store_product_updated', clubId, uid: actor?.uid, metadata: { productId: id } }).catch(() => {});
}

/** Atalho para mudar só o status (à venda / pausar / arquivar / esgotado). */
export async function setProductStatus(clubId, id, actor, status) {
  if (!db) return;
  if (!Object.values(PRODUCT_STATUS).includes(status)) throw new Error('Status inválido');
  await _verifyTenant(clubId, id);
  await updateDoc(productRef(clubId, id), { status, updated_at: serverTimestamp() });
  createAuditLog({ action: 'store_product_status', clubId, uid: actor?.uid, metadata: { productId: id, status } }).catch(() => {});
}

export async function deleteProduct(clubId, id, actor) {
  if (!db) return;
  await _verifyTenant(clubId, id);
  try {
    const batch = writeBatch(db);
    for (const sub of [REVIEWS, QUESTIONS]) {
      const s = await getDocs(collection(db, CLUBS, clubId, PRODUCTS, id, sub));
      s.docs.forEach((d) => batch.delete(d.ref));
    }
    batch.delete(productPrivateRef(clubId, id));
    batch.delete(productRef(clubId, id));
    await batch.commit();
  } catch (err) {
    logger.warn('[shelterStoreService] falha ao apagar subcoleções, apagando só o produto', err);
    await deleteDoc(productRef(clubId, id));
  }
  createAuditLog({ action: 'store_product_deleted', clubId, uid: actor?.uid, metadata: { productId: id } }).catch(() => {});
}

// ─── Avaliações ──────────────────────────────────────────────────────────

export async function listReviews(clubId, productId) {
  if (!db || !clubId || !productId) return [];
  const q = query(reviewsCol(clubId, productId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addReview(clubId, productId, actor, payload) {
  if (!db) return { id: 'mock-review' };
  if (!actor?.uid) throw new Error('É preciso estar autenticado para avaliar');
  const parsed = reviewSchema.parse(payload);
  const ref = await addDoc(reviewsCol(clubId, productId), stripUndefined({
    shelter_club_id: clubId,
    product_id: productId,
    rating: parsed.rating,
    comment: parsed.comment || '',
    author_uid: actor.uid,
    author_name: actor.name || actor.displayName || 'Usuário',
    created_at: serverTimestamp(),
  }));
  return { id: ref.id };
}

export async function deleteReview(clubId, productId, reviewId) {
  if (!db) return;
  await deleteDoc(doc(db, CLUBS, clubId, PRODUCTS, productId, REVIEWS, reviewId));
}

// ─── Perguntas e respostas ─────────────────────────────────────────────────

export async function listQuestions(clubId, productId) {
  if (!db || !clubId || !productId) return [];
  const q = query(questionsCol(clubId, productId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function askQuestion(clubId, productId, actor, payload) {
  if (!db) return { id: 'mock-question' };
  if (!actor?.uid) throw new Error('É preciso estar autenticado para perguntar');
  const parsed = questionSchema.parse(payload);
  const ref = await addDoc(questionsCol(clubId, productId), stripUndefined({
    shelter_club_id: clubId,
    product_id: productId,
    question: parsed.question,
    answer: null,
    author_uid: actor.uid,
    author_name: actor.name || actor.displayName || 'Usuário',
    answered_by_uid: null,
    answered_by_name: null,
    answered_at: null,
    created_at: serverTimestamp(),
  }));
  return { id: ref.id };
}

export async function answerQuestion(clubId, productId, questionId, actor, payload) {
  if (!db) return;
  const parsed = answerSchema.parse(payload);
  await updateDoc(doc(db, CLUBS, clubId, PRODUCTS, productId, QUESTIONS, questionId), stripUndefined({
    answer: parsed.answer,
    answered_by_uid: actor?.uid || null,
    answered_by_name: actor?.name || actor?.displayName || 'Abrigo',
    answered_at: serverTimestamp(),
  }));
}

export async function deleteQuestion(clubId, productId, questionId) {
  if (!db) return;
  await deleteDoc(doc(db, CLUBS, clubId, PRODUCTS, productId, QUESTIONS, questionId));
}

// ─── Pedidos (intenção de compra — pagamento off-platform) ──────────────────

export async function listOrders(clubId) {
  if (!db || !clubId) return [];
  const q = query(ordersCol(clubId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createOrder(clubId, actor, payload) {
  if (!db) return { id: 'mock-order' };
  if (!clubId) throw new Error('clubId é obrigatório');
  if (!actor?.uid) throw new Error('É preciso estar autenticado para comprar');
  const parsed = orderCreateSchema.parse(payload);
  const total = parsed.items.reduce((acc, it) => acc + (Number(it.price_cents) || 0) * (Number(it.qty) || 1), 0);
  const now = serverTimestamp();
  const activity = [{
    id: genId('act'), type: 'created', at: new Date().toISOString(),
    by_name: actor.name || actor.displayName || 'Comprador', message: 'Pedido registrado',
  }];
  const ref = await addDoc(ordersCol(clubId), stripUndefined({
    shelter_club_id: clubId,
    items: parsed.items,
    total_cents: total,
    status: ORDER_STATUS.PENDING,
    buyer_uid: actor.uid,
    buyer_name: parsed.buyer_name,
    contact: parsed.contact,
    message: parsed.message || '',
    payment_method: parsed.payment_method || null,
    delivery_method: parsed.delivery_method || null,
    shipping_address: parsed.shipping_address || '',
    activity,
    created_at: now,
    updated_at: now,
  }));
  createAuditLog({ action: 'store_order_created', clubId, uid: actor?.uid, metadata: { orderId: ref.id, total_cents: total } }).catch(() => {});
  return { id: ref.id };
}

export async function setOrderStatus(clubId, orderId, actor, status) {
  if (!db) return;
  if (!Object.values(ORDER_STATUS).includes(status)) throw new Error('Status inválido');
  const snap = await getDoc(orderRef(clubId, orderId));
  const current = snap.exists() ? snap.data() : {};
  const activity = [
    ...(current.activity || []),
    {
      id: genId('act'), type: 'status', at: new Date().toISOString(),
      by_name: actor?.name || actor?.displayName || 'Gestor',
      message: `Status: ${status}`,
    },
  ];
  await updateDoc(orderRef(clubId, orderId), { status, activity, updated_at: serverTimestamp() });
  createAuditLog({ action: 'store_order_status', clubId, uid: actor?.uid, metadata: { orderId, status } }).catch(() => {});
}

// ─── Marketplace da plataforma (agregação) ───────────────────────────────────

/**
 * Produtos públicos de TODAS as lojas (marketplace). Usa collectionGroup em
 * `store_products` filtrando por status ativo. Os filtros por abrigo/cidade/
 * categoria são aplicados no cliente (a base já vem enxuta). `max` limita a
 * quantidade retornada.
 */
export async function listMarketplaceProducts({ max = 200 } = {}) {
  if (!db) return [];
  const q = query(
    collectionGroup(db, PRODUCTS),
    where('status', '==', PRODUCT_STATUS.ACTIVE),
    orderBy('created_at', 'desc'),
    fbLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    club_id: d.ref.parent.parent?.id || d.data().shelter_club_id || null,
    ...d.data(),
  }));
}

/**
 * Marketplace enriquecido: agrega os produtos ativos, junta nome/cidade/UF do
 * abrigo e a config da loja, e mantém APENAS os produtos de lojas ativas +
 * públicas. Retorna `{ products, shelters }` onde `products[i]` traz
 * `shelter_name/shelter_city/shelter_state` e `shelters` é o mapa clubId→config.
 */
export async function listMarketplaceEnriched({ max = 200 } = {}) {
  const products = await listMarketplaceProducts({ max });
  const clubIds = Array.from(new Set(products.map((p) => p.club_id).filter(Boolean)));
  const [clubs, settingsList] = await Promise.all([
    Promise.all(clubIds.map((id) => getClub(id).catch(() => null))),
    Promise.all(clubIds.map((id) => getStoreSettings(id).catch(() => null))),
  ]);
  const meta = {};
  clubIds.forEach((id, i) => {
    meta[id] = { club: clubs[i] || null, settings: settingsList[i] || null };
  });
  const enriched = products
    .filter((p) => {
      const s = meta[p.club_id]?.settings;
      return s && s.enabled && s.public_visible;
    })
    .map((p) => ({
      ...p,
      shelter_name: meta[p.club_id]?.club?.name || 'Abrigo',
      shelter_city: meta[p.club_id]?.club?.city || p.ship_from_city || '',
      shelter_state: meta[p.club_id]?.club?.state || p.ship_from_state || '',
    }));
  const shelters = {};
  clubIds.forEach((id) => {
    if (meta[id]?.settings?.enabled && meta[id]?.settings?.public_visible) {
      shelters[id] = {
        id,
        name: meta[id]?.club?.name || 'Abrigo',
        city: meta[id]?.club?.city || '',
        state: meta[id]?.club?.state || '',
        settings: meta[id]?.settings || null,
      };
    }
  });
  return { products: enriched, shelters };
}
