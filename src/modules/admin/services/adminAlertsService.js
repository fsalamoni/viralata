/**
 * @fileoverview Configuração de alertas admin master (Fase 21).
 *
 * O admin master pode configurar regras que disparam notificações
 * para Slack/Email quando certos thresholds de saúde da plataforma
 * são ultrapassados (ex.: error rate > 5%, billing > $X, latência
 * p99 > 2s).
 *
 * Persistência: `platform_alert_config/{configId}`. Cada config
 * tem:
 *   - type: 'error_rate'|'latency_p99'|'billing'|'uptime'
 *   - channels: ['slack', 'email']
 *   - threshold: number
 *   - destination: { slack_webhook_url?, email_to? }
 *   - enabled: boolean
 *
 * O envio é responsabilidade da Cloud Function `adminAlerts`
 * (functions/adminAlerts.js) — ela escuta inserts em
 * `platform_alert_events/` e dispara o canal.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';

export const ALERT_TYPES = Object.freeze({
  ERROR_RATE: 'error_rate',
  LATENCY_P99: 'latency_p99',
  BILLING: 'billing',
  UPTIME: 'uptime',
  SLOW_QUERY: 'slow_query',
});

export const ALERT_CHANNELS = Object.freeze({
  SLACK: 'slack',
  EMAIL: 'email',
});

const VALID_TYPES = new Set(Object.values(ALERT_TYPES));
const VALID_CHANNELS = new Set(Object.values(ALERT_CHANNELS));

function sanitizeString(value, max = 2000) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

function ensureChannels(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error('Informe ao menos um canal de notificação (slack/email).');
  }
  const unique = new Set(channels.map((c) => String(c).toLowerCase()));
  for (const c of unique) {
    if (!VALID_CHANNELS.has(c)) {
      throw new Error(`Canal de alerta inválido: ${c}. Aceitos: slack, email.`);
    }
  }
  return [...unique];
}

function ensureType(type) {
  const t = String(type || '').toLowerCase();
  if (!VALID_TYPES.has(t)) {
    throw new Error(
      `Tipo de alerta inválido: ${type}. Aceitos: ${[...VALID_TYPES].join(', ')}.`,
    );
  }
  return t;
}

/**
 * Normaliza o payload de uma configuração de alerta.
 * @param {{
 *   type: string,
 *   channels: string[],
 *   threshold: number,
 *   destination?: {slack_webhook_url?: string, email_to?: string|string[]},
 *   enabled?: boolean,
 *   description?: string,
 * }} input
 */
export function normalizeAlertConfig(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Configuração de alerta inválida.');
  }
  const type = ensureType(input.type);
  const channels = ensureChannels(input.channels);
  const threshold = Number(input.threshold);
  if (!Number.isFinite(threshold) || threshold < 0) {
    throw new Error('Threshold deve ser um número >= 0.');
  }
  const dest = input.destination && typeof input.destination === 'object'
    ? {
      slack_webhook_url: sanitizeString(input.destination.slack_webhook_url, 2000),
      email_to: Array.isArray(input.destination.email_to)
        ? input.destination.email_to.map((e) => sanitizeString(e, 320)).filter(Boolean)
        : sanitizeString(input.destination.email_to, 320),
    }
    : { slack_webhook_url: '', email_to: '' };
  // Validação mínima: se canal slack, exige webhook URL.
  if (channels.includes('slack') && !dest.slack_webhook_url) {
    throw new Error('Canal "slack" requer destination.slack_webhook_url.');
  }
  // Email pode ser string ou array.
  if (channels.includes('email') && !dest.email_to) {
    throw new Error('Canal "email" requer destination.email_to.');
  }
  return {
    type,
    channels,
    threshold,
    destination: dest,
    enabled: input.enabled !== false,
    description: sanitizeString(input.description, 280),
  };
}

/**
 * Cria uma configuração de alerta.
 * @param {object} input
 * @param {object} actor
 * @returns {Promise<{id: string}>}
 */
export async function configureAlert(input, actor) {
  if (!db) throw new Error('Firestore não inicializado.');
  const config = normalizeAlertConfig(input);
  const ref = await addDoc(collection(db, 'platform_alert_config'), {
    ...config,
    created_by: actor?.uid || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'platform_alert_config_created',
    actor,
    details: { config_id: ref.id, type: config.type, threshold: config.threshold },
  });
  return { id: ref.id };
}

/**
 * Atualiza uma configuração de alerta existente.
 * @param {string} configId
 * @param {object} input
 * @param {object} actor
 */
export async function updateAlert(configId, input, actor) {
  if (!db || !configId) throw new Error('Config inválida.');
  const config = normalizeAlertConfig(input);
  await updateDoc(doc(db, 'platform_alert_config', configId), {
    ...config,
    updated_by: actor?.uid || null,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'platform_alert_config_updated',
    actor,
    details: { config_id: configId, type: config.type, threshold: config.threshold },
  });
  return { id: configId };
}

/**
 * Liga/desliga um alerta sem precisar refazer todas as configs.
 * @param {string} configId
 * @param {boolean} enabled
 */
export async function setAlertEnabled(configId, enabled) {
  if (!db || !configId) throw new Error('Config inválida.');
  await updateDoc(doc(db, 'platform_alert_config', configId), {
    enabled: Boolean(enabled),
    updated_at: serverTimestamp(),
  });
  return { id: configId, enabled: Boolean(enabled) };
}

/**
 * Remove uma configuração.
 * @param {string} configId
 */
export async function deleteAlert(configId, actor) {
  if (!db || !configId) throw new Error('Config inválida.');
  await deleteDoc(doc(db, 'platform_alert_config', configId));
  await createAuditLog({
    action: 'platform_alert_config_deleted',
    actor,
    details: { config_id: configId },
  });
  return { id: configId };
}

/**
 * Lista todas as configurações de alerta.
 * @returns {Promise<Array<{id: string, ...config}>>}
 */
export async function getAlertConfigs() {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, 'platform_alert_config'), orderBy('created_at_ms', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Lê configurações filtradas por tipo.
 * @param {string} type
 */
export async function getAlertConfigsByType(type) {
  if (!db) return [];
  const t = ensureType(type);
  const snap = await getDocs(
    query(
      collection(db, 'platform_alert_config'),
      where('type', '==', t),
      where('enabled', '==', true),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Dispara um alerta manualmente (ou pela Cloud Function de billing).
 * Grava um evento em `platform_alert_events/{eventId}` que é
 * consumido pela Cloud Function `adminAlerts`.
 *
 * @param {{
 *   type: string,
 *   current_value: number,
 *   threshold: number,
 *   severity?: 'info'|'warning'|'critical',
 *   message?: string,
 *   context?: object,
 * }} alert
 * @returns {Promise<{id: string}>}
 */
export async function triggerAlert(alert) {
  if (!db) throw new Error('Firestore não inicializado.');
  if (!alert || typeof alert !== 'object') throw new Error('Alert inválido.');
  const type = ensureType(alert.type);
  const current = Number(alert.current_value);
  const threshold = Number(alert.threshold);
  if (!Number.isFinite(current) || !Number.isFinite(threshold)) {
    throw new Error('current_value e threshold devem ser numéricos.');
  }
  const severity = alert.severity || 'warning';
  const eventRef = await addDoc(collection(db, 'platform_alert_events'), {
    type,
    current_value: current,
    threshold,
    severity: ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning',
    message: sanitizeString(alert.message || '', 500),
    context: alert.context && typeof alert.context === 'object' ? alert.context : {},
    status: 'pending',
    created_at: serverTimestamp(),
    created_at_ms: Date.now(),
  });
  await createAuditLog({
    action: 'platform_alert_triggered',
    actor: { uid: 'system', displayName: 'system' },
    details: { event_id: eventRef.id, type, current_value: current, threshold, severity },
  });
  return { id: eventRef.id, type, current_value: current, threshold };
}

/**
 * Avalia uma métrica contra todas as configs ativas do tipo e
 * dispara alertas automaticamente quando o threshold for
 * ultrapassado. Usado pela Cloud Function `platformHealthCron`.
 *
 * @param {string} type
 * @param {number} value
 * @param {object} [context]
 * @returns {Promise<{triggered: Array<{id: string}>}>}
 */
export async function evaluateAlerts(type, value, context = {}) {
  if (!db) return { triggered: [] };
  const t = ensureType(type);
  const configs = await getAlertConfigsByType(t);
  const triggered = [];
  for (const cfg of configs) {
    if (Number(value) >= Number(cfg.threshold)) {
      try {
        const evt = await triggerAlert({
          type: t,
          current_value: Number(value),
          threshold: Number(cfg.threshold),
          severity: Number(value) >= Number(cfg.threshold) * 1.5 ? 'critical' : 'warning',
          message: `Threshold de ${t} ultrapassado: ${value} (limite ${cfg.threshold}).`,
          context: { config_id: cfg.id, ...context },
        });
        triggered.push(evt);
      } catch (err) {
        logger.warn(`adminAlerts: failed to trigger for config ${cfg.id}`, err);
      }
    }
  }
  return { triggered };
}

/**
 * Lista os eventos de alerta (histórico).
 * @param {{limit?: number}} [opts]
 * @returns {Promise<Array<{id: string, ...event}>>}
 */
export async function getAlertEvents({ limit: limitCount = 50 } = {}) {
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, 'platform_alert_events'), orderBy('created_at_ms', 'desc')),
  );
  return snap.docs.slice(0, limitCount).map((d) => ({ id: d.id, ...d.data() }));
}

// re-export para os testes
export { setDoc };
