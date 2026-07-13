/**
 * @fileoverview Núcleo puro de `mockData` (TASK-400 fix 2026-07-12).
 *
 * Helpers testáveis sem dependência de `firebase-functions` nem
 * `firebase-admin`:
 *  - `deepReplace` — substitui placeholders `REAL_USER_UID`/`REAL_USER_NAME`
 *    recursivamente em objetos/arrays.
 *  - `materializeData` — aplica o `deepReplace` se `realUid` for
 *    fornecido; senão retorna o data intacto.
 *  - `resolveDocRef` — resolve a referência absoluta do documento
 *    (raiz vs subcoleção), recebendo o `db` (admin) já inicializado.
 *
 * O wrapper com `onCall` + `HttpsError` + `getFirestore` vive em
 * `mockData.js` — `mockDataCore.js` pode ser importado por testes
 * sem precisar do runtime do Firebase.
 */

const REAL_USER_UID = 'REAL_USER_UID';
const REAL_USER_NAME = 'REAL_USER_NAME';

/** Substitui recursivamente os placeholders no payload. */
function deepReplace(value, realUid, realUserName) {
  if (value === REAL_USER_UID) return realUid;
  if (value === REAL_USER_NAME) return realUserName;
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

function materializeData(data, realUid, realUserName) {
  if (!realUid) return data;
  return deepReplace(data, realUid, realUserName);
}

/** Resolve a referência absoluta do documento (raiz ou subcoleção). */
function resolveDocRef(db, name, id, parent, parentId) {
  if (parent && parentId) {
    return db.collection(parent).doc(parentId).collection(name).doc(id);
  }
  return db.collection(name).doc(id);
}

module.exports = {
  deepReplace,
  materializeData,
  resolveDocRef,
  REAL_USER_UID,
  REAL_USER_NAME,
};
