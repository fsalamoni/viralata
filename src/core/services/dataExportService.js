/**
 * @fileoverview LGPD — portabilidade de dados (Art. 18, V).
 *
 * Reúne os documentos das principais coleções referenciando o uid do
 * usuário e devolve um objeto pronto para exportar como JSON. Não é uma
 * extração exaustiva de 100% dos dados (mensagens de chat, por exemplo,
 * exigiriam varrer toda conversa) — cobre os dados de identidade e as
 * ações do usuário na plataforma, o suficiente para o direito de
 * portabilidade sem depender de um job de backend.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

async function queryByField(col, field, uid) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, col), where(field, '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function exportMyData(uid) {
  if (!db || !uid) throw new Error('Usuário não autenticado.');

  const [profileSnap, pets, adoptionInterests, clubMemberships,
    notifications, abuseReports, ratingsGiven, ratingsReceived, conversations] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    queryByField('pets', 'owner_id', uid),
    queryByField('adoption_interests', 'user_id', uid),
    queryByField('club_members', 'user_id', uid),
    queryByField('notifications', 'user_id', uid),
    queryByField('abuse_reports', 'reporter_uid', uid),
    queryByField('adoption_ratings', 'rater_uid', uid),
    queryByField('adoption_ratings', 'rated_uid', uid),
    getDocs(query(collection(db, 'conversations'), where('member_ids', 'array-contains', uid))),
  ]);

  return {
    exported_at: new Date().toISOString(),
    profile: profileSnap.exists() ? profileSnap.data() : null,
    pets,
    adoption_interests: adoptionInterests,
    club_memberships: clubMemberships,
    notifications,
    abuse_reports: abuseReports,
    ratings_given: ratingsGiven,
    ratings_received: ratingsReceived,
    conversations: conversations.docs.map((d) => ({ id: d.id, ...d.data() })),
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
