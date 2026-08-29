/**
 * @fileoverview Domínio (view helpers): Lares Temporários v2 (Fase 3 — SHELTER_FOSTER_V2).
 *
 * Funções PURAS (sem React/Firebase) para a "lista própria" de lares temporários:
 *  - agrupa os placements por lar (foster_uid) → um registro por lar, com o
 *    snapshot mais recente e a disponibilidade declarada;
 *  - "disponível hoje" derivado das janelas de `availability_dates`;
 *  - resumo do período de disponibilidade (faixas de datas);
 *  - rótulos dos tipos de pet aceitos e resumo de capacidade.
 *
 * O modelo de dados (schemas, enums) vive em `foster.js`. Aqui só há
 * apresentação/curadoria — não altera comportamento de segurança nem de escrita.
 * Testável em isolamento.
 */

import {
  FOSTER_PET_TYPES,
  FOSTER_PET_TYPE_LABELS,
} from './foster.js';

/** Placements ainda "vivos" (o lar segue vinculado ao abrigo). */
const LIVE_STATUSES = Object.freeze(['pending', 'active', 'extended']);

/** Normaliza uma string ISO/`YYYY-MM-DD` para `YYYY-MM-DD` (ou null). */
function toDayString(value) {
  if (typeof value !== 'string' || value.length < 10) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Data atual como `YYYY-MM-DD` (comparação por dia, sem fuso). */
function todayString(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  return now.toISOString().slice(0, 10);
}

/**
 * Janelas de disponibilidade válidas (defensivo: aceita snapshots antigos sem o
 * campo, ou com itens malformados). Retorna [{start,end}] com `end >= start`.
 */
export function parseAvailabilityWindows(availabilityDates) {
  if (!Array.isArray(availabilityDates)) return [];
  const windows = [];
  for (const win of availabilityDates) {
    if (!win || typeof win !== 'object') continue;
    const start = toDayString(win.start_date);
    const end = toDayString(win.end_date);
    if (!start || !end) continue;
    if (end < start) continue;
    windows.push({ start, end });
  }
  return windows;
}

/**
 * O lar está disponível na data informada (por padrão, hoje)? Considera-se
 * disponível se a data cair dentro de ao menos uma janela (inclusive).
 *
 * @param {Array} availabilityDates - lista de {start_date,end_date}
 * @param {Date} [date=new Date()] - data de referência
 * @returns {boolean}
 */
export function isFosterAvailableOn(availabilityDates, date = new Date()) {
  const windows = parseAvailabilityWindows(availabilityDates);
  if (windows.length === 0) return false;
  const day = todayString(date);
  if (!day) return false;
  return windows.some((w) => day >= w.start && day <= w.end);
}

/** Atalho: disponível hoje (usa a data atual). */
export function isFosterAvailableToday(availabilityDates, now = new Date()) {
  return isFosterAvailableOn(availabilityDates, now);
}

/** Formata `YYYY-MM-DD` para `DD/MM/YYYY` (pt-BR). */
function formatBr(day) {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Resumo textual do período de disponibilidade (faixas ordenadas por início).
 * Ex.: "01/09/2026 – 30/09/2026; 15/10/2026 – 20/10/2026". Vazio se não houver.
 */
export function fosterAvailabilityPeriodSummary(availabilityDates) {
  const windows = parseAvailabilityWindows(availabilityDates)
    .slice()
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  if (windows.length === 0) return '';
  return windows.map((w) => `${formatBr(w.start)} – ${formatBr(w.end)}`).join('; ');
}

/**
 * Rótulos dos tipos de pet aceitos (a partir de `accepted_pet_types`). Ignora
 * chaves desconhecidas e preserva a ordem canônica dos tipos.
 * Ex.: ['Cães', 'Gatos', 'Filhotes (cão)'].
 */
export function fosterPetTypeLabels(acceptedPetTypes) {
  if (!Array.isArray(acceptedPetTypes)) return [];
  const present = new Set(acceptedPetTypes.filter((t) => typeof t === 'string'));
  return FOSTER_PET_TYPES.filter((t) => present.has(t)).map((t) => FOSTER_PET_TYPE_LABELS[t]);
}

/**
 * Resumo curto de capacidade. Ex.: "Até 2 pets", "Sem vaga", "" (não informado).
 */
export function fosterCapacitySummary(capacity) {
  if (capacity === undefined || capacity === null || !Number.isFinite(capacity)) return '';
  if (capacity <= 0) return 'Sem vaga';
  return `Até ${capacity} pet${capacity === 1 ? '' : 's'}`;
}

/**
 * Agrupa placements por lar (foster_uid) → uma linha por lar na "lista própria".
 * Escolhe o placement mais recente (maior start_date) como representativo do
 * snapshot de contato e da disponibilidade declarada. Também expõe contadores
 * de placements ativos/pendentes.
 *
 * @param {Array} placements - documentos de `clubs/{clubId}/fosters/{fosterId}`
 * @returns {Array} lares, ordenados por nome (asc)
 */
export function groupFosterHomes(placements) {
  if (!Array.isArray(placements)) return [];
  const byUid = new Map();

  for (const p of placements) {
    if (!p || typeof p !== 'object') continue;
    const uid = p.foster_uid;
    if (!uid) continue;

    let home = byUid.get(uid);
    if (!home) {
      home = {
        foster_uid: uid,
        placements: [],
        active_count: 0,
        pending_count: 0,
        live_count: 0,
        latest: null,
      };
      byUid.set(uid, home);
    }
    home.placements.push(p);
    if (p.status === 'active' || p.status === 'extended') home.active_count += 1;
    if (p.status === 'pending') home.pending_count += 1;
    if (LIVE_STATUSES.includes(p.status)) home.live_count += 1;

    // Representativo: maior start_date (fallback: primeiro visto).
    if (!home.latest || String(p.start_date || '') > String(home.latest.start_date || '')) {
      home.latest = p;
    }
  }

  const rows = [];
  for (const home of byUid.values()) {
    const latest = home.latest || {};
    const snap = latest.foster_profile_snapshot || {};
    rows.push({
      id: home.foster_uid,
      foster_uid: home.foster_uid,
      name: snap.full_name || '',
      email: snap.email || '',
      phone: snap.phone || '',
      address: snap.address || '',
      environment: snap.environment || '',
      terms_accepted_at: snap.terms_accepted_at || null,
      terms_version: snap.terms_version || null,
      availability_dates: latest.availability_dates || [],
      capacity: latest.capacity,
      accepted_pet_types: latest.accepted_pet_types || [],
      active_count: home.active_count,
      pending_count: home.pending_count,
      live_count: home.live_count,
      placements_count: home.placements.length,
      latest_placement_id: latest.id || null,
      latest_status: latest.status || null,
      placements: home.placements,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return rows;
}
