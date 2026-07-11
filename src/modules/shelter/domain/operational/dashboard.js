/**
 * @fileoverview Domínio: Dashboard do Abrigo (Fase 14).
 *
 * Define o modelo de dados do dashboard de um abrigo:
 *  - Schemas Zod dos widgets customizados (métricas que o abrigo cria)
 *  - Helpers puros que computam o resumo do dashboard a partir de
 *    snapshots já agregados (counts, listas) — sem side-effects e sem
 *    dependência de Firebase. Testáveis em isolamento.
 *
 * O dashboard agrega dados de várias subcoleções:
 *  - `pets`                → cães / gatos / outros / em LT
 *  - `adoption_workflow`   → processos em andamento
 *  - `post_adoption`       → acompanhamentos pendentes
 *  - `fosters`             → lares temporários ativos
 *  - `medications`         → medicações ativas (subcoleção de pet)
 *  - `pet_photos`/exhibitions → vitrines próximas (Fase 10/11)
 *
 * O agregador (service) se inscreve em cada collection via `onSnapshot`,
 * mantém um `Map<collectionKey, count>` e chama `computeDashboardSummary`
 * sempre que algo muda. O helper é puro: recebe os dados, retorna a
 * estrutura final renderizada. Isso isola a regra de negócio da camada
 * de I/O e facilita testes.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14
 */

import { z } from 'zod';

// ─── Coleções rastreadas pelo dashboard ─────────────────────────────────
// Cada chave é o nome da collection no Firestore (raiz ou subcoleção).
// O agregador de snapshots usa essas chaves como identificador.

export const DASHBOARD_COLLECTIONS = Object.freeze({
  PETS: 'pets',                       // raiz — todos os pets do abrigo
  ADOPTION_WORKFLOW: 'adoption_workflow',  // subcoleção por abrigo
  POST_ADOPTION: 'post_adoption',     // subcoleção por abrigo
  FOSTERS: 'fosters',                 // subcoleção por abrigo
  MEDICATIONS: 'medications',         // subcoleção de pet
  EXHIBITIONS: 'exhibitions',         // vitrines (Fase 11)
});

// ─── Helpers de período ────────────────────────────────────────────────

/**
 * Janela "do mês atual" (1º dia do mês 00:00:00 → agora).
 * Retorna {start, end} como Date. Usado para filtros "do mês".
 *
 * @param {Date} [now] - data de referência (default: now)
 */
export function currentMonthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = now;
  return { start, end };
}

/**
 * Janela "próximos N dias" (agora → agora+N).
 *
 * @param {number} days
 * @param {Date} [now]
 */
export function upcomingDaysRange(days, now = new Date()) {
  const start = now;
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return { start, end };
}

// ─── Schemas de Widget (customizável por abrigo) ────────────────────────

/**
 * Tipos de widget suportados. `count` = número (ex.: "Cães no abrigo"),
 * `list` = lista de itens (ex.: "Próximas castrações"). `trend` é um
 * placeholder para gráficos (Fase 17/Relatórios).
 */
export const WIDGET_TYPES = Object.freeze(['count', 'list', 'trend']);

/**
 * Operadores de filtro suportados nos widgets customizados. O abrigo
 * escolhe a collection + filtros e o service aplica.
 */
export const WIDGET_FILTER_OPERATORS = Object.freeze([
  '==', '!=', '>', '>=', '<', '<=', 'in', 'not_in', 'array-contains',
]);

const widgetFilterSchema = z.object({
  field: z.string().min(1).max(80),
  op: z.enum(WIDGET_FILTER_OPERATORS).default('=='),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()])).max(50)]),
}).strict();

/**
 * Query salva de um widget. Hoje limitamos a collection + filtros.
 * Fases futuras (Smart Search / Relatórios) podem estender com projeção
 * de campos, ordenação e limit.
 */
const widgetQuerySchema = z.object({
  collection: z.enum(Object.values(DASHBOARD_COLLECTIONS)),
  filters: z.array(widgetFilterSchema).max(10).default([]),
  // futuro: projection, orderBy, limit
}).strict();

/**
 * Schema completo de um widget customizado.
 * - `shelter_club_id` redundante (defesa em profundidade)
 * - `order` controla a posição no grid
 * - `size` permite ao abrigo pedir 1 ou 2 colunas (cards grandes)
 */
export const dashboardWidgetSchema = z.object({
  shelter_club_id: z.string().min(1).max(128),
  type: z.enum(WIDGET_TYPES),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  query: widgetQuerySchema,
  icon: z.string().max(40).optional(),    // lucide-react icon name
  tone: z.enum(['default', 'success', 'warning', 'danger', 'info']).default('default'),
  order: z.number().int().min(0).max(1000).default(100),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  created_by_uid: z.string().min(1).max(128),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/** Schema de criação (campos opcionais preenchidos por default) */
export const createWidgetSchema = dashboardWidgetSchema.omit({
  created_at: true,
  updated_at: true,
}).strict();

/** Schema de update (todos campos opcionais) */
export const updateWidgetSchema = z.object({
  type: z.enum(WIDGET_TYPES).optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  query: widgetQuerySchema.optional(),
  icon: z.string().max(40).optional(),
  tone: z.enum(['default', 'success', 'warning', 'danger', 'info']).optional(),
  order: z.number().int().min(0).max(1000).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
}).strict();

// ─── Estrutura do DashboardData (output do computeDashboardSummary) ─────

/**
 * @typedef {object} DashboardCardData
 * @property {string} key              — identificador único (ex: 'dogs_in_shelter')
 * @property {string} title            — label exibido
 * @property {string} [subtitle]       — sublabel
 * @property {number} [count]          — valor principal (cards tipo 'count')
 * @property {string} [href]           — link de navegação
 * @property {'count'|'list'|'trend'}  variant
 * @property {'default'|'success'|'warning'|'danger'|'info'} tone
 * @property {string} [icon]           — lucide-react icon name
 */

/**
 * @typedef {object} DashboardData
 * @property {string} clubId
 * @property {DashboardCardData[]} cards        — cards padrão + custom
 * @property {Date}    computedAt
 * @property {boolean} hasError                 — algum sub-source falhou
 * @property {object}  errors                   — { [collection]: message }
 */

/**
 * Helper: cria um card de contagem com defaults.
 */
function makeCountCard({ key, title, count, href, tone = 'default', icon, subtitle }) {
  return { key, title, count, href, variant: 'count', tone, icon, subtitle };
}

// ─── Helper principal: computeDashboardSummary ─────────────────────────

/**
 * Computa o resumo do dashboard a partir de snapshots agregados.
 *
 * @param {string} clubId
 * @param {object} data - dados agregados (ver `aggregateDashboardSnapshots` no service)
 * @param {object} [options]
 * @param {Date}   [options.now]            - data de referência (testabilidade)
 * @param {DashboardCardData[]} [options.customWidgets] - widgets customizados
 * @returns {DashboardData}
 */
export function computeDashboardSummary(clubId, data, options = {}) {
  if (!clubId) throw new Error('clubId é obrigatório');
  const now = options.now instanceof Date ? options.now : new Date();
  const errors = data?.errors || {};
  const hasError = Object.keys(errors).length > 0;

  const monthRange = currentMonthRange(now);
  const upcomingRange = upcomingDaysRange(30, now);

  // ── Sub-contagens a partir do agregado ──
  const pets = data?.pets || [];                  // lista (não count) para detalhes
  const petsBySpecies = countPetsBySpecies(pets);
  const petsInFoster = (data?.fosters || []).filter((f) => f.status === 'active').length;

  // Resgates do mês: pets com rescue_date dentro do mês corrente
  const rescuesThisMonth = pets.filter((p) => {
    if (!p.rescue_date) return false;
    const d = new Date(p.rescue_date);
    return d >= monthRange.start && d <= monthRange.end;
  }).length;

  // Adoções do mês: applications com decided_at no mês e status=adoption_completed
  const adoptionsThisMonth = (data?.adoptions || []).filter((a) => {
    if (a.status !== 'adoption_completed') return false;
    if (!a.decided_at) return false;
    const d = new Date(a.decided_at);
    return d >= monthRange.start && d <= monthRange.end;
  }).length;

  // Devoluções do mês: post_adoptions retornados no mês
  const returnsThisMonth = (data?.postAdoptions || []).filter((p) => {
    if (p.status !== 'returned') return false;
    if (!p.returned_at) return false;
    const d = new Date(p.returned_at);
    return d >= monthRange.start && d <= monthRange.end;
  }).length;

  // Castrações pendentes (no abrigo): pets do abrigo sem flag de castrado
  // (Fase 8 medicalRecordsService pode ter campo `castrated` ou
  // `neutered_at` — usamos a presença de `neutered_at` no doc do pet)
  const pendingSpayNeuter = pets.filter((p) => {
    // Pet de abrigo e não castrado
    if (!p.shelter_owner_club_id || p.shelter_owner_club_id !== clubId) return false;
    if (p.status && p.status !== 'in_shelter' && p.status !== 'available') return false;
    return !p.neutered_at;
  }).length;

  // Medicações ativas: subcoleção de pets — agregado como count
  const activeMedications = data?.medicationsCount || 0;

  // Doses pendentes hoje: medicações ativas com dose vencendo hoje
  // O service já calcula esse número e injeta em data.medicationsDueToday
  const dosesDueToday = data?.medicationsDueToday || 0;

  // Acompanhamentos pós-adoção pendentes: postAdoptions com
  // status='active' que têm milestones passados não-materializados
  const postAdoptionsPending = (data?.postAdoptions || []).filter((p) => {
    if (p.status !== 'active') return false;
    const ms = p.milestones || [];
    return ms.some((m) => {
      if (m.materialized) return false;
      const d = new Date(m.scheduled_for);
      return d <= now;
    });
  }).length;

  // Processos de adoção em andamento: applications não terminais
  const processesInProgress = (data?.adoptions || []).filter((a) => {
    return ['applied', 'under_review', 'approved'].includes(a.status);
  }).length;

  // Próximas vitrines (próximos 30 dias)
  const upcomingExhibitions = (data?.exhibitions || []).filter((e) => {
    if (!e.start_date) return false;
    const d = new Date(e.start_date);
    return d >= upcomingRange.start && d <= upcomingRange.end;
  }).length;

  // ── Cards padrão (clicáveis) ──
  const cards = [
    makeCountCard({
      key: 'dogs_in_shelter',
      title: 'Cães no abrigo',
      count: petsBySpecies.dog || 0,
      href: `/abrigos/${clubId}/animals?species=dog&status=in_shelter`,
      tone: 'info',
      icon: 'Dog',
    }),
    makeCountCard({
      key: 'cats_in_shelter',
      title: 'Gatos no abrigo',
      count: petsBySpecies.cat || 0,
      href: `/abrigos/${clubId}/animals?species=cat&status=in_shelter`,
      tone: 'info',
      icon: 'Cat',
    }),
    makeCountCard({
      key: 'other_animals_in_shelter',
      title: 'Outros animais',
      count: petsBySpecies.other || 0,
      href: `/abrigos/${clubId}/animals?status=in_shelter&species=other`,
      tone: 'default',
      icon: 'PawPrint',
    }),
    makeCountCard({
      key: 'animals_in_foster',
      title: 'Animais em lar temporário',
      count: petsInFoster,
      href: `/abrigos/${clubId}/fosters?status=active`,
      tone: 'info',
      icon: 'Home',
    }),
    makeCountCard({
      key: 'rescues_this_month',
      title: 'Resgates do mês',
      count: rescuesThisMonth,
      href: `/abrigos/${clubId}/animals?filter=rescues_this_month`,
      tone: 'success',
      icon: 'HeartHandshake',
    }),
    makeCountCard({
      key: 'adoptions_this_month',
      title: 'Adoções do mês',
      count: adoptionsThisMonth,
      href: `/abrigos/${clubId}/applications?status=adoption_completed&period=this_month`,
      tone: 'success',
      icon: 'BadgeCheck',
    }),
    makeCountCard({
      key: 'returns_this_month',
      title: 'Devoluções do mês',
      count: returnsThisMonth,
      href: `/abrigos/${clubId}/post-adoption?status=returned&period=this_month`,
      tone: 'warning',
      icon: 'Undo2',
    }),
    makeCountCard({
      key: 'pending_spay_neuter',
      title: 'Castrações pendentes',
      subtitle: 'No abrigo',
      count: pendingSpayNeuter,
      href: `/abrigos/${clubId}/health?filter=pending_spay_neuter`,
      tone: 'warning',
      icon: 'Scissors',
    }),
    makeCountCard({
      key: 'active_medications',
      title: 'Medicações ativas',
      subtitle: dosesDueToday > 0 ? `${dosesDueToday} doses pendentes hoje` : null,
      count: activeMedications,
      href: `/abrigos/${clubId}/medications?status=active`,
      tone: dosesDueToday > 0 ? 'warning' : 'default',
      icon: 'Pill',
    }),
    makeCountCard({
      key: 'post_adoption_pending',
      title: 'Acompanhamentos pós-adoção',
      subtitle: 'Pendentes',
      count: postAdoptionsPending,
      href: `/abrigos/${clubId}/post-adoption?filter=pending_milestones`,
      tone: postAdoptionsPending > 0 ? 'warning' : 'default',
      icon: 'Clock',
    }),
    makeCountCard({
      key: 'processes_in_progress',
      title: 'Processos de adoção',
      subtitle: 'Em andamento',
      count: processesInProgress,
      href: `/abrigos/${clubId}/applications?status=in_progress`,
      tone: 'info',
      icon: 'ClipboardList',
    }),
    makeCountCard({
      key: 'upcoming_exhibitions',
      title: 'Próximas vitrines',
      subtitle: 'Próximos 30 dias',
      count: upcomingExhibitions,
      href: `/abrigos/${clubId}/exhibitions?period=next_30_days`,
      tone: 'default',
      icon: 'Calendar',
    }),
  ];

  // ── Adiciona widgets customizados (Fase 14.1) ──
  const customWidgets = options.customWidgets || [];
  for (const w of customWidgets) {
    if (!w || w.shelter_club_id !== clubId) continue;
    cards.push({
      key: `custom_${w.id || w.title}`,
      title: w.title,
      description: w.description,
      count: data?.customCounts?.[w.id] ?? 0,
      variant: w.type,
      tone: w.tone,
      icon: w.icon,
      href: w.href || null,
      subtitle: w.description,
      order: typeof w.order === 'number' ? w.order : 100,
    });
  }

  // Ordena por `order` (default 100)
  cards.sort((a, b) => {
    const ao = a.order ?? 100;
    const bo = b.order ?? 100;
    return ao - bo;
  });

  return {
    clubId,
    cards,
    computedAt: now,
    hasError,
    errors,
  };
}

// ─── Helpers de classificação ───────────────────────────────────────────

/**
 * Agrupa pets por espécie (dog / cat / other).
 * Recebe lista de pets com campo `species`. Espécies desconhecidas vão
 * para `other` (mantém compat com Fase 0).
 */
export function countPetsBySpecies(pets = []) {
  const result = { dog: 0, cat: 0, other: 0 };
  for (const p of pets) {
    const s = p.species;
    if (s === 'dog') result.dog += 1;
    else if (s === 'cat') result.cat += 1;
    else result.other += 1;
  }
  return result;
}

/**
 * Decide se um pet está "no abrigo" (não adotado, não em LT, não falecido).
 * Critério: `status` em {available, in_shelter} OU ausente/null.
 */
export function isPetInShelter(pet) {
  if (!pet) return false;
  const s = pet.status;
  if (s === 'adopted' || s === 'returned' || s === 'deceased' || s === 'fostered') {
    return false;
  }
  return true;
}

// ─── Labels pt-BR (para uso na UI) ──────────────────────────────────────

export const DASHBOARD_CARD_LABELS = Object.freeze({
  dogs_in_shelter: 'Cães no abrigo',
  cats_in_shelter: 'Gatos no abrigo',
  other_animals_in_shelter: 'Outros animais',
  animals_in_foster: 'Animais em lar temporário',
  rescues_this_month: 'Resgates do mês',
  adoptions_this_month: 'Adoções do mês',
  returns_this_month: 'Devoluções do mês',
  pending_spay_neuter: 'Castrações pendentes',
  active_medications: 'Medicações ativas',
  post_adoption_pending: 'Acompanhamentos pós-adoção',
  processes_in_progress: 'Processos de adoção',
  upcoming_exhibitions: 'Próximas vitrines',
});

/** Tones (classes Tailwind) usados pelos cards. */
export const DASHBOARD_TONE_CLASSES = Object.freeze({
  default: 'bg-card text-card-foreground',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-red-50 text-red-900 border-red-200',
  info: 'bg-sky-50 text-sky-900 border-sky-200',
});

/**
 * Validador de uma chave de card conhecida. Útil para filtragem em testes.
 */
export function isKnownCardKey(key) {
  return Object.prototype.hasOwnProperty.call(DASHBOARD_CARD_LABELS, key);
}
