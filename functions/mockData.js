/**
 * @fileoverview Cloud Functions para materialização do pacote de mock data
 * (`src/mocks/`).
 *
 * Por que isso existe? As Firestore rules de várias coleções exigem que
 * `owner_id`/`created_by`/`author_id`/`reporter_uid` etc. sejam iguais ao
 * `request.auth.uid` do chamador. O pacote de mock data cria documentos com
 * uids determinísticos (`mock_usr_001`, `mock_org_001`, …) referenciando
 * criadores fictícios — não é possível materializar tudo via client-side
 * SDK sem comprometer as rules. Esta função roda com Firebase Admin SDK
 * e ignora as rules (semântica padrão do Admin SDK), o caminho canônico
 * para trabalho administrativo em lote.
 *
 * Segurança:
 *  - Gate por e-mail: apenas `fsalamoni@gmail.com` (o "dono fixo da
 *    plataforma" espelhado em `isPlatformOwnerAuth()` nas rules) pode
 *    executar as três funções. Mantém o risco de elevação de privilégio
 *    em zero mesmo se a função vazar acidentalmente.
 *  - As operações rodam com Admin SDK, mas só podem ser disparadas
 *    autenticado e com o e-mail correto — não há "via pública".
 *
 * Idempotência: como o `loadMockData` usa `set` em documentos com IDs
 * determinísticos, re-rodar sobrescreve o mesmo estado (sem duplicar).
 * `clearMockData` apaga pelos mesmos IDs.
 *
 * Auditoria: cada operação grava um `audit_logs` com action
 * `platform_settings_updated` e tag `_mock: true` para que o painel
 * admin mostre o que aconteceu.
 *
 * Carregamento do payload: o `src/mocks/` é ESM (Vite) e o restante do
 * `functions/` é CJS. Em vez de duplicar o pacote, usamos
 * `await import()` dinâmico no runtime — funciona em Node 20 e mantém
 * a sincronia entre client e server (uma única fonte de verdade).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { deepReplace, materializeData, resolveDocRef } = require('./mockDataCore');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

// E-mail do "dono fixo" da plataforma (mesmo gate em firestore.rules
// `isPlatformOwnerAuth()`). Único ator autorizado a mexer no pacote de
// mocks — qualquer outro caller recebe `permission-denied`.
const ALLOWED_EMAIL = 'fsalamoni@gmail.com';

// Limite de ops por batch do Firestore (Firestore permite até 500).
const ADMIN_BATCH_LIMIT = 450;

// Cache do import dinâmico — uma vez carregado, reusa para todas as
// invocações da função (warm starts).
let _payloadsPromise = null;
function loadMockPayloads() {
  if (!_payloadsPromise) {
    // Aponta para a raiz do repositório (functions/ está 1 nível abaixo).
    const indexUrl = pathToFileURL(
      path.resolve(__dirname, '..', 'src', 'mocks', 'index.js')
    ).href;
    _payloadsPromise = import(indexUrl);
  }
  return _payloadsPromise;
}

/** Garante que só o dono da plataforma pode chamar. */
function assertOwner(context) {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'É preciso estar autenticado.');
  }
  const email = (context.auth.token.email || '').toLowerCase();
  if (email !== ALLOWED_EMAIL) {
    throw new HttpsError('permission-denied', 'Apenas o dono da plataforma pode executar esta ação.');
  }
}

/** Aplica uma operação (set/delete) em batches, respeitando o limite. */
async function commitOps(db, ops) {
  if (!ops.length) return;
  for (let i = 0; i < ops.length; i += ADMIN_BATCH_LIMIT) {
    const slice = ops.slice(i, i + ADMIN_BATCH_LIMIT);
    const batch = db.batch();
    for (const op of slice) {
      if (op.type === 'set') batch.set(op.ref, op.data);
      else if (op.type === 'delete') batch.delete(op.ref);
    }
    await batch.commit();
  }
}

/** Materializa (load) todos os payloads. Retorna counts + errors. */
async function writeAllMockDocs(db, payloads, realUid, realUserName) {
  const counts = {};
  const errors = [];
  for (const payload of payloads) {
    const ops = [];
    for (const item of payload.items) {
      try {
        const data = materializeData(item.data, realUid, realUserName);
        const parentId = payload.resolveParent ? payload.resolveParent(item) : null;
        const ref = resolveDocRef(db, payload.name, item.id, payload.parent, parentId);
        ops.push({ type: 'set', ref, data });
      } catch (err) {
        errors.push({ collection: payload.name, error: err?.message || String(err) });
      }
    }
    try {
      await commitOps(db, ops);
      counts[payload.name] = ops.length;
    } catch (err) {
      logger.error(`mockData: falha em ${payload.name}`, err);
      errors.push({ collection: payload.name, error: err?.message || String(err) });
      counts[payload.name] = 0;
    }
  }
  return { counts, errors };
}

/** Apaga (clear) todos os documentos pelos IDs determinísticos. */
async function deleteAllMockDocs(db, payloads) {
  const counts = {};
  const errors = [];
  for (const payload of payloads) {
    const ops = [];
    for (const item of payload.items) {
      try {
        const parentId = payload.resolveParent ? payload.resolveParent(item) : null;
        const ref = resolveDocRef(db, payload.name, item.id, payload.parent, parentId);
        ops.push({ type: 'delete', ref });
      } catch (err) {
        errors.push({ collection: payload.name, error: err?.message || String(err) });
      }
    }
    try {
      await commitOps(db, ops);
      counts[payload.name] = ops.length;
    } catch (err) {
      logger.error(`mockData: clear falhou em ${payload.name}`, err);
      errors.push({ collection: payload.name, error: err?.message || String(err) });
      counts[payload.name] = 0;
    }
  }
  return { counts, errors };
}

/** Conta documentos `_mock: true` por coleção. */
async function countMockDocsByCollection(db, payloads) {
  const byCollection = {};
  for (const payload of payloads) {
    let total = 0;
    let errored = false;
    for (const item of payload.items) {
      try {
        const parentId = payload.resolveParent ? payload.resolveParent(item) : null;
        const ref = resolveDocRef(db, payload.name, item.id, payload.parent, parentId);
        const snap = await ref.get();
        if (snap.exists && snap.data() && snap.data()._mock === true) total += 1;
      } catch (err) {
        logger.warn(`mockData.getStatus: erro em ${payload.name}/${item.id}`, err);
        errored = true;
        break;
      }
    }
    byCollection[payload.name] = errored ? -1 : total;
  }
  const total = Object.values(byCollection).reduce((a, b) => (b > 0 ? a + b : a), 0);
  return { byCollection, total };
}

/** Grava uma linha em `audit_logs` (server-side, sem passar por createAuditLog). */
async function writeAuditLog(db, realUid, realUserName, op, counts, errorsLength) {
  try {
    const actorName = realUserName || ALLOWED_EMAIL;
    const createdAtMs = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    await db.collection('audit_logs').add({
      log_number: Number(`${createdAtMs}${String(randomSuffix).padStart(3, '0')}`),
      action: 'platform_settings_updated',
      action_label: 'Configurações globais alteradas',
      actor_id: realUid,
      actor_name: actorName,
      actor_email: ALLOWED_EMAIL,
      user_id: realUid,
      user_name: actorName,
      user_email: ALLOWED_EMAIL,
      details: { _mock: true, op, counts, errors: errorsLength },
      created_at_ms: createdAtMs,
      created_at: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.warn('mockData: audit log falhou (não bloqueia a operação):', err);
  }
}

/**
 * Materializa todos os 208 documentos do pacote de mock no Firestore.
 * Idempotente — re-chamar sobrescreve os mesmos IDs.
 *
 * `cors: true` é explícito (já é o default em onCall v2, mas colocar
 * no código evita surpresa se um dia alguém setar `enforceAppCheck` ou
 * outra opção que mexa no CORS pipeline). Sem isso o OPTIONS preflight
 * volta 403 do Google Frontend e o `httpsCallable` do client SDK
 * rejeita com "blocked by CORS policy".
 */
exports.loadMockData = onCall(
  { region: REGION, cors: true },
  async (request) => {
    assertOwner(request);
    const { realUid, realUserName } = request.data || {};
    if (!realUid) {
      throw new HttpsError('invalid-argument', 'realUid é obrigatório (uid do chamador).');
    }
    const db = getFirestore(DATABASE_ID);
    logger.info(`loadMockData iniciado por ${ALLOWED_EMAIL} (uid=${realUid})`);

    const { mockPayloads } = await loadMockPayloads();
    const { counts, errors } = await writeAllMockDocs(db, mockPayloads, realUid, realUserName);
    const total = Object.values(counts).reduce((a, b) => a + (b > 0 ? b : 0), 0);

    await writeAuditLog(db, realUid, realUserName, 'load', counts, errors.length);

    logger.info(`loadMockData concluído: total=${total} erros=${errors.length}`);
    return { ok: errors.length === 0, counts, errors, total };
  },
);

/** Apaga do Firestore todos os documentos com IDs determinísticos. */
exports.clearMockData = onCall(
  { region: REGION, cors: true },
  async (request) => {
    assertOwner(request);
    const { realUid, realUserName } = request.data || {};
    const db = getFirestore(DATABASE_ID);
    logger.info(`clearMockData iniciado por ${(request.auth && request.auth.token && request.auth.token.email) || 'anônimo'}`);

    const { mockPayloads } = await loadMockPayloads();
    const { counts, errors } = await deleteAllMockDocs(db, mockPayloads);
    const total = Object.values(counts).reduce((a, b) => a + (b > 0 ? b : 0), 0);

    if (realUid) {
      await writeAuditLog(db, realUid, realUserName, 'clear', counts, errors.length);
    }

    logger.info(`clearMockData concluído: total=${total} erros=${errors.length}`);
    return { ok: errors.length === 0, counts, errors, total };
  },
);

/** Conta documentos `_mock: true` por coleção (para o painel admin). */
exports.getMockStatus = onCall(
  { region: REGION, cors: true },
  async (request) => {
    assertOwner(request);
    const db = getFirestore(DATABASE_ID);
    const { mockPayloads } = await loadMockPayloads();
    const { byCollection, total } = await countMockDocsByCollection(db, mockPayloads);
    return { byCollection, total };
  },
);

// (Lógica pura extraída em `mockDataCore.js` para testes sem o runtime
// do Firebase Functions.)
