/**
 * @fileoverview Serviço: Indicadores de Vitrines + Voluntários (Fase 17).
 *
 * Implementa:
 *  - `getIndicatorsSummary(clubId, options)` — busca exhibitions e
 *    volunteer_participations do abrigo e computa todos os indicadores
 *    via helpers puros em `indicators.js`.
 *
 * Read-only: não cria, atualiza nem deleta documentos no Firestore.
 *
 * Multi-tenant: TODAS as queries filtram por `shelter_club_id`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 17 (SHELTER_INDICATORS)
 */

import {
  collection, doc, getDocs, query as fsQuery, where, limit,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import {
  periodRangeInd,
  computeExhibitionSummary,
  computeExhibitionDetail,
  computeVolunteerSummary,
  computeVolunteerDetail,
} from '@/modules/shelter/domain/operational/indicators';

const CLUBS_COLLECTION = 'clubs';
const EXHIBITIONS_COLLECTION = 'exhibitions'; // raiz
const VOLUNTEERS_COLLECTION = 'volunteers';    // subcoleção do abrigo
const PARTICIPATIONS_COLLECTION = 'volunteer_participations'; // subcoleção do abrigo

const MAX_EXHIBITIONS = 500;
const MAX_PARTICIPATIONS = 5000;
const MAX_VOLUNTEERS = 500;

// ─── fetchers ────────────────────────────────────────────────────────

async function fetchExhibitions(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, EXHIBITIONS_COLLECTION),
      where('shelter_club_id', '==', clubId),
      limit(MAX_EXHIBITIONS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('indicatorsService.fetchExhibitions', { clubId, err: String(err) });
    return [];
  }
}

async function fetchVolunteerProfiles(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, CLUBS_COLLECTION, clubId, VOLUNTEERS_COLLECTION),
      limit(MAX_VOLUNTEERS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('indicatorsService.fetchVolunteerProfiles', { clubId, err: String(err) });
    return [];
  }
}

async function fetchParticipations(clubId) {
  if (!db) return [];
  try {
    const q = fsQuery(
      collection(db, CLUBS_COLLECTION, clubId, PARTICIPATIONS_COLLECTION),
      limit(MAX_PARTICIPATIONS),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('indicatorsService.fetchParticipations', { clubId, err: String(err) });
    return [];
  }
}

// ─── API pública ─────────────────────────────────────────────────────

/**
 * Busca e computa todos os indicadores de vitrines e voluntários.
 *
 * @param {string} clubId
 * @param {object} [options]
 * @param {'month'|'quarter'|'year'|'all'} [options.periodType]
 * @param {string} [options.referenceDate]
 * @param {string[]} [options.indicatorTypes]
 * @returns {Promise<object>}
 */
export async function getIndicatorsSummary(clubId, options = {}) {
  if (!db) {
    return { errors: { _init: 'db_unavailable' } };
  }

  const periodType = options.periodType || 'year';
  const referenceDate = options.referenceDate
    ? new Date(options.referenceDate)
    : new Date();
  const { start, end } = periodRangeInd(periodType, referenceDate);
  const indicatorTypes = new Set(options.indicatorTypes || [
    'exhibition_summary', 'exhibition_detail', 'volunteer_summary', 'volunteer_detail',
  ]);

  const [exhibitions, participations, volunteerProfiles] = await Promise.all([
    fetchExhibitions(clubId),
    fetchParticipations(clubId),
    fetchVolunteerProfiles(clubId),
  ]);

  const result = {};

  if (indicatorTypes.has('exhibition_summary')) {
    try {
      result.exhibition_summary = computeExhibitionSummary(exhibitions, participations, start, end);
    } catch (err) {
      logger.warn('indicatorsService.exhibition_summary', { err: String(err) });
      result.exhibition_summary = { type: 'exhibition_summary', _error: String(err) };
    }
  }

  if (indicatorTypes.has('exhibition_detail')) {
    try {
      result.exhibition_detail = computeExhibitionDetail(exhibitions, participations);
    } catch (err) {
      logger.warn('indicatorsService.exhibition_detail', { err: String(err) });
      result.exhibition_detail = { type: 'exhibition_detail', exhibitions: [], _error: String(err) };
    }
  }

  if (indicatorTypes.has('volunteer_summary')) {
    try {
      result.volunteer_summary = computeVolunteerSummary(participations, start, end);
    } catch (err) {
      logger.warn('indicatorsService.volunteer_summary', { err: String(err) });
      result.volunteer_summary = { type: 'volunteer_summary', _error: String(err) };
    }
  }

  if (indicatorTypes.has('volunteer_detail')) {
    try {
      result.volunteer_detail = computeVolunteerDetail(participations, volunteerProfiles);
    } catch (err) {
      logger.warn('indicatorsService.volunteer_detail', { err: String(err) });
      result.volunteer_detail = { type: 'volunteer_detail', volunteers: [], _error: String(err) };
    }
  }

  return result;
}
