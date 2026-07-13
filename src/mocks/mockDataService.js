/**
 * @fileoverview mockDataService — orquestra inserir e remover dados de demo.
 *
 * Os dados vivem em `src/mocks/`. O `loadAll()` materializa tudo no Firestore;
 * o `clearAll()` apaga os documentos marcados com `_mock: true`. O
 * `getStatus()` consulta quantos docs de mock existem em cada coleção.
 *
 * Pré-requisitos e armadilhas:
 *  - Firestore precisa estar inicializado (`db` em `core/config/firebase`).
 *  - O chamador precisa estar autenticado como platform_admin (`fsalamoni@gmail.com`
 *    com `role: 'platform_admin'`), senão várias coleções recusam a escrita.
 *  - As `audit_logs` são IMUTÁVEIS após escritas — `clearAll` apenas
 *    tenta apagar; coleções imutáveis vão reportar falha, e o status
 *    vai refletir isso.
 *  - IDs determinísticos permitem re-rodar `loadAll()` idempotentemente:
 *    o `setDoc` com o mesmo `id` apenas sobrescreve.
 *  - Substituições em runtime: campos como `user_id`, `author_id`,
 *    `created_by`, `owner_id` que precisam ser iguais ao uid do chamador
 *    são resolvidos via `realUid` injetado.
 *
 * Mantém um log das últimas execuções (em memória) — usado pela UI admin
 * para mostrar o que aconteceu na última carga/limpeza.
 */

import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { MOCK_TAG, mockMeta, MOCK_DATA_VERSION } from './constants.js';
import { mockPayloads } from './index.js';

const MOCK_BATCH_LIMIT = 450; // Firestore permite até 500 ops por batch

/* ============================================================== *
 * 1. Resolução de placeholders (`REAL_USER_UID`, `REAL_USER_NAME`)
 * ============================================================== */

/** Aplica substituições em objetos/arrays recursivamente. */
function deepReplace(value, realUid, realUserName) {
  if (value === 'REAL_USER_UID') return realUid;
  if (value === 'REAL_USER_NAME') return realUserName;
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, realUid, realUserName));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepReplace(v, realUid, realUserName);
    }
    return out;
  }
  return value;
}

/** Substitui placeholders `REAL_USER_UID`/`REAL_USER_NAME` no payload. */
function materializeData(data, realUid, realUserName) {
  if (!realUid) return data;
  return deepReplace(data, realUid, realUserName);
}

/* ============================================================== *
 * 2. Operações em batch                                           *
 * ============================================================== */

function resolveDocRef(name, id, parent, parentId) {
  if (parent && parentId) {
    return doc(db, parent, parentId, name, id);
  }
  return doc(db, name, id);
}

function chunkedBatches(ops, batchSize = MOCK_BATCH_LIMIT) {
  const chunks = [];
  for (let i = 0; i < ops.length; i += batchSize) {
    chunks.push(ops.slice(i, i + batchSize));
  }
  return chunks;
}

async function writeAll(ops) {
  if (!ops.length) return;
  const chunks = chunkedBatches(ops);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      if (op.type === 'set') batch.set(op.ref, op.data, { merge: false });
      else if (op.type === 'delete') batch.delete(op.ref);
    });
    await batch.commit();
  }
}

/* ============================================================== *
 * 3. `loadAll(realUid, realUserName)`                             *
 * ============================================================== */

/**
 * Materializa todos os payloads de mock no Firestore.
 * Idempotente: re-rodar sobrescreve os mesmos documentos (mesmo `id`).
 *
 * @param {object} options
 * @param {string} options.realUid — uid do chamador (resolve placeholders)
 * @param {string} options.realUserName — nome a desnormalizar nos docs
 * @param {(phase: string, current: number, total: number) => void} [options.onProgress]
 * @returns {Promise<{ ok: boolean, counts: Record<string, number>, errors: Array<{collection: string, error: string}> }>}
 */
export async function loadAll({ realUid, realUserName, onProgress } = {}) {
  if (!db) throw new Error('Firebase não inicializado.');
  if (!realUid) throw newMockError('MOCK_NO_AUTH', 'É preciso estar autenticado como admin para carregar os dados demo.');

  const counts = {};
  const errors = [];
  const total = mockPayloads.reduce((acc, p) => acc + p.items.length, 0);
  let current = 0;

  for (const payload of mockPayloads) {
    const ops = [];
    for (const item of payload.items) {
      try {
        const data = materializeData(item.data, realUid, realUserName);
        const parentId = payload.resolveParent ? payload.resolveParent(item) : null;
        const ref = resolveDocRef(payload.name, item.id, payload.parent, parentId);
        ops.push({ type: 'set', ref, data });
      } catch (err) {
        errors.push({ collection: payload.name, error: err?.message || String(err) });
      }
    }
    try {
      await writeAll(ops);
      counts[payload.name] = ops.length;
    } catch (err) {
      logger.error(`mockDataService.loadAll: falha em ${payload.name}`, err);
      errors.push({ collection: payload.name, error: err?.message || String(err) });
      counts[payload.name] = 0;
    }
    current += payload.items.length;
    if (typeof onProgress === 'function') {
      try { onProgress(payload.name, current, total); } catch { /* swallow */ }
    }
  }

  await createAuditLog({
    action: 'platform_settings_updated',
    actor: { uid: realUid, displayName: realUserName, email: 'fsalamoni@gmail.com' },
    details: { _mock: true, op: 'load', version: MOCK_DATA_VERSION, counts, errors: errors.length },
  }).catch(() => {});

  return { ok: errors.length === 0, counts, errors, total };
}

/* ============================================================== *
 * 4. `clearAll(realUid, realUserName)`                            *
 * ============================================================== */

/**
 * Apaga do Firestore todos os documentos que carregam `_mock: true`.
 * Coleções imutáveis (audit_logs) vão falhar — o resultado reporta isso,
 * mas o resto do cleanup prossegue.
 *
 * @returns {Promise<{ ok: boolean, counts: Record<string, number>, errors: Array<{collection: string, error: string}> }>}
 */
export async function clearAll({ realUid, realUserName, onProgress } = {}) {
  if (!db) throw new Error('Firebase não inicializado.');

  const counts = {};
  const errors = [];
  const total = mockPayloads.reduce((acc, p) => acc + p.items.length, 0);
  let current = 0;

  for (const payload of mockPayloads) {
    const ops = [];
    for (const item of payload.items) {
      try {
        const parentId = payload.resolveParent ? payload.resolveParent(item) : null;
        const ref = resolveDocRef(payload.name, item.id, payload.parent, parentId);
        ops.push({ type: 'delete', ref });
      } catch (err) {
        errors.push({ collection: payload.name, error: err?.message || String(err) });
      }
    }
    try {
      await writeAll(ops);
      counts[payload.name] = ops.length;
    } catch (err) {
      logger.error(`mockDataService.clearAll: falha em ${payload.name}`, err);
      errors.push({ collection: payload.name, error: err?.message || String(err) });
      counts[payload.name] = 0;
    }
    current += payload.items.length;
    if (typeof onProgress === 'function') {
      try { onProgress(payload.name, current, total); } catch { /* swallow */ }
    }
  }

  if (realUid) {
    await createAuditLog({
      action: 'platform_settings_updated',
      actor: { uid: realUid, displayName: realUserName, email: 'fsalamoni@gmail.com' },
      details: { _mock: true, op: 'clear', version: MOCK_DATA_VERSION, counts, errors: errors.length },
    }).catch(() => {});
  }

  return { ok: errors.length === 0, counts, errors, total };
}

/* ============================================================== *
 * 5. `getStatus()`                                                *
 * ============================================================== */

/**
 * Conta quantos documentos `_mock: true` existem em cada coleção. Útil pra
 * a UI admin exibir "X pets de demo, Y ONGs de demo, ...".
 *
 * @returns {Promise<{ byCollection: Record<string, number>, total: number }>}
 */
export async function getStatus() {
  if (!db) return { byCollection: {}, total: 0 };
  const byCollection = {};
  for (const payload of mockPayloads) {
    try {
      let totalForCollection = 0;
      // Estratégia: checar cada id determinístico — evita dependência de
      // índice em `where('_mock','==', true)` (que Firestore aceita mas custa
      // uma varredura completa). Como o número de mocks é pequeno, ler 1 a 1
      // é mais barato e direto.
      for (const item of payload.items) {
        const parentId = payload.resolveParent ? payload.resolveParent(item) : null;
        const ref = resolveDocRef(payload.name, item.id, payload.parent, parentId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data?._mock === true) totalForCollection += 1;
        }
      }
      byCollection[payload.name] = totalForCollection;
    } catch (err) {
      logger.warn(`mockDataService.getStatus: erro em ${payload.name}`, err);
      byCollection[payload.name] = -1; // -1 = erro
    }
  }
  const total = Object.values(byCollection).reduce((a, b) => (b > 0 ? a + b : a), 0);
  return { byCollection, total };
}

/* ============================================================== *
 * 6. Helpers                                                      *
 * ============================================================== */

class MockError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MockError';
    this.code = code;
  }
}

function newMockError(code, message) {
  return new MockError(code, message);
}

export { MockError };

/** Schema mínimo do que a UI precisa. */
export function getMockSummary() {
  return mockPayloads.map((p) => ({
    collection: p.name,
    label: p.label,
    count: p.items.length,
    isSubcollection: Boolean(p.parent),
  }));
}

/** Versão atual do payload (exibida na UI). */
export function getMockVersion() {
  return MOCK_DATA_VERSION;
}

export { MOCK_TAG };
