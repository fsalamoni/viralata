/**
 * @fileoverview Helper para parsing tolerante de timestamps vindos do Firestore.
 *
 * POR QUE EXISTE:
 * O pacote de mock data (src/mocks/) salva `created_at` como string ISO
 * (formato cliente/Vite), enquanto a UI normalmente espera um Firestore
 * Timestamp (com método .toDate()). Quando o admin materializa os mocks
 * no Firestore via Cloud Function, o campo string é persistido como
 * string — sem o método .toDate() — quebrando componentes que assumem
 * Timestamp.
 *
 * Também é robusto a:
 *  - Firestore Timestamp (vindo de serverTimestamp() do client SDK)
 *  - number (milisegundos desde epoch)
 *  - Date object
 *  - string ISO 8601
 *  - null/undefined
 *
 * USO:
 *   import { parseTimestamp } from '@/core/utils/timestamp';
 *   const date = parseTimestamp(post.created_at);
 *   if (date) format(date, 'dd/MM/yyyy');
 */
export function parseTimestamp(value) {
  if (value == null) return null;
  // Firestore Timestamp (client SDK v9+): { seconds, nanoseconds, toDate() }
  if (typeof value.toDate === 'function') {
    try { return value.toDate(); } catch { return null; }
  }
  // Já é Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  // number (ms ou s)
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value; // s → ms se < ano 2001
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  // string ISO 8601 ou outra string parseável
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Versão que aceita null e retorna um fallback Date (now) se value for null.
 */
export function parseTimestampOrNow(value) {
  return parseTimestamp(value) || new Date();
}

/**
 * Retorna uma string formatada (pt-BR relative) a partir de qualquer formato.
 * Se value for null/undefined/inválido, retorna `fallback`.
 */
export function formatTimestamp(value, fallback = '', locale = 'pt-BR') {
  const d = parseTimestamp(value);
  if (!d) return fallback;
  try {
    return d.toLocaleString(locale);
  } catch {
    return d.toISOString();
  }
}
