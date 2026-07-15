/**
 * @fileoverview Cloud Function triggers: módulo de voluntários (Fase 13).
 *
 * Seis triggers reativos + helpers de idempotência/DLQ, mais um cron
 * opcional de agregação de horas. Padrão de design: o handler de
 * lógica (testável sem `firebase-functions`) fica aqui; a amarração
 * com os triggers (v2) é feita em `functions/index.js` (mesmo padrão
 * de `adminAlerts.js`).
 *
 * Triggers:
 *   1. propagateVolunteerProfileSnapshot
 *      → onUpdate users/{uid}/volunteer_profile/main
 *      → Propaga campos de exibição do perfil para todos os docs de
 *        roster em que o voluntário aparece (collectionGroup).
 *
 *   2. notifyAdminOnNewVolunteer
 *      → onCreate clubs/{clubId}/volunteers/{volunteerUid}
 *      → Notifica todos os admins/owners do abrigo.
 *
 *   3. notifyVolunteerOnStatusChange
 *      → onUpdate clubs/{clubId}/volunteers/{volunteerUid}
 *      → Dispara APENAS quando `status` muda.
 *
 *   4. notifyAdminOnNewParticipation
 *      → onCreate clubs/{clubId}/volunteer_participations/{participationId}
 *      → Notifica admins do abrigo.
 *
 *   5. notifyOnCheckInOut
 *      → onUpdate clubs/{clubId}/volunteer_participations/{participationId}
 *      → Dispara APENAS quando `check_in` ou `check_out` mudam.
 *
 *   6. onVolunteerParticipationCreated (TASK-269)
 *      → onCreate clubs/{clubId}/volunteer_participations/{participationId}
 *      → Notifica o próprio voluntário: FCM + email + calendar + audit log.
 *
 * Idempotência:
 *   Cada notificação gera um `dedup_id` determinístico:
 *     sha256(prefix + '|' + parts).slice(0, 16)
 *   O id é gravado em `notification_dedup/{dedupId}` dentro de uma
 *   transação. Se o doc já existe, o envio é suprimido. Previne
 *   double-send em caso de retry do trigger.
 *
 * DLQ:
 *   Qualquer falha de processamento vai para
 *   `dlq_volunteer_notifications/{autoId}` com payload + erro. Não
 *   usa `await sendToDLQ` para capturar o erro do trigger — só para
 *   enriquecer o log. O Firebase já faz retry automático do trigger.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13
 * @see functions/adminAlerts.js (mesmo padrão Core/Trigger)
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');
const _admin = require('firebase-admin');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}
const db = getFirestore();

let _logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function setLogger(logger) {
  if (logger && typeof logger.info === 'function') {
    _logger = logger;
  }
}

/**
 * Injeta um mock de messaging (para testes). Use no beforeAll do test.
 */
let _messagingOverride = null;
function setMessagingOverride(messaging) {
  _messagingOverride = messaging;
}

/** Retorna a instância de messaging (mockada em teste ou real em produção). */
function _getMessaging() {
  if (_messagingOverride) return _messagingOverride;
  const admin = _admin;
  if (!admin.apps.length) admin.initializeApp();
  return admin.messaging();
}

const DEDUP_COLLECTION = 'notification_dedup';
const DLQ_COLLECTION = 'dlq_volunteer_notifications';
const NOTIFICATIONS_COLLECTION = 'notifications';

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

/**
 * Gera id determinístico pra idempotência. Mesmo input → mesmo id.
 * Inclui um timestamp com granularidade de dia (YYYY-MM-DD) pra
 * permitir reenvio se o admin quiser (e o `parts` incluir a data).
 */
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
 * Grava evento no DLQ. Best-effort: erro do DLQ é logado mas não
 * propaga (não queremos mascarar a falha original).
 */
async function sendToDLQ(triggerName, payload, error) {
  try {
    await db.collection(DLQ_COLLECTION).add({
      trigger: triggerName,
      payload,
      error: {
        message: error?.message || String(error),
        stack: error?.stack || null,
      },
      failed_at: new Date().toISOString(),
      retry_count: 0,
    });
    _logger.error(`volunteerTriggers: ${triggerName} sent to DLQ`, {
      error: error?.message,
    });
  } catch (dlqErr) {
    _logger.error(`volunteerTriggers: ${triggerName} DLQ write failed`, {
      original: String(error),
      dlq: String(dlqErr),
    });
  }
}

/**
 * Cria uma notificação por recipient, com dedup transacional.
 * Retorna true se a notificação foi criada, false se foi suprimida
 * por duplicata.
 *
 * @param {string} dedupKey - chave determinística (sem prefixo)
 * @param {object} payload - {type, club_id, title, body, link?, actor_id?}
 * @param {string[]} recipientUids - uids dos destinatários
 */
async function createNotificationForRecipients(dedupKey, payload, recipientUids) {
  if (!Array.isArray(recipientUids) || recipientUids.length === 0) {
    return { created: 0, suppressed: 0 };
  }

  const dedupRef = db.collection(DEDUP_COLLECTION).doc(dedupKey);

  // Checagem rápida (best-effort) fora da transação
  const dedupDoc = await dedupRef.get();
  if (dedupDoc.exists) {
    _logger.info('volunteerTriggers: dedup hit, skipping', { dedupKey });
    return { created: 0, suppressed: recipientUids.length };
  }

  // Cria dedup + fan-out numa transação
  const createdAt = new Date().toISOString();
  const createdAtMs = Date.now();

  await db.runTransaction(async (t) => {
    const fresh = await t.get(dedupRef);
    if (fresh.exists) {
      // Outra invocação paralela chegou primeiro
      return;
    }
    t.set(dedupRef, {
      sent_at: createdAt,
      sent_at_ms: createdAtMs,
      payload_type: payload.type,
    });
    recipientUids.forEach((uid) => {
      const ref = db.collection(NOTIFICATIONS_COLLECTION).doc();
      t.set(ref, {
        user_id: uid,
        type: payload.type,
        club_id: payload.club_id || null,
        title: String(payload.title || '').slice(0, 140),
        message: String(payload.body || '').slice(0, 300),
        link: payload.link || null,
        actor_id: payload.actor_id || null,
        actor_name: payload.actor_name || null,
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

/**
 * Busca os uids de admin/owner do abrigo. Coleção `members` é onde o
 * abrigo gerencia seu time (papéis: owner, admin, member, etc).
 */
async function getShelterAdminUids(clubId) {
  const snap = await db
    .collection('clubs')
    .doc(clubId)
    .collection('members')
    .where('role', 'in', ['admin', 'owner'])
    .get();
  return snap.docs.map((d) => d.id);
}

// ════════════════════════════════════════════════════════════════════
// TRIGGER 1: onUpdate users/{uid}/volunteer_profile/main
// ════════════════════════════════════════════════════════════════════

const PROPAGATE_WATCHED_FIELDS = [
  'display_name',
  'full_name',
  'phone',
  'email',
  'photo_url',
  'skills',
  'availability',
];

function _fieldsChanged(before, after) {
  return PROPAGATE_WATCHED_FIELDS.some((f) => {
    return JSON.stringify(before?.[f]) !== JSON.stringify(after?.[f]);
  });
}

/**
 * Propaga campos de exibição do perfil global para os docs de roster
 * em todos os abrigos. Se o voluntário atualizou seu nome, todos os
 * abrigos em que está na rostagem enxergam o nome novo (sem precisar
 * que cada abrigo busque o `users/{uid}/volunteer_profile/main`
 * individualmente em runtime).
 */
async function runPropagateVolunteerProfileSnapshot(event) {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return { propagated: 0 };

  const { userId } = event.params;
  if (!_fieldsChanged(before, after)) {
    return { propagated: 0, reason: 'no_relevant_change' };
  }

  const rosters = await db
    .collectionGroup('volunteers')
    .where('volunteer_uid', '==', userId)
    .get();

  if (rosters.empty) {
    return { propagated: 0 };
  }

  const batch = db.batch();
  rosters.docs.forEach((doc) => {
    batch.update(doc.ref, {
      volunteer_name: after.display_name || after.full_name || null,
      volunteer_email: after.email || null,
      volunteer_phone: after.phone || null,
      volunteer_photo_url: after.photo_url || null,
      snapshot_updated_at: new Date().toISOString(),
    });
  });
  await batch.commit();

  _logger.info('volunteerTriggers: snapshot propagated', {
    user_id: userId,
    rosters_updated: rosters.size,
  });

  return { propagated: rosters.size };
}

// ════════════════════════════════════════════════════════════════════
// TRIGGER 2: onCreate clubs/{clubId}/volunteers/{volunteerUid}
// ════════════════════════════════════════════════════════════════════

async function runNotifyAdminOnNewVolunteer(event) {
  const data = event.data?.data();
  if (!data) return;
  const { clubId, volunteerUid } = event.params;

  const adminUids = await getShelterAdminUids(clubId);
  if (adminUids.length === 0) {
    _logger.warn('volunteerTriggers: no admins found for new volunteer', {
      club_id: clubId,
    });
    return;
  }

  const key = dedupId(
    'new-volunteer',
    clubId,
    volunteerUid,
    data.created_at?.toMillis?.()?.toString() || data.joined_at || '',
  );

  await createNotificationForRecipients(
    key,
    {
      type: 'volunteer_new_roster',
      club_id: clubId,
      title: 'Novo voluntário no abrigo',
      body: `${data.volunteer_name || 'Um voluntário'} entrou na rostagem.`,
      link: `/abrigo/${clubId}/voluntarios`,
      actor_id: volunteerUid,
      actor_name: data.volunteer_name || null,
    },
    adminUids,
  );

  _logger.info('volunteerTriggers: new volunteer notified admins', {
    club_id: clubId,
    volunteer_uid: volunteerUid,
    admins_count: adminUids.length,
  });
}

// ════════════════════════════════════════════════════════════════════
// TRIGGER 3: onUpdate clubs/{clubId}/volunteers/{volunteerUid}
// (status change only)
// ════════════════════════════════════════════════════════════════════

async function runNotifyVolunteerOnStatusChange(event) {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return;

  const { clubId, volunteerUid } = event.params;
  if (!before || before.status === after.status) return;

  const key = dedupId(
    'volunteer-status',
    clubId,
    volunteerUid,
    after.status,
    after.updated_at?.toMillis?.()?.toString() || '',
  );

  await createNotificationForRecipients(
    key,
    {
      type: 'volunteer_status_change',
      club_id: clubId,
      title: 'Seu status no abrigo foi atualizado',
      body: `Status: ${before.status} → ${after.status}.`,
      link: `/abrigo/${clubId}/voluntarios`,
      actor_id: null,
    },
    [volunteerUid],
  );

  _logger.info('volunteerTriggers: status change notified', {
    club_id: clubId,
    volunteer_uid: volunteerUid,
    from: before.status,
    to: after.status,
  });
}

// ════════════════════════════════════════════════════════════════════
// TRIGGER 4: onCreate clubs/{clubId}/volunteer_participations/{pid}
// ════════════════════════════════════════════════════════════════════

async function runNotifyAdminOnNewParticipation(event) {
  const data = event.data?.data();
  if (!data) return;
  const { clubId, participationId } = event.params;

  const adminUids = await getShelterAdminUids(clubId);
  if (adminUids.length === 0) return;

  const key = dedupId(
    'new-participation',
    clubId,
    participationId,
    data.created_at?.toMillis?.()?.toString() || '',
  );

  const eventLabel =
    data.event_label ||
    (data.event_type ? `${data.event_type}${data.role ? ` (${data.role})` : ''}` : 'evento');
  const eventDate = data.event_date || 'data a definir';

  await createNotificationForRecipients(
    key,
    {
      type: 'volunteer_new_participation',
      club_id: clubId,
      title: 'Nova participação registrada',
      body: `${data.volunteer_name || 'Voluntário'} registrado para "${eventLabel}" em ${eventDate}.`,
      link: `/abrigo/${clubId}/voluntarios/participacoes/${participationId}`,
      actor_id: data.created_by || data.volunteer_uid || null,
      actor_name: data.volunteer_name || null,
    },
    adminUids,
  );

  _logger.info('volunteerTriggers: new participation notified admins', {
    club_id: clubId,
    participation_id: participationId,
    admins_count: adminUids.length,
  });
}

// ════════════════════════════════════════════════════════════════════
// TRIGGER 5: onUpdate check_in / check_out
// ════════════════════════════════════════════════════════════════════

async function runNotifyOnCheckInOut(event) {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return;

  const { clubId, participationId } = event.params;

  const checkInChanged = before?.check_in !== after.check_in;
  const checkOutChanged = before?.check_out !== after.check_out;
  if (!checkInChanged && !checkOutChanged) return;

  // Notifica admins (sempre) e o voluntário (apenas no check-out, como
  // confirmação; check-in notifica o próprio voluntário como recibo).
  const adminUids = await getShelterAdminUids(clubId);
  const checkEvent = checkInChanged ? 'check_in' : 'check_out';
  const volunteerUid = after.volunteer_uid;

  const recipients = new Set(adminUids);
  if (volunteerUid) recipients.add(volunteerUid);

  const key = dedupId(
    'check',
    clubId,
    participationId,
    checkEvent,
    after[checkEvent]?.toMillis?.()?.toString() || after[checkEvent] || '',
  );

  await createNotificationForRecipients(
    key,
    {
      type: checkEvent === 'check_in' ? 'volunteer_check_in' : 'volunteer_check_out',
      club_id: clubId,
      title: checkEvent === 'check_in' ? 'Check-in realizado' : 'Check-out realizado',
      body:
        checkEvent === 'check_in'
          ? `${after.volunteer_name || 'Voluntário'} bateu ponto.`
          : `${after.volunteer_name || 'Voluntário'} encerrou o turno${
              after.hours_logged != null
                ? ` — ${after.hours_logged}h registradas`
                : ''
            }.`,
      link: `/abrigo/${clubId}/voluntarios/participacoes/${participationId}`,
      actor_id: volunteerUid || null,
      actor_name: after.volunteer_name || null,
    },
    [...recipients],
  );

  _logger.info('volunteerTriggers: check in/out notified', {
    club_id: clubId,
    participation_id: participationId,
    check_event: checkEvent,
    recipients: recipients.size,
  });
}

// ════════════════════════════════════════════════════════════════════
// TRIGGER 6 (TASK-269): onCreate volunteer_participation → notifica voluntário
// FCM + calendar entry + email (volunteer-shift-confirmed-v1) + audit log.
// ════════════════════════════════════════════════════════════════════

const CALENDAR_COLLECTION = 'calendar';
const AUDIT_COLLECTION = 'audit_logs';

/**
 * Determina o título de notificação a partir dos dados da participação.
 */
function buildParticipationTitle(data) {
  const role = data.role ? ` (${data.role})` : '';
  const label = data.event_label || data.event_type || 'turno';
  return `Turno confirmado: ${label}${role}`;
}

/**
 * Determina a URL de deep-link para a participação.
 */
function buildParticipationLink(clubId, participationId) {
  return `/abrigo/${clubId}/voluntarios/participacoes/${participationId}`;
}

/**
 * Envia FCM multicast para o voluntário. Retorna contagem de
 * tokens notificados. Falha no envio FCM é non-fatal (log + continua).
 *
 * @param {string} volunteerUid
 * @param {object} participationData
 * @param {string} clubId
 * @param {string} participationId
 * @param {string} participationTitle
 * @param {string} participationLink
 * @returns {Promise<{tokens: string[], sent: number, failed: number}>}
 */
/**
 * Envia FCM multicast para o voluntário. Retorna contagem de
 * tokens notificados. Falha no envio FCM é non-fatal (log + continua).
 *
 * @param {string} volunteerUid
 * @param {object} participationData
 * @param {string} clubId
 * @param {string} participationId
 * @param {string} participationTitle
 * @param {string} participationLink
 * @param {object} [_injected] - test injection: { messaging?, db? }
 * @returns {Promise<{tokens: string[], sent: number, failed: number}>}
 */
async function sendFCMToVolunteer(volunteerUid, participationData, clubId, participationId, participationTitle, participationLink, _injected = {}) {
  const _db = _injected.db || db;
  try {
    const messaging = _getMessaging();

    const userSnap = await _db.collection('users').doc(volunteerUid).get();
    const userData = userSnap.data() || {};
    const tokens = Array.isArray(userData.fcm_tokens) ? userData.fcm_tokens : [];
    if (!tokens.length) {
      _logger.info('onVolunteerParticipationCreated: no FCM tokens for volunteer', { volunteer_uid: volunteerUid });
      return { tokens: [], sent: 0, failed: 0 };
    }

    const validTokens = tokens.filter((t) => typeof t === 'string' && t.length > 0);
    if (!validTokens.length) {
      return { tokens: [], sent: 0, failed: 0 };
    }

    const message = {
      notification: {
        title: participationTitle.slice(0, 140),
        body: `Você foi confirmado para ${participationData.event_date || 'o turno'}. Toque para ver os detalhes.`.slice(0, 300),
      },
      data: {
        type: 'volunteer_shift_confirmed',
        participation_id: participationId,
        club_id: clubId,
        title: participationData.event_label || '',
        event_label: participationData.event_label || '',
        event_date: participationData.event_date || '',
        role: participationData.role || '',
        url: participationLink,
      },
      tokens: validTokens,
    };

    let sent = 0;
    let failed = 0;
    try {
      const response = await messaging.sendEachForMulticast(message);
      sent = response.successCount || 0;
      failed = response.failureCount || 0;
    } catch (fcmErr) {
      _logger.warn('onVolunteerParticipationCreated: FCM sendEachForMulticast failed', {
        volunteer_uid: volunteerUid,
        error: fcmErr.message,
      });
      failed = validTokens.length;
    }

    _logger.info('onVolunteerParticipationCreated: FCM sent', {
      volunteer_uid: volunteerUid,
      tokens_count: validTokens.length,
      sent,
      failed,
    });
    return { tokens: validTokens, sent, failed };
  } catch (err) {
    _logger.warn('onVolunteerParticipationCreated: FCM error', {
      volunteer_uid: volunteerUid,
      error: err.message,
    });
    return { tokens: [], sent: 0, failed: 0 };
  }
}

/**
 * Grava entrada no calendário do voluntário em users/{uid}/calendar/{id}.
 */
async function writeCalendarEntry(volunteerUid, participationId, participationData, clubId, title) {
  try {
    const calendarRef = db.collection('users').doc(volunteerUid).collection(CALENDAR_COLLECTION).doc(participationId);
    await calendarRef.create({
      type: 'volunteer_shift',
      title: title,
      event_label: participationData.event_label || null,
      event_type: participationData.event_type || null,
      event_date: participationData.event_date || null,
      role: participationData.role || null,
      club_id: clubId,
      participation_id: participationId,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      created_at_ms: Date.now(),
    });
    _logger.info('onVolunteerParticipationCreated: calendar entry written', {
      volunteer_uid: volunteerUid,
      participation_id: participationId,
    });
    return true;
  } catch (err) {
    if (err?.code === 6 || /already exists/i.test(String(err?.message))) {
      _logger.info('onVolunteerParticipationCreated: calendar entry already exists (dedup)', {
        volunteer_uid: volunteerUid,
        participation_id: participationId,
      });
      return false;
    }
    _logger.warn('onVolunteerParticipationCreated: calendar write failed', {
      volunteer_uid: volunteerUid,
      error: err.message,
    });
    return false;
  }
}

/**
 * Grava audit log de confirmação de turno.
 */
async function writeAuditLog(volunteerUid, participationId, participationData, clubId, title, fcmResult) {
  try {
    const auditRef = db.collection(AUDIT_COLLECTION).doc();
    await auditRef.create({
      action: 'volunteer_shift_confirmed',
      action_label: 'Turno de voluntariado confirmado',
      actor_id: participationData.created_by || null,
      actor_name: null,
      user_id: volunteerUid,
      details: {
        club_id: clubId,
        participation_id: participationId,
        title,
        event_label: participationData.event_label || null,
        event_date: participationData.event_date || null,
        role: participationData.role || null,
        fcm_tokens_count: fcmResult.tokens?.length || 0,
        fcm_sent: fcmResult.sent || 0,
        fcm_failed: fcmResult.failed || 0,
      },
      created_at: new Date().toISOString(),
      created_at_ms: Date.now(),
    });
    _logger.info('onVolunteerParticipationCreated: audit log written', {
      participation_id: participationId,
    });
  } catch (err) {
    _logger.warn('onVolunteerParticipationCreated: audit log failed', {
      participation_id: participationId,
      error: err.message,
    });
  }
}

/**
 * Core da trigger 6: notifica voluntário via FCM, grava no calendário,
 * dispara email de confirmação e loga no audit.
 */
async function runOnVolunteerParticipationCreated(event, _injected = {}) {
  const data = event.data?.data();
  if (!data) return;
  const { clubId, participationId } = event.params;
  const volunteerUid = data.volunteer_uid;
  if (!volunteerUid) {
    _logger.warn('onVolunteerParticipationCreated: no volunteer_uid', { participation_id: participationId });
    return;
  }

  const title = buildParticipationTitle(data);
  const link = buildParticipationLink(clubId, participationId);

  // FCM (não-fatal se falhar)
  const fcmResult = await sendFCMToVolunteer(volunteerUid, data, clubId, participationId, title, link, _injected);

  // Calendar entry (idempotente via create)
  await writeCalendarEntry(volunteerUid, participationId, data, clubId, title);

  // Email de confirmação (non-blocking, best-effort)
  try {
    const { sendShiftConfirmationEmail } = require('./volunteerEmails');
    await sendShiftConfirmationEmail(volunteerUid, {
      eventLabel: data.event_label || data.event_type || 'turno',
      eventDate: data.event_date || null,
      role: data.role || null,
      clubId,
    });
  } catch (emailErr) {
    _logger.warn('onVolunteerParticipationCreated: email failed', {
      volunteer_uid: volunteerUid,
      error: emailErr.message,
    });
  }

  // Audit log (non-blocking)
  await writeAuditLog(volunteerUid, participationId, data, clubId, title, fcmResult);

  _logger.info('onVolunteerParticipationCreated: done', {
    participation_id: participationId,
    volunteer_uid: volunteerUid,
    fcm_sent: fcmResult.sent,
  });
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC: wrappers com try/catch + DLQ. Chamados pelos triggers
// definidos em `functions/index.js`. Cada um retorna `{ok:true}`
// (sucesso ou duplicata suprimida) ou `{ok:false, error}`.
// ════════════════════════════════════════════════════════════════════

async function safeRun(triggerName, payload, fn) {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (err) {
    _logger.error(`volunteerTriggers: ${triggerName} failed`, {
      error: err?.message,
      stack: err?.stack,
    });
    await sendToDLQ(triggerName, payload, err);
    return { ok: false, error: err?.message };
  }
}

async function runPropagateVolunteerProfileSnapshotSafe(event) {
  return safeRun(
    'propagateVolunteerProfileSnapshot',
    { userId: event.params?.userId },
    () => runPropagateVolunteerProfileSnapshot(event),
  );
}

async function runNotifyAdminOnNewVolunteerSafe(event) {
  const { clubId, volunteerUid } = event.params || {};
  return safeRun(
    'notifyAdminOnNewVolunteer',
    { clubId, volunteerUid },
    () => runNotifyAdminOnNewVolunteer(event),
  );
}

async function runNotifyVolunteerOnStatusChangeSafe(event) {
  const { clubId, volunteerUid } = event.params || {};
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  return safeRun(
    'notifyVolunteerOnStatusChange',
    {
      clubId,
      volunteerUid,
      from: before?.status,
      to: after?.status,
    },
    () => runNotifyVolunteerOnStatusChange(event),
  );
}

async function runNotifyAdminOnNewParticipationSafe(event) {
  const { clubId, participationId } = event.params || {};
  return safeRun(
    'notifyAdminOnNewParticipation',
    { clubId, participationId },
    () => runNotifyAdminOnNewParticipation(event),
  );
}

async function runNotifyOnCheckInOutSafe(event) {
  const { clubId, participationId } = event.params || {};
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  const eventName =
    before?.check_in !== after?.check_in
      ? 'check_in'
      : before?.check_out !== after?.check_out
        ? 'check_out'
        : 'unknown';
  return safeRun(
    'notifyOnCheckInOut',
    { clubId, participationId, event_type: eventName },
    () => runNotifyOnCheckInOut(event),
  );
}

async function runOnVolunteerParticipationCreatedSafe(event) {
  const { clubId, participationId } = event.params || {};
  const data = event.data?.data?.();
  return safeRun(
    'onVolunteerParticipationCreated',
    { clubId, participationId, volunteer_uid: data?.volunteer_uid },
    () => runOnVolunteerParticipationCreated(event),
  );
}

module.exports = {
  // Core (testável)
  dedupId,
  _fieldsChanged,
  runPropagateVolunteerProfileSnapshot,
  runNotifyAdminOnNewVolunteer,
  runNotifyVolunteerOnStatusChange,
  runNotifyAdminOnNewParticipation,
  runNotifyOnCheckInOut,
  runOnVolunteerParticipationCreated,
  buildParticipationTitle,
  buildParticipationLink,
  sendFCMToVolunteer,
  writeCalendarEntry,
  writeAuditLog,
  getShelterAdminUids,
  createNotificationForRecipients,
  sendToDLQ,
  setLogger,
  setMessagingOverride,
  // Wrappers com DLQ (chamados pelos triggers em index.js)
  runPropagateVolunteerProfileSnapshotSafe,
  runNotifyAdminOnNewVolunteerSafe,
  runNotifyVolunteerOnStatusChangeSafe,
  runNotifyAdminOnNewParticipationSafe,
  runNotifyOnCheckInOutSafe,
  runOnVolunteerParticipationCreatedSafe,
  // Constants
  DEDUP_COLLECTION,
  DLQ_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  CALENDAR_COLLECTION,
  AUDIT_COLLECTION,
  PROPAGATE_WATCHED_FIELDS,
};
