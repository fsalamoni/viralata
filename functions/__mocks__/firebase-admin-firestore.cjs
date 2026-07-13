/**
 * Stub mínimo de `firebase-admin/firestore` para os testes de
 * `functions/`. Devolve objetos `doc`/`collection`/`batch`/`get`/`set`/
 * `delete`/`commit`/`add` com a forma mínima que `mockData` e os demais
 * módulos precisam. Os testes que rodam contra esse stub NÃO batem no
 * Firestore real; o caminho end-to-end é coberto por testes com o
 * emulador em outro lugar.
 */
function makeRef() {
  return {
    id: 'mock-id',
    data: () => ({ _mock: true }),
    exists: true,
  };
}

function makeCollection() {
  const api = {
    doc: () => makeRef(),
    where: () => api,
    get: async () => ({ empty: true, docs: [] }),
    add: async () => makeRef(),
  };
  return api;
}

const batchApi = {
  set: () => batchApi,
  update: () => batchApi,
  delete: () => batchApi,
  commit: async () => undefined,
};

module.exports = {
  getFirestore: () => ({
    collection: () => makeCollection(),
    batch: () => batchApi,
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
};
