/**
 * @fileoverview shelterOverviewStats — agrega números do abrigo a partir da
 * lista de pets para o dashboard da Visão Geral do painel do abrigo.
 *
 * Função pura (fácil de testar): recebe a lista de pets e devolve contagens
 * por status/espécie/localização, castração, novos no mês, permanência média
 * e o animal com maior permanência.
 */
import { daysInShelter } from '@/modules/shelter/domain/core/animal';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Converte created_at (Timestamp | ISO | ms) em milissegundos, ou null. */
function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * @param {Array<object>} pets
 * @param {number} [now] timestamp de referência (default Date.now())
 */
export function computeShelterStats(pets = [], now = Date.now()) {
  const list = Array.isArray(pets) ? pets : [];
  const total = list.length;

  const byStatus = { available: 0, in_process: 0, adopted: 0, unavailable: 0 };
  const bySpecies = {};
  const byLocation = {};
  let neutered = 0;
  let newLast30 = 0;
  let staySum = 0;
  let stayCount = 0;
  let longest = null;

  for (const p of list) {
    const st = p?.status || 'available';
    byStatus[st] = (byStatus[st] || 0) + 1;

    const sp = p?.species || 'other';
    bySpecies[sp] = (bySpecies[sp] || 0) + 1;

    const loc = p?.current_location || 'unknown';
    byLocation[loc] = (byLocation[loc] || 0) + 1;

    if (p?.neutered) neutered += 1;

    const createdMs = toMillis(p?.created_at);
    if (createdMs != null && now - createdMs <= 30 * DAY_MS) newLast30 += 1;

    const d = daysInShelter(p);
    if (typeof d === 'number' && d >= 0) {
      staySum += d;
      stayCount += 1;
      if (!longest || d > longest.days) longest = { id: p?.id, name: p?.name || p?.title, days: d };
    }
  }

  return {
    total,
    byStatus,
    bySpecies,
    byLocation,
    neutered,
    neuteredPct: total ? Math.round((neutered / total) * 100) : 0,
    available: byStatus.available || 0,
    inProcess: byStatus.in_process || 0,
    adopted: byStatus.adopted || 0,
    unavailable: byStatus.unavailable || 0,
    newLast30,
    avgStayDays: stayCount ? Math.round(staySum / stayCount) : null,
    longest,
  };
}

export default computeShelterStats;
