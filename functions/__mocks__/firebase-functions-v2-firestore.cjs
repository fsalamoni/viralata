/**
 * Stub mínimo de `firebase-functions/v2/firestore` para os testes.
 * `onDocumentCreated` retorna uma função identidade (o teste importa
 * a lógica via `communityNotificationsCore` diretamente).
 */
module.exports = {
  onDocumentCreated: (opts) => (handler) => handler,
};
