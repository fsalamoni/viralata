/**
 * Helper defensivo de concatenação de arrays (TASK-103).
 *
 * Recebe N fontes e concatena apenas as que são arrays de verdade,
 * ignorando `undefined`/`null`/objetos/strings. Motivação: hooks que
 * retornam `undefined` durante loading crashavam spreads em produção
 * ("X is not iterable") — ver TASK-068/099-102.
 *
 * @param {...*} sources Fontes candidatas (arrays ou lixo).
 * @returns {Array} Novo array com os itens das fontes válidas, na ordem.
 */
export function concatSafe(...sources) {
  const out = [];
  for (const src of sources) {
    if (Array.isArray(src)) out.push(...src);
  }
  return out;
}

export default concatSafe;
