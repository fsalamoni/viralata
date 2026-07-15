/**
 * Stub mínimo de `firebase-functions/v2/scheduler` para os testes.
 * `onSchedule` retorna uma função identidade (o teste importa
 * a lógica via `volunteerHoursCronCore` diretamente).
 */
module.exports = {
  onSchedule: (opts) => (handler) => handler,
};
