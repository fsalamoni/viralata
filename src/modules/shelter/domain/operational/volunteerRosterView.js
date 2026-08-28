/**
 * @fileoverview Domínio (view helpers): Voluntários v2 (Fase 2 — SHELTER_VOLUNTEERS_V2).
 *
 * Funções PURAS (sem React/Firebase) para a tabela rica de voluntários:
 *  - "disponível hoje" derivado da `availability` (dia da semana atual);
 *  - resumo do período de disponibilidade (dias + faixa de horário);
 *  - rótulos das atividades a que o voluntário se dispõe (skills).
 *
 * O modelo de dados (schemas, enums) vive em `volunteerProfile.js`. Aqui só
 * há apresentação/curadoria — não altera comportamento de segurança nem de
 * escrita. Testável em isolamento.
 */

import {
  VOLUNTEER_DAYS_OF_WEEK,
  VOLUNTEER_DAY_LABELS,
  VOLUNTEER_SKILL_LABELS,
} from './volunteerProfile.js';

/** Rótulos curtos dos dias da semana (para chips/resumos compactos). */
export const VOLUNTEER_DAY_SHORT_LABELS = Object.freeze({
  mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui',
  fri: 'Sex', sat: 'Sáb', sun: 'Dom',
});

/**
 * Converte o índice de `Date.getDay()` (0=Dom … 6=Sáb) para o código de dia
 * usado em `availability` ('mon'…'sun'). Retorna null para entradas inválidas.
 */
export function jsDayToCode(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  // getDay(): 0=Sun,1=Mon,...,6=Sat → mapeia para os códigos ISO usados aqui.
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[date.getDay()] ?? null;
}

/**
 * Normaliza a lista de availability para itens válidos (defensivo: aceita
 * `undefined`/`null`/valores estranhos vindos de snapshots antigos).
 */
function safeAvailability(availability) {
  if (!Array.isArray(availability)) return [];
  return availability.filter(
    (slot) => slot && typeof slot === 'object'
      && VOLUNTEER_DAYS_OF_WEEK.includes(slot.day_of_week),
  );
}

/**
 * O voluntário está disponível na data informada (por padrão, hoje)?
 * Considera-se disponível se houver ao menos um slot de `availability` cujo
 * `day_of_week` seja o mesmo dia da semana da data.
 *
 * @param {Array} availability - lista de slots {day_of_week,start_time,end_time}
 * @param {Date} [date=new Date()] - data de referência (default: agora)
 * @returns {boolean}
 */
export function isVolunteerAvailableOn(availability, date = new Date()) {
  const slots = safeAvailability(availability);
  if (slots.length === 0) return false;
  const code = jsDayToCode(date);
  if (!code) return false;
  return slots.some((slot) => slot.day_of_week === code);
}

/** Atalho: disponível hoje (usa a data atual). */
export function isVolunteerAvailableToday(availability, now = new Date()) {
  return isVolunteerAvailableOn(availability, now);
}

/**
 * Dias únicos (ordenados Seg→Dom) em que o voluntário tem disponibilidade,
 * com rótulo curto. Ex.: ['Seg', 'Qua', 'Sex'].
 */
export function availabilityDays(availability, { short = true } = {}) {
  const slots = safeAvailability(availability);
  const present = new Set(slots.map((s) => s.day_of_week));
  return VOLUNTEER_DAYS_OF_WEEK
    .filter((d) => present.has(d))
    .map((d) => (short ? VOLUNTEER_DAY_SHORT_LABELS[d] : VOLUNTEER_DAY_LABELS[d]));
}

/** Resumo textual dos dias (ex.: "Seg, Qua, Sex"). Vazio se não houver. */
export function availabilityDaysSummary(availability, opts) {
  return availabilityDays(availability, opts).join(', ');
}

/**
 * Faixa de horário agregada (menor start, maior end) entre todos os slots.
 * Retorna null se não houver disponibilidade. Ex.: { start: '08:00', end: '18:00' }.
 */
export function availabilityTimeRange(availability) {
  const slots = safeAvailability(availability).filter(
    (s) => typeof s.start_time === 'string' && typeof s.end_time === 'string',
  );
  if (slots.length === 0) return null;
  let start = slots[0].start_time;
  let end = slots[0].end_time;
  for (const s of slots) {
    if (s.start_time < start) start = s.start_time;
    if (s.end_time > end) end = s.end_time;
  }
  return { start, end };
}

/**
 * Resumo completo do período de disponibilidade combinando dias + faixa.
 * Ex.: "Seg, Qua, Sex · 08:00–18:00". Vazio se não houver disponibilidade.
 */
export function availabilityPeriodSummary(availability) {
  const days = availabilityDaysSummary(availability);
  if (!days) return '';
  const range = availabilityTimeRange(availability);
  return range ? `${days} · ${range.start}–${range.end}` : days;
}

/**
 * Rótulos das atividades a que o voluntário se dispõe (a partir de `skills`).
 * Ignora chaves desconhecidas. Ex.: ['Passeio com cães', 'Transporte de animais'].
 */
export function volunteerActivityLabels(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .filter((s) => typeof s === 'string' && VOLUNTEER_SKILL_LABELS[s])
    .map((s) => VOLUNTEER_SKILL_LABELS[s]);
}
