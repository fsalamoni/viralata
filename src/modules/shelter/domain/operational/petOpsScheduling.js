/**
 * @fileoverview petOpsScheduling — lógica pura de agendamento/proximidade
 * das tabelas operacionais do abrigo (SHELTER_PET_OPS_TABLES_V1).
 *
 * Modelo uniforme para TODAS as subcoleções operacionais do pet
 * (medications, vet_visits, treatments, health_records, care_log,
 * adopters_history, devolutions):
 *
 *  - Cada registro tem um campo de data NATIVO (ex.: `visit_date`,
 *    `start_date`, `care_date`, `devolution_date`).
 *  - Um registro pode ser AGENDADO para o futuro via o campo opcional
 *    `scheduled_for` (ISO date, YYYY-MM-DD ou ISO datetime).
 *  - `completed_at` (ISO) marca um agendamento como já realizado.
 *
 * A "data efetiva" de um registro é `scheduled_for ?? <campo nativo>`.
 *
 * Status derivado (sem persistir — calculado em runtime):
 *  - `done`      : realizado — com `completed_at`, ou sem agendamento e com
 *                  data efetiva hoje/no passado.
 *  - `scheduled` : agendado para o futuro (via `scheduled_for` OU apenas com
 *                  o campo de data nativo no futuro), ainda não realizado.
 *  - `overdue`   : agendado via `scheduled_for` no passado, não realizado.
 *
 * Observação: um registro com `scheduled_for` no passado é "atrasado"
 * (foi explicitamente agendado e não cumprido). Já um registro SEM
 * `scheduled_for`, só com o campo nativo, no passado é "realizado" — não
 * há como saber que foi "perdido"; no futuro é "agendado".
 *
 * Nada aqui toca Firestore nem React — é lógica pura e testável.
 */

export const PET_OPS_RECORD_STATUS = Object.freeze({
  DONE: 'done',
  SCHEDULED: 'scheduled',
  OVERDUE: 'overdue',
});

export const PET_OPS_STATUS_LABELS = Object.freeze({
  done: 'Realizada',
  scheduled: 'Agendada',
  overdue: 'Atrasada',
});

/** Janela (em dias) para considerar um agendamento "próximo". */
export const PROXIMITY_WINDOW_DAYS = 7;

/**
 * Converte um valor de data (ISO string, Firestore Timestamp, Date ou
 * número epoch) em `Date`. Retorna null se inválido/ausente.
 * @param {*} value
 * @returns {Date|null}
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // Firestore Timestamp (client SDK) tem toDate(); admin tem toMillis()
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === 'number') {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Início do dia (00:00:00.000 local) de um Date — para comparações por
 * dia sem sofrer com horas.
 * @param {Date} d
 * @returns {Date}
 */
export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Diferença em dias inteiros entre `target` e `ref` (target - ref),
 * comparando por dia. Positivo = target no futuro.
 * @param {Date} target
 * @param {Date} [ref=new Date()]
 * @returns {number}
 */
export function daysUntil(target, ref = new Date()) {
  const a = startOfDay(target).getTime();
  const b = startOfDay(ref).getTime();
  return Math.round((a - b) / 86400000);
}

/**
 * Data efetiva de um registro: `scheduled_for` se houver, senão o campo
 * nativo indicado por `dateField`.
 * @param {object} record
 * @param {string} dateField
 * @returns {Date|null}
 */
export function effectiveDate(record, dateField) {
  if (!record) return null;
  return toDate(record.scheduled_for) ?? toDate(record?.[dateField]);
}

/**
 * Um registro é "agendado" se tem `scheduled_for` e ainda não foi
 * marcado como realizado (`completed_at`).
 * @param {object} record
 * @returns {boolean}
 */
export function isScheduled(record) {
  return Boolean(record?.scheduled_for) && !record?.completed_at;
}

/**
 * Status derivado do registro (done | scheduled | overdue).
 *
 * Ordem de decisão:
 *  1. `completed_at` → done (agendamento cumprido).
 *  2. `scheduled_for` presente → overdue se no passado, senão scheduled.
 *  3. Só o campo nativo (`dateField`) → scheduled se no futuro, senão done.
 *
 * O `dateField` é opcional para retrocompatibilidade; sem ele, registros
 * sem `scheduled_for` são sempre tratados como realizados.
 *
 * @param {object} record
 * @param {Date} [now=new Date()]
 * @param {string} [dateField] campo de data nativo do registro
 * @returns {'done'|'scheduled'|'overdue'}
 */
export function recordStatus(record, now = new Date(), dateField) {
  if (record?.completed_at) return PET_OPS_RECORD_STATUS.DONE;
  if (record?.scheduled_for) {
    const when = toDate(record.scheduled_for);
    if (!when) return PET_OPS_RECORD_STATUS.SCHEDULED;
    return daysUntil(when, now) < 0
      ? PET_OPS_RECORD_STATUS.OVERDUE
      : PET_OPS_RECORD_STATUS.SCHEDULED;
  }
  const native = dateField ? toDate(record?.[dateField]) : null;
  if (!native) return PET_OPS_RECORD_STATUS.DONE;
  return daysUntil(native, now) > 0
    ? PET_OPS_RECORD_STATUS.SCHEDULED
    : PET_OPS_RECORD_STATUS.DONE;
}

/**
 * Um agendamento está "próximo" se é hoje ou dentro de PROXIMITY_WINDOW_DAYS.
 * (Atrasados não contam como "próximos" — têm alerta próprio.)
 * @param {object} record
 * @param {Date} [now=new Date()]
 * @param {number} [windowDays=PROXIMITY_WINDOW_DAYS]
 * @param {string} [dateField]
 * @returns {boolean}
 */
export function isUpcoming(record, now = new Date(), windowDays = PROXIMITY_WINDOW_DAYS, dateField) {
  if (recordStatus(record, now, dateField) !== PET_OPS_RECORD_STATUS.SCHEDULED) return false;
  const when = effectiveDate(record, dateField);
  if (!when) return false;
  const d = daysUntil(when, now);
  return d >= 0 && d <= windowDays;
}

/**
 * Resumo de alertas de uma lista de registros: quantos próximos e quantos
 * atrasados. Útil para o banner no topo da tabela.
 * @param {object[]} records
 * @param {Date} [now=new Date()]
 * @param {number} [windowDays=PROXIMITY_WINDOW_DAYS]
 * @param {string} [dateField]
 * @returns {{upcoming: number, overdue: number}}
 */
export function summarizeAlerts(records = [], now = new Date(), windowDays = PROXIMITY_WINDOW_DAYS, dateField) {
  let upcoming = 0;
  let overdue = 0;
  for (const r of records) {
    const st = recordStatus(r, now, dateField);
    if (st === PET_OPS_RECORD_STATUS.OVERDUE) overdue += 1;
    else if (st === PET_OPS_RECORD_STATUS.SCHEDULED && isUpcoming(r, now, windowDays, dateField)) upcoming += 1;
  }
  return { upcoming, overdue };
}

/**
 * Estado inicial do toggle "Agendar" a partir de um registro existente
 * (edição): agendado se tem scheduled_for e não foi realizado.
 * @param {object} record
 * @returns {boolean}
 */
export function initScheduled(record) {
  return Boolean(record?.scheduled_for && !record?.completed_at);
}

/**
 * Aplica o agendamento a um payload de create/update, de forma uniforme:
 *  - agendado → scheduled_for = payload[dateField] (data prevista),
 *    completed_at = null.
 *  - não agendado, em EDIÇÃO → scheduled_for = null (realiza / remove
 *    agendamento). Em CRIAÇÃO → não mexe (registro passado normal).
 * @param {object} payload
 * @param {boolean} scheduled
 * @param {string} dateField
 * @param {boolean} [isEdit=false]
 * @returns {object} novo payload
 */
export function applyScheduling(payload, scheduled, dateField, isEdit = false) {
  if (scheduled) {
    return { ...payload, scheduled_for: payload?.[dateField] || null, completed_at: null };
  }
  return isEdit ? { ...payload, scheduled_for: null } : { ...payload };
}

/**
 * Rótulo humano de proximidade para um agendamento (PT-BR).
 * Ex.: "hoje", "amanhã", "em 3 dias", "atrasada há 2 dias".
 * Retorna '' para registros já realizados.
 * @param {object} record
 * @param {Date} [now=new Date()]
 * @param {string} [dateField]
 * @returns {string}
 */
export function proximityLabel(record, now = new Date(), dateField) {
  const st = recordStatus(record, now, dateField);
  if (st === PET_OPS_RECORD_STATUS.DONE) return '';
  const when = effectiveDate(record, dateField);
  if (!when) return '';
  const d = daysUntil(when, now);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d > 1) return `em ${d} dias`;
  if (d === -1) return 'atrasada há 1 dia';
  return `atrasada há ${Math.abs(d)} dias`;
}
