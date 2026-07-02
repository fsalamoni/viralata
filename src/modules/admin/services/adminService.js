import { collection, getDocs, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';

/** Lista todos os usuários da plataforma (visão do Super Admin). */
export async function listAllUsers() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Bane um usuário, impedindo que ele acesse a plataforma. */
export async function banUser(uid, reason, actor) {
  if (!db || !uid) throw new Error('Dados inválidos');
  await updateDoc(doc(db, 'users', uid), {
    banned: true,
    banned_at: serverTimestamp(),
    banned_reason: reason || '',
    updated_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'user_banned', actor, details: { user_id: uid, reason } });
}

/** Remove o banimento de um usuário. */
export async function unbanUser(uid, actor) {
  if (!db || !uid) throw new Error('Dados inválidos');
  await updateDoc(doc(db, 'users', uid), {
    banned: false,
    banned_at: null,
    banned_reason: null,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'user_unbanned', actor, details: { user_id: uid } });
}
