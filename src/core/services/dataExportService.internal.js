/**
 * @fileoverview Helpers internos do dataExportService exportados
 * para serem testáveis. NÃO usar diretamente de UI/services — esses
 * helpers são detalhes de implementação.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

/**
 * Query uma coleção onde `field == uid`. Retorna [] se db indisponível
 * ou uid ausente.
 */
export async function queryByField(col, field, uid) {
  if (!db) return [];
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, col), where(field, '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Audit logs onde o uid é ator OU sujeito, últimos 6 meses (Marco Civil
 * Art. 15). Dedup por id quando o mesmo doc aparece nas duas queries.
 */
export async function queryAuditLogs(uid) {
  if (!db) return [];
  if (!uid) return [];
  const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
  const [asActor, asSubject] = await Promise.all([
    getDocs(
      query(
        collection(db, 'audit_logs'),
        where('actor_id', '==', uid),
        where('created_at_ms', '>=', sixMonthsAgo),
      ),
    ).catch(() => ({ docs: [] })),
    getDocs(
      query(
        collection(db, 'audit_logs'),
        where('user_id', '==', uid),
        where('created_at_ms', '>=', sixMonthsAgo),
      ),
    ).catch(() => ({ docs: [] })),
  ]);
  const seen = new Set();
  const all = [];
  for (const d of [...asActor.docs, ...asSubject.docs]) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      all.push({ id: d.id, ...d.data() });
    }
  }
  return all;
}
