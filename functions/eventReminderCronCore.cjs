/**
 * @fileoverview Core logic — lembrete de evento 24h antes (TASK-337).
 *
 * Extraída para permitir testes unitários sem dependência do Firebase
 * Functions runtime. A lógica pura está aqui; o wrapper `onSchedule`
 * fica em `eventReminderCron.js`.
 *
 * @see functions/eventReminderCron.js
 */

'use strict';

const crypto = require('crypto');

const NOTIFICATIONS_COLLECTION = 'notifications';
const DEDUP_COLLECTION = 'notification_dedup';
const NOTIF_TYPE = 'event_reminder';
const FEATURE_FLAG = 'community_event_detail_v1';

/**
 * @param {object} opts
 * @param {object} opts.db       - Firestore db instance
 * @param {object} opts.logger   - Logger with info/error
 * @returns {Promise<{sent: number, skipped: number, errors: number, reason?: string}>}
 */
async function runEventReminder({ db, logger }) {
  // Flag check
  const flagEnabled = await isFeatureEnabled(db, FEATURE_FLAG);
  if (!flagEnabled) {
    logger.info('eventReminderCron: feature flag off, skipping');
    return { sent: 0, skipped: 0, errors: 0, reason: 'flag_disabled' };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  // Buscar eventos community_events no intervalo
  const eventsSnap = await db
    .collection('community_events')
    .where('event_date', '>=', now.toISOString())
    .where('event_date', '<=', windowEnd.toISOString())
    .get();

  if (eventsSnap.empty) {
    logger.info('eventReminderCron: no events in 24h window');
    return { sent: 0, skipped: 0, errors: 0 };
  }

  let totalSent = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const eventDoc of eventsSnap.docs) {
    const eventData = eventDoc.data();
    const eventId = eventDoc.id;

    try {
      const result = await _processEvent(db, eventId, eventData, now, logger);
      totalSent += result.sent;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    } catch (err) {
      totalErrors++;
      logger.error('eventReminderCron: failed to process event', {
        eventId,
        error: String(err),
      });
    }
  }

  return { sent: totalSent, skipped: totalSkipped, errors: totalErrors };
}

async function _processEvent(db, eventId, eventData, now, logger) {
  // Buscar RSVPs confirmados
  const rsvpsSnap = await db
    .collection('event_rsvps')
    .where('event_id', '==', eventId)
    .where('status', '==', 'confirmed')
    .get();

  if (rsvpsSnap.empty) {
    return { sent: 0, skipped: 0, errors: 0 };
  }

  const eventTitle = eventData.title || 'Evento';
  const eventDate = _parseDate(eventData.event_date);
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    : '';

  const notificationTitle = '⏰ Lembrete: evento amanhã!';
  const notificationMessage = eventTitle + (formattedDate ? ` — ${formattedDate}` : '');

  // Determinar link do evento
  const communityId = eventData.community_id || '';
  const link = communityId
    ? `/comunidades/${communityId}/eventos/${eventId}`
    : `/eventos/${eventId}`;

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  const createdAt = new Date().toISOString();
  const createdAtMs = Date.now();

  for (const rsvpDoc of rsvpsSnap.docs) {
    const rsvp = rsvpDoc.data();
    const userUid = rsvp.user_uid;
    if (!userUid) { skipped++; continue; }

    const dedupKey = _dedupId('event_reminder', eventId, userUid, _toDateStr(now));

    try {
      const created = await _sendWithDedup(
        db,
        dedupKey,
        userUid,
        NOTIF_TYPE,
        notificationTitle,
        notificationMessage,
        link,
        eventId,
        createdAt,
        createdAtMs,
      );
      if (created) sent++;
      else skipped++;
    } catch (err) {
      errors++;
      logger.error('eventReminderCron: failed to send notification', {
        eventId,
        userUid,
        error: String(err),
      });
    }
  }

  return { sent, skipped, errors };
}

/**
 * Corpo transacional — extraído para permitir testes unitários.
 * Recebe o objeto `t` da transação diretamente.
 *
 * @param {object} t         - Firestore transaction object
 * @param {object} db        - Firestore db instance
 * @param {string} dedupKey  - Dedup document ID
 * @param {string} userUid   - Recipient user ID
 * @param {string} type      - Notification type
 * @param {string} title     - Notification title
 * @param {string} message   - Notification message
 * @param {string|null} link - Notification link
 * @param {string} eventId   - Source event ID
 * @param {string} createdAt - ISO timestamp
 * @param {number} createdAtMs - Unix ms timestamp
 * @returns {Promise<boolean>} true = criada, false = já existia
 */
async function _doTransaction(
  t,
  db,
  dedupKey,
  userUid,
  type,
  title,
  message,
  link,
  eventId,
  createdAt,
  createdAtMs,
) {
  const dedupRef = db.collection(DEDUP_COLLECTION).doc(dedupKey);
  const fresh = await t.get(dedupRef);
  if (fresh.exists) return false;

  t.set(dedupRef, {
    sent_at: createdAt,
    sent_at_ms: createdAtMs,
    payload_type: type,
  });

  const notifRef = db.collection(NOTIFICATIONS_COLLECTION).doc();
  t.set(notifRef, {
    user_id: userUid,
    type,
    title: String(title || '').slice(0, 140),
    message: String(message || '').slice(0, 300),
    link: link || null,
    actor_id: null,
    actor_name: null,
    event_id: eventId,
    read: false,
    read_at: null,
    created_at: createdAt,
    created_at_ms: createdAtMs,
    dedup_key: dedupKey,
  });

  return true;
}

/**
 * Grava notificação apenas se a dedup key ainda não existir (transação).
 * @returns {Promise<boolean>} true = criada, false = já existia (suppressed)
 */
async function _sendWithDedup(
  db,
  dedupKey,
  userUid,
  type,
  title,
  message,
  link,
  eventId,
  createdAt,
  createdAtMs,
) {
  return db.runTransaction((t) => _doTransaction(
    t, db, dedupKey, userUid, type, title, message, link, eventId, createdAt, createdAtMs,
  ));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function _dedupId(prefix, ...parts) {
  return (
    prefix +
    ':' +
    crypto
      .createHash('sha256')
      .update(parts.filter(Boolean).join('|'))
      .digest('hex')
      .slice(0, 24)
  );
}

function _parseDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function _toDateStr(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function isFeatureEnabled(db, flagKey) {
  try {
    const snap = await db.collection('platform_settings').doc('flags').get();
    const flags = snap.data()?.feature_flags || {};
    return flags[flagKey] === true;
  } catch (_) {
    return false;
  }
}

module.exports = { runEventReminder, _doTransaction, _dedupId, _toDateStr, _parseDate };
