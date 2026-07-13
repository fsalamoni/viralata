/**
 * @fileoverview Domínio: Indicadores de Vitrines + Voluntários (Fase 17).
 *
 * Define:
 *  - Schemas Zod para os indicadores
 *  - Helpers puros que computam indicadores a partir de dados agregados
 *    (sem side-effects, testáveis em isolamento)
 *
 * Read-only: não há coleções próprias — os indicadores agregam dados das
 * coleções existentes (exhibitions, volunteer_participations, volunteers).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 17 (SHELTER_INDICATORS)
 */

import { z } from 'zod';
import { parseTimestamp } from '@/core/utils/timestamp';

// ─── Enums ────────────────────────────────────────────────────────────
export const INDICATOR_TYPES = Object.freeze([
  'exhibition_summary',  // Resumo geral de vitrines
  'exhibition_detail', // Por vitrine
  'volunteer_summary', // Resumo geral de voluntários
  'volunteer_detail',  // Por voluntário
]);

export const INDICATOR_TYPE_LABELS = Object.freeze({
  exhibition_summary: 'Resumo de Vitrines',
  exhibition_detail: 'Por Vitrine',
  volunteer_summary: 'Resumo de Voluntários',
  volunteer_detail: 'Por Voluntário',
});

// ─── Helpers de período ───────────────────────────────────────────────

export const PERIOD_TYPES_IND = Object.freeze(['month', 'quarter', 'year', 'all']);
export const PERIOD_LABELS_IND = Object.freeze({
  month: 'Mensal',
  quarter: 'Trimestral',
  year: 'Anual',
  all: 'Todo o período',
});

export function periodRangeInd(periodType, referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  switch (periodType) {
    case 'month': {
      const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
      const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'quarter': {
      const q = Math.floor(ref.getUTCMonth() / 3);
      const start = new Date(Date.UTC(ref.getUTCFullYear(), q * 3, 1));
      const end = new Date(Date.UTC(ref.getUTCFullYear(), q * 3 + 3, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'year': {
      const start = new Date(Date.UTC(ref.getUTCFullYear(), 0, 1));
      const end = new Date(Date.UTC(ref.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      return { start, end };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
}

// ─── Helpers de data ─────────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatMonthLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function daysBetween(a, b) {
  const d1 = a instanceof Date ? a : new Date(a);
  const d2 = b instanceof Date ? b : new Date(b);
  return Math.abs(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

export function lastNMonths(n, referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
    result.push({
      date: d,
      label: formatMonthLabel(d),
      month: d.getUTCMonth(),
      year: d.getUTCFullYear(),
    });
  }
  return result;
}

// ─── Schemas de output ───────────────────────────────────────────────

/**
 * Indicador resumido de vitrines.
 */
export const exhibitionSummarySchema = z.object({
  type: z.literal('exhibition_summary'),
  totalExhibitions: z.number().int().min(0),
  scheduled: z.number().int().min(0),
  completed: z.number().int().min(0),
  cancelled: z.number().int().min(0),
  adoptionRate: z.number().min(0).max(1),
  totalAnimals: z.number().int().min(0),
  totalParticipants: z.number().int().min(0),
  avgParticipantsPerEvent: z.number().min(0),
  byMonth: z.array(z.object({
    label: z.string(),
    month: z.number(),
    year: z.number(),
    exhibitions: z.number().int().min(0),
    participants: z.number().int().min(0),
    adoptions: z.number().int().min(0),
  })),
});

/**
 * Indicadores por vitrine.
 */
export const exhibitionDetailSchema = z.object({
  type: z.literal('exhibition_detail'),
  exhibitions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    status: z.string(),
    participants: z.number().int().min(0),
    animals: z.number().int().min(0),
    adoptionRate: z.number().min(0).max(1),
    transports: z.number().int().min(0),
  })),
});

/**
 * Indicador resumido de voluntários.
 */
export const volunteerSummarySchema = z.object({
  type: z.literal('volunteer_summary'),
  totalVolunteers: z.number().int().min(0),
  activeVolunteers: z.number().int().min(0),
  totalParticipations: z.number().int().min(0),
  totalTransportsIda: z.number().int().min(0),
  totalTransportsVolta: z.number().int().min(0),
  totalHours: z.number().min(0),
  avgHoursPerVolunteer: z.number().min(0),
  avgParticipationsPerVolunteer: z.number().min(0),
  byMonth: z.array(z.object({
    label: z.string(),
    month: z.number(),
    year: z.number(),
    participations: z.number().int().min(0),
    transports: z.number().int().min(0),
    hours: z.number().min(0),
  })),
});

/**
 * Indicadores por voluntário.
 */
export const volunteerDetailSchema = z.object({
  type: z.literal('volunteer_detail'),
  volunteers: z.array(z.object({
    uid: z.string(),
    name: z.string(),
    totalParticipations: z.number().int().min(0),
    totalHours: z.number().min(0),
    transports: z.number().int().min(0),
    lastParticipation: z.string().nullable(),
    frequency: z.number().min(0).max(1), // % de eventos que participou
  })),
});

// ─── Helpers de computação ────────────────────────────────────────────

/**
 * Filtra items por data dentro de um período.
 */
export function filterByPeriod(items, dateField, start, end) {
  return items.filter((item) => {
    const raw = item[dateField];
    if (!raw) return false;
    const d = raw?.toDate ? parseTimestamp(raw) : new Date(raw);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/**
 * Computa o resumo de vitrines.
 *
 * @param {object[]} exhibitions - lista de exhibitions
 * @param {object[]} participations - volunteer_participations
 * @param {Date} start
 * @param {Date} end
 * @param {number} nMonths
 */
export function computeExhibitionSummary(exhibitions, participations, start, end, nMonths = 12) {
  const months = lastNMonths(nMonths, end);
  const now = end || new Date();

  // Filtra por período
  const inPeriod = exhibitions.filter((e) => {
    if (!start && !end) return true;
    const d = e.datetime_start ? new Date(e.datetime_start) : null;
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });

  // Contadores
  const totalExhibitions = inPeriod.length;
  const scheduled = inPeriod.filter((e) => e.status === 'scheduled').length;
  const completed = inPeriod.filter((e) => e.status === 'completed').length;
  const cancelled = inPeriod.filter((e) => e.status === 'cancelled').length;

  // Participantes por vitrine
  const exhibitionIds = new Set(inPeriod.map((e) => e.id));
  const relevantParticipations = participations.filter((p) =>
    exhibitionIds.has(p.exhibition_id),
  );
  const totalParticipants = relevantParticipations.length;

  // Adoções: exhibitions com post_event_log
  let totalAdoptions = 0;
  let totalAnimals = 0;
  for (const ex of inPeriod) {
    const petIds = ex.pet_ids || [];
    const externalPets = ex.external_pets || [];
    const total = petIds.length + externalPets.length;
    totalAnimals += total;
    const log = ex.post_event_log || [];
    const adopted = log.filter((l) => l.outcome === 'adopted').length;
    totalAdoptions += adopted;
  }

  const adoptionRate = totalExhibitions > 0 ? totalAdoptions / totalExhibitions : 0;
  const avgParticipantsPerEvent = totalExhibitions > 0
    ? Math.round((totalParticipants / totalExhibitions) * 10) / 10
    : 0;

  // Por mês
  const byMonth = months.map(({ date, label, month, year }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const monthExhibitions = exhibitions.filter((e) => {
      const d = e.datetime_start ? new Date(e.datetime_start) : null;
      return d && d >= monthStart && d <= monthEnd;
    });
    const exIds = new Set(monthExhibitions.map((e) => e.id));
    const monthParts = participations.filter((p) => exIds.has(p.exhibition_id));
    let monthAdoptions = 0;
    for (const ex of monthExhibitions) {
      const log = ex.post_event_log || [];
      monthAdoptions += log.filter((l) => l.outcome === 'adopted').length;
    }
    return {
      label,
      month,
      year,
      exhibitions: monthExhibitions.length,
      participants: monthParts.length,
      adoptions: monthAdoptions,
    };
  });

  return exhibitionSummarySchema.parse({
    type: 'exhibition_summary',
    totalExhibitions,
    scheduled,
    completed,
    cancelled,
    adoptionRate,
    totalAnimals,
    totalParticipants,
    avgParticipantsPerEvent,
    byMonth,
  });
}

/**
 * Computa indicadores por vitrine.
 */
export function computeExhibitionDetail(exhibitions, participations) {
  const exhibitionIds = new Set(exhibitions.map((e) => e.id));
  const partsByExhibition = participations.reduce((acc, p) => {
    if (exhibitionIds.has(p.exhibition_id)) {
      acc[p.exhibition_id] = (acc[p.exhibition_id] || 0) + 1;
    }
    return acc;
  }, {});

  const detail = exhibitions.map((ex) => {
    const parts = partsByExhibition[ex.id] || 0;
    const petIds = ex.pet_ids || [];
    const externalPets = ex.external_pets || [];
    const animals = petIds.length + externalPets.length;
    const log = ex.post_event_log || [];
    const adopted = log.filter((l) => l.outcome === 'adopted').length;
    const transports = (ex.shifts || []).filter(
      (s) => ['transporte_ida', 'transporte_volta'].includes(s.role),
    ).length;
    return {
      id: ex.id,
      title: ex.title || 'Sem título',
      date: ex.datetime_start || '',
      status: ex.status || 'scheduled',
      participants: parts,
      animals,
      adoptionRate: animals > 0 ? adopted / animals : 0,
      transports,
    };
  });

  return exhibitionDetailSchema.parse({ type: 'exhibition_detail', exhibitions: detail });
}

/**
 * Computa o resumo de voluntários.
 */
export function computeVolunteerSummary(participations, start, end, nMonths = 12) {
  const months = lastNMonths(nMonths, end);

  // Filtra por período
  const inPeriod = participations.filter((p) => {
    if (!start && !end) return true;
    const d = p.created_at?.toDate ? parseTimestamp(p.created_at) : (p.created_at ? new Date(p.created_at) : null);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });

  const totalParticipations = inPeriod.length;
  const uniqueVolunteers = new Set(inPeriod.map((p) => p.volunteer_uid)).size;
  const totalTransportsIda = inPeriod.filter((p) => p.role === 'transporte_ida').length;
  const totalTransportsVolta = inPeriod.filter((p) => p.role === 'transporte_volta').length;

  // Horas: check_out - check_in
  let totalHours = 0;
  for (const p of inPeriod) {
    if (p.check_out && p.check_in) {
      const out = p.check_out?.toDate ? parseTimestamp(p.check_out) : new Date(p.check_out);
      const inn = p.check_in?.toDate ? parseTimestamp(p.check_in) : new Date(p.check_in);
      const hours = (out.getTime() - inn.getTime()) / (1000 * 60 * 60);
      if (hours > 0 && hours < 48) totalHours += hours; // sanity cap: 48h
    }
  }

  const avgHoursPerVolunteer = uniqueVolunteers > 0
    ? Math.round((totalHours / uniqueVolunteers) * 10) / 10
    : 0;
  const avgParticipationsPerVolunteer = uniqueVolunteers > 0
    ? Math.round((totalParticipations / uniqueVolunteers) * 10) / 10
    : 0;

  // Por mês
  const byMonth = months.map(({ date, label, month, year }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const monthParts = inPeriod.filter((p) => {
      const d = p.created_at?.toDate ? parseTimestamp(p.created_at) : (p.created_at ? new Date(p.created_at) : null);
      return d && d >= monthStart && d <= monthEnd;
    });
    let monthHours = 0;
    for (const p of monthParts) {
      if (p.check_out && p.check_in) {
        const out = p.check_out?.toDate ? parseTimestamp(p.check_out) : new Date(p.check_out);
        const inn = p.check_in?.toDate ? parseTimestamp(p.check_in) : new Date(p.check_in);
        const h = (out.getTime() - inn.getTime()) / (1000 * 60 * 60);
        if (h > 0 && h < 48) monthHours += h;
      }
    }
    return {
      label,
      month,
      year,
      participations: monthParts.length,
      transports: monthParts.filter((p) => ['transporte_ida', 'transporte_volta'].includes(p.role)).length,
      hours: Math.round(monthHours * 10) / 10,
    };
  });

  return volunteerSummarySchema.parse({
    type: 'volunteer_summary',
    totalVolunteers: uniqueVolunteers,
    activeVolunteers: _countActiveVolunteers(participations, 90),
    totalParticipations,
    totalTransportsIda,
    totalTransportsVolta,
    totalHours: Math.round(totalHours * 10) / 10,
    avgHoursPerVolunteer,
    avgParticipationsPerVolunteer,
    byMonth,
  });
}

/**
 * Conta voluntários com pelo menos 1 participação nos últimos N dias.
 * @param {Array<object>} participations
 * @param {number} [days=90]
 * @returns {number}
 */
function _countActiveVolunteers(participations, days = 90) {
  if (!Array.isArray(participations) || participations.length === 0) return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const uids = new Set();
  for (const p of participations) {
    const d = p.created_at?.toDate ? parseTimestamp(p.created_at) : (p.created_at ? new Date(p.created_at) : null);
    if (!d) continue;
    if (d.getTime() >= cutoff && p.volunteer_uid) uids.add(p.volunteer_uid);
  }
  return uids.size;
}

/**
 * Computa indicadores por voluntário.
 */
export function computeVolunteerDetail(participations, volunteerProfiles) {
  const profileMap = new Map(volunteerProfiles.map((p) => [p.uid || p.id, p]));

  const uidGroups = participations.reduce((acc, p) => {
    const uid = p.volunteer_uid;
    if (!uid) return acc;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(p);
    return acc;
  }, {});

  const volunteers = Object.entries(uidGroups).map(([uid, parts]) => {
    const profile = profileMap.get(uid) || {};
    const name = profile.display_name || profile.full_name || uid;
    const transports = parts.filter((p) => ['transporte_ida', 'transporte_volta'].includes(p.role)).length;
    let hours = 0;
    let lastDate = null;
    for (const p of parts) {
      if (p.check_out && p.check_in) {
        const out = p.check_out?.toDate ? parseTimestamp(p.check_out) : new Date(p.check_out);
        const inn = p.check_in?.toDate ? parseTimestamp(p.check_in) : new Date(p.check_in);
        const h = (out.getTime() - inn.getTime()) / (1000 * 60 * 60);
        if (h > 0 && h < 48) hours += h;
      }
      const d = p.created_at?.toDate ? parseTimestamp(p.created_at) : (p.created_at ? new Date(p.created_at) : null);
      if (d && (!lastDate || d > lastDate)) lastDate = d;
    }
    return {
      uid,
      name,
      totalParticipations: parts.length,
      totalHours: Math.round(hours * 10) / 10,
      transports,
      lastParticipation: lastDate ? lastDate.toISOString() : null,
      frequency: 0, // placeholder: calcular vs total de eventos do abrigo
    };
  });

  // Ordena por participações DESC
  volunteers.sort((a, b) => b.totalParticipations - a.totalParticipations);

  return volunteerDetailSchema.parse({ type: 'volunteer_detail', volunteers });
}
