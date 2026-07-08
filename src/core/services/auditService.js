import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

export const AUDIT_ACTION_LABELS = {
  user_profile_updated: 'Perfil atualizado',
  user_banned: 'Usuário banido',
  user_unbanned: 'Banimento removido',
  user_account_deleted: 'Conta excluída (LGPD)',
  club_created: 'Organização criada',
  club_updated: 'Organização atualizada',
  club_deleted: 'Organização excluída',
  admin_club_directory_updated: 'Organização moderada no diretório',
  club_invite_regenerated: 'Código de convite da organização renovado',
  club_member_joined: 'Ingressou na organização',
  club_member_left: 'Saiu da organização',
  club_member_removed: 'Membro removido da organização',
  club_member_invited: 'Membro convidado para a organização',
  club_member_permissions_updated: 'Permissões de administrador alteradas',
  club_admin_added: 'Admin de organização adicionado',
  club_admin_removed: 'Admin de organização removido',
  club_join_requested: 'Pedido de ingresso na organização',
  club_join_approved: 'Pedido de ingresso aprovado',
  club_join_rejected: 'Pedido de ingresso recusado',
  club_invite_accepted: 'Convite de organização aceito',
  club_invite_declined: 'Convite de organização recusado',
  club_invite_cancelled: 'Convite de organização cancelado',
  club_event_created: 'Evento criado',
  club_event_updated: 'Evento atualizado',
  club_event_deleted: 'Evento excluído',
  club_post_deleted: 'Publicação do mural removida',
  club_forum_thread_created: 'Tópico de fórum criado',
  club_forum_thread_updated: 'Tópico de fórum atualizado',
  club_forum_thread_deleted: 'Tópico de fórum excluído',
  club_campaign_created: 'Chamado de doação criado',
  club_campaign_updated: 'Chamado de doação atualizado',
  club_campaign_deleted: 'Chamado de doação excluído',
  club_ledger_entry_created: 'Lançamento financeiro registrado',
  club_ledger_entry_deleted: 'Lançamento financeiro removido',
  pet_created: 'Pet cadastrado',
  pet_updated: 'Pet atualizado',
  pet_deleted: 'Pet removido',
  adoption_completed: 'Adoção concluída',
  adoption_interest_registered: 'Interesse em adoção registrado',
  interest_status_updated: 'Status de interesse atualizado',
  adoption_rating_created: 'Avaliação pós-adoção registrada',
  abuse_report_created: 'Denúncia de maus-tratos registrada',
  platform_feature_flag_changed: 'Feature flag alterada (admin)',
  platform_settings_updated: 'Configurações globais alteradas',
  community_created: 'Comunidade criada',
  community_updated: 'Comunidade atualizada',
  community_deleted: 'Comunidade excluída',
  community_post_created: 'Post publicado na comunidade',
  community_post_deleted: 'Post removido da comunidade',
  community_event_created: 'Evento criado na comunidade',
  community_event_deleted: 'Evento removido da comunidade',
};

export async function createAuditLog({
  action,
  actor,
  userId = null,
  userName = null,
  userEmail = null,
  details = {},
}) {
  if (!actor?.uid || !action) return;

  const actorName = actor.displayName || actor.email || actor.uid;
  const createdAtMs = Date.now();

  try {
    await addDoc(collection(db, 'audit_logs'), {
      log_number: Number(`${createdAtMs}${randomNumericSuffix()}`),
      action,
      action_label: AUDIT_ACTION_LABELS[action] || action,
      actor_id: actor.uid,
      actor_name: actorName,
      actor_email: actor.email || '',
      user_id: userId || actor.uid,
      user_name: userName || actorName,
      user_email: userEmail || actor.email || '',
      details,
      created_at_ms: createdAtMs,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    logger.error('Audit log failed:', err);
  }
}

/**
 * Adds entropy to the millisecond timestamp so visible log numbers remain
 * unique when several records are created nearly simultaneously.
 */
function randomNumericSuffix() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint16Array(1);
    globalThis.crypto.getRandomValues(values);
    return String(values[0]).padStart(5, '0');
  }
  return String(performance.now()).replace(/\D/g, '').slice(-5).padStart(5, '0');
}

export function formatAuditDate(value, fallbackMs) {
  const date = toDate(value) || (fallbackMs ? new Date(fallbackMs) : null);
  if (!date) return '—';
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
