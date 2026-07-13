/**
 * Stub mínimo de `firebase-functions/v2/https` para os testes.
 * `onCall` devolve a função passada (no-op wrapper) e `HttpsError`
 * emula o suficiente para os asserts de `assertOwner`.
 */
class HttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HttpsError';
    this.code = code;
  }
}

function onCall(_opts, handler) {
  // devolve um wrapper que aceita (request) e devolve a invocação
  // — útil se algum teste quiser chamar diretamente. Não é exercitado
  // aqui (assertOwner é testado via mock.context).
  return handler;
}

module.exports = { onCall, HttpsError };
