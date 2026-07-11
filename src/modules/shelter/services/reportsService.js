/**
 * @fileoverview Serviço: Relatórios de Abrigos (Fase 16).
 *
 * Implementa:
 *  - `getReportsSummary(clubId, options)` — busca dados históricos das
 *    collections do abrigo e computa todos os relatórios via helpers puros
 *    em `reports.js`.
 *  - Read-only: não cria, atualiza nem deleta documentos no Firestore.
 *
 * Multi-tenant: TODAS as queries filtram por `shelter_owner_club_id`
 * (pets na raiz) ou pelo abrigo (`clubs/{clubId}/…` subcoleções).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 16 (SHELTER_REPORTS)
 */

import {
  collection, collectionGroup, doc, getDoc, getDocs, query as fsQuery,
  where, limit, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import {
  reportsQuerySchema,
  periodRange,
  computeRescuesReport,
  computeAdoptionsReport,
  computeComparativeReport,
  computeBalanceReport,
  computeTimeToAdoptionReport,
  computeTimeInShelterReport,
  computeFostersReport,
  computeSpayNeuterReport,
} from '@/modules/shelter/domain/operational/reports';

const CLUBS_COLLECTION = 'clubs';
const PETS_COLLECTION = 'pets';
const ADOPTION_COLLECTION = 'adoption_workflow';
const POST_ADOPTION_COLLECTION = 'post_adoption';
const FOSTERS_COLLECTION = 'fosters';
const MEDICATIONS_COLLECTION = 'medications';

const MAX_PETS = 5000;
const MAX_APPS = 2000;
const MAX_POSTS = 2000;
const MAX_FOSTERS = 1000;

// ─── helpers internos ───────────────────────────────────────────────────

/**
 * Filtra por shelter_club_id (pets na raiz) ou por clubId (subcoleções).
 * Pets que pertencem a outro abrigo são descartados.
 */
function filterByTenant(items, clubId, idField = 'shelter_club_id') {
  return items.filter((item) => item[idField] === clubId);
}

/**
 * Filtra por período (start/end podem ser null = sem filtro).
 */
function filterByDateRange(items, dateField, start, end) {
  if (!start && !end) return items;
  return items.filter((item) => {
    const raw = item[dateField];
    if (!raw) return false;
    const d = raw?.toDate ? raw.toDate() : new Date(raw);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

// ─── fetchers por coleção ──────────────────────────────────────────────

/**
 * Busca pets do abrigo (raiz). Limita a MAX_PETS para evitar memory blow.
 *
 * @param {string} clubId
 * @returns {Promise<object[]>}
 */
async function fetchPets(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, PETS_COLLECTION),
      where('shelter_owner_club_id', '==', clubId),
      limit(MAX_PETS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('reportsService.fetchPets', { clubId, err: String(err) });
    return [];
  }
}

/**
 * Busca applications de adoção do abrigo (subcoleção).
 */
async function fetchAdoptions(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, CLUBS_COLLECTION, clubId, ADOPTION_COLLECTION),
      limit(MAX_APPS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('reportsService.fetchAdoptions', { clubId, err: String(err) });
    return [];
  }
}

/**
 * Busca acompanhamentos pós-adoção (subcoleção).
 */
async function fetchPostAdoptions(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, CLUBS_COLLECTION, clubId, POST_ADOPTION_COLLECTION),
      limit(MAX_POSTS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('reportsService.fetchPostAdoptions', { clubId, err: String(err) });
    return [];
  }
}

/**
 * Busca placements de lar temporário (subcoleção).
 */
async function fetchFosters(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, CLUBS_COLLECTION, clubId, FOSTERS_COLLECTION),
      limit(MAX_FOSTERS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('reportsService.fetchFosters', { clubId, err: String(err) });
    return [];
  }
}

// ─── API pública ────────────────────────────────────────────────────────

/**
 * Busca e computa todos (ou um subconjunto) de relatórios para um abrigo.
 *
 * @param {string} clubId
 * @param {object} [options]
 * @param {'month'|'quarter'|'year'|'all'} [options.periodType]
 * @param {string} [options.referenceDate] - ISO string
 * @param {string[]} [options.reportTypes] - subconjunto de REPORT_TYPES
 * @returns {Promise<object>} - mapa de { [type]: reportData }
 */
export async function getReportsSummary(clubId, options = {}) {
  if (!db) {
    return { errors: { _init: 'db_unavailable' } };
  }

  const parsed = reportsQuerySchema.parse({ clubId, ...options });
  const { periodType, referenceDate: refDateStr } = parsed;
  const referenceDate = refDateStr ? new Date(refDateStr) : new Date();
  const { start, end } = periodRange(periodType, referenceDate);

  // Fetch todos os dados em paralelo (as collections são independentes)
  const [pets, adoptions, postAdoptions, fosters] = await Promise.all([
    fetchPets(clubId),
    fetchAdoptions(clubId),
    fetchPostAdoptions(clubId),
    fetchFosters(clubId),
  ]);

  // Filtra pets por período de referência (para reports que usam "todo período")
  // Para reports mensais, cada helper filtra internamente por mês
  const N_MONTHS = periodType === 'year' ? 12 : (periodType === 'quarter' ? 3 : 12);

  // Computa cada relatório solicitado
  const result = {};
  const types = new Set(parsed.reportTypes);

  if (types.has('rescues')) {
    try {
      result.rescues = computeRescuesReport(pets, start, end, N_MONTHS);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.rescues', { err: String(err) });
      result.rescues = { type: 'rescues', total: 0, byMonth: [], bySpecies: {}, byIntakeType: {}, _error: String(err) };
    }
  }

  if (types.has('adoptions')) {
    try {
      result.adoptions = computeAdoptionsReport(adoptions, postAdoptions, start, end, N_MONTHS);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.adoptions', { err: String(err) });
      result.adoptions = { type: 'adoptions', total: 0, byMonth: [], byStatus: {}, returnsCount: 0, _error: String(err) };
    }
  }

  if (types.has('comparative')) {
    try {
      const years = [];
      const now = referenceDate;
      for (let y = now.getUTCFullYear() - 3; y <= now.getUTCFullYear(); y++) {
        years.push(y);
      }
      result.comparative = computeComparativeReport(pets, adoptions, postAdoptions, years);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.comparative', { err: String(err) });
      result.comparative = { type: 'comparative', years: [], _error: String(err) };
    }
  }

  if (types.has('balance')) {
    try {
      result.balance = computeBalanceReport(pets, adoptions, postAdoptions, N_MONTHS, referenceDate);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.balance', { err: String(err) });
      result.balance = { type: 'balance', months: [], totalIntake: 0, totalAdoptions: 0, totalReturns: 0, netBalance: 0, _error: String(err) };
    }
  }

  if (types.has('returns')) {
    try {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(referenceDate);
        d.setUTCMonth(d.getUTCMonth() - i);
        const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
        const monthEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        const inMonth = postAdoptions.filter((p) => {
          if (p.status !== 'returned' || !p.returned_at) return false;
          const rd = p.returned_at?.toDate ? p.returned_at.toDate() : new Date(p.returned_at);
          return rd >= monthStart && rd <= monthEnd;
        });
        const byReason = inMonth.reduce((acc, p) => {
          const r = p.return_reason || 'não informada';
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {});
        const allReturns = postAdoptions.filter((p) => p.status === 'returned');
        const allAdoptions = adoptions.filter((a) => a.status === 'adoption_completed');
        const rate = allAdoptions.length > 0 ? allReturns.length / allAdoptions.length : 0;
        months.push({
          label: `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`,
          month: monthStart.getUTCMonth(),
          year: monthStart.getUTCFullYear(),
          count: inMonth.length,
        });
        result.returns = {
          type: 'returns',
          total: allReturns.length,
          byMonth: months,
          byReason,
          rate,
        };
      }
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.returns', { err: String(err) });
      result.returns = { type: 'returns', total: 0, byMonth: [], byReason: {}, rate: 0, _error: String(err) };
    }
  }

  if (types.has('time_to_adoption')) {
    try {
      result.time_to_adoption = computeTimeToAdoptionReport(adoptions, N_MONTHS, referenceDate);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.time_to_adoption', { err: String(err) });
      result.time_to_adoption = { type: 'time_to_adoption', averageDays: 0, medianDays: 0, byMonth: [], _error: String(err) };
    }
  }

  if (types.has('time_in_shelter')) {
    try {
      result.time_in_shelter = computeTimeInShelterReport(pets);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.time_in_shelter', { err: String(err) });
      result.time_in_shelter = { type: 'time_in_shelter', averageDays: 0, medianDays: 0, bySpecies: {}, _error: String(err) };
    }
  }

  if (types.has('fosters')) {
    try {
      result.fosters = computeFostersReport(fosters);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.fosters', { err: String(err) });
      result.fosters = { type: 'fosters', total: 0, active: 0, ended: 0, byStatus: {}, byEnvironment: {}, _error: String(err) };
    }
  }

  if (types.has('spay_neuter')) {
    try {
      result.spay_neuter = computeSpayNeuterReport(pets);
    } catch (err) {
      logger.warn('reportsService.getReportsSummary.spay_neuter', { err: String(err) });
      result.spay_neuter = { type: 'spay_neuter', totalPets: 0, neutered: 0, notNeutered: 0, neuteredRate: 0, pending: 0, bySpecies: {}, _error: String(err) };
    }
  }

  return result;
}
