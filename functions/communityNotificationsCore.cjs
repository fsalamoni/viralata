/**
 * @fileoverview Core logic — notificações de comunidade (TASK-336).
 *
 * Extraída para permitir testes unitários sem dependência do runtime
 * Firebase Functions (que requer firebase-functions/v2/firestore).
 * A lógica de trigger fica em `communityNotifications.js`; esta módulo
 * contém apenas a lógica pura testável.
 *
 * @see functions/communityNotifications.js
 */

'use strict';

const crypto = require('crypto');

const NOTIFICATIONS_COLLECTION = 'notifications';
const DEDUP_COLLECTION = 'notification_dedup';

// ─── Helpers idempotência ──────────────────────────────────────────────

function dedupId(prefix, ...parts) {
  return (
    prefix +
    ':' +
    crypto
      .createHash('sha256')
      .update(parts.filter(Boolean).join('|'))
      .digest('hex')
      .slice(0, 16)
  );
}

/**
 * Fan-out de notificação com dedup transacional.
 * @param {object} db - Firestore db instance
 * @param {object} opts
 * @returns {Promise<{created: number, suppressed: number}>}
 */
async function fanOutNotification(db, {
  dedupKey,
  type,
  title,
  message,
  link,
  recipientUids,
  actorId,
  actorName,
}) {
  if (!Array.isArray(recipientUids) || recipientUids.length === 0) {
    return { created: 0, suppressed: 0 };
  }

  const dedupRef = db.collection(DEDUP_COLLECTION).doc(dedupKey);
  const createdAt = new Date().toISOString();
  const createdAtMs = Date.now();

  await db.runTransaction(async (t) => {
    const fresh = await t.get(dedupRef);
    if (fresh.exists) return;
    t.set(dedupRef, { sent_at: createdAt, sent_at_ms: createdAtMs, payload_type: type });
    recipientUids.forEach((uid) => {
      const ref = db.collection(NOTIFICATIONS_COLLECTION).doc();
      t.set(ref, {
        user_id: uid,
        type,
        title: String(title || '').slice(0, 140),
        message: String(message || '').slice(0, 300),
        link: link || null,
        actor_id: actorId || null,
        actor_name: actorName || null,
        read: false,
        read_at: null,
        created_at: createdAt,
        created_at_ms: createdAtMs,
        dedup_key: dedupKey,
      });
    });
  });

  return { created: recipientUids.length, suppressed: 0 };
}

// ─── Buscar membros da comunidade ──────────────────────────────────────

async function getCommunityAdminUids(db, communityId) {
  const snap = await db
    .collection('community_members')
    .where('community_id', '==', communityId)
    .where('role', '==', 'admin')
    .get();
  return snap.docs.map((d) => d.id);
}

// ─── TRIGGER 1: onCreate community_posts ───────────────────────────────

async function runOnCommunityPostCreated(db, event) {
  const post = event.data?.data();
  if (!post) return { notified: 0 };

  const { community_id: communityId, author_id: authorId, author_name: authorName, text } = post;
  if (!communityId || !authorId) return { notified: 0 };

  const admins = await getCommunityAdminUids(db, communityId);
  // Não notifica o próprio autor se for admin
  const recipients = admins.filter((uid) => uid !== authorId);
  if (recipients.length === 0) return { notified: 0 };

  const dedupKey = dedupId('com_post', communityId, event.data.id, 'post_created');
  const postPreview = (text || '').slice(0, 80);
  const title = 'Novo post no mural da comunidade';
  const message = `${authorName || 'Um membro'} publicou: "${postPreview}..."`;
  const link = `/communities/${communityId}`;

  return fanOutNotification(db, {
    dedupKey,
    type: 'community_post_created',
    title,
    message,
    link,
    recipientUids: recipients,
    actorId: authorId,
    actorName: authorName || null,
  });
}

// ─── TRIGGER 2: onCreate community_post_likes ──────────────────────────

async function runOnCommunityPostLiked(db, event) {
  const like = event.data?.data();
  if (!like) return { notified: 0 };

  const { post_id: postId, user_id: likerId } = like;
  if (!postId || !likerId) return { notified: 0 };

  // Busca o post para obter o autor
  const postSnap = await db.collection('community_posts').doc(postId).get();
  if (!postSnap.exists) return { notified: 0 };
  const post = postSnap.data();

  // Não notifica auto-like
  if (post.author_id === likerId) return { notified: 0, reason: 'self_like' };

  const dedupKey = dedupId('com_like', postId, likerId, 'post_liked');
  const title = 'Seu post foi curtido';
  const message = `Alguém curtiu seu post no mural.`;
  const link = `/communities/${post.community_id}`;

  return fanOutNotification(db, {
    dedupKey,
    type: 'community_post_liked',
    title,
    message,
    link,
    recipientUids: [post.author_id].filter(Boolean),
    actorId: likerId,
    actorName: null,
  });
}

// ─── TRIGGER 3: onCreate community_post_comments ──────────────────────

async function runOnCommunityPostCommented(db, event) {
  const comment = event.data?.data();
  if (!comment) return { notified: 0 };

  const { post_id: postId, author_id: authorId, author_name: authorName, text } = comment;
  if (!postId || !authorId) return { notified: 0 };

  // Busca o post
  const postSnap = await db.collection('community_posts').doc(postId).get();
  if (!postSnap.exists) return { notified: 0 };
  const post = postSnap.data();

  // Não notifica auto-comment no próprio post
  const recipients = new Set();
  if (post.author_id && post.author_id !== authorId) recipients.add(post.author_id);

  // Notifica quem já comentou nesse post (para manter conversa)
  const existingComments = await db
    .collection('community_post_comments')
    .where('post_id', '==', postId)
    .get();
  existingComments.docs.forEach((d) => {
    const c = d.data();
    if (c.author_id && c.author_id !== authorId) recipients.add(c.author_id);
  });

  if (recipients.size === 0) return { notified: 0 };

  const dedupKey = dedupId('com_comment', postId, event.data.id, 'comment_created');
  const commentPreview = (text || '').slice(0, 80);
  const title = 'Novo comentário no seu post';
  const message = `${authorName || 'Um membro'} comentou: "${commentPreview}..."`;
  const link = `/communities/${post.community_id}`;

  return fanOutNotification(db, {
    dedupKey,
    type: 'community_post_commented',
    title,
    message,
    link,
    recipientUids: Array.from(recipients),
    actorId: authorId,
    actorName: authorName || null,
  });
}

// ─── TRIGGER 4: onCreate community_events ──────────────────────────────

async function runOnCommunityEventCreated(db, event) {
  const evt = event.data?.data();
  if (!evt) return { notified: 0 };

  const { community_id: communityId, created_by: creatorId, title: eventTitle } = evt;
  if (!communityId || !creatorId) return { notified: 0 };

  const admins = await getCommunityAdminUids(db, communityId);
  const recipients = admins.filter((uid) => uid !== creatorId);
  if (recipients.length === 0) return { notified: 0 };

  const dedupKey = dedupId('com_event', communityId, event.data.id, 'event_created');
  const title = 'Novo evento criado na comunidade';
  const message = `Evento: "${eventTitle || 'sem título'}"`;
  const link = `/communities/${communityId}/events`;

  return fanOutNotification(db, {
    dedupKey,
    type: 'community_event_created',
    title,
    message,
    link,
    recipientUids: recipients,
    actorId: creatorId,
    actorName: null,
  });
}

module.exports = {
  runOnCommunityPostCreated,
  runOnCommunityPostLiked,
  runOnCommunityPostCommented,
  runOnCommunityEventCreated,
  dedupId,
  fanOutNotification,
};
