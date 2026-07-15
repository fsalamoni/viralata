/**
 * @fileoverview Pure logic core — Firebase Cloud Messaging push notifications.
 *
 * TASK-292: FCM v1 integration.
 *
 * Notification types (notification_type field):
 *   - `adoption_workflow_created`  → new application submitted (→ shelter)
 *   - `adoption_workflow_status`    → status changed (→ applicant)
 *   - `kanban_task_created`        → task assigned (→ assignee)
 *
 * LGPD: push notifications are transactional (Art.7 IV) and fall under
 * "legitimate interest" (Art.7 IX) or explicit consent (Art.7 I).
 * Feature flag gates all sends. Opt-out = token removal from fcm_tokens[].
 *
 * @module sendPushNotificationCore
 */

'use strict';

// ─── Notification type metadata ──────────────────────────────────────────────

/**
 * @typedef {Object} NotificationTypeMeta
 * @property {string} title
 * @property {string} defaultBody
 */

/**
 * @type {Record<string, NotificationTypeMeta>}
 */
const NOTIFICATION_TYPE_META = Object.freeze({
  adoption_workflow_created: {
    title: 'Nova solicitação de adoção',
    defaultBody: 'Alguém se candidatou para adotar um pet do seu abrigo.',
  },
  adoption_workflow_status: {
    title: 'Atualização na sua adoção',
    defaultBody: 'O status da sua solicitação de adoção foi atualizado.',
  },
  kanban_task_created: {
    title: 'Nova tarefa atribuída',
    defaultBody: 'Uma tarefa foi atribuída a você.',
  },
  kanban_task_due: {
    title: 'Tarefa com prazo próximo',
    defaultBody: 'Você tem uma tarefa com prazo de conclusão próximo.',
  },
  kanban_task_overdue: {
    title: 'Tarefa atrasada',
    defaultBody: 'Uma tarefa sua está com o prazo vencido.',
  },
  milestone_due: {
    title: 'Marco do programa pendente',
    defaultBody: 'Você tem um marco do programa de adoção pendente.',
  },
  milestone_overdue: {
    title: 'Marco do programa atrasado',
    defaultBody: 'Você tem um marco do programa de adoção atrasado.',
  },
  volunteer_shift_reminder: {
    title: 'Lembrete de escala',
    defaultBody: 'Você tem uma escala de voluntariado amanhã.',
  },
  post_adoption_returned: {
    title: 'Pet devolvido',
    defaultBody: 'Um pet foi devolvido após adoção. Verifique o abrigo.',
  },
});

// ─── Input validation ─────────────────────────────────────────────────────────

const ALLOWED_TYPES = Object.freeeze
  ? Object.freeze(Object.keys(NOTIFICATION_TYPE_META))
  : Object.keys(NOTIFICATION_TYPE_META);

/**
 * Validates the input data for sendPush.
 * @param {object} data
 * @returns {{ok: true} | {ok: false, error: string}}
 */
function validateInput(data) {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'data must be an object' };
  }
  if (!data.recipientUid || typeof data.recipientUid !== 'string') {
    return { ok: false, error: 'recipientUid is required and must be a string' };
  }
  if (!data.type || typeof data.type !== 'string') {
    return { ok: false, error: 'type is required and must be a string' };
  }
  if (!ALLOWED_TYPES.includes(data.type)) {
    return {
      ok: false,
      error: `type "${data.type}" is not supported. Allowed: ${ALLOWED_TYPES.join(', ')}`,
    };
  }
  if (data.title !== undefined && (typeof data.title !== 'string' || data.title.trim().length === 0)) {
    return { ok: false, error: 'title must be a non-empty string if provided' };
  }
  if (data.title && data.title.length > 140) {
    return { ok: false, error: 'title must be 140 characters or fewer' };
  }
  if (data.body !== undefined && (typeof data.body !== 'string' || data.body.trim().length === 0)) {
    return { ok: false, error: 'body must be a non-empty string if provided' };
  }
  if (data.body && data.body.length > 300) {
    return { ok: false, error: 'body must be 300 characters or fewer' };
  }
  if (data.link !== undefined && typeof data.link !== 'string') {
    return { ok: false, error: 'link must be a string if provided' };
  }
  return { ok: true };
}

// ─── Core send logic ───────────────────────────────────────────────────────────

/**
 * Sends push notification(s) to all FCM tokens for a given user.
 *
 * @param {object} deps
 * @param {object} deps.db           - Firebase Admin Firestore db
 * @param {object} deps.messaging     - Firebase Admin Messaging instance
 * @param {object} deps.logger        - Firebase Functions logger
 * @param {object} deps.data          - Validated input data
 * @param {string} deps.actorUid      - UID of the caller (for audit)
 * @param {boolean} [deps.dryRun]     - If true, log but don't actually send
 * @returns {Promise<{ok: boolean, sent: number, failed: number, skipped: number, errors?: string[]}>}
 */
async function sendPushCore({ db, messaging, logger, data, actorUid, dryRun = false }) {
  const { recipientUid, type, title, body, link, data: extraData } = data;

  const meta = NOTIFICATION_TYPE_META[type];
  const resolvedTitle = (title || meta?.title || 'Notificação').slice(0, 140);
  const resolvedBody = (body || meta?.defaultBody || '').slice(0, 300);

  // ── 1. Fetch FCM tokens for recipient ────────────────────────────────────
  const userSnap = await db.collection('users').doc(recipientUid).get();

  if (!userSnap.exists) {
    logger.warn(`[sendPush] user ${recipientUid} not found — skipping`);
    return { ok: false, sent: 0, failed: 0, skipped: 1, errors: ['user_not_found'] };
  }

  const userData = userSnap.data();
  const tokens = userData.fcm_tokens || [];

  if (tokens.length === 0) {
    logger.info(`[sendPush] user ${recipientUid} has no FCM tokens — skipping`);
    return { ok: false, sent: 0, failed: 0, skipped: 1, errors: ['no_tokens'] };
  }

  const validTokens = tokens
    .filter((t) => t && typeof t.token === 'string' && t.token.length > 0)
    .map((t) => t.token);

  if (validTokens.length === 0) {
    return { ok: false, sent: 0, failed: 0, skipped: validTokens.length, errors: ['no_valid_tokens'] };
  }

  // ── 2. Build notification payload ────────────────────────────────────────
  const notification = {
    title: resolvedTitle,
    body: resolvedBody,
  };

  const payload = {
    notification,
    data: {
      type: String(type),
      ...(link ? { link } : {}),
      ...(extraData ? Object.fromEntries(
        Object.entries(extraData)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [String(k), String(v)]),
      ) : {}),
    },
    // Android / Web default options
    android: {
      priority: 'high',
      notification: {
        channelId: 'viralata_main',
        icon: 'ic_notification',
        color: '#6B46C1',
      },
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      fcmOptions: {
        link: link || undefined,
      },
    },
  };

  // ── 3. Send to each token ─────────────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  const errors = [];

  // Process in parallel with a concurrency limit (FCM rate limits)
  const BATCH_SIZE = 50;
  for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
    const batch = validTokens.slice(i, i + BATCH_SIZE);

    if (dryRun) {
      logger.info(`[sendPush dry-run] would send to ${batch.length} tokens`, { notification, payload });
      sent += batch.length;
      continue;
    }

    const results = await Promise.allSettled(
      batch.map((token) =>
        messaging.send({ ...payload, token }).catch((err) => ({ token, error: err?.message || String(err) })),
      ),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (typeof result.value === 'object' && result.value.error) {
          // FCM returned an error for this token
          failed++;
          errors.push(result.value.error);
          logger.warn(`[sendPush] token send failed: ${result.value.error}`);
        } else {
          sent++;
        }
      } else {
        failed++;
        errors.push(String(result.reason));
      }
    }
  }

  // ── 4. Write to notifications collection (in-app notification center) ──
  const notificationsCol = db.collection('notifications');
  const notifDoc = notificationsCol.doc();
  await notifDoc.set({
    user_id: recipientUid,
    title: resolvedTitle,
    message: resolvedBody,
    type: String(type),
    link: link || null,
    actor_id: actorUid || null,
    actor_name: null, // resolved by caller if needed
    read: false,
    read_at: null,
    created_at: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
    created_at_ms: Date.now(),
  });

  logger.info(`[sendPush] ${type} → ${recipientUid}: sent=${sent}, failed=${failed}, skipped=${validTokens.length - sent - failed}`);

  return { ok: true, sent, failed, skipped: 0, errors: errors.length > 0 ? errors : undefined };
}

// ─── Public API ───────────────────────────────────────────────────────────────

module.exports = {
  NOTIFICATION_TYPE_META,
  ALLOWED_TYPES,
  validateInput,
  sendPushCore,
};
