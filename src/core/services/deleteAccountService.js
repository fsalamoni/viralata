/**
 * @fileoverview LGPD — direito ao esquecimento (Art. 18, VI).
 *
 * Anonimiza o perfil do usuário (remove PII), apaga sua presença pública
 * (radar de pets), cascade-anonymiza dados de voluntariado (4 coleções)
 * e exclui a conta de autenticação. `audit_logs` nunca é tocado
 * (trilha imutável, exigida por lei mesmo após a exclusão da conta —
 * já documentado em docs/DATA_MODEL.md).
 *
 * Não apaga em cascata pets/posts/mensagens já publicados pelo usuário —
 * mesma decisão já adotada para remoção de membros de clube, para não
 * quebrar referências de outros usuários a esses registros.
 *
 * ─── CONFLITO LEGAL: Marco Civil Art. 15 (6m) vs termo v2 §7.7 (5a) ───
 * We keep `terms_accepted_at`/`terms_version` INDEFINIDAMENTE no perfil
 * de voluntário (users/{uid}/volunteer_profile/main) e nos docs per-shelter
 * (clubs/{clubId}/volunteers/{uid}) como prova legal do aceite eletrônico, conforme
 * Lei 14.063/2020 art. 6º (assinatura eletrônica) + art. 10 (preservação
 * de registros). Outros PII (notes, availability, radius_km, transport,
 * email, phone, signature_text) são anonimizados para LGPD Art. 18 VI.
 *
 * O prazo de 6 meses do Marco Civil Art. 15 aplica-se a LOGS de acesso
 * (audit_logs), não a "legal holds" de aceite de termos. O cron de purge
 * do audit_log é controlado por `auditLogPurgeCron` (TASK-217/240) e
 * opera de forma independente desta função.
 *
 * @see docs/VOLUNTEER_MODULE.md
 * @see TASK-216, TASK-225
 */
import {
  doc, setDoc, deleteDoc, serverTimestamp,
  collection, collectionGroup, getDocs, query, where, writeBatch,
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { logger } from '@/core/lib/logger';

const ANONYMIZED_NAME = '[conta excluída]';
const LEFT_REASON_ACCOUNT_DELETED = 'account_deleted';

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

  // Cascade-anonymize dados de voluntariado (4 coleções).
  // Erros aqui NÃO bloqueiam a exclusão da conta de auth — soft-delete
  // do perfil users/{uid} já garante LGPD Art. 18 VI no nível mais alto.
  try {
    await cascadeAnonymizeVolunteerData(uid, user);
  } catch (err) {
    logger.error('deleteAccountService.cascadeAnonymizeVolunteerData', {
      msg: 'volunteer cascade failed (non-blocking)',
      uid,
      err: String(err),
    });
  }

  // Requer login recente; se falhar, o perfil já foi anonimizado — o
  // usuário pode tentar novamente após relogar para remover a autenticação.
  await deleteUser(auth.currentUser);
}

/**
 * Cascade-anonymize dados de voluntariado quando o usuário pede
 * exclusão de conta (LGPD Art. 18 VI).
 *
 * Coleções tocadas:
 *  1. `users/{uid}/volunteer_profile/main` — soft-delete + anonimiza
 *     PII (mantém `terms_*` como prova legal Lei 14.063/2020).
 *  2. `clubs/{clubId}/volunteers/{uid}` — marca `status='left'` com motivo
 *     + anonimiza PII (mantém `volunteer_name` como placeholder e
 *     `terms_*` como prova legal).
 *  3. `clubs/{clubId}/volunteer_participations/{participationId}`
 *     (where `volunteer_uid==uid`) — NÃO deleta (preserva histórico
 *     legal de horas), apenas anonimiza `volunteer_name`.
 *  4. Audit log dedicado (`volunteer_data_anonymized`) com contadores.
 */
async function cascadeAnonymizeVolunteerData(uid, actor) {
  const counts = { profile: 0, roster: 0, participations: 0 };

  // (1) users/{uid}/volunteer_profile/main — soft-delete + anonimiza
  const profileRef = doc(db, 'users', uid, 'volunteer_profile', 'main');
  try {
    await setDoc(profileRef, {
      deleted_at: serverTimestamp(),
      notes: null,
      availability: [],
      radius_km: null,
      transport_available: false,
      has_vehicle: false,
      updated_at: serverTimestamp(),
    }, { merge: true });
    counts.profile = 1;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.profile', { uid, err: String(err) });
  }

  // (2) clubs/*/volunteers/{uid} — collectionGroup per-club
  try {
    const rosterSnap = await getDocs(
      query(collectionGroup(db, 'volunteers'), where('volunteer_uid', '==', uid)),
    );
    const batch = writeBatch(db);
    rosterSnap.forEach((d) => {
      batch.update(d.ref, {
        status: 'left',
        left_reason: LEFT_REASON_ACCOUNT_DELETED,
        left_at: new Date().toISOString(),
        volunteer_email: null,
        volunteer_phone: null,
        volunteer_photo_url: null,
        signature_text: null,
        volunteer_name: ANONYMIZED_NAME,
        updated_at: serverTimestamp(),
      });
    });
    if (rosterSnap.size > 0) {
      await batch.commit();
    }
    counts.roster = rosterSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.roster', { uid, err: String(err) });
  }

  // (3) clubs/*/volunteer_participations/* — NÃO deleta; só anonimiza nome
  try {
    const partSnap = await getDocs(
      query(
        collectionGroup(db, 'volunteer_participations'),
        where('volunteer_uid', '==', uid),
      ),
    );
    const batch = writeBatch(db);
    partSnap.forEach((d) => {
      batch.update(d.ref, {
        volunteer_name: ANONYMIZED_NAME,
        updated_at: serverTimestamp(),
      });
    });
    if (partSnap.size > 0) {
      await batch.commit();
    }
    counts.participations = partSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.participations', { uid, err: String(err) });
  }

  await createAuditLog({
    action: 'volunteer_data_anonymized',
    actor,
    details: { uid, ...counts },
  }).catch(() => {});
}
