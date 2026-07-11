/**
 * @fileoverview Cloud Function trigger: dispatch de alertas admin
 * master (Fase 21).
 *
 * Reage a inserts em `platform_alert_events/{eventId}`. Para cada
 * evento novo, lê a config correspondente e dispara os canais
 * configurados (Slack webhook, Email via stub).
 *
 * Stub de Email: o `dispatchEmail` loga o conteúdo (não envia real).
 * Em produção, integrar com SendGrid ou Firebase Extensions.
 *
 * Stub de Slack: o `dispatchSlack` faz um POST para o webhook. Em
 * ambiente de teste (`SLACK_DRY_RUN=1`), o webhook é apenas logado.
 *
 * Para manter o arquivo testável sem precisar instalar
 * `firebase-functions`, o `onDocumentCreated` foi movido para
 * `functions/index.js` — aqui só exportamos a lógica. O logger
 * é injetado pelo Cloud Function no deploy.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 21
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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

/** Injeta o logger real (chamado pelo `functions/index.js` no deploy). */
function setLogger(logger) {
  if (logger && typeof logger.info === 'function') {
    _logger = logger;
  }
}

const SEVERITY_EMOJI = {
  info: ':information_source:',
  warning: ':warning:',
  critical: ':rotating_light:',
};

/**
 * Handler principal — chamado pela Cloud Function trigger
 * (definida em `functions/index.js`).
 */
async function runOnPlatformAlertEvent(event, targetDb = db) {
  const alertEvent = event.data && event.data();
  if (!alertEvent) return;
  const eventId = event.params.eventId;

  if (alertEvent.status && alertEvent.status !== 'pending') return;

  const configs = await loadConfigsForType(alertEvent.type, targetDb);
  if (configs.length === 0) {
    _logger.info('adminAlerts: no configs for type', { type: alertEvent.type, event_id: eventId });
    await markEventStatus(eventId, 'no_config', {}, targetDb);
    return;
  }

  const channels = new Set();
  for (const cfg of configs) {
    (cfg.channels || []).forEach((c) => channels.add(c));
  }

  const results = await Promise.all(
    [...channels].map((channel) => dispatchChannel(channel, alertEvent, configs)),
  );
  const ok = results.every((r) => r.ok);

  await markEventStatus(eventId, ok ? 'sent' : 'partial', {
    channels: [...channels],
    results,
  }, targetDb);

  _logger.info('adminAlerts: dispatched', {
    event_id: eventId,
    type: alertEvent.type,
    channels: [...channels],
    ok,
  });
}

async function loadConfigsForType(type, targetDb = db) {
  const snap = await targetDb.collection('platform_alert_config')
    .where('type', '==', type)
    .where('enabled', '==', true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function dispatchChannel(channel, alertEvent, configs) {
  if (channel === 'slack') return dispatchSlack(alertEvent, configs);
  if (channel === 'email') return dispatchEmail(alertEvent, configs);
  _logger.warn('adminAlerts: unknown channel', { channel });
  return { channel, ok: false, reason: 'unknown_channel' };
}

async function dispatchSlack(alertEvent, configs) {
  const hook = configs
    .map((c) => c.destination && c.destination.slack_webhook_url)
    .filter(Boolean)[0];
  if (!hook) return { channel: 'slack', ok: false, reason: 'no_webhook' };

  // SSRF guard: a URL deve apontar para um host autorizado.
  // Sem essa checagem, um config malicioso poderia redirecionar o
  // POST para um endpoint interno (metadata service, localhost, etc).
  let parsed;
  try {
    parsed = new URL(hook);
  } catch {
    return { channel: 'slack', ok: false, reason: 'invalid_url' };
  }
  if (parsed.protocol !== 'https:') {
    return { channel: 'slack', ok: false, reason: 'insecure_protocol' };
  }
  const allowedHosts = (process.env.SLACK_ALLOWED_HOSTS || 'hooks.slack.com')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
    return { channel: 'slack', ok: false, reason: 'host_not_allowed' };
  }

  const payload = buildSlackPayload(alertEvent);
  try {
    if (process.env.SLACK_DRY_RUN === '1' || process.env.NODE_ENV === 'test') {
      _logger.info('adminAlerts: SLACK_DRY_RUN', { payload });
      return { channel: 'slack', ok: true, dry_run: true };
    }
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { channel: 'slack', ok: res.ok, status: res.status };
  } catch (err) {
    _logger.error('adminAlerts: slack dispatch failed', err);
    return { channel: 'slack', ok: false, reason: String(err) };
  }
}

async function dispatchEmail(alertEvent, configs) {
  const recipients = new Set();
  for (const cfg of configs) {
    const dest = (cfg.destination && cfg.destination.email_to) || '';
    if (Array.isArray(dest)) dest.forEach((e) => e && recipients.add(e));
    else if (dest) recipients.add(dest);
  }
  if (recipients.size === 0) {
    return { channel: 'email', ok: false, reason: 'no_recipients' };
  }
  const subject = `[Viralata · ${alertEvent.severity || 'warning'}] ${alertEvent.type}`;
  const body = buildEmailBody(alertEvent);
  _logger.info('adminAlerts: EMAIL_STUB', {
    to: [...recipients],
    subject,
    body,
  });
  return {
    channel: 'email',
    ok: true,
    stub: true,
    recipients: [...recipients],
  };
}

function buildSlackPayload(alertEvent) {
  const emoji = SEVERITY_EMOJI[alertEvent.severity] || SEVERITY_EMOJI.warning;
  const text = alertEvent.message
    || `Threshold de ${alertEvent.type} ultrapassado: ${alertEvent.current_value} (limite ${alertEvent.threshold}).`;
  return {
    text: `${emoji} *${alertEvent.type}* — ${text}`,
    attachments: [
      {
        fields: [
          { title: 'Valor atual', value: String(alertEvent.current_value), short: true },
          { title: 'Threshold', value: String(alertEvent.threshold), short: true },
          { title: 'Severidade', value: alertEvent.severity || 'warning', short: true },
        ],
        ts: Math.floor((alertEvent.created_at_ms || Date.now()) / 1000),
      },
    ],
  };
}

function buildEmailBody(alertEvent) {
  return [
    `Alerta: ${alertEvent.type}`,
    `Severidade: ${alertEvent.severity || 'warning'}`,
    `Valor atual: ${alertEvent.current_value}`,
    `Threshold: ${alertEvent.threshold}`,
    '',
    alertEvent.message || '(sem mensagem)',
    '',
    `— Plataforma Viralata (painel admin)`,
  ].join('\n');
}

async function markEventStatus(eventId, status, extra = {}, targetDb = db) {
  await targetDb.collection('platform_alert_events').doc(eventId).set({
    status,
    ...extra,
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

module.exports = {
  runOnPlatformAlertEvent,
  buildSlackPayload,
  buildEmailBody,
  dispatchSlack,
  dispatchEmail,
  dispatchChannel,
  loadConfigsForType,
  markEventStatus,
  setLogger,
};
