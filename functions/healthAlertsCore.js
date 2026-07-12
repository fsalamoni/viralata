/**
 * @fileoverview Núcleo puro de `healthAlertsCron` (TASK-137).
 *
 * Varre `pets/{petId}/medical/{recordId}` (collectionGroup) com
 * `next_visit_date` dentro da janela [now, now+7d] e cria uma
 * notification in-app para cada admin/owner do abrigo dono do
 * registro (retorno de exame, reforço de vacina etc.).
 *
 * Dedup: cada (record, uid) gera no máximo 1 alerta por
 * `next_visit_date` — o doc de notificação usa id determinístico
 * `health_{recordId}_{uid}_{dueYYYYMMDD}` com `create()` (falha
 * silenciosa se já existe).
 *
 * E-mail: fica com a infra SendGrid (TASK-222/229) — este cron cobre
 * o canal in-app.
 */

const ALERT_WINDOW_DAYS = 7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Filtra registros com follow-up dentro da janela.
 * @param {Array<{next_visit_date?: string}>} records
 * @param {number} now - ms epoch
 * @returns {Array} registros elegíveis
 */
function recordsDueSoon(records, now = Date.now()) {
  const end = now + ALERT_WINDOW_DAYS * ONE_DAY_MS;
  return (records || []).filter((r) => {
    if (!r?.next_visit_date) return false;
    const t = new Date(r.next_visit_date).getTime();
    return Number.isFinite(t) && t >= now && t <= end;
  });
}

/** Id determinístico de dedup por (record, uid, data). */
function alertId(recordId, uid, nextVisitIso) {
  const day = String(nextVisitIso).slice(0, 10).replace(/-/g, '');
  return `health_${recordId}_${uid}_${day}`;
}

/**
 * Cria as notifications para os admins do abrigo de cada registro.
 *
 * @param {{db: object}} deps
 * @param {Array<{id:string, data:Function, ref:{path:string}}>} recordDocs
 * @param {(clubId: string) => Promise<string[]>} resolveAdminUids
 * @param {object} logger
 * @returns {Promise<{created:number, skipped:number, errors:number}>}
 */
async function processHealthAlerts(deps, recordDocs, resolveAdminUids, logger = console) {
  const { db } = deps;
  const counters = { created: 0, skipped: 0, errors: 0 };

  for (const doc of recordDocs) {
    const data = doc.data();
    const petId = doc.ref.path.split('/')[1];
    try {
      const clubId = data.shelter_club_id;
      if (!clubId) { counters.skipped += 1; continue; }
      const uids = await resolveAdminUids(clubId);
      const dueLabel = String(data.next_visit_date).slice(0, 10).split('-').reverse().join('/');
      for (const uid of uids) {
        const ref = db.collection('notifications').doc(alertId(doc.id, uid, data.next_visit_date));
        try {
          await ref.create({
            user_id: uid,
            title: `Saúde: retorno em ${dueLabel}`.slice(0, 140),
            message: `${data.title || data.record_type || 'Registro de saúde'} tem acompanhamento marcado para ${dueLabel}. Toque para ver o pet.`.slice(0, 300),
            type: 'health_follow_up_due',
            link: `/pet/${petId}`,
            actor_id: null,
            actor_name: null,
            read: false,
            read_at: null,
            created_at_ms: Date.now(),
          });
          counters.created += 1;
        } catch (err) {
          // ALREADY_EXISTS = dedup funcionando; qualquer outro erro conta.
          if (err?.code === 6 || /already exists/i.test(String(err?.message))) {
            counters.skipped += 1;
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      counters.errors += 1;
      logger.error?.('healthAlertsCron: failed record', {
        record: doc.id,
        err: String(err?.message || err),
      });
    }
  }
  return counters;
}

module.exports = { recordsDueSoon, alertId, processHealthAlerts, ALERT_WINDOW_DAYS };
