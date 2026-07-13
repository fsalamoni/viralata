/**
 * Stub mínimo de `firebase-admin/app` para os testes de `functions/`.
 * Não inicializa nada — só exporta o símbolo que `mockData` espera.
 * Os testes que dependem de `getFirestore` são cobertos via
 * `firebase-admin-firestore.cjs` (mesma estratégia dos demais).
 */
module.exports = {
  initializeApp: () => ({}),
};
