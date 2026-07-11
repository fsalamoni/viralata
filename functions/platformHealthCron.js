/**
 * @fileoverview Cloud Function scheduled: snapshot de saúde da
 * plataforma (Fase 21).
 *
 * Roda a cada 1h, coleta métricas agregadas (firestore, auth,
 * functions, hosting) e grava em
 * `platform_health_snapshots/{timestamp}`. Mantém as últimas
 * 24h de snapshots (auto-cleanup de snapshots > 24h).
 *
 * Também avalia os alertas configurados em
 * `platform_alert_config` e dispara `triggerAlert` quando os
 * thresholds são ultrapassados.
 *
 * Para manter o arquivo testável sem precisar instalar o
 * `firebase-functions` (dependência do Cloud Functions runtime),
 * o `onSchedule` foi movido para `functions/index.js` — aqui só
 * exportamos a lógica. O logger é injetado pelo Cloud Function
 * no deploy.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 21
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}

const db = getFirestore();

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

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

/**
 * Cria o handler `runSnapshotPlatformHealth` recebendo o `db` e
 * o `logger` como dependências. Permite testar sem precisar mockar
 * `firebase-admin` (injetamos o mock diretamente).
 */
function createSnapshotHandler(deps = {}) {
  const _db = deps.db || db;
  const _loggerLocal = deps.logger || _logger;
  return {
    async run() {
      const startTime = Date.now();
      _loggerLocal.info('snapshotPlatformHealth: starting hourly run');
      try {
        const metrics = await collectHealthMetrics(_db);
        const snapshotId = new Date().toISOString();
        await _db.collection('platform_health_snapshots').doc(snapshotId).set({
          ...metrics,
          created_at: FieldValue.serverTimestamp(),
          created_at_ms: Date.now(),
          last_deploy_at: metrics.hosting.last_deploy_at,
          uptime_30d: metrics.hosting.uptime_30d,
        });
        _loggerLocal.info('snapshotPlatformHealth: snapshot saved', {
          snapshot_id: snapshotId,
          duration_ms: Date.now() - startTime,
        });
        await evaluateAlertsForSnapshot(_db, metrics, _loggerLocal);
        await pruneOldSnapshots(_db, _loggerLocal);
      } catch (err) {
        _loggerLocal.error('snapshotPlatformHealth: failed', { error: String(err) });
      }
    },
  };
}

/**
 * Coleta métricas de saúde. Heurística para Fase 21 MVP — em
 * produção, integrar com Firebase Cloud Logging API para latência
 * p50/p99 real.
 */
async function collectHealthMetrics(targetDb = db) {
  const now = new Date();
  const since24hMs = now.getTime() - ONE_DAY_MS;

  const [activeUsers, signups, fnInvocations, fnErrors, latestDeploy] = await Promise.all([
    targetDb.collection('users')
      .where('last_seen_at_ms', '>=', since24hMs)
      .count().get().catch(() => ({ data: () => ({ count: 0 }) })),
    targetDb.collection('users')
      .where('created_at_ms', '>=', since24hMs)
      .count().get().catch(() => ({ data: () => ({ count: 0 }) })),
    targetDb.collection('function_invocations')
      .where('created_at_ms', '>=', since24hMs)
      .count().get().catch(() => ({ data: () => ({ count: 0 }) })),
    targetDb.collection('function_invocations')
      .where('created_at_ms', '>=', since24hMs)
      .where('status', '==', 'error')
      .count().get().catch(() => ({ data: () => ({ count: 0 }) })),
    targetDb.collection('deploys').orderBy('created_at_ms', 'desc').limit(1).get()
      .catch(() => ({ empty: true, docs: [] })),
  ]);

  const inv = fnInvocations.data().count;
  const err = fnErrors.data().count;
  const errorRate = inv > 0 ? err / inv : 0;

  const lastDeployDoc = latestDeploy.empty ? null : latestDeploy.docs[0];
  const lastDeployAt = lastDeployDoc ? lastDeployDoc.data().created_at : null;

  return {
    firestore: {
      latency_p50: 45,
      latency_p99: 120,
      error_rate: Number(errorRate.toFixed(4)),
    },
    auth: {
      active_users_24h: activeUsers.data().count,
      signups_24h: signups.data().count,
    },
    functions: {
      invocations_24h: inv,
      errors_24h: err,
    },
    hosting: {
      last_deploy_at: lastDeployAt,
      uptime_30d: 99.95,
    },
  };
}

/**
 * Avalia cada métrica contra as configs de alerta ativas.
 */
async function evaluateAlertsForSnapshot(targetDb = db, metrics, loggerLocal = _logger) {
  const checks = [
    { type: 'error_rate', value: metrics.firestore.error_rate },
    { type: 'latency_p99', value: metrics.firestore.latency_p99 },
    { type: 'uptime', value: metrics.hosting.uptime_30d },
    { type: 'billing', value: 0 },
  ];
  for (const check of checks) {
    try {
      const snap = await targetDb.collection('platform_alert_config')
        .where('type', '==', check.type)
        .where('enabled', '==', true)
        .get();
      for (const docSnap of snap.docs) {
        const cfg = docSnap.data();
        const threshold = Number(cfg.threshold || 0);
        const breached = check.type === 'uptime'
          ? check.value < threshold
          : check.value >= threshold;
        if (!breached) continue;
        const eventRef = targetDb.collection('platform_alert_events').doc();
        await eventRef.set({
          type: check.type,
          current_value: check.value,
          threshold,
          severity: check.value >= threshold * 1.5 ? 'critical' : 'warning',
          message: `Threshold de ${check.type} ultrapassado: ${check.value} (limite ${threshold}).`,
          context: { config_id: docSnap.id, source: 'platformHealthCron' },
          status: 'pending',
          created_at: FieldValue.serverTimestamp(),
          created_at_ms: Date.now(),
        });
        loggerLocal.info('snapshotPlatformHealth: alert triggered', {
          type: check.type, value: check.value, threshold, config_id: docSnap.id,
        });
      }
    } catch (err) {
      loggerLocal.warn(`snapshotPlatformHealth: failed to evaluate ${check.type}`, err);
    }
  }
}

/**
 * Remove snapshots com mais de 24h.
 */
async function pruneOldSnapshots(targetDb = db, loggerLocal = _logger) {
  const cutoffMs = Date.now() - ONE_DAY_MS;
  const snap = await targetDb.collection('platform_health_snapshots')
    .where('created_at_ms', '<', cutoffMs)
    .limit(100)
    .get();
  if (snap.empty) return;
  const batch = targetDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  loggerLocal.info('snapshotPlatformHealth: pruned old snapshots', { count: snap.size });
}

/**
 * Handler principal — chamado pela Cloud Function scheduled
 * (definida em `functions/index.js`).
 */
async function runSnapshotPlatformHealth() {
  const handler = createSnapshotHandler();
  return handler.run();
}

module.exports = {
  runSnapshotPlatformHealth,
  createSnapshotHandler,
  collectHealthMetrics,
  evaluateAlertsForSnapshot,
  pruneOldSnapshots,
  setLogger,
  ONE_DAY_MS,
  ONE_HOUR_MS,
};
