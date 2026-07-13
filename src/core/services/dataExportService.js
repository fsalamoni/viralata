/**
 * @fileoverview LGPD — portabilidade de dados (Art. 18, V).
 *
 * Reúne os documentos das principais coleções referenciando o uid do
 * usuário e devolve um objeto pronto para exportar como JSON. Não é uma
 * extração exaustiva de 100% dos dados (mensagens de chat, por exemplo,
 * exigiriam varrer toda conversa) — cobre os dados de identidade e as
 * ações do usuário na plataforma, o suficiente para o direito de
 * portabilidade sem depender de um job de backend.
 *
 * TASK-294 (LGPD Art. 18 V): expandido para incluir terms_acceptances,
 * donation_contributions (clube), audit_logs pessoais (actor_id OU
 * user_id == uid), applications de adoção (clube),
 * volunteer_profiles e volunteer_rosters. Audit log do próprio
 * export é gerado (`data_export_requested`).
 *
 * Helpers puros extraídos em `dataExportService.internal.js` para
 * serem testáveis.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { queryByField, queryAuditLogs } from './dataExportService.internal';

export async function exportMyData(uid) {
  if (!db || !uid) throw new Error('Usuário não autenticado.');

  const [profileSnap, pets, adoptionInterests, clubMemberships,
    notifications, abuseReports, ratingsGiven, ratingsReceived, conversations,
    termsAcceptances, donationContributions, auditLogs,
    adoptionApplications, volunteerProfiles, volunteerRosters,
    communityPosts, communityPostComments, communityForumThreads,
    communityForumMessages, communityMembers, communityPostLikes,
    communityEvents, communityEventRsvps, clubChatMessages] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    queryByField('pets', 'owner_id', uid),
    queryByField('adoption_interests', 'user_id', uid),
    queryByField('club_members', 'user_id', uid),
    queryByField('notifications', 'user_id', uid),
    queryByField('abuse_reports', 'reporter_uid', uid),
    queryByField('adoption_ratings', 'rater_uid', uid),
    queryByField('adoption_ratings', 'rated_uid', uid),
    getDocs(query(collection(db, 'conversations'), where('member_ids', 'array-contains', uid))),
    queryByField('terms_acceptances', 'user_id', uid),
    queryByField('donation_contributions', 'user_id', uid),
    queryAuditLogs(uid),
    queryByField('adoption_applications', 'applicant_uid', uid),
    queryByField('volunteer_profiles', 'user_id', uid),
    queryByField('volunteer_rosters', 'volunteer_uid', uid),
    // TASK-331: dados de comunidade + chat (LGPD Art. 18 V — cobertura total)
    queryByField('community_posts', 'author_id', uid),
    queryByField('community_post_comments', 'author_id', uid),
    queryByField('community_forum_threads', 'author_id', uid),
    queryByField('community_forum_messages', 'author_id', uid),
    queryByField('community_members', 'user_id', uid),
    queryByField('community_post_likes', 'user_id', uid),
    queryByField('community_events', 'created_by', uid),
    queryByField('community_event_rsvps', 'user_id', uid),
    queryByField('club_chat_messages', 'author_id', uid),
  ]);

  // Gera audit log do próprio export (LGPD Art. 37 + Art. 18 V — o
  // usuário tem direito a saber QUANDO seus dados foram exportados e
  // POR QUÊ). Best-effort — não bloqueia o export se o log falhar.
  try {
    await createAuditLog({
      action: 'data_export_requested',
      actor: { uid, email: profileSnap.data()?.email },
      details: {
        counts: {
          pets: pets.length,
          adoption_applications: adoptionApplications.length,
          terms_acceptances: termsAcceptances.length,
          donation_contributions: donationContributions.length,
          audit_logs: auditLogs.length,
          conversations: conversations.size,
          volunteer_profiles: volunteerProfiles.length,
          volunteer_rosters: volunteerRosters.length,
          community_posts: communityPosts.length,
          community_post_comments: communityPostComments.length,
          community_forum_threads: communityForumThreads.length,
          community_forum_messages: communityForumMessages.length,
          community_members: communityMembers.length,
          community_post_likes: communityPostLikes.length,
          community_events: communityEvents.length,
          community_event_rsvps: communityEventRsvps.length,
          club_chat_messages: clubChatMessages.length,
        },
      },
    });
  } catch {
    // Silencioso — export é mais importante que o log.
  }

  return {
    exported_at: new Date().toISOString(),
    lgpd_article: 'Art. 18, V — direito de portabilidade',
    profile: profileSnap.exists() ? profileSnap.data() : null,
    pets,
    adoption_interests: adoptionInterests,
    adoption_applications: adoptionApplications,
    club_memberships: clubMemberships,
    notifications,
    abuse_reports: abuseReports,
    ratings_given: ratingsGiven,
    ratings_received: ratingsReceived,
    conversations: conversations.docs.map((d) => ({ id: d.id, ...d.data() })),
    terms_acceptances: termsAcceptances,
    donation_contributions: donationContributions,
    volunteer_profiles: volunteerProfiles,
    volunteer_rosters: volunteerRosters,
    // TASK-331: comunidade + chat
    community_posts: communityPosts,
    community_post_comments: communityPostComments,
    community_forum_threads: communityForumThreads,
    community_forum_messages: communityForumMessages,
    community_members: communityMembers,
    community_post_likes: communityPostLikes,
    community_events: communityEvents,
    community_event_rsvps: communityEventRsvps,
    club_chat_messages: clubChatMessages,
    audit_logs: auditLogs,
  };
}

/** Dispara o download do export como um arquivo .json. */
export function downloadDataExport(data, uid) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `viralata-meus-dados-${uid}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
