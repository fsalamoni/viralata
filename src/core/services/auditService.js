import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

/** Lazy-callable ref do httpsCallable para createAuditLog. */
let _createAuditLogFn = null;
function getCreateAuditLogFn() {
  if (!_createAuditLogFn) _createAuditLogFn = httpsCallable(functions, 'createAuditLog');
  return _createAuditLogFn;
}

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

// ─── TASK-217: Categorias de retenção (auditLogPurgeCron) ──────────────
//
// Cada audit log recebe `category` derivado de `action`. A categoria
// determina o prazo de retenção aplicado pelo cron de purge no
// server (functions/auditLogPurgeCronCore.js):
//   - operational:     180 dias (Marco Civil Art. 15)
//   - term_acceptance: 1825 dias (Lei 14.063/2020 art. 6º — prova legal)
//   - payment:         2555 dias (Receita Federal)
//
// Os sets DEVEM ficar em sync com os do server. Mudanças aqui
// exigem rodar functions/auditLogPurgeCron.test.js para validar o
// lado server.
//
// Não exportamos um audit service unificado client/server porque o
// functions/ runtime é CommonJS/Admin SDK e este arquivo roda no
// browser via Firebase Web SDK — boundary incompatível.
export const AUDIT_TERM_ACCEPTANCE_ACTIONS = new Set([
  'terms_accepted',
  'privacy_policy_accepted',
  'code_of_conduct_accepted',
  'adoption_terms_accepted',
  'donation_terms_accepted',
  'volunteer_terms_accepted',
  'foster_terms_accepted',
  'shelter_terms_accepted',
  'terms_acceptance_recorded',
]);

export const AUDIT_PAYMENT_ACTIONS = new Set([
  'donation_received',
  'donation_failed',
  'subscription_started',
  'subscription_cancelled',
  'payment_refunded',
]);

export function classifyAuditCategory(action) {
  if (AUDIT_TERM_ACCEPTANCE_ACTIONS.has(action)) return 'term_acceptance';
  if (AUDIT_PAYMENT_ACTIONS.has(action)) return 'payment';
  return 'operational';
}

// ─── TASK-351: target_user_id + correlation_id ────────────────────────
//
// `target_user_id`: UID do usuário diretamente afetado pela ação.
// Usado quando actor ≠ target (ex: admin bane usuário X).
// Quando omitted/null, o consumer pode inferir target_user_id = actor_id
// para ações onde actor==target.
//
// `correlation_id`: UUID que encadeia múltiplas entradas de auditoria
// pertencentes a uma mesma operação lógica (ex: cascade delete de pet
// + adoção + aceite de termo = mesmo correlation_id). Gerado pelo
// caller e passado para todas as sub-operações. Valor null/undefined
// é aceitável — o campo simplesmente não é写入ado.
export async function createAuditLog({
  action,
  actor,
  userId = null,
  userName = null,
  userEmail = null,
  targetUserId = null,
  correlationId = null,
  details = {},
}) {
  if (!actor?.uid || !action) return;

  // ─── TASK-330 (SEC-HIGH): grava via Cloud Function (Admin SDK).
  // Não escreve diretamente no Firestore — o callable usa Admin SDK
  // e bypassa as security rules. Client writing diretamente foi
  // removido para evitar poluição / injeção de audit logs falsos.
  try {
    // O callable extrai IP real via CF-Connecting-IP e auth.uid.
    // Passamos actor por compatibilidade (certifica actor_name/email).
    await getCreateAuditLogFn()({
      action,
      actor: {
        uid: actor.uid,
        email: actor.email || '',
        displayName: actor.displayName || '',
      },
      userId: userId || null,
      userName: userName || null,
      userEmail: userEmail || null,
      details,
    });
    return { ok: true };
  } catch (err) {
    // Inner try/catch: createAuditLog is the low-level writer and NEVER
    // throws (audit must not break business operations). Returns
    // { ok: false, error } so wrappers (safeCreateAuditLog) can detect
    // failure and re-throw. Visibility is delegated to safeCreateAuditLog
    // for callers that opt in. We still log here as a last-resort sink.
    logger.error('Audit log failed:', err);
    return { ok: false, error: err };
  }
}

/**
 * Counter local (in-memory) de falhas de auditoria. Reseta a cada page
 * load — serve apenas como sinal de smoke em runtime. Quando o Sentry
 * SDK for wireado (TASK-239), este contador vira um gauge exposto lá.
 *
 * Estrutura: { total: number, byAction: Record<string, number> }
 */
const auditFailureCounter = { total: 0, byAction: {} };

/** Snapshot do contador — útil pra healthchecks e dashboards futuros. */
export function getAuditFailureStats() {
  return {
    total: auditFailureCounter.total,
    byAction: { ...auditFailureCounter.byAction },
  };
}

/**
 * Reset do contador — apenas para testes.
 * @internal
 */
export function __resetAuditFailureCounter() {
  auditFailureCounter.total = 0;
  auditFailureCounter.byAction = {};
}

/**
 * Wrapper para `createAuditLog` que NUNCA falha em silêncio.
 *
 * LGPD Art. 37 ("registro das operações de tratamento") + Marco Civil
 * Art. 10 (§2º) exigem que o registro de tratamento seja observável.
 * Uma falha de auditoria engolida via `.catch(() => {})` é uma lacuna
 * de proteção de dados — equivale a apagar o registro sem justificativa.
 *
 * Comportamento:
 *  1. Tenta gravar o log via `createAuditLog`.
 *  2. Em caso de falha: registra via `logger.error` (visível em console
 *     e em qualquer sink de log futuro), incrementa `auditFailureCounter`
 *     (sinal de smoke observável em runtime), e re-lança o erro.
 *  3. O re-throw permite que o caller ESCOLHA entre:
 *      a) deixar borbulhar (operação de negócio falha — estrito);
 *      b) capturar com `.catch` para manter não-bloqueante (caso
 *         comum: a operação já commitou e reverter seria pior que
 *         um log faltando — mas o log da falha fica visível).
 *  4. Quando o Sentry SDK for wireado (TASK-239), adicionar:
 *      `Sentry.captureException(err, { tags: { audit_failure: true, action } })`
 *      neste mesmo ponto.
 *
 * Por que NÃO `.catch(() => {})`: viola o requisito de "registro
 * das operações de tratamento" — uma falha silenciosa é um gap de
 * proteção de dados.
 *
 * @param {object} payload - mesmo payload de `createAuditLog`
 * @returns {Promise<void>} resolve em sucesso; rejeita com o erro
 *   original se a gravação falhar
 *
 * @example
 *   // Não-bloqueante (audit falha não derruba a operação):
 *   safeCreateAuditLog({ action: 'volunteer_joined_shelter', actor, details })
 *     .catch(err => logger.warn('audit_log', { err: String(err) }));
 *
 *   // Estrito (audit falha derruba a operação):
 *   await safeCreateAuditLog({ action: 'terms_accepted', actor, details });
 */
export function safeCreateAuditLog(payload) {
  return Promise.resolve(createAuditLog(payload)).then((result) => {
    if (result && result.ok === false) {
      const err = result.error || new Error('audit_log_failed');
      auditFailureCounter.total += 1;
      const actionTag = payload?.action || 'unknown';
      auditFailureCounter.byAction[actionTag] = (auditFailureCounter.byAction[actionTag] || 0) + 1;

      logger.error('[AUDIT_FAILURE]', {
        action: actionTag,
        err: err?.message || String(err),
        stack: err?.stack,
      });

      // TODO: Wire Sentry.captureException once Sentry SDK is added (TASK-239).
      // Sentry.captureException(err, { tags: { audit_failure: true, action: actionTag } });

      throw err;
    }
    return result;
  });
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
