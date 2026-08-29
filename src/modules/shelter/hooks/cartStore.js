/**
 * @fileoverview Store do carrinho da Loja v2 (SHELTER_STORE_V2). Vive no
 * cliente (localStorage) — a plataforma NÃO persiste carrinho no Firestore. É
 * um store de módulo (singleton) com emissor de eventos para o React assinar via
 * `useSyncExternalStore`, mantendo a árvore de componentes intacta (sem Provider
 * novo no topo → zero risco de regressão com a flag OFF). SSR-safe.
 */
import {
  emptyCart, normalizeCart, addToCart, setCartQty, removeFromCart,
  clearCart, clearShelterFromCart,
} from '@/modules/shelter/domain/store/storeCart';

const STORAGE_KEY = 'viralata_store_cart_v2';
const hasWindow = typeof window !== 'undefined';

let state = emptyCart();
const listeners = new Set();

function read() {
  if (!hasWindow) return emptyCart();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCart();
    return normalizeCart(JSON.parse(raw));
  } catch {
    return emptyCart();
  }
}

function persist(next) {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota/preview — ignora, mantém em memória */
  }
}

// Hidrata a partir do storage na primeira carga.
state = read();

function emit() {
  for (const l of listeners) l();
}

function commit(next) {
  state = normalizeCart(next);
  persist(state);
  emit();
}

// ─── API pública do store ────────────────────────────────────────────────────

export function getCartSnapshot() {
  return state;
}

export function subscribeCart(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cartAddItem(item, qty = 1) {
  commit(addToCart(state, item, qty));
}

export function cartSetQty(key, qty) {
  commit(setCartQty(state, key, qty));
}

export function cartRemove(key) {
  commit(removeFromCart(state, key));
}

export function cartClear() {
  commit(clearCart());
}

export function cartClearShelter(clubId) {
  commit(clearShelterFromCart(state, clubId));
}

// Sincroniza entre abas do navegador.
if (hasWindow) {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = read();
      emit();
    }
  });
}
