/**
 * @fileoverview Constants for Partner Spaces module.
 *
 * @see docs/PARTNER_SPACES_PLAN.md
 */

export const PARTNER_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  PENDING_REVIEW: 'pending_review',
  REJECTED: 'rejected',
});

export const PARTNER_STATUS_LABELS = Object.freeze({
  active: 'Ativo',
  paused: 'Pausado',
  pending_review: 'Aguardando aprovação',
  rejected: 'Rejeitado',
});

export const PARTNER_STATUS_COLORS = Object.freeze({
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  pending_review: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
});

export const PARTNER_CATEGORIES = Object.freeze([
  { value: 'pet_shop', label: 'Pet Shop' },
  { value: 'vet', label: 'Veterinária' },
  { value: 'brand', label: 'Marca' },
  { value: 'shelter', label: 'Abrigo Parceiro' },
  { value: 'other', label: 'Outro' },
]);

export const PARTNER_CATEGORY_LABELS = Object.freeze(
  PARTNER_CATEGORIES.reduce((acc, c) => {
    acc[c.value] = c.label;
    return acc;
  }, {}),
);

export const BANNER_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FINISHED: 'finished',
  EXPIRED: 'expired',
});

export const BANNER_STATUS_LABELS = Object.freeze({
  draft: 'Rascunho',
  active: 'Ativo',
  paused: 'Pausado',
  finished: 'Finalizado',
  expired: 'Expirado',
});

export const BANNER_STATUS_COLORS = Object.freeze({
  draft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  paused: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  finished: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  expired: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
});

export const BANNER_POSITIONS = Object.freeze([
  { value: 'feed_top', label: 'Topo do Feed', ratio: '5:1' },
  { value: 'feed_inline', label: 'Inline no Feed', ratio: '5:1' },
  { value: 'home_inline', label: 'Home (inline)', ratio: '5:1' },
  { value: 'search_inline', label: 'Busca (inline)', ratio: '5:1' },
  { value: 'pet_detail_inline', label: 'Detalhes do Pet', ratio: '5:1' },
  { value: 'club_detail_inline', label: 'Detalhes da ONG', ratio: '5:1' },
  { value: 'community_detail_inline', label: 'Detalhes da Comunidade', ratio: '5:1' },
]);

export const BANNER_POSITION_LABELS = Object.freeze(
  BANNER_POSITIONS.reduce((acc, p) => {
    acc[p.value] = p.label;
    return acc;
  }, {}),
);

export const EVENT_TYPE = Object.freeze({
  VIEW: 'view',
  CLICK: 'click',
});

export const BANNER_LIMITS = Object.freeze({
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 100,
  DEFAULT_WEIGHT: 50,
  DESKTOP_WIDTH: 1200,
  DESKTOP_HEIGHT: 240,
  MOBILE_WIDTH: 600,
  MOBILE_HEIGHT: 200,
  MAX_SIZE_BYTES: 500 * 1024, // 500KB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ROTATION_DEBOUNCE_MS: 30 * 1000, // 30s
  VIEW_DEBOUNCE_MS: 30 * 60 * 1000, // 30min
});
