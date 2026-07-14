/**
 * @fileoverview volunteerMetricsService — métricas globais de voluntários
 * (TASK-126).
 *
 * **Escopo**: agrega participações de um voluntário (em qualquer abrigo)
 * para mostrar no perfil global dele:
 * - # participações (total)
 * - # transporte_ida (chegou como passageiro)
 * - # transporte_volta (foi embora como passageiro)
 * - frequência (% de participações confirmadas vs total)
 * - horas totais (soma de todas)
 * - abrigo favorito (mais participações)
 *
 * **Como funciona**:
 * 1. Função pura `computeVolunteerMetrics(participations)` aceita lista
 *    de participações e retorna métricas
 * 2. Hook `useVolunteerMetrics(uid)` busca participações via
 *    collectionGroup query e chama computeVolunteerMetrics
 *
 * **Performance**: cache via React Query. Recalcula apenas quando
 * participações mudam.
 */

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { calculateParticipationHours } from '@/modules/shelter/domain/operational/volunteerProfile';

const VOLUNTEER_PARTICIPATIONS_COLLECTION = 'volunteer_participations';

/**
 * Schema-like result. Zod não é necessário aqui (estrutura simples).
 *
 * @typedef {object} VolunteerMetrics
 * @property {number} totalParticipations
 * @property {number} totalHours
 * @property {number} transporteIda
 * @property {number} transporteVolta
 * @property {number} confirmados
 * @property {number} noShows
 * @property {number} cancelled
 * @property {number} frequencia — % (0-100)
 * @property {string|null} abrigoFavoritoId
 * @property {string|null} abrigoFavoritoNome
 * @property {number} abrigoFavoritoParticipacoes
 * @property {string} periodoInicio
 * @property {string} periodoFim
 * @property {number} abrigosAtendidos
 */

/**
 * Computa métricas globais de um voluntário a partir de suas participações.
 *
 * @param {Array<object>} participations
 * @param {Map<string, string>} [shelterNames] — mapa clubId → name
 * @returns {VolunteerMetrics}
 */
export function computeVolunteerMetrics(participations, shelterNames = new Map()) {
  if (!Array.isArray(participations)) {
    return getEmptyMetrics();
  }

  let totalParticipations = participations.length;
  let totalHours = 0;
  let transporteIda = 0;
  let transporteVolta = 0;
  let confirmados = 0;
  let noShows = 0;
  let cancelled = 0;
  const abrigosCount = new Map(); // clubId → count
  let oldest = null;
  let newest = null;

  for (const p of participations) {
    // Status
    const status = p.status || 'pending';
    if (status === 'confirmed' || status === 'checked_in' || status === 'completed') {
      confirmados++;
    } else if (status === 'no_show' || status === 'no-show') {
      noShows++;
    } else if (status === 'cancelled' || status === 'canceled') {
      cancelled++;
    }

    // Horas
    if (p.check_in && p.check_out) {
      const h = calculateParticipationHours(p.check_in, p.check_out);
      if (Number.isFinite(h)) totalHours += h;
    } else if (p.hours) {
      totalHours += p.hours;
    }

    // Transporte
    if (p.transport_offer === 'ride_ida' || p.transport_offer === 'both') transporteIda++;
    if (p.transport_offer === 'ride_volta' || p.transport_offer === 'both') transporteVolta++;

    // Abrigos
    const clubId = p.shelter_club_id || p.club_id;
    if (clubId) {
      abrigosCount.set(clubId, (abrigosCount.get(clubId) || 0) + 1);
    }

    // Período
    const date = p.event_date || p.created_at?.toDate?.()?.toISOString();
    if (date) {
      if (!oldest || date < oldest) oldest = date;
      if (!newest || date > newest) newest = date;
    }
  }

  // Frequência = confirmados / (confirmados + noShows) * 100
  // (exclui cancelled que é independente da presença)
  const baseFreq = confirmados + noShows;
  const frequencia = baseFreq > 0 ? Math.round((confirmados / baseFreq) * 100) : 0;

  // Abrigo favorito
  let abrigoFavoritoId = null;
  let abrigoFavoritoParticipacoes = 0;
  for (const [clubId, count] of abrigosCount.entries()) {
    if (count > abrigoFavoritoParticipacoes) {
      abrigoFavoritoId = clubId;
      abrigoFavoritoParticipacoes = count;
    }
  }
  const abrigoFavoritoNome = abrigoFavoritoId ? shelterNames.get(abrigoFavoritoId) || null : null;

  return {
    totalParticipations,
    totalHours: Math.round(totalHours * 10) / 10, // 1 casa decimal
    transporteIda,
    transporteVolta,
    confirmados,
    noShows,
    cancelled,
    frequencia,
    abrigoFavoritoId,
    abrigoFavoritoNome,
    abrigoFavoritoParticipacoes,
    periodoInicio: oldest,
    periodoFim: newest,
    abrigosAtendidos: abrigosCount.size,
  };
}

function getEmptyMetrics() {
  return {
    totalParticipations: 0,
    totalHours: 0,
    transporteIda: 0,
    transporteVolta: 0,
    confirmados: 0,
    noShows: 0,
    cancelled: 0,
    frequencia: 0,
    abrigoFavoritoId: null,
    abrigoFavoritoNome: null,
    abrigoFavoritoParticipacoes: 0,
    periodoInicio: null,
    periodoFim: null,
    abrigosAtendidos: 0,
  };
}

/**
 * Busca todas as participações de um voluntário (em todos os abrigos).
 * Usa collectionGroup query.
 */
export async function fetchUserParticipations(uid, { max = 500 } = {}) {
  if (!db || !uid) return [];
  try {
    const q = query(
      collection(db, VOLUNTEER_PARTICIPATIONS_COLLECTION),
      where('volunteer_uid', '==', uid),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('volunteerMetricsService.fetchUserParticipations', { msg: 'fetch failed', err: String(err) });
    return [];
  }
}
