/**
 * @fileoverview Domínio: Relatórios de Abrigos (Fase 16).
 *
 * Define:
 *  - Schemas Zod para os tipos de relatório
 *  - Helpers puros que computam métricas a partir de dados agregados
 *  - Funções de formatação para charts (recharts)
 *
 * Read-only: não há coleções próprias — os relatórios agregam dados das
 * coleções existentes (pets, adoption_workflow, fosters, post_adoption).
 *
 * Os helpers são puros: recebem dados já fetcheados, retornam estruturas
 * prontas para renderização (sem side-effects, testáveis em isolamento).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 16 (SHELTER_REPORTS)
 */

import { z } from 'zod';
import { parseTimestamp } from '@/core/utils/timestamp';

// ─── Tipos de relatório ────────────────────────────────────────────────

/**
 * Tipos disponíveis. Adicionar aqui também adiciona tab no ReportsTab.
 */
export const REPORT_TYPES = Object.freeze([
  'rescues',          // Resgates por período
  'adoptions',        // Adoções por período
  'comparative',      // Comparativo anual
  'balance',          // Saldo mensal de animais
  'returns',          // Devoluções
  'time_to_adoption', // Tempo médio até adoção
  'time_in_shelter',  // Tempo médio no abrigo
  'fosters',          // Animais em lar temporário
  'spay_neuter',      // Castrados / não castrados
  'medication_adherence', // Adesão à medicação por animal (TASK-141)
]);

export const REPORT_TYPE_LABELS = Object.freeze({
  rescues: 'Resgates',
  adoptions: 'Adoções',
  comparative: 'Comparativo Anual',
  balance: 'Saldo Mensal',
  returns: 'Devoluções',
  time_to_adoption: 'Tempo até Adoção',
  time_in_shelter: 'Tempo no Abrigo',
  fosters: 'Lares Temporários',
  spay_neuter: 'Castrações',
  medication_adherence: 'Adesão à Medicação',
});

// ─── Período ───────────────────────────────────────────────────────────

export const PERIOD_TYPES = Object.freeze(['month', 'quarter', 'year', 'all']);
export const PERIOD_LABELS = Object.freeze({
  month: 'Mensal',
  quarter: 'Trimestral',
  year: 'Anual',
  all: 'Todo o período',
});

/**
 * Janela de um período, dado o tipo e uma data de referência.
 *
 * @param {'month'|'quarter'|'year'|'all'} periodType
 * @param {Date} [referenceDate] - default: now
 * @returns {{ start: Date, end: Date }}
 */
export function periodRange(periodType, referenceDate = new Date()) {
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

// ─── Schemas de input/output ──────────────────────────────────────────

/**
 * Input para fetchReports().
 */
export const reportsQuerySchema = z.object({
  clubId: z.string().min(1).max(128),
  periodType: z.enum(PERIOD_TYPES).default('month'),
  referenceDate: z.string().datetime().optional(), // ISO string, default now
  reportTypes: z.array(z.enum(REPORT_TYPES)).default(Object.values(REPORT_TYPES)),
}).strict();

/**
 * Estrutura de uma barra do chart (dados mensais).
 */
export const chartBarSchema = z.object({
  label: z.string(),         // ex: 'Jan 2025'
  month: z.number(),        // 0-11
  year: z.number(),         // 4 dígitos
  rescues: z.number().int().min(0),
  adoptions: z.number().int().min(0),
  returns: z.number().int().min(0),
  fosters: z.number().int().min(0),
});

/**
 * Dados de rescue report.
 */
export const rescuesReportSchema = z.object({
  type: z.literal('rescues'),
  total: z.number().int().min(0),
  byMonth: z.array(chartBarSchema),
  bySpecies: z.object({
    dog: z.number().int().min(0),
    cat: z.number().int().min(0),
    other: z.number().int().min(0),
  }),
  byIntakeType: z.record(z.string(), z.number().int().min(0)),
});

/**
 * Dados de adoption report.
 */
export const adoptionsReportSchema = z.object({
  type: z.literal('adoptions'),
  total: z.number().int().min(0),
  byMonth: z.array(chartBarSchema),
  byStatus: z.record(z.string(), z.number().int().min(0)),
  returnsCount: z.number().int().min(0),
});

/**
 * Comparativo anual.
 */
export const comparativeReportSchema = z.object({
  type: z.literal('comparative'),
  years: z.array(z.object({
    year: z.number().int(),
    rescues: z.number().int().min(0),
    adoptions: z.number().int().min(0),
    returns: z.number().int().min(0),
    balance: z.number().int(), // adoptions - returns
  })),
});

/**
 * Saldo mensal de animais (entradas - saídas por mês).
 */
export const balanceReportSchema = z.object({
  type: z.literal('balance'),
  months: z.array(z.object({
    label: z.string(),
    month: z.number(),
    year: z.number(),
    intake: z.number().int().min(0),
    adoptions: z.number().int().min(0),
    transfers_out: z.number().int().min(0),
    deaths: z.number().int().min(0),
    returns: z.number().int().min(0),
    balance: z.number().int(),
  })),
  totalIntake: z.number().int(),
  totalAdoptions: z.number().int(),
  totalReturns: z.number().int(),
  netBalance: z.number().int(),
});

/**
 * Devoluções.
 */
export const returnsReportSchema = z.object({
  type: z.literal('returns'),
  total: z.number().int().min(0),
  byMonth: z.array(z.object({
    label: z.string(),
    month: z.number(),
    year: z.number(),
    count: z.number().int().min(0),
  })),
  byReason: z.record(z.string(), z.number().int().min(0)),
  rate: z.number().min(0).max(1), // returns / adoptions
});

/**
 * Tempo médio até adoção.
 */
export const timeToAdoptionReportSchema = z.object({
  type: z.literal('time_to_adoption'),
  averageDays: z.number().min(0),
  medianDays: z.number().min(0),
  byMonth: z.array(z.object({
    label: z.string(),
    month: z.number(),
    year: z.number(),
    averageDays: z.number().min(0),
    count: z.number().int().min(0),
  })),
});

/**
 * Tempo médio no abrigo (pets disponíveis sem adoção).
 */
export const timeInShelterReportSchema = z.object({
  type: z.literal('time_in_shelter'),
  averageDays: z.number().min(0),
  medianDays: z.number().min(0),
  bySpecies: z.object({
    dog: z.object({ averageDays: z.number().min(0), count: z.number().int().min(0) }),
    cat: z.object({ averageDays: z.number().min(0), count: z.number().int().min(0) }),
    other: z.object({ averageDays: z.number().min(0), count: z.number().int().min(0) }),
  }),
});

/**
 * Lares temporários.
 */
export const fostersReportSchema = z.object({
  type: z.literal('fosters'),
  total: z.number().int().min(0),
  active: z.number().int().min(0),
  ended: z.number().int().min(0),
  byStatus: z.record(z.string(), z.number().int().min(0)),
  byEnvironment: z.record(z.string(), z.number().int().min(0)),
});

/**
 * Castrações.
 */
export const spayNeuterReportSchema = z.object({
  type: z.literal('spay_neuter'),
  totalPets: z.number().int().min(0),
  neutered: z.number().int().min(0),
  notNeutered: z.number().int().min(0),
  neuteredRate: z.number().min(0).max(1),
  pending: z.number().int().min(0),
  bySpecies: z.object({
    dog: z.object({ neutered: z.number().int().min(0), total: z.number().int().min(0) }),
    cat: z.object({ neutered: z.number().int().min(0), total: z.number().int().min(0) }),
    other: z.object({ neutered: z.number().int().min(0), total: z.number().int().min(0) }),
  }),
});

// ─── Helpers de date ──────────────────────────────────────────────────

/**
 * Nome do mês abreviado em português (indexado 0).
 */
const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Nome do mês completo em português.
 */
const MONTH_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Formata um Date para string de label mensal (ex: "Jan 2025").
 */
export function formatMonthLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Lista os N meses anteriores (inclusive o atual).
 *
 * @param {number} n - quantos meses incluir
 * @param {Date} [referenceDate]
 * @returns {Array<{ date: Date, label: string, month: number, year: number }>}
 */
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

/**
 * Lista anos entre startYear e endYear (inclusive).
 */
export function yearRange(startYear, endYear) {
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  return years;
}

/**
 * Dias entre duas datas (absoluto).
 */
export function daysBetween(a, b) {
  const d1 = a instanceof Date ? a : new Date(a);
  const d2 = b instanceof Date ? b : new Date(b);
  return Math.abs(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Mediana de um array de números.
 */
export function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Helpers de computação ─────────────────────────────────────────────

/**
 * Conta pets num array que tiveram rescue_date dentro de um período.
 */
export function countPetsInPeriod(pets, start, end) {
  return pets.filter((p) => {
    if (!p.rescue_date) return false;
    const d = new Date(p.rescue_date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/**
 * Conta adoções finalizadas num array de applications.
 */
export function countAdoptionsInPeriod(apps, start, end) {
  return apps.filter((a) => {
    if (a.status !== 'adoption_completed') return false;
    if (!a.decided_at) return false;
    const d = new Date(a.decided_at);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/**
 * Conta devoluções num array de post-adoptions.
 */
export function countReturnsInPeriod(posts, start, end) {
  return posts.filter((p) => {
    if (p.status !== 'returned') return false;
    if (!p.returned_at) return false;
    const d = new Date(p.returned_at);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/**
 * Agrupa pets por espécie.
 */
export function groupBySpecies(pets) {
  return pets.reduce((acc, p) => {
    const s = p.species || 'other';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { dog: 0, cat: 0, other: 0 });
}

/**
 * Computa o report de resgates.
 *
 * @param {object[]} pets - lista de pets do abrigo
 * @param {Date} start
 * @param {Date} end
 * @param {number} nMonths
 * @returns {object} rescuesReportSchema
 */
export function computeRescuesReport(pets, start, end, nMonths = 12) {
  const months = lastNMonths(nMonths, end);

  const byMonth = months.map(({ date, label, month, year }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const inMonth = countPetsInPeriod(pets, monthStart, monthEnd);
    return {
      label,
      month,
      year,
      rescues: inMonth.length,
      adoptions: 0,
      returns: 0,
      fosters: 0,
    };
  });

  const total = countPetsInPeriod(pets, start, end).length;
  const inPeriod = countPetsInPeriod(pets, start, end);
  const bySpecies = groupBySpecies(inPeriod);

  // Intake type distribution
  const byIntakeType = inPeriod.reduce((acc, p) => {
    const t = p.intake_type || 'rescue';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return rescuesReportSchema.parse({
    type: 'rescues',
    total,
    byMonth,
    bySpecies,
    byIntakeType,
  });
}

/**
 * Computa o report de adoções.
 */
export function computeAdoptionsReport(apps, posts, start, end, nMonths = 12) {
  const months = lastNMonths(nMonths, end);

  const byMonth = months.map(({ date, label, month, year }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const adpt = countAdoptionsInPeriod(apps, monthStart, monthEnd);
    const ret = countReturnsInPeriod(posts, monthStart, monthEnd);
    return {
      label,
      month,
      year,
      rescues: 0,
      adoptions: adpt.length,
      returns: ret.length,
      fosters: 0,
    };
  });

  const total = countAdoptionsInPeriod(apps, start, end).length;
  const inPeriod = countAdoptionsInPeriod(apps, start, end);
  const returnsCount = countReturnsInPeriod(posts, start, end).length;

  const byStatus = inPeriod.reduce((acc, a) => {
    const s = a.status || 'adoption_completed';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return adoptionsReportSchema.parse({
    type: 'adoptions',
    total,
    byMonth,
    byStatus,
    returnsCount,
  });
}

/**
 * Computa comparativo anual (resgates, adoções, devoluções por ano).
 */
export function computeComparativeReport(pets, apps, posts, years) {
  const results = years.map((year) => {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const rescues = countPetsInPeriod(pets, yearStart, yearEnd).length;
    const adoptions = countAdoptionsInPeriod(apps, yearStart, yearEnd).length;
    const returns = countReturnsInPeriod(posts, yearStart, yearEnd).length;
    return {
      year,
      rescues,
      adoptions,
      returns,
      balance: adoptions - returns,
    };
  });

  return comparativeReportSchema.parse({ type: 'comparative', years: results });
}

/**
 * Computa saldo mensal de animais.
 */
export function computeBalanceReport(pets, apps, posts, nMonths = 12, referenceDate = new Date()) {
  const months = lastNMonths(nMonths, referenceDate);

  const monthsData = months.map(({ label, month, year }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    // Intake: pets resgatados no mês
    const intake = countPetsInPeriod(pets, monthStart, monthEnd).length;

    // Adoções no mês
    const adoptions = countAdoptionsInPeriod(apps, monthStart, monthEnd).length;

    // Devoluções no mês
    const returns = countReturnsInPeriod(posts, monthStart, monthEnd).length;

    // Mortes no mês (status = 'deceased' com deceased_at no mês)
    const deaths = pets.filter((p) => {
      if (!p.deceased_at) return false;
      const d = new Date(p.deceased_at);
      return d >= monthStart && d <= monthEnd;
    }).length;

    // Transfers out: foster ended com reason=transferred no mês
    const transfers_out = posts.filter((post) => {
      if (post.status !== 'returned') return false;
      if (post.return_reason !== 'transferred') return false;
      const d = post.returned_at ? new Date(post.returned_at) : null;
      return d && d >= monthStart && d <= monthEnd;
    }).length;

    const balance = intake - adoptions - returns - deaths - transfers_out;

    return {
      label,
      month,
      year,
      intake,
      adoptions,
      transfers_out,
      deaths,
      returns,
      balance,
    };
  });

  const totals = monthsData.reduce((acc, m) => ({
    intake: acc.intake + m.intake,
    adoptions: acc.adoptions + m.adoptions,
    returns: acc.returns + m.returns,
    netBalance: acc.netBalance + m.balance,
  }), { intake: 0, adoptions: 0, returns: 0, netBalance: 0 });

  return balanceReportSchema.parse({
    type: 'balance',
    months: monthsData,
    totalIntake: totals.intake,
    totalAdoptions: totals.adoptions,
    totalReturns: totals.returns,
    netBalance: totals.netBalance,
  });
}

/**
 * Computa tempo médio até adoção.
 */
export function computeTimeToAdoptionReport(apps, nMonths = 12, referenceDate = new Date()) {
  const months = lastNMonths(nMonths, referenceDate);

  const byMonth = months.map(({ label, month, year }) => {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const monthAdoptions = countAdoptionsInPeriod(apps, monthStart, monthEnd);

    // Para cada adoção finalizada, calcular dias entre created_at e decided_at
    const days = monthAdoptions
      .map((a) => {
        if (!a.created_at || !a.decided_at) return null;
        const created = a.created_at?.toDate ? parseTimestamp(a.created_at) : new Date(a.created_at);
        const decided = a.decided_at?.toDate ? parseTimestamp(a.decided_at) : new Date(a.decided_at);
        return daysBetween(created, decided);
      })
      .filter((d) => d !== null && d >= 0);

    const avg = days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : 0;

    return {
      label,
      month,
      year,
      averageDays: avg,
      count: days.length,
    };
  });

  // Média global
  const allCompleted = apps.filter((a) => a.status === 'adoption_completed' && a.created_at && a.decided_at);
  const allDays = allCompleted.map((a) => {
    const created = a.created_at?.toDate ? parseTimestamp(a.created_at) : new Date(a.created_at);
    const decided = a.decided_at?.toDate ? parseTimestamp(a.decided_at) : new Date(a.decided_at);
    return daysBetween(created, decided);
  }).filter((d) => d >= 0);

  return timeToAdoptionReportSchema.parse({
    type: 'time_to_adoption',
    averageDays: allDays.length > 0 ? Math.round(allDays.reduce((s, d) => s + d, 0) / allDays.length) : 0,
    medianDays: Math.round(median(allDays)),
    byMonth,
  });
}

/**
 * Computa tempo médio no abrigo (pets atualmente disponíveis).
 */
export function computeTimeInShelterReport(pets) {
  const now = new Date();
  const available = pets.filter((p) =>
    ['in_shelter', 'available'].includes(p.status || p.situacao)
  );

  const bySpecies = {};
  for (const sp of ['dog', 'cat', 'other']) {
    const spPets = available.filter((p) => (p.species || 'other') === sp);
    const days = spPets
      .map((p) => {
        if (!p.rescue_date && !p.created_at) return null;
        const d = p.rescue_date?.toDate
          ? parseTimestamp(p.rescue_date)
          : (p.created_at?.toDate ? parseTimestamp(p.created_at) : new Date(p.created_at));
        return daysBetween(d, now);
      })
      .filter((d) => d !== null);
    bySpecies[sp] = {
      averageDays: days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : 0,
      count: days.length,
    };
  }

  const allDays = available
    .map((p) => {
      if (!p.rescue_date && !p.created_at) return null;
      const d = p.rescue_date?.toDate
        ? parseTimestamp(p.rescue_date)
        : (p.created_at?.toDate ? parseTimestamp(p.created_at) : new Date(p.created_at));
      return daysBetween(d, now);
    })
    .filter((d) => d !== null);

  return timeInShelterReportSchema.parse({
    type: 'time_in_shelter',
    averageDays: allDays.length > 0 ? Math.round(allDays.reduce((s, d) => s + d, 0) / allDays.length) : 0,
    medianDays: Math.round(median(allDays)),
    bySpecies,
  });
}

/**
 * Computa report de lares temporários.
 */
export function computeFostersReport(fosters) {
  const total = fosters.length;
  const active = fosters.filter((f) => f.status === 'active').length;
  const ended = fosters.filter((f) => ['ended', 'cancelled', 'interrupted'].includes(f.status)).length;

  const byStatus = fosters.reduce((acc, f) => {
    const s = f.status || 'active';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const byEnvironment = fosters.reduce((acc, f) => {
    const e = f.environment || f.housing_type || 'unknown';
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});

  return fostersReportSchema.parse({
    type: 'fosters',
    total,
    active,
    ended,
    byStatus,
    byEnvironment,
  });
}

/**
 * Computa report de castrações.
 */
export function computeSpayNeuterReport(pets) {
  const total = pets.length;
  const neutered = pets.filter((p) => !!p.neutered_at || p.neutered === true);
  const notNeutered = pets.filter((p) => !p.neutered_at && p.neutered !== true);

  const bySpecies = {};
  for (const sp of ['dog', 'cat', 'other']) {
    const spPets = pets.filter((p) => (p.species || 'other') === sp);
    const spNeutered = spPets.filter((p) => !!p.neutered_at || p.neutered === true);
    bySpecies[sp] = {
      neutered: spNeutered.length,
      total: spPets.length,
    };
  }

  return spayNeuterReportSchema.parse({
    type: 'spay_neuter',
    totalPets: total,
    neutered: neutered.length,
    notNeutered: notNeutered.length,
    neuteredRate: total > 0 ? Math.round((neutered.length / total) * 1000) / 1000 : 0,
    pending: notNeutered.length,
    bySpecies,
  });
}

/**
 * Exporta um array de objetos para CSV.
 *
 * @param {object[]} data
 * @param {string} filename
 */
export function exportToCSV(data, filename = 'relatorio.csv') {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return String(v);
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Medicação: Adesão (TASK-141) ───────────────────────────────────────

/**
 * Schema do relatório de adesão à medicação.
 * - `adherencePct`: 0-100 (% de doses administradas no prazo)
 * - `onTime`: doses administradas no prazo
 * - `late`: doses administradas com atraso (mas não puladas)
 * - `missed`: doses não administradas (pulados ou vencidas sem registro)
 * - `perPet`: array com breakdown por animal
 */
export const medicationAdherenceReportSchema = z.object({
  type: z.literal('medication_adherence'),
  totalDoses: z.number().int().min(0),
  onTime: z.number().int().min(0),
  late: z.number().int().min(0),
  missed: z.number().int().min(0),
  skipped: z.number().int().min(0),
  adherencePct: z.number().min(0).max(100),
  perPet: z.array(z.object({
    pet_id: z.string(),
    pet_name: z.string().optional(),
    totalDoses: z.number().int().min(0),
    onTime: z.number().int().min(0),
    late: z.number().int().min(0),
    missed: z.number().int().min(0),
    adherencePct: z.number().min(0).max(100),
  })),
});

/**
 * Computa a taxa de adesão à medicação por animal (TASK-141).
 *
 * Critérios:
 *  - **onTime** (verde): dose administrada em até 30 min após scheduled_at
 *  - **late** (amarelo): dose administrada após 30 min de atraso
 *  - **missed** (vermelho): dose não administrada (skipped=true OU
 *    scheduled_at < now - 24h sem administered_at)
 *  - **skipped** (cinza): dose explicitamente pulada
 *
 * Compliance: (onTime + late*0.5) / total
 *  - On-time = 100% credit
 *  - Late = 50% credit
 *  - Missed/Skipped = 0% credit
 *
 * Alerta: se adherencePct < 80% → abrigo precisa de mais staff.
 */
export function computeMedicationAdherenceReport({ medications, doses, pets }) {
  if (!medications || medications.length === 0) {
    return medicationAdherenceReportSchema.parse({
      type: 'medication_adherence',
      totalDoses: 0, onTime: 0, late: 0, missed: 0, skipped: 0,
      adherencePct: 0, perPet: [],
    });
  }

  const ON_TIME_WINDOW_MS = 30 * 60 * 1000; // 30 min
  const now = Date.now();
  const petById = (pets || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

  let totalDoses = 0;
  let onTime = 0;
  let late = 0;
  let missed = 0;
  let skipped = 0;
  const perPetMap = new Map();

  for (const med of medications) {
    const medDoses = (doses || []).filter((d) => d.medication_id === med.id || d.medication_id === med.medId);
    const petId = med.pet_id || med.petId;
    if (!petId) continue;

    if (!perPetMap.has(petId)) {
      perPetMap.set(petId, {
        pet_id: petId,
        pet_name: petById[petId]?.name || 'Pet',
        totalDoses: 0, onTime: 0, late: 0, missed: 0,
      });
    }
    const perPetRow = perPetMap.get(petId);

    for (const dose of medDoses) {
      totalDoses++;
      perPetRow.totalDoses++;

      if (dose.skipped) {
        skipped++;
        continue;
      }

      const scheduled = dose.scheduled_at && dose.scheduled_at.toMillis
        ? dose.scheduled_at.toMillis()
        : (typeof dose.scheduled_at === 'string' ? new Date(dose.scheduled_at).getTime() : null);
      const administered = dose.administered_at
        ? (dose.administered_at.toMillis
            ? dose.administered_at.toMillis()
            : new Date(dose.administered_at).getTime())
        : null;

      if (administered && scheduled !== null) {
        const diff = administered - scheduled;
        if (diff <= ON_TIME_WINDOW_MS) {
          onTime++;
          perPetRow.onTime++;
        } else {
          late++;
          perPetRow.late++;
        }
      } else if (!administered && scheduled !== null && scheduled < now - 24 * 60 * 60 * 1000) {
        missed++;
        perPetRow.missed++;
      }
    }
  }

  // Calcula compliance por pet
  const perPet = Array.from(perPetMap.values()).map((p) => ({
    ...p,
    adherencePct: p.totalDoses > 0
      ? Math.round(((p.onTime + p.late * 0.5) / p.totalDoses) * 100)
      : 0,
  }));

  const adherencePct = totalDoses > 0
    ? Math.round(((onTime + late * 0.5) / totalDoses) * 100)
    : 0;

  return medicationAdherenceReportSchema.parse({
    type: 'medication_adherence',
    totalDoses, onTime, late, missed, skipped,
    adherencePct, perPet,
  });
}
