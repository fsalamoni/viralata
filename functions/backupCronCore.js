/**
 * @fileoverview Núcleo puro de `scheduledFirestoreBackup` (TASK-240).
 *
 * Função agendada que dispara `firestoreAdminClient.exportDocuments`
 * para `gs://<bucket>/<YYYY-MM-DD>/`, gerando um export completo do
 * Firestore. O resultado é persistido como metadado em
 * `backup_log/{auto}` (status, operation_name, bucket, folder,
 * started_at). Logs de sucesso e falha saem no logger injetado.
 *
 * Por que existe: AGENTS.md §LGPD promete "Backup imutável (WORM) no
 * GCS, lifecycle 90d" e a Lei 14.063/2020 art. 6º exige prova de
 * aceite recuperável em caso de desastre. Restore: ver
 * `docs/DR_PLAN.md`.
 *
 * O core é testável sem `firebase-functions/v1` — recebe `db`,
 * `client` (FirestoreAdminClient), `bucketName`, `projectId` e
 * `logger` injetados. O trigger (`backupCron.js`) só faz a amarração
 * com o pubsub schedule.
 *
 * @see backupCron.js (trigger wrapper)
 * @see docs/DR_PLAN.md
 */

const DEFAULT_BUCKET = 'viralata-backups';

/**
 * Calcula o folder name (`YYYY-MM-DD/`) para um instante. Retorna a
 * data em UTC — a janela de execução é 02:00 BRT (05:00 UTC), então
 * o UTC date é estável e monotônico independente do host clock skew.
 *
 * @param {Date} [date] - opcional, default `new Date()`
 * @returns {string} ex: "2026-07-12/"
 */
function folderNameForDate(date = new Date()) {
  return `${date.toISOString().slice(0, 10)}/`;
}

/**
 * Monta o `outputUriPrefix` para o export. Resultado: `gs://<bucket>/<date>/`.
 * @param {string} bucketName
 * @param {string} dateFolder
 * @returns {string}
 */
function buildOutputUri(bucketName, dateFolder) {
  return `gs://${bucketName}/${dateFolder}`;
}

/**
 * Constrói o payload de metadados a gravar em `backup_log/`.
 * @param {object} args
 * @param {string} args.date
 * @param {string|null} args.operationName
 * @param {string} args.bucket
 * @param {string} args.folder
 * @param {'in_progress'|'completed'|'failed'} args.status
 * @param {string|null} [args.error]
 * @param {Function} args.serverTimestamp - firebase-admin FieldValue.serverTimestamp
 * @returns {object}
 */
function buildBackupLogEntry({ date, operationName, bucket, folder, status, error, serverTimestamp }) {
  const entry = {
    date,
    operation_name: operationName,
    bucket,
    folder,
    started_at: serverTimestamp(),
    status,
  };
  if (error) entry.error = error;
  return entry;
}

/**
 * Dispara o export e registra metadados. Lida com TODAS as falhas:
 *   1. Erro em `client.exportDocuments` → log entry `failed` + throw
 *      (pubsub retry) — ver backupCron.js.
 *   2. Erro no `db.collection('backup_log').add(...)` → log via
 *      logger.error mas não impede o export (que já foi disparado).
 *
 * @param {object} deps
 * @param {object} deps.db - firebase-admin/firestore
 * @param {object} deps.client - FirestoreAdminClient (de `@google-cloud/firestore`).v1.FirestoreAdminClient)
 * @param {string} deps.projectId - GCP project id
 * @param {string} [deps.bucketName] - default 'viralata-backups'
 * @param {Date} [deps.now] - default `new Date()` (injetável p/ teste)
 * @param {object} [deps.logger] - { info, error, warn }
 * @param {object} [deps.fieldValue] - { serverTimestamp: Function } (default require('firebase-admin').firestore.FieldValue)
 * @returns {Promise<{date:string, operationName:string, bucket:string, folder:string}>}
 */
async function runScheduledBackup(deps) {
  const {
    db,
    client,
    projectId,
    bucketName = DEFAULT_BUCKET,
    now = new Date(),
    logger = console,
  } = deps;

  const fieldValue = deps.fieldValue || require('firebase-admin').firestore.FieldValue;

  const date = now.toISOString().slice(0, 10);
  const folder = folderNameForDate(now);
  const outputUri = buildOutputUri(bucketName, folder);

  logger.info?.('scheduledFirestoreBackup: starting', {
    date,
    projectId,
    bucketName,
    outputUri,
  });

  let operationName = null;
  try {
    const [op] = await client.exportDocuments({
      name: `projects/${projectId}/databases/(default)`,
      outputUriPrefix: outputUri,
      collectionIds: [],
    });
    operationName = op && op.name ? op.name : null;
    logger.info?.('scheduledFirestoreBackup: export started', {
      operation_name: operationName,
      outputUri,
    });
  } catch (err) {
    const errMsg = String(err?.message || err);
    logger.error?.('scheduledFirestoreBackup: exportDocuments failed', {
      error: errMsg,
      outputUri,
    });
    // Tenta registrar falha no backup_log, mas não impede o throw.
    try {
      await db.collection('backup_log').add(
        buildBackupLogEntry({
          date,
          operationName: null,
          bucket: bucketName,
          folder,
          status: 'failed',
          error: errMsg,
          serverTimestamp: fieldValue.serverTimestamp,
        }),
      );
    } catch (logErr) {
      logger.error?.('scheduledFirestoreBackup: failed to write backup_log (failed)', {
        error: String(logErr?.message || logErr),
      });
    }
    throw err;
  }

  // Sucesso no disparo — registrar status inicial.
  try {
    await db.collection('backup_log').add(
      buildBackupLogEntry({
        date,
        operationName,
        bucket: bucketName,
        folder,
        status: 'in_progress',
        serverTimestamp: fieldValue.serverTimestamp,
      }),
    );
  } catch (logErr) {
    logger.error?.('scheduledFirestoreBackup: failed to write backup_log (in_progress)', {
      error: String(logErr?.message || logErr),
    });
  }

  return {
    date,
    operationName,
    bucket: bucketName,
    folder,
  };
}

module.exports = {
  DEFAULT_BUCKET,
  folderNameForDate,
  buildOutputUri,
  buildBackupLogEntry,
  runScheduledBackup,
};
