/**
 * @fileoverview Cloud Function triggers: notificações de comunidade (TASK-336).
 *
 * Quatro triggers reativos seguindo o padrão Core/Trigger.
 * A lógica pura está em `communityNotificationsCore.cjs`; esta módulo
 * amarra os handlers `onDocumentCreated` do Firebase Functions v2.
 *
 * Triggers:
 *   1. onCommunityPostCreated
 *      → onCreate community_posts/{postId}
 *      → Notifica admins da comunidade (exceto o autor).
 *
 *   2. onCommunityPostLiked
 *      → onCreate community_post_likes/{likeId}
 *      → Notifica o autor do post (exceto auto-like).
 *
 *   3. onCommunityPostCommented
 *      → onCreate community_post_comments/{commentId}
 *      → Notifica o autor do post e outros comentadores (exceto auto-comment).
 *
 *   4. onCommunityEventCreated
 *      → onCreate community_events/{eventId}
 *      → Notifica admins da comunidade (exceto o criador).
 *
 * Idempotência: dedup determinístico via sha256(parts).slice(0, 16)
 * dentro de transação Firestore.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 4-int
 * @see functions/communityNotificationsCore.cjs
 */

'use strict';

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const {
  runOnCommunityPostCreated,
  runOnCommunityPostLiked,
  runOnCommunityPostCommented,
  runOnCommunityEventCreated,
} = require('./communityNotificationsCore');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

const db = getFirestore(DATABASE_ID);
const DLQ_COLLECTION = 'dlq_community_notifications';

async function sendToDLQ(triggerName, payload, error) {
  try {
    await db.collection(DLQ_COLLECTION).add({
      trigger: triggerName,
      payload,
      error: { message: error?.message || String(error), stack: error?.stack || null },
      failed_at: new Date().toISOString(),
      retry_count: 0,
    });
  } catch (_) {
    // best-effort
  }
}

// ─── Safe wrappers ──────────────────────────────────────────────────────

async function runOnCommunityPostCreatedSafe(event) {
  try { return await runOnCommunityPostCreated(db, event); }
  catch (e) { await sendToDLQ('onCommunityPostCreated', { postId: event.data?.id }, e); throw e; }
}

async function runOnCommunityPostLikedSafe(event) {
  try { return await runOnCommunityPostLiked(db, event); }
  catch (e) { await sendToDLQ('onCommunityPostLiked', { likeId: event.data?.id }, e); throw e; }
}

async function runOnCommunityPostCommentedSafe(event) {
  try { return await runOnCommunityPostCommented(db, event); }
  catch (e) { await sendToDLQ('onCommunityPostCommented', { commentId: event.data?.id }, e); throw e; }
}

async function runOnCommunityEventCreatedSafe(event) {
  try { return await runOnCommunityEventCreated(db, event); }
  catch (e) { await sendToDLQ('onCommunityEventCreated', { eventId: event.data?.id }, e); throw e; }
}

// ─── Exports (handlers exportados para index.js) ────────────────────────

exports.onCommunityPostCreated = onDocumentCreated(
  { document: 'community_posts/{postId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityPostCreatedSafe(event); }
    catch (e) { logger.error('onCommunityPostCreated error', e); }
  },
);

exports.onCommunityPostLiked = onDocumentCreated(
  { document: 'community_post_likes/{likeId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityPostLikedSafe(event); }
    catch (e) { logger.error('onCommunityPostLiked error', e); }
  },
);

exports.onCommunityPostCommented = onDocumentCreated(
  { document: 'community_post_comments/{commentId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityPostCommentedSafe(event); }
    catch (e) { logger.error('onCommunityPostCommented error', e); }
  },
);

exports.onCommunityEventCreated = onDocumentCreated(
  { document: 'community_events/{eventId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityEventCreatedSafe(event); }
    catch (e) { logger.error('onCommunityEventCreated error', e); }
  },
);

// ─── Core exports (para testes unitários — usa communityNotificationsCore.cjs) ──
module.exports = {
  runOnCommunityPostCreated: runOnCommunityPostCreated,
  runOnCommunityPostLiked: runOnCommunityPostLiked,
  runOnCommunityPostCommented: runOnCommunityPostCommented,
  runOnCommunityEventCreated: runOnCommunityEventCreated,
};
