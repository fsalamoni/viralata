/**
 * @fileoverview Core logic — lembrete de evento 24h antes (TASK-337).
 *
 * Extraída para permitir testes unitários sem dependência do Firebase
 * Functions runtime. A lógica pura está aqui; o wrapper `onSchedule`
 * fica em `eventReminderCron.js`.
 *
 * Handles:
 *   - community_events (TASK-337): eventos de comunidade
 *   - club_events (TASK-337):     eventos de abrigo/ONG
 *
 * RSVP collections:
 *   - community_event_rsvps  (community_events)
 *   - club_event_rsvps       (club_events)
 *
 * Feature flag: `community_event_detail_v1` (via feature_flags/{name})
 *
 * @see functions/eventReminderCron.js
 */

'use strict';

const crypto = require('crypto');

const NOTIFICATIONS_COLLECTION = 'notifications';
const DEDUP_COLLECTION = 'notification_dedup';
const NOTIF_TYPE = 'event_reminder';
const FEATURE_FLAG = 'community_event_detail_v1';

// ─── Main entry ─────────────────────────────────────────────────────────

/**
 * Executa varredura de eventos que começam entre agora e agora+25h.
 * Notifica participantes com RSVP confirmado via EVENT_REMINDER.
 *
 * @param {object} opts
 * @param {object} opts.db     - Firestore db instance
 * @param {object} opts.logger - Logger with info/error
 * @returns {Promise<{sent: number, skipped: number, errors: number, reason?: string}>}
 */
async function runEventReminder({ db, logger }) {
  const flagEnabled = await isFeatureEnabled(db, FEATURE_FLAG);
  if (!flagEnabled) {
    logger.info('eventReminderCron: feature flag off, skipping');
    return { sent: 0, skipped: 0, errors: 0, reason: 'flag_disabled' };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const windowEndIso = windowEnd.toISOString();

  logger.info('eventReminderCron: scanning window', { now: nowIso, windowEnd: windowEndIso });

  let totalSent = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // ── community_events ────────────────────────────────────────────────
  try {
    const communityEventsSnap = await db
      .collection('community_events')
      .where('starts_at', '>=', nowIso)
      .where('starts_at', '<=', windowEndIso)
      .get();

    if (!communityEventsSnap.empty) {
      logger.info('eventReminderCron: community_events found', { count: communityEventsSnap.size });

      for (const eventDoc of communityEventsSnap.docs) {
        const eventData = eventDoc.data();
        try {
          const result = await _processCommunityEvent(db, eventDoc.id, eventData, now, logger);
          totalSent += result.sent;
          totalSkipped += result.skipped;
          totalErrors += result.errors;
        } catch (err) {
          totalErrors++;
          logger.error('eventReminderCron: failed community event', { eventId: eventDoc.id, error: String(err) });
        }
      }
    }
  } catch (err) {
    logger.error('eventReminderCron: community_events query failed', { error: String(err) });
  }

  // ── club_events (collectionGroup: all clubs/*/events) ───────────────
  try {
    const clubEventsSnap = await db
      .collectionGroup('events')
      .where('starts_at', '>=', nowIso)
      .where('starts_at', '<=', windowEndIso)
      .get();

    if (!clubEventsSnap.empty) {
      logger.info('eventReminderCron: club_events found', { count: clubEventsSnap.size });

      for (const eventDoc of clubEventsSnap.docs) {
        const eventData = eventDoc.data();
        const eventPath = eventDoc.ref.path; // clubs/{clubId}/events/{eventId}
        const clubId = _extractClubId(eventPath);
        try {
          const result = await _processClubEvent(db, eventDoc.id, clubId, eventData, now, logger);
          totalSent += result.sent;
          totalSkipped += result.skipped;
          totalErrors += result.errors;
        } catch (err) {
          totalErrors++;
          logger.error('eventReminderCron: failed club event', { eventId: eventDoc.id, clubId, error: String(err) });
        }
      }
    }
  } catch (err) {
    logger.error('eventReminderCron: club_events collectionGroup query failed', { error: String(err) });
  }

  logger.info('eventReminderCron: done', { sent: totalSent, skipped: totalSkipped, errors: totalErrors });
  return { sent: totalSent, skipped: totalSkipped, errors: totalErrors };
}

// ─── community_events processor ────────────────────────────────────────

/**
 * @param {object} db
 * @param {string} eventId
 * @param {object} eventData
 * @param {Date} now
 * @param {object} logger
 */
async function _processCommunityEvent(db, eventId, eventData, now, logger) {
  // community_event_rsvps: { event_id, user_id, status }
  const rsvpsSnap = await db
    .collection('community_event_rsvps')
    .where('event_id', '==', eventId)
    .where('status', '==', 'confirmed')
    .get();

  if (rsvpsSnap.empty) return { sent: 0, skipped: 0, errors: 0 };

  return _fanOutEventReminder({
    db,
    eventId,
    eventTitle: eventData.title || 'Evento de comunidade',
    eventDateField: eventData.starts_at,
    link: `/comunidades/${eventData.community_id || ''}/eventos/${eventId}`,
    rsvpsSnap,
    now,
    logger,
    source: 'community',
  });
}

// ─── club_events processor ──────────────────────────────────────────────

/**
 * @param {object} db
 * @param {string} eventId
 * @param {string} clubId
 * @param {object} eventData
 * @param {Date} now
 * @param {object} logger
 */
async function _processClubEvent(db, eventId, clubId, eventData, now, logger) {
  // club_event_rsvps: { event_id, club_id, user_id, status }
  const rsvpsSnap = await db
    .collection('club_event_rsvps')
    .where('event_id', '==', eventId)
    .where('club_id', '==', clubId)
    .where('status', '==', 'confirmed')
    .get();

  if (rsvpsSnap.empty) return { sent: 0, skipped: 0, errors: 0 };

  return _fanOutEventReminder({
    db,
    eventId,
    eventTitle: eventData.title || 'Evento de abrigo',
    eventDateField: eventData.starts_at,
    link: `/abrigo/${clubId}/eventos/${eventId}`,
    rsvpsSnap,
    now,
    logger,
    source: 'club',
  });
}

// ─── Shared fan-out ────────────────────────────────────────────────────

/**
 * Fan-out de EVENT_REMINDER para participantes com RSVP confirmado.
 * Idempotente via dedup key (event_id + user_id + date).
 *
 * @param {object} opts
 * @param {object} opts.db
 * @param {string} opts.eventId
 * @param {string} opts.eventTitle
 * @param {string} opts.eventDateField  - starts_at value from Firestore (ISO string or Timestamp)
 * @param {string} opts.link
 * @param {object} opts.rsvpsSnap       - Firestore query snapshot
 * @param {Date}   opts.now
 * @param {object} opts.logger
 * @param {string} opts.source           - 'community' | 'club'
 */
async function _fanOutEventReminder({ db, eventId, eventTitle, eventDateField, link, rsvpsSnap, now, logger, source }) {
  const parsedDate = _parseDate(eventDateField);
  const formattedDate = parsedDate
    ? parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';

  const notificationTitle = '⏰ Lembrete: evento em breve!';
  const notificationMessage = eventTitle + (formattedDate ? ` — ${formattedDate}` : '');

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  const createdAt = new Date().toISOString();
  const createdAtMs = Date.now();

  for (const rsvpDoc of rsvpsSnap.docs) {
    const rsvp = rsvpDoc.data();
    const userUid = rsvp.user_id;
    if (!userUid) { skipped++; continue; }

    const dedupKey = _dedupKey('event_reminder', eventId, userUid, _toDateStr(now));

    try {
      const created = await _sendWithDedup(db, dedupKey, userUid, NOTIF_TYPE, notificationTitle, notificationMessage, link, eventId, createdAt, createdAtMs);
      if (created) sent++;
      else skipped++;
    } catch (err) {
      errors++;
      logger.error(`eventReminderCron: failed fan-out (${source})`, { eventId, userUid, error: String(err) });
    }
  }

  logger.info(`eventReminderCron: ${source} event processed`, { eventId, sent, skipped, errors });
  return { sent, skipped, errors };
}

// ─── Transaction ───────────────────────────────────────────────────────

/**
 * Transacional: cria dedup doc + notification doc.
 * @returns {Promise<boolean>} true = criada, false = já existia (suppressed)
 */
async function _sendWithDedup(db, dedupKey, userUid, type, title, message, link, eventId, createdAt, createdAtMs) {
  return db.runTransaction((t) => _doTransaction(t, db, dedupKey, userUid, type, title, message, link, eventId, createdAt, createdAtMs));
}

/**
 * @param {object} t    - Firestore transaction
 * @param {object} db   - Firestore db
 */
async function _doTransaction(t, db, dedupKey, userUid, type, title, message, link, eventId, createdAt, createdAtMs) {
  const dedupRef = db.collection(DEDUP_COLLECTION).doc(dedupKey);
  const fresh = await t.get(dedupRef);
  if (fresh.exists) return false;

  t.set(dedupRef, { sent_at: createdAt, sent_at_ms: createdAtMs, payload_type: type });

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

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Extrai clubId do path 'clubs/{clubId}/events/{eventId}'.
 */
function _extractClubId(eventPath) {
  const match = eventPath.match(/^clubs\/([^/]+)\/events\/[^/]+$/);
  return match ? match[1] : '';
}

function _dedupKey(prefix, ...parts) {
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
  if (value && typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function _toDateStr(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Feature flag via feature_flags/{name} (padrão do codebase).
 */
async function isFeatureEnabled(db, flagKey) {
  try {
    const snap = await db.collection('feature_flags').doc(flagKey).get();
    return snap.data()?.enabled === true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  runEventReminder,
  _processCommunityEvent,
  _processClubEvent,
  _fanOutEventReminder,
  _doTransaction,
  _sendWithDedup,
  _extractClubId,
  _dedupKey,
  _toDateStr,
  _parseDate,
  isFeatureEnabled,
  NOTIF_TYPE,
  FEATURE_FLAG,
  NOTIFICATIONS_COLLECTION,
  DEDUP_COLLECTION,
};
