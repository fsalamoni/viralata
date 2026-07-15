/**
 * @fileoverview Firestore triggers for push notification delivery (TASK-292).
 *
 * TASK-292: FCM v1 — Firebase Cloud Messaging.
 *
 * Three triggers:
 *   1. onAdoptionWorkflowCreated  → notify shelter admins
 *   2. onAdoptionWorkflowStatusUpdated → notify applicant (adopter)
 *   3. onKanbanTaskCreated        → notify assignee
 *
 * All triggers call `sendPushCore` via the callable URL to reuse the
 * existing IAM permissions (allUsers → callable → permission checks).
 * This avoids duplicating FCM logic and keeps IAM centralized.
 *
 * LGPD: notifications are transactional (Art.7 IV); feature flag
 * SHELTER_FCM_V1 (default OFF) gates all sends.
 *
 * @module pushNotificationTriggers
 * @see TASK-292
 */

'use strict';

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { getFunctions } = require('firebase-admin/functions');
const { getFirestore } = require('firebase-admin/firestore');
const { validateInput, sendPushCore } = require('./sendPushNotificationCore.cjs');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';
const FCM_FEATURE_FLAG_KEY = 'shelter_fcm_v1';

let _db = null;
function getDb() {
  if (!_db) _db = getFirestore(DATABASE_ID);
  return _db;
}

// ─── Feature flag helpers ─────────────────────────────────────────────────────

async function isFCMGloballyEnabled() {
  try {
    const snap = await getDb().collection('platform_config').doc('feature_flags').get();
    if (snap.exists) {
      return snap.data()?.[FCM_FEATURE_FLAG_KEY] === true;
    }
  } catch {
    // ignore
  }
  return false;
}

// ─── Helper: resolve shelter admins UIDs ──────────────────────────────────────

/**
 * Returns the UIDs of all shelter admins (role='admin'|'owner') for a club.
 * @param {string} clubId
 * @returns {Promise<string[]>}
 */
async function getShelterAdminUids(clubId) {
  const db = getDb();
  try {
    const membersSnap = await db
      .collection('club_members')
      .where('club_id', '==', clubId)
      .where('role', 'in', ['admin', 'owner'])
      .get();

    return membersSnap.docs.map((d) => d.data().user_id).filter(Boolean);
  } catch (err) {
    logger.warn('[pushTriggers] failed to get shelter admins:', err);
    return [];
  }
}

// ─── Helper: call sendPush callable (cross-function invocation) ───────────────

/**
 * Calls the sendPushNotification callable internally.
 * Falls back to direct sendPushCore if the callable URL is unavailable.
 *
 * @param {object} params
 * @param {string} params.recipientUid
 * @param {string} params.type
 * @param {string} [params.title]
 * @param {string} [params.body]
 * @param {string} [params.link]
 * @param {object} [params.data]
 * @param {string} [params.actorUid]
 */
async function dispatchPush({ recipientUid, type, title, body, link, data, actorUid }) {
  // Check feature flag before dispatch
  const enabled = await isFCMGloballyEnabled();
  if (!enabled) {
    logger.info(`[pushTriggers] SHELTER_FCM_V1 is OFF — skipping push to ${recipientUid}`);
    return;
  }

  const input = { recipientUid, type, title, body, link, data };
  const validation = validateInput(input);
  if (!validation.ok) {
    logger.warn(`[pushTriggers] invalid input: ${validation.error}`);
    return;
  }

  try {
    const functions = getFunctions();
    const callable = functions.httpsCallable('sendPushNotification');

    const result = await callable(input);
    logger.info(`[pushTriggers] dispatchPush → ${recipientUid} (${type}):`, result?.data || 'ok');
  } catch (err) {
    // If callable fails (e.g., IAM not set up yet), fall back to direct core
    logger.warn(`[pushTriggers] callable failed, falling back to direct sendPushCore: ${err?.message}`);
    try {
      const { getMessaging } = require('firebase-admin/messaging');
      await sendPushCore({
        db: getDb(),
        messaging: getMessaging(),
        logger,
        data: input,
        actorUid: actorUid || null,
      });
    } catch (coreErr) {
      logger.error('[pushTriggers] direct sendPushCore also failed:', coreErr);
    }
  }
}

// ─── Trigger 1: onAdoptionWorkflowCreated ─────────────────────────────────────

/**
 * Fires when a new application is submitted in adoption_workflow.
 * Notifies all shelter admins that a new application is pending review.
 *
 * onCreate `clubs/{clubId}/adoption_workflow/{applicationId}`
 */
exports.onAdoptionWorkflowCreated = onDocumentCreated(
  {
    document: 'clubs/{clubId}/adoption_workflow/{applicationId}',
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const { clubId, applicationId } = event.params;
    const data = event.data?.data();

    if (!data) return;

    try {
      const adminUids = await getShelterAdminUids(clubId);
      if (adminUids.length === 0) {
        logger.info(`[pushTriggers] no admins for club ${clubId} — skipping`);
        return;
      }

      const petName = data.pet_name || data.applicant_form?.pet_name || 'um pet';
      const applicantName = data.applicant_form?.name || 'Um candidato';

      await Promise.allSettled(
        adminUids.map((uid) =>
          dispatchPush({
            recipientUid: uid,
            type: 'adoption_workflow_created',
            title: 'Nova solicitação de adoção',
            body: `${applicantName} se candidatou para adotar ${petName}.`,
            link: `/shelter/${clubId}/applications/${applicationId}`,
            data: {
              clubId,
              applicationId,
              petId: data.pet_id || '',
              applicantUid: data.applicant_uid || '',
            },
            actorUid: data.applicant_uid || null,
          }),
        ),
      );

      logger.info(`[pushTriggers] adoption_workflow_created → ${adminUids.length} admins for ${applicationId}`);
    } catch (err) {
      logger.error('[pushTriggers] onAdoptionWorkflowCreated failed:', err);
    }
  },
);

// ─── Trigger 2: onAdoptionWorkflowStatusUpdated ───────────────────────────────

/**
 * Fires when the status of an adoption workflow changes.
 * Notifies the applicant (adopter) of the status change.
 *
 * onUpdate `clubs/{clubId}/adoption_workflow/{applicationId}`
 *
 * Skips: first save (no before snapshot), same status, or terminal statuses
 * that already generated a notification.
 */
exports.onAdoptionWorkflowStatusUpdated = onDocumentUpdated(
  {
    document: 'clubs/{clubId}/adoption_workflow/{applicationId}',
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const { clubId, applicationId } = event.params;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    const oldStatus = before.status;
    const newStatus = after.status;

    // Skip if status didn't actually change
    if (oldStatus === newStatus) return;

    // Skip terminal statuses (notification sent at adoption_completed or final rejection)
    const TERMINAL = ['adoption_completed', 'rejected', 'cancelled', 'withdrawn'];
    if (TERMINAL.includes(newStatus)) return;

    const applicantUid = after.applicant_uid;
    if (!applicantUid) return;

    try {
      // Status labels for notification body
      const STATUS_LABELS = {
        applied: 'recebida',
        under_review: 'em análise',
        approved: 'aprovada — aguardando assinatura do termo',
        adoption_completed: 'finalizada',
        rejected: 'recusada',
        cancelled: 'cancelada',
        withdrawn: 'desistida',
      };

      const statusLabel = STATUS_LABELS[newStatus] || newStatus;
      const petName = after.pet_name || after.applicant_form?.pet_name || 'o pet';

      await dispatchPush({
        recipientUid: applicantUid,
        type: 'adoption_workflow_status',
        title: `Status da adoção atualizado`,
        body: `A sua solicitação para adotar ${petName} está: ${statusLabel}.`,
        link: `/my-adoptions/${applicationId}`,
        data: {
          clubId,
          applicationId,
          oldStatus,
          newStatus,
          petId: after.pet_id || '',
        },
        actorUid: null, // system trigger
      });

      logger.info(`[pushTriggers] adoption_workflow_status → ${applicantUid}: ${oldStatus} → ${newStatus}`);
    } catch (err) {
      logger.error('[pushTriggers] onAdoptionWorkflowStatusUpdated failed:', err);
    }
  },
);

// ─── Trigger 3: onKanbanTaskCreated ──────────────────────────────────────────

/**
 * Fires when a new kanban task is created and assigned to someone.
 * Notifies the assignee.
 *
 * onCreate `clubs/{clubId}/kanban_tasks/{taskId}`
 *
 * Skips: tasks without an assignee_uid.
 */
exports.onKanbanTaskCreated = onDocumentCreated(
  {
    document: 'clubs/{clubId}/kanban_tasks/{taskId}',
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const { clubId, taskId } = event.params;
    const data = event.data?.data();

    if (!data) return;

    const assigneeUid = data.assignee_uid;
    if (!assigneeUid) return; // Unassigned task — skip

    try {
      const taskTitle = data.title || data.description || 'Nova tarefa';
      const taskType = data.type || 'tarefa';
      const truncatedTitle = String(taskTitle).slice(0, 80);

      await dispatchPush({
        recipientUid: assigneeUid,
        type: 'kanban_task_created',
        title: `Nova ${taskType}: ${truncatedTitle}`,
        body: `Uma tarefa foi atribuída a você no abrigo. Verifique os detalhes e o prazo.`,
        link: `/shelter/${clubId}/kanban`,
        data: {
          clubId,
          taskId,
          taskType: data.type || '',
          dueDate: data.due_date || '',
        },
        actorUid: data.created_by_uid || null,
      });

      logger.info(`[pushTriggers] kanban_task_created → ${assigneeUid} for task ${taskId}`);
    } catch (err) {
      logger.error('[pushTriggers] onKanbanTaskCreated failed:', err);
    }
  },
);
