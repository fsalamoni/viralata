/**
 * @fileoverview mockDataService — orquestra inserir e remover dados de demo
 * chamando Cloud Functions server-side (Admin SDK) em vez do Firestore client.
 *
 * Por que mudou? (TASK-400 → fix 2026-07-12)
 *  - A versão anterior escrevia via `db.batch()` (Client SDK), mas as
 *    Firestore rules de várias coleções exigem `owner_id == request.auth.uid`
 *    (e variantes), o que é incompatível com o pacote de mock — ele cria
 *    docs com uids determinísticos `mock_usr_001` etc., não com o uid do
 *    admin real. Resultado: 14 de 28 coleções batiam em
 *    "Missing or insufficient permissions" e os dados não persistiam.
 *  - A correção canônica é mover a escrita para uma Cloud Function com
 *    Admin SDK (bypassa rules por design). O painel admin não muda —
 *    `loadAll` / `clearAll` / `getStatus` mantêm a mesma assinatura.
 *
 * Pré-requisitos:
 *  - Firebase Functions inicializado (`functions` em `core/config/firebase`).
 *  - Chamador autenticado como `fsalamoni@gmail.com` (gate server-side
 *    em `assertOwner`). Se outra conta tentar, recebe `permission-denied`.
 *  - A Cloud Function `loadMockData` (e irmãs) precisa estar deployed
 *    (feito pelo workflow `Deploy Cloud Functions` no push para main).
 *
 * As `audit_logs` são IMUTÁVEIS após escritas — `clearMockData` apenas
 * tenta apagar; coleções imutáveis podem falhar, e o status reflete isso.
 * IDs determinísticos permitem re-rodar `loadAll` idempotentemente.
 *
 * Mantém um log das últimas execuções (em memória) — usado pela UI admin
 * para mostrar o que aconteceu na última carga/limpeza.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { MOCK_TAG, MOCK_DATA_VERSION } from './constants.js';
import { mockPayloads } from './index.js';

/* ============================================================== *
 * 1. Resolução de callable (cria uma vez por função, cacheia)    *
 * ============================================================== */

let _loadFn = null;
let _clearFn = null;
let _statusFn = null;

function getLoadFn() {
  if (!functions) throw new Error('Firebase Functions não inicializado.');
  if (!_loadFn) _loadFn = httpsCallable(functions, 'loadMockData');
  return _loadFn;
}
function getClearFn() {
  if (!functions) throw new Error('Firebase Functions não inicializado.');
  if (!_clearFn) _clearFn = httpsCallable(functions, 'clearMockData');
  return _clearFn;
}
function getStatusFn() {
  if (!functions) throw new Error('Firebase Functions não inicializado.');
  if (!_statusFn) _statusFn = httpsCallable(functions, 'getMockStatus');
  return _statusFn;
}

/* ============================================================== *
 * 2. Helpers de erro                                               *
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

/**
 * Detecta erros de CORS / função não-deployed / função em cold-start.
 *
 * O `firebase/functions` SDK engole a fase de preflight e expõe o
 * resultado como `functions/internal` quando o navegador bloqueia a
 * requisição via CORS ou a Cloud Function devolve 403/HTML em vez de
 * JSON. Sem essa detecção, o painel admin mostra "Erro interno" sem
 * dica do problema real (deploy pendente, region errada, função não
 * deployed, etc).
 */
function isCallableUnreachable(err) {
  if (!err) return false;
  const code = String(err.code || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();
  // Códigos típicos do SDK quando o preflight falha:
  if (code === 'functions/internal') return true;
  if (code === 'functions/unavailable') return true;
  if (code === 'internal') return true;
  // Sinais no corpo do erro (mensagens que o gateway devolve em HTML).
  if (msg.includes('cors')) return true;
  if (msg.includes('preflight')) return true;
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('blocked by')) return true;
  if (msg.includes('forbidden') && msg.includes('getmockstatus')) return true;
  if (msg.includes('forbidden') && msg.includes('loadmockdata')) return true;
  if (msg.includes('forbidden') && msg.includes('clearmockdata')) return true;
  return false;
}

export { MockError, isCallableUnreachable };

/* ============================================================== *
 * 3. `loadAll(realUid, realUserName)` — chama a Cloud Function    *
 * ============================================================== */

/**
 * Materializa todos os payloads de mock no Firestore via Cloud Function.
 * Idempotente: re-rodar sobrescreve os mesmos documentos (mesmo `id`).
 *
 * @param {object} options
 * @param {string} options.realUid — uid do chamador (resolve placeholders)
 * @param {string} options.realUserName — nome a desnormalizar nos docs
 * @param {(phase: string, current: number, total: number) => void} [options.onProgress]
 * @returns {Promise<{ ok: boolean, counts: Record<string, number>, errors: Array<{collection: string, error: string}>, total: number }>}
 */
export async function loadAll({ realUid, realUserName, onProgress } = {}) {
  if (!realUid) throw newMockError('MOCK_NO_AUTH', 'É preciso estar autenticado como admin para carregar os dados demo.');

  if (typeof onProgress === 'function') {
    try { onProgress('Solicitando carga via Cloud Function…', 0, 1); } catch { /* swallow */ }
  }

  let result;
  try {
    result = await getLoadFn()({ realUid, realUserName: realUserName || null });
  } catch (err) {
    // onCall joga HttpsError — normalizamos para o shape de erro da UI.
    if (isCallableUnreachable(err)) {
      logger.error('mockDataService.loadAll: callable indisponível (CORS/403/deploy pendente)', err);
      throw newMockError(
        'MOCK_FN_UNREACHABLE',
        'Cloud Function de mock indisponível. Verifique se `loadMockData` está deployed em southamerica-east1 e se o CI do último push para main foi bem-sucedido. Veja .github/workflows/deploy.yml.',
      );
    }
    const code = err?.code || 'MOCK_REMOTE_ERROR';
    const message = err?.message || String(err);
    logger.error('mockDataService.loadAll: callable falhou', err);
    throw newMockError(code, message);
  }

  if (typeof onProgress === 'function') {
    try { onProgress('Concluído', 1, 1); } catch { /* swallow */ }
  }

  return result.data;
}

/* ============================================================== *
 * 4. `clearAll(realUid, realUserName)` — chama a Cloud Function   *
 * ============================================================== */

/**
 * Apaga do Firestore todos os documentos de demo (via Cloud Function).
 *
 * @returns {Promise<{ ok: boolean, counts: Record<string, number>, errors: Array<{collection: string, error: string}>, total: number }>}
 */
export async function clearAll({ realUid, realUserName, onProgress } = {}) {
  if (typeof onProgress === 'function') {
    try { onProgress('Solicitando limpeza via Cloud Function…', 0, 1); } catch { /* swallow */ }
  }

  let result;
  try {
    result = await getClearFn()({ realUid: realUid || null, realUserName: realUserName || null });
  } catch (err) {
    if (isCallableUnreachable(err)) {
      logger.error('mockDataService.clearAll: callable indisponível (CORS/403/deploy pendente)', err);
      throw newMockError(
        'MOCK_FN_UNREACHABLE',
        'Cloud Function de mock indisponível. Verifique se `clearMockData` está deployed em southamerica-east1 e se o CI do último push para main foi bem-sucedido. Veja .github/workflows/deploy.yml.',
      );
    }
    const code = err?.code || 'MOCK_REMOTE_ERROR';
    const message = err?.message || String(err);
    logger.error('mockDataService.clearAll: callable falhou', err);
    throw newMockError(code, message);
  }

  if (typeof onProgress === 'function') {
    try { onProgress('Concluído', 1, 1); } catch { /* swallow */ }
  }

  return result.data;
}

/* ============================================================== *
 * 5. `getStatus()` — chama a Cloud Function                       *
 * ============================================================== */

/**
 * Conta documentos `_mock: true` por coleção (server-side, mais barato
 * que o loop client-side antigo).
 *
 * @returns {Promise<{ byCollection: Record<string, number>, total: number, expected: number, _error?: string }>}
 */
export async function getStatus() {
  if (!functions) return { byCollection: {}, total: 0, expected: 0 };
  try {
    const result = await getStatusFn()();
    return result.data;
  } catch (err) {
    if (isCallableUnreachable(err)) {
      logger.error('mockDataService.getStatus: callable indisponível (CORS/403/deploy pendente)', err);
      return {
        byCollection: {},
        total: 0,
        expected: 0,
        _error: 'MOCK_FN_UNREACHABLE',
      };
    }
    logger.error('mockDataService.getStatus: callable falhou', err);
    return { byCollection: {}, total: 0, expected: 0, _error: err?.code || 'MOCK_REMOTE_ERROR' };
  }
}

/* ============================================================== *
 * 6. Helpers locais (não precisam de rede)                        *
 * ============================================================== */

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
