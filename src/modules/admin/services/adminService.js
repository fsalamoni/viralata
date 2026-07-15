import { collection, getDocs, doc, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { normalizeClubDirectoryStatus } from '@/modules/communities/domain/directory';

/** Lista todos os usuários da plataforma (visão do Super Admin). */
export async function listAllUsers() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Bane um usuário, impedindo que ele acesse a plataforma. */
export async function banUser(uid, reason, actor, bannedUntil = null) {
  if (!db || !uid) throw new Error('Dados inválidos');
  if (!reason || String(reason).trim().length < 5) {
    throw new Error('Informe o motivo do banimento (mínimo 5 caracteres).');
  }
  // TASK-178: bannedUntil = ISO string para banimento temporário;
  // null = perpétuo. O gate (FirebaseAuthContext) trata expiração.
  await updateDoc(doc(db, 'users', uid), {
    banned: true,
    banned_at: serverTimestamp(),
    banned_reason: String(reason).trim(),
    banned_until: bannedUntil || null,
    updated_at: serverTimestamp(),
  });
  // TASK-351: targetUserId = admin agindo sobre outro usuário
  await createAuditLog({
    action: 'user_banned',
    actor,
    targetUserId: uid,
    details: { reason: String(reason).trim(), banned_until: bannedUntil || null },
  });
}

/** Remove o banimento de um usuário. */
export async function unbanUser(uid, actor) {
  if (!db || !uid) throw new Error('Dados inválidos');
  await updateDoc(doc(db, 'users', uid), {
    banned: false,
    banned_at: null,
    banned_reason: null,
    banned_until: null,
    updated_at: serverTimestamp(),
  });
  // TASK-351: targetUserId = admin agindo sobre outro usuário
  await createAuditLog({ action: 'user_unbanned', actor, targetUserId: uid, details: {} });
}

/** Lista todas as organizações, inclusive fora do diretório público. */
export async function listAdminClubs() {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'clubs'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
}

/** Atualiza metadados globais de moderação/publicação de uma organização. */
export async function updateAdminClub(id, updates, actor) {
  if (!db || !id) throw new Error('Organização inválida.');

  const payload = {};
  if (updates.directory_status !== undefined) {
    payload.directory_status = normalizeClubDirectoryStatus(updates.directory_status);
  }
  if (updates.featured !== undefined) {
    payload.featured = Boolean(updates.featured);
  }
  if (updates.community_id !== undefined) {
    payload.community_id = String(updates.community_id || '').trim();
  }
  if (updates.community_name !== undefined) {
    payload.community_name = String(updates.community_name || '').trim();
  }

  if (Object.keys(payload).length === 0) return;

  await updateDoc(doc(db, 'clubs', id), {
    ...payload,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'admin_club_directory_updated', actor, details: { club_id: id, fields: payload } });
}
