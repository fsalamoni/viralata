/**
 * @fileoverview LGPD — direito ao esquecimento (Art. 18, VI).
 *
 * Anonimiza o perfil do usuário (remove PII), apaga sua presença pública
 * (radar de pets) e exclui a conta de autenticação. `audit_logs` nunca é
 * tocado (trilha imutável, exigida por lei mesmo após a exclusão da conta —
 * já documentado em docs/DATA_MODEL.md).
 *
 * Não apaga em cascata pets/posts/mensagens já publicados pelo usuário —
 * mesma decisão já adotada para remoção de membros de clube, para não
 * quebrar referências de outros usuários a esses registros.
 */
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';

export async function deleteMyAccount(user) {
  if (!db || !auth?.currentUser || !user?.uid) throw new Error('Usuário não autenticado.');
  const uid = user.uid;

  await createAuditLog({ action: 'user_account_deleted', actor: user, details: { uid } });

  await setDoc(doc(db, 'users', uid), {
    deleted: true,
    deleted_at: serverTimestamp(),
    full_name: '[conta excluída]',
    platform_name: '[conta excluída]',
    email: null,
    phone: null,
    photo_url: null,
    city: null,
    state: null,
    updated_at: serverTimestamp(),
  }, { merge: true });

  await deleteDoc(doc(db, 'pet_radars', uid)).catch(() => {});

  // Requer login recente; se falhar, o perfil já foi anonimizado — o
  // usuário pode tentar novamente após relogar para remover a autenticação.
  await deleteUser(auth.currentUser);
}
