/**
 * Stub mínimo de `firebase-admin` (pacote principal) para os testes de
 * `functions/`. Inclui:
 *   - messaging() → mock de Firebase Cloud Messaging
 *   - apps       → array vazio (nenhum app inicializado)
 *   - initializeApp() → no-op
 *   - _setMessaging(fn) → injeta mock de messaging (usado nos testes)
 */
const { getFirestore, FieldValue } = require('./firebase-admin-firestore.cjs');

let _messagingInstance = null;

function messaging() {
  if (!_messagingInstance) {
    _messagingInstance = {
      sendEachForMulticast: async () => ({ successCount: 0, failureCount: 0 }),
    };
  }
  return _messagingInstance;
}

/** Injeta um mock de messaging (tests chamam isto). */
function _setMessaging(instance) {
  _messagingInstance = instance;
}

/** Reseta o stub entre tests. */
function resetStub() {
  _messagingInstance = null;
}

module.exports = {
  initializeApp: () => {},
  apps: [],
  messaging,
  _setMessaging,
  _resetStub: resetStub,
  // Sub-pacotes (compat com require('firebase-admin/firestore'))
  firestore: { getFirestore, FieldValue },
};
