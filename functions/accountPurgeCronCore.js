/**
 * @fileoverview Núcleo puro de `accountPurgeCron` (TASK-186 · LGPD
 * Art. 18 VI). Purga definitiva de contas soft-deletadas há mais de
 * 30 dias (`users/{uid}.deleted_at`).
 *
 * O soft-delete é feito no client por `deleteAccountService` (que já
 * cascade-anonymiza voluntariado e remove PII imediata). Este cron
 * completa o ciclo: após a janela de arrependimento de 30 dias,
 * remove o doc do usuário e suas subcoleções (recursiveDelete).
 *
 * Aceites de termos NÃO são afetados — vivem em `audit_logs` com
 * retenção própria (Lei 14.063/2020, ver auditLogPurgeCronCore).
 *
 * Testável sem firebase-functions: recebe `db` injetado.
 */

const PURGE_DAYS = 30;
const BATCH_LIMIT = 100;

/**
 * Processa a lista de user docs soft-deletados vencidos.
 *
 * @param {{ db: object }} deps - db com `recursiveDelete(ref)`
 * @param {Array<{id: string, ref: object, data: Function}>} userDocs
 * @param {object} logger
 * @returns {Promise<{purged: number, errors: number}>}
 */
async function processAccountPurge(deps, userDocs, logger = console) {
  const { db } = deps;
  let purged = 0;
  let errors = 0;

  for (const doc of userDocs) {
    try {
      // recursiveDelete remove o doc E todas as subcoleções
      // (volunteer_profile, adopter_profile, radar etc.).
      await db.recursiveDelete(doc.ref);
      purged += 1;
      logger.info?.('accountPurgeCron: purged user', { uid: doc.id });
    } catch (err) {
      errors += 1;
      logger.error?.('accountPurgeCron: failed to purge user', {
        uid: doc.id,
        err: String(err?.message || err),
      });
    }
  }

  return { purged, errors };
}

module.exports = { processAccountPurge, PURGE_DAYS, BATCH_LIMIT };
