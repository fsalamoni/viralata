import { DEFAULT_FEATURE_FLAGS, normalizeFeatureFlags } from '@/core/featureFlags';

export const PLATFORM_SETTINGS_DEFAULTS = Object.freeze({
  feature_flags: { ...DEFAULT_FEATURE_FLAGS },
  ui_labels: {
    header_create_pet_cta: '+ Cadastrar Pet',
    mobile_create_pet_cta: 'Cadastrar',
    home_primary_cta: 'Ver Pets para Adoção',
    home_secondary_cta: 'Cadastrar meu Pet',
    home_final_cta: 'Criar minha conta grátis',
  },
  ui_text: {
    home_hero_badge: 'Adoção responsável e gratuita',
    home_hero_title_prefix: 'Encontre seu',
    home_hero_title_highlight: 'companheiro',
    home_hero_title_suffix: 'ideal',
    home_hero_description: 'O Viralata conecta pets que precisam de um lar com famílias que têm amor para dar — do primeiro match até o dia da adoção.',
    home_final_cta_title: 'Pronto para mudar uma vida?',
    home_final_cta_description: 'Cada adoção é uma história de amor que começa aqui.',
    feed_hero_description: 'Deslize para curtir os destaques ou explore a lista completa abaixo com o mesmo padrão visual das demais áreas da plataforma.',
  },
  operational_limits: {
    notifications_dropdown_limit: 30,
    admin_notifications_limit: 200,
  },
});
const DEFAULT_TEXT_LIMIT = 240;

const UI_LABEL_LIMITS = Object.freeze({
  header_create_pet_cta: 48,
  mobile_create_pet_cta: 24,
  home_primary_cta: 48,
  home_secondary_cta: 48,
  home_final_cta: 48,
});

const UI_TEXT_LIMITS = Object.freeze({
  home_hero_badge: 80,
  home_hero_title_prefix: 80,
  home_hero_title_highlight: 80,
  home_hero_title_suffix: 80,
  home_hero_description: 320,
  home_final_cta_title: 120,
  home_final_cta_description: 220,
  feed_hero_description: 320,
});

function normalizeTextField(raw, fallback, maxLength) {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function normalizeTextMap(raw, defaults, limits) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      normalizeTextField(source[key], fallback, limits[key] || DEFAULT_TEXT_LIMIT),
    ]),
  );
}

function clampNumber(raw, fallback, min, max) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function normalizeOperationalLimits(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    notifications_dropdown_limit: clampNumber(
      source.notifications_dropdown_limit,
      PLATFORM_SETTINGS_DEFAULTS.operational_limits.notifications_dropdown_limit,
      5,
      50,
    ),
    admin_notifications_limit: clampNumber(
      source.admin_notifications_limit,
      PLATFORM_SETTINGS_DEFAULTS.operational_limits.admin_notifications_limit,
      50,
      500,
    ),
  };
}

export function normalizePlatformSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    feature_flags: normalizeFeatureFlags(source.feature_flags),
    ui_labels: normalizeTextMap(source.ui_labels, PLATFORM_SETTINGS_DEFAULTS.ui_labels, UI_LABEL_LIMITS),
    ui_text: normalizeTextMap(source.ui_text, PLATFORM_SETTINGS_DEFAULTS.ui_text, UI_TEXT_LIMITS),
    operational_limits: normalizeOperationalLimits(source.operational_limits),
  };
}
