/**
 * @fileoverview Cloud Function: auditLogPurgeCron (TASK-217)
 *
 * Scheduled function que varre `audit_logs/` e deleta entries mais
 * antigas que o período de retenção da sua categoria:
 *   - operational:     180 dias (Marco Civil Art. 15)
 *   - term_acceptance: 1825 dias (Lei 14.063/2020 art. 6º — prova legal)
 *   - payment:         2555 dias (Receita Federal)
 *
 * Categorias com retenção maior NUNCA são purgadas antes do cutoff
 * próprio — o cron varre categoria-por-categoria com `where('category','==',X)`
 * então `term_acceptance` e `payment` são imunes ao cutoff de
 * `operational`.
 *
 * Schedule: todo dia às 03:00 BRT (06:00 UTC). Mesma janela do
 * `materializePostAdoptionTasks` — coordena carga noturna.
 *
 * O núcleo testável está em `auditLogPurgeCronCore.js`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § LGPD / Marco Civil
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { runAuditLogPurge } = require('./auditLogPurgeCronCore');

/**
 * Cloud Function agendada — purga audit_logs antigos conforme
 * retenção por categoria. Roda em 06:00 UTC (03:00 BRT) diariamente.
 */
exports.auditLogPurgeCron = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();

    functions.logger.info('auditLogPurgeCron: starting');

    const result = await runAuditLogPurge({
      db,
      collectionName: 'audit_logs',
      batchLimit: 500,
      logger: {
        info: functions.logger.info.bind(functions.logger),
        error: functions.logger.error.bind(functions.logger),
      },
    });

    functions.logger.info('auditLogPurgeCron: done', result);
    return result;
  });
