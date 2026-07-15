/**
 * @fileoverview Core puro de volunteerHoursCron.js — sem dependência
 * do firebase-functions. Toda a lógica testável vive aqui.
 *
 * @see volunteerHoursCron.js
 */

'use strict';

const { FieldValue } = require('firebase-admin/firestore');

let _db = null;
let _messaging = null;

function getDb() {
  if (!_db) {
    try {
      const { getFirestore } = require('firebase-admin/firestore');
      _db = getFirestore('viralata');
    } catch {
      _db = null;
    }
  }
  return _db;
}

function getMessaging() {
  if (_messaging !== null) return _messaging;
  try {
    const { getMessaging: _getMessaging } = require('firebase-admin/messaging');
    _messaging = _getMessaging();
  } catch {
    _messaging = null;
  }
  return _messaging;
}

const REGION = 'southamerica-east1';

// ─── Helpers ──────────────────────────────────────────────────────────────

const FEATURE_FLAG_HOURS = 'shelter_volunteer_digest_v1';

let _featureFlagsCache = null;

async function isFeatureEnabled(db, flagName) {
  if (_featureFlagsCache !== null) return !!_featureFlagsCache[flagName];
  try {
    const snap = await db.collection('feature_flags').doc(flagName).get();
    _featureFlagsCache = snap.data() || {};
    return !!_featureFlagsCache[flagName];
  } catch {
    return false;
  }
}

function _hoursFromCheck(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const t1 = checkIn instanceof Date ? checkIn.getTime() : new Date(checkIn).getTime();
  const t2 = checkOut instanceof Date ? checkOut.getTime() : new Date(checkOut).getTime();
  if (isNaN(t1) || isNaN(t2) || t2 <= t1) return 0;
  return Math.round(((t2 - t1) / (1000 * 60 * 60)) * 100) / 100;
}

function _toDateStr(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _isToday(date) {
  return _toDateStr(date) === _toDateStr(new Date());
}

// ─── 1. Aggregate Volunteer Hours ────────────────────────────────────────

/**
 * Soma horas do voluntário a partir de todas as participações.
 * Recebe `db` injetado para permitir mocking.
 */
async function computeVolunteerHours(db, uid) {
  const participationsSnap = await db
    .collectionGroup('volunteer_participations')
    .where('volunteer_uid', '==', uid)
    .where('status', 'in', ['completed', 'checked_in'])
    .get();

  let totalHours = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  let monthlyHours = 0;

  for (const doc of participationsSnap.docs) {
    const data = doc.data();
    const hours = _hoursFromCheck(data.check_in, data.check_out);
    totalHours += hours;

    if (data.event_date) {
      const ed = new Date(data.event_date);
      if (!isNaN(ed.getTime()) && ed.getFullYear() === currentYear && ed.getMonth() === currentMonth) {
        monthlyHours += hours;
      }
    }
  }

  return {
    total: Math.round(totalHours * 100) / 100,
    monthly: Math.round(monthlyHours * 100) / 100,
  };
}

/**
 * Core de agregação de horas. Recebe `{ db, logger }` injetados.
 */
async function runAggregateVolunteerHours({ db, logger = { info: () => {}, error: () => {} } } = {}) {
  const database = db || getDb();
  if (!database) return { skipped: true, reason: 'no_db' };

  const flagEnabled = await isFeatureEnabled(database, FEATURE_FLAG_HOURS);
  if (!flagEnabled) {
    logger.info('aggregateVolunteerHours: flag off, skipping');
    return { skipped: true, reason: 'flag_disabled' };
  }

  const profilesSnap = await database.collectionGroup('volunteer_profile')
    .where('__active__', '==', true)
    .limit(200)
    .get();

  if (profilesSnap.empty) {
    logger.info('aggregateVolunteerHours: no active profiles found');
    return { processed: 0, errors: 0, skipped: false };
  }

  let processed = 0;
  let errors = 0;

  for (const profileDoc of profilesSnap.docs) {
    const parts = profileDoc.ref.path.split('/');
    const uid = parts[1];
    if (!uid || parts[0] !== 'users') continue;

    try {
      const { total, monthly } = await computeVolunteerHours(database, uid);
      await profileDoc.ref.update({
        hours_logged_total: total,
        monthly_hours: monthly,
        last_hours_aggregated_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      });
      processed++;
    } catch (err) {
      errors++;
      logger.error('aggregateVolunteerHours: failed for uid', { uid, error: String(err) });
    }
  }

  logger.info('aggregateVolunteerHours: done', { processed, errors });
  return { processed, errors, skipped: false };
}

// ─── 2. Shift Reminders ───────────────────────────────────────────────────

const NOTIF_TYPE_SHIFT_REMINDER = 'shift_reminder';
const DEDUP_COLLECTION = 'notification_dedup';

/**
 * Envia push FCM direto ao voluntário.
 */
async function sendFcmPush(uid, payload, dbOverride) {
  const messaging = getMessaging();
  if (!messaging) return { ok: false, reason: 'messaging_not_available' };

  try {
    const db = dbOverride || getDb();
    if (!db) return { ok: false, reason: 'no_db' };
    const userDoc = await db.collection('users').doc(uid).get();
    const tokens = userDoc.data()?.fcm_tokens || [];
    if (tokens.length === 0) return { ok: false, reason: 'no_tokens' };

    const message = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: NOTIF_TYPE_SHIFT_REMINDER,
        link: payload.link || '',
        club_id: payload.club_id || '',
        participation_id: payload.participation_id || '',
      },
      android: {
        priority: 'high',
        notification: { channel_id: 'shift_reminders' },
      },
      apns: {
        payload: {
          aps: { badge: 1, sound: 'default' },
        },
      },
    };

    const result = await messaging.sendEachForMulticast(message);
    return {
      ok: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

/**
 * Core de lembrete de turnos. Recebe `{ db, logger }` injetados.
 */
async function runSendShiftReminders({ db, logger = { info: () => {}, error: () => {} } } = {}) {
  const database = db || getDb();
  if (!database) return { skipped: true, reason: 'no_db' };

  const flagEnabled = await isFeatureEnabled(database, FEATURE_FLAG_HOURS);
  if (!flagEnabled) {
    logger.info('sendShiftReminders: flag off, skipping');
    return { skipped: true, reason: 'flag_disabled' };
  }

  const today = _toDateStr(new Date());

  const participationsSnap = await database
    .collectionGroup('volunteer_participations')
    .where('event_date', '==', today)
    .where('status', 'in', ['scheduled', 'approved'])
    .get();

  if (participationsSnap.empty) {
    logger.info('sendShiftReminders: no participations for today');
    return { sent: 0, skipped: 0, errors: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of participationsSnap.docs) {
    const data = doc.data();
    const uid = data.volunteer_uid;
    const participationId = doc.id;

    if (!uid) { skipped++; continue; }

    const parts = doc.ref.path.split('/');
    const clubId = parts[1];

    const dedupKey = `shift-reminder:${uid}:${participationId}:${today}`;
    const dedupRef = database.collection(DEDUP_COLLECTION).doc(dedupKey);

    try {
      const dedupDoc = await dedupRef.get();
      if (dedupDoc.exists) { skipped++; continue; }

      const eventLabel = data.event_label || data.event_type || 'turno';
      const scheduledTime = data.scheduled_time || '';
      const payload = {
        title: '⏰ Lembrete de turno hoje',
        body: `Você tem um turno "${eventLabel}"${scheduledTime ? ` às ${scheduledTime}` : ''}. Bateu ponto pelo app!`,
        link: `/abrigo/${clubId}/voluntarios/participacoes/${participationId}`,
        club_id: clubId,
        participation_id: participationId,
      };

      await dedupRef.set({
        sent_at: new Date().toISOString(),
        sent_at_ms: Date.now(),
        type: NOTIF_TYPE_SHIFT_REMINDER,
      }, { merge: true });

      await database.collection('notifications').add({
        user_id: uid,
        type: NOTIF_TYPE_SHIFT_REMINDER,
        club_id: clubId,
        title: payload.title,
        message: payload.body,
        link: payload.link,
        read: false,
        read_at: null,
        created_at: new Date().toISOString(),
        created_at_ms: Date.now(),
        dedup_key: dedupKey,
      });

      await sendFcmPush(uid, payload, database);

      // Email (transactional — no consent needed for shift reminders)
      try {
        const { sendShiftReminderEmail } = require('./volunteerEmails');
        await sendShiftReminderEmail(uid, today, eventLabel);
      } catch {
        // Email failure is non-blocking
      }

      sent++;
    } catch (err) {
      errors++;
      logger.error('sendShiftReminders: failed for participation', {
        participation_id: participationId,
        error: String(err),
      });
    }
  }

  logger.info('sendShiftReminders: done', { sent, skipped, errors });
  return { sent, skipped, errors };
}

// ─── Exports ─────────────────────────────────────────────────────────────

/**
 * Override de dependências (para testes).
 * Chamar antes dos testes: setOverrides({ db: mockDb }).
 */
function _setOverrides({ db, messaging } = {}) {
  if (db !== undefined) _db = db;
  if (messaging !== undefined) _messaging = messaging;
}
function _resetOverrides() {
  _db = null;
  _messaging = null;
  _featureFlagsCache = null;
}

function _setMessaging(m) { _messaging = m; }

module.exports = {
  runAggregateVolunteerHours,
  runSendShiftReminders,
  computeVolunteerHours,
  _hoursFromCheck,
  _toDateStr,
  _isToday,
  FEATURE_FLAG_HOURS,
  NOTIF_TYPE_SHIFT_REMINDER,
  DEDUP_COLLECTION,
  REGION,
  _setOverrides,
  _resetOverrides,
  _setMessaging,
};
