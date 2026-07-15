/**
 * @fileoverview Core de auditoria — Admin SDK (server-side).
 *
 * Usado por:
 *  1. `createAuditLogCall` (callable) — client invoca via
 *     `httpsCallable(functions, 'createAuditLog')`.
 *  2. Qualquer outro Cloud Function que precise logar ações
 *     administrativas (não passa por callable — chama direto).
 *
 * IMPORTANTE: esta função usa Firebase Admin SDK e IGNORA as
 * Firestore security rules (Admin SDK é privilegiada). Isso é
 * intencional — audit_logs nunca deve ser escrito pelo client
 * diretamente (TASK-330, SEC-HIGH).
 *
 * LGPD Art. 37 + Marco Civil Art. 10 §2º: registro imutável das
 * operações de tratamento. O log é append-only (update/delete
 * bloqueados no firestore.rules).
 */

const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const DATABASE_ID = 'viralata';
let _db;

/** Lazy-init do Admin Firestore. */
function getDb() {
  if (!_db) _db = getFirestore(DATABASE_ID);
  return _db;
}

/** Sufixo numérico randômico (6 dígitos) para desambiguação em escritas rápidas. */
function randomNumericSuffix() {
  return String(Math.floor(Math.random() * 999999)).padStart(6, '0');
}

const AUDIT_ACTION_LABELS = {
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
  terms_accepted: 'Termos de Uso aceitos (cadastro)',
  privacy_policy_accepted: 'Política de Privacidade aceita (cadastro)',
  code_of_conduct_accepted: 'Código de Conduta aceito (cadastro)',
  adoption_terms_accepted: 'Termo de Adoção assinado',
  donation_terms_accepted: 'Política de Doações aceita',
  volunteer_terms_accepted: 'Termo de Voluntariado aceito',
  foster_terms_accepted: 'Termo de Lar Temporário aceito',
  shelter_terms_accepted: 'Termo de Adesão de Abrigo aceito (com DPA)',
  platform_admin_promoted: 'Platform admin promovido',
  platform_admin_demoted: 'Platform admin rebaixado',
  platform_alert_config_created: 'Configuração de alerta criada',
  platform_alert_config_updated: 'Configuração de alerta atualizada',
  platform_alert_config_deleted: 'Configuração de alerta removida',
  platform_alert_triggered: 'Alerta da plataforma disparado',
  platform_billing_summary_updated: 'Resumo de billing da plataforma atualizado',
  volunteer_data_anonymized: 'Dados de voluntário anonimizados (LGPD)',
  subscription_started: 'Assinatura iniciada',
  subscription_cancelled: 'Assinatura cancelada',
  payment_refunded: 'Reembolso processado',
};

const AUDIT_TERM_ACCEPTANCE_ACTIONS = new Set([
  'terms_accepted',
  'privacy_policy_accepted',
  'code_of_conduct_accepted',
  'adoption_terms_accepted',
  'donation_terms_accepted',
  'volunteer_terms_accepted',
  'foster_terms_accepted',
  'shelter_terms_accepted',
]);

const AUDIT_PAYMENT_ACTIONS = new Set([
  'subscription_started',
  'subscription_cancelled',
  'payment_refunded',
]);

function classifyAuditCategory(action) {
  if (AUDIT_TERM_ACCEPTANCE_ACTIONS.has(action)) return 'term_acceptance';
  if (AUDIT_PAYMENT_ACTIONS.has(action)) return 'payment';
  return 'operational';
}

/**
 * Grava um audit log via Admin SDK (bypassa Firestore rules).
 *
 * @param {object} params
 * @param {string} params.action              - chave de AUDIT_ACTION_LABELS
 * @param {object} params.actor              - { uid, displayName?, email? }
 * @param {string|null} params.userId         - uid do sujeito (default = actor.uid)
 * @param {string|null} params.userName       - nome do sujeito
 * @param {string|null} params.userEmail      - email do sujeito
 * @param {object} params.details             - payload livre
 * @param {string|null} params.ipAddress      - IP do cliente (extraído pelo callable)
 * @param {string|null} params.userAgent      - User-Agent do cliente
 * @param {object} params.logger              - firebase-functions logger (opcional)
 * @returns {Promise<{ok: boolean, logId?: string, error?: string}>}
 */
async function createAuditLogCore({
  action,
  actor,
  userId = null,
  userName = null,
  userEmail = null,
  details = {},
  ipAddress = null,
  userAgent = null,
  logger: log = console,
}) {
  if (!actor?.uid || !action) {
    return { ok: false, error: 'actor.uid e action são obrigatórios.' };
  }

  const db = getDb();
  const createdAtMs = Date.now();
  const actorName = actor.displayName || actor.email || actor.uid;
  const effectiveUserId = userId || actor.uid;
  const effectiveUserName = userName || actorName;
  const effectiveUserEmail = userEmail || actor.email || '';

  const logEntry = {
    log_number: Number(`${createdAtMs}${randomNumericSuffix()}`),
    action,
    action_label: AUDIT_ACTION_LABELS[action] || action,
    category: classifyAuditCategory(action),
    actor_id: actor.uid,
    actor_name: actorName,
    actor_email: actor.email || '',
    user_id: effectiveUserId,
    user_name: effectiveUserName,
    user_email: effectiveUserEmail,
    ip_address: ipAddress || 'server-unknown',
    user_agent: userAgent || 'server-callable',
    details,
    created_at_ms: createdAtMs,
    created_at: FieldValue.serverTimestamp(),
  };

  try {
    const docRef = await db.collection('audit_logs').add(logEntry);
    if (log && log.info) {
      log.info('[auditLogCore] log criado', { action, logId: docRef.id });
    }
    return { ok: true, logId: docRef.id };
  } catch (err) {
    if (log && log.error) {
      log.error('[auditLogCore] falha ao gravar audit log', { action, error: err.message });
    }
    return { ok: false, error: err.message };
  }
}

module.exports = { createAuditLogCore, classifyAuditCategory, AUDIT_ACTION_LABELS };
