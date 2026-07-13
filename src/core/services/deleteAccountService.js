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
import { ANONYMIZED_NAME, LEFT_REASON_ACCOUNT_DELETED } from './deleteAccountService.constants';
import { logger } from '@/core/lib/logger';



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

  // TASK-332: cascade-anonymize dados de comunidade (9 coleções).
  // Anonimiza autor/photo dos posts/comments/threads/messages/chat
  // e DELETA likes/rsvps (sem refs externas). Memberships viram
  // 'left' com motivo 'account_deleted'. Erros NÃO bloqueiam.
  try {
    await cascadeAnonymizeCommunityData(uid, user);
  } catch (err) {
    logger.error('deleteAccountService.cascadeAnonymizeCommunityData', {
      msg: 'community cascade failed (non-blocking)',
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

/**
 * Cascade-anonymize dados de comunidade quando o usuário pede
 * exclusão de conta (LGPD Art. 18 VI).
 *
 * Coleções tocadas:
 *  1. `community_posts` (where author_id == uid) — anonimiza author_name,
 *     author_photo. Mantém o post para não quebrar histórico de outros users.
 *     Adiciona `deleted_by_user: true` e mantém `author_id` (regra do Firestore
 *     imutável, ver TASK-329).
 *  2. `community_post_comments` (where author_id == uid) — mesmo padrão.
 *  3. `community_post_likes` (where user_id == uid) — DELETA (like é
 *     derivado, não referenciado; sem like não quebra nada).
 *  4. `community_forum_threads` (where author_id == uid) — anonimiza
 *     author_name/photo, mantém o thread.
 *  5. `community_forum_messages` (where author_id == uid) — mesmo padrão.
 *  6. `community_members` (where user_id == uid) — marca `status='left'`
 *     com `left_reason='account_deleted'`. Remove a membership mas
 *     preserva audit trail.
 *  7. `community_events` (where created_by == uid) — anonimiza
 *     created_by_name. Mantém o evento.
 *  8. `community_event_rsvps` (where user_id == uid) — DELETA (RSVP
 *     é próprio do user, sem outras refs).
 *  9. `club_chat_messages` (where author_id == uid) — anonimiza
 *     author_name. Mantém a mensagem.
 *
 * Erros aqui NÃO bloqueiam a exclusão da conta de auth — o soft-delete
 * do perfil users/{uid} já garante LGPD Art. 18 VI no nível mais alto.
 */
async function cascadeAnonymizeCommunityData(uid, actor) {
  const counts = {
    posts: 0, comments: 0, postLikes: 0,
    threads: 0, messages: 0, memberships: 0,
    events: 0, rsvps: 0, chatMessages: 0,
  };

  const ANON_AUTHOR = '[conta excluída]';

  // (1-2, 4-5) Anonimiza posts/comments/threads/messages — mantém o doc,
  // remove PII. `author_id` IMUTÁVEL (TASK-329), só `author_name/photo`.
  const anonTextAuthors = [
    { col: 'community_posts', fkField: 'author_id', countKey: 'posts' },
    { col: 'community_post_comments', fkField: 'author_id', countKey: 'comments' },
    { col: 'community_forum_threads', fkField: 'author_id', countKey: 'threads' },
    { col: 'community_forum_messages', fkField: 'author_id', countKey: 'messages' },
  ];
  for (const { col, fkField, countKey } of anonTextAuthors) {
    try {
      const snap = await getDocs(query(collection(db, col), where(fkField, '==', uid)));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.update(d.ref, {
          author_name: ANON_AUTHOR,
          author_photo: null,
          deleted_by_user: true,
          updated_at: serverTimestamp(),
        });
      });
      if (snap.size > 0) await batch.commit();
      counts[countKey] = snap.size;
    } catch (err) {
      logger.warn(`deleteAccountService.cascade.${countKey}`, { uid, err: String(err) });
    }
  }

  // (3) Likes — DELETA (sem referências externas)
  try {
    const likesSnap = await getDocs(
      query(collection(db, 'community_post_likes'), where('user_id', '==', uid)),
    );
    const batch = writeBatch(db);
    likesSnap.forEach((d) => batch.delete(d.ref));
    if (likesSnap.size > 0) await batch.commit();
    counts.postLikes = likesSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.postLikes', { uid, err: String(err) });
  }

  // (6) Memberships — marca left + motivo
  try {
    const memberSnap = await getDocs(
      query(collection(db, 'community_members'), where('user_id', '==', uid)),
    );
    const batch = writeBatch(db);
    memberSnap.forEach((d) => {
      batch.update(d.ref, {
        status: 'left',
        left_reason: 'account_deleted',
        left_at: new Date().toISOString(),
        updated_at: serverTimestamp(),
      });
    });
    if (memberSnap.size > 0) await batch.commit();
    counts.memberships = memberSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.memberships', { uid, err: String(err) });
  }

  // (7) Events criados — anonimiza created_by_name (mantém evento)
  try {
    const evSnap = await getDocs(
      query(collection(db, 'community_events'), where('created_by', '==', uid)),
    );
    const batch = writeBatch(db);
    evSnap.forEach((d) => {
      batch.update(d.ref, {
        created_by_name: ANON_AUTHOR,
        updated_at: serverTimestamp(),
      });
    });
    if (evSnap.size > 0) await batch.commit();
    counts.events = evSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.events', { uid, err: String(err) });
  }

  // (8) RSVPs — DELETA
  try {
    const rsvpSnap = await getDocs(
      query(collection(db, 'community_event_rsvps'), where('user_id', '==', uid)),
    );
    const batch = writeBatch(db);
    rsvpSnap.forEach((d) => batch.delete(d.ref));
    if (rsvpSnap.size > 0) await batch.commit();
    counts.rsvps = rsvpSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.rsvps', { uid, err: String(err) });
  }

  // (9) Chat messages — anonimiza author_name
  try {
    const chatSnap = await getDocs(
      query(collection(db, 'club_chat_messages'), where('author_id', '==', uid)),
    );
    const batch = writeBatch(db);
    chatSnap.forEach((d) => {
      batch.update(d.ref, {
        author_name: ANON_AUTHOR,
        updated_at: serverTimestamp(),
      });
    });
    if (chatSnap.size > 0) await batch.commit();
    counts.chatMessages = chatSnap.size;
  } catch (err) {
    logger.warn('deleteAccountService.cascade.chatMessages', { uid, err: String(err) });
  }

  await createAuditLog({
    action: 'community_data_anonymized',
    actor,
    details: { uid, ...counts },
  }).catch(() => {});
}

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
