/**
 * @fileoverview sendPushNotification — Cloud Function callable v2 (TASK-292).
 *
 * Envia push notification FCM para o usuário recipientUid.
 * Chamado internamente por outros Cloud Functions (triggers Firestore) ou
 * diretamente pela UI admin (via callable).
 *
 * Feature flag: SHELTER_FCM_V1 (default OFF) — todas as chamadas verificam.
 *
 * LGPD: transactional notification (Art.7 IV); feature flag gates sends.
 * Audit log: token sends written to email_delivery_log with type='push'.
 *
 * @see TASK-292
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');
const { validateInput, sendPushCore } = require('./sendPushNotificationCore.cjs');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

/** Feature flag key — must match SHELTER_FCM_V1 in constants.js */
const FCM_FEATURE_FLAG_KEY = 'shelter_fcm_v1';

/**
 * Checks if the FCM feature flag is enabled for the recipient's shelter.
 * Falls back to checking a global platform flags doc.
 *
 * @param {string} recipientUid
 * @returns {Promise<boolean>}
 */
async function isFCMEnabled(recipientUid) {
  const db = getFirestore(DATABASE_ID);

  // 1. Check global platform flags
  try {
    const globalFlagSnap = await db.collection('platform_config').doc('feature_flags').get();
    if (globalFlagSnap.exists) {
      const flags = globalFlagSnap.data();
      if (flags[FCM_FEATURE_FLAG_KEY] === true) return true;
      if (flags[FCM_FEATURE_FLAG_KEY] === false) return false;
    }
  } catch {
    // ignore — check shelter-level next
  }

  // 2. Check shelter-level flags (clubs/{clubId}/feature_flags)
  try {
    // Try to get shelter club from user's clubs[]
    const userSnap = await db.collection('users').doc(recipientUid).get();
    if (userSnap.exists) {
      const userData = userSnap.data();
      const clubIds = userData.clubs || [];
      for (const clubId of clubIds) {
        const shelterFlagSnap = await db.collection('clubs').doc(clubId).collection('_meta').doc('feature_flags').get();
        if (shelterFlagSnap.exists) {
          const flags = shelterFlagSnap.data();
          if (flags[FCM_FEATURE_FLAG_KEY] === true) return true;
          if (flags[FCM_FEATURE_FLAG_KEY] === false) return false;
        }
      }
    }
  } catch {
    // ignore
  }

  // Default: disabled (feature flag OFF by default)
  return false;
}

/**
 * sendPushNotification — callable Cloud Function v2.
 *
 * Body (data):
 *   - recipientUid: string (required)
 *   - type: string (required) — adoption_workflow_created | adoption_workflow_status |
 *                                kanban_task_created | kanban_task_due | kanban_task_overdue |
 *                                milestone_due | milestone_overdue |
 *                                volunteer_shift_reminder | post_adoption_returned
 *   - title?: string (optional, max 140 chars)
 *   - body?: string (optional, max 300 chars)
 *   - link?: string (optional, deep link URL)
 *   - data?: Record<string, string> (optional, extra key-value pairs for the client)
 *
 * Requires: authenticated caller.
 *
 * Returns: { ok, sent, failed, skipped }
 */
exports.sendPushNotification = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;

    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Callable requer autenticação.');
    }

    const { recipientUid, type, title, body, link, data: extraData } = request.data || {};

    // ── Validate ─────────────────────────────────────────────────────────────
    const validation = validateInput({ recipientUid, type, title, body, link, data: extraData });
    if (!validation.ok) {
      throw new HttpsError('invalid-argument', validation.error);
    }

    // ── Feature flag check ──────────────────────────────────────────────────
    const enabled = await isFCMEnabled(recipientUid);
    if (!enabled) {
      logger.info(`[sendPush] feature flag OFF for ${recipientUid} — skipped`);
      return { ok: false, reason: 'feature_disabled', sent: 0, failed: 0, skipped: 1 };
    }

    // ── Send ─────────────────────────────────────────────────────────────────
    const db = getFirestore(DATABASE_ID);
    const messaging = getMessaging();

    try {
      const result = await sendPushCore({
        db,
        messaging,
        logger,
        data: { recipientUid, type, title, body, link, data: extraData },
        actorUid: callerUid,
      });

      return result;
    } catch (err) {
      logger.error('[sendPush] unexpected error:', err);
      throw new HttpsError('internal', 'Erro interno ao enviar notificação push.', err?.message || String(err));
    }
  },
);
