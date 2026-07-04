import { describe, expect, it } from 'vitest';
import {
  PLATFORM_SETTINGS_DEFAULTS,
  normalizeOperationalLimits,
  normalizePlatformSettings,
} from './platformSettings';

describe('normalizeOperationalLimits', () => {
  it('aplica os limites mínimo e máximo permitidos', () => {
    expect(normalizeOperationalLimits({
      notifications_dropdown_limit: 2,
      admin_notifications_limit: 999,
    })).toEqual({
      notifications_dropdown_limit: 5,
      admin_notifications_limit: 500,
    });
  });
});

describe('normalizePlatformSettings', () => {
  it('mescla valores válidos com os padrões e ignora flags desconhecidas', () => {
    const settings = normalizePlatformSettings({
      feature_flags: {
        ad_slots: true,
        unknown_flag: true,
      },
      ui_labels: {
        header_create_pet_cta: '  Publicar pet agora  ',
      },
      ui_text: {
        feed_hero_description: '',
      },
      operational_limits: {
        notifications_dropdown_limit: 12,
      },
    });

    expect(settings.feature_flags).toEqual({
      ...PLATFORM_SETTINGS_DEFAULTS.feature_flags,
      ad_slots: true,
    });
    expect(settings.ui_labels.header_create_pet_cta).toBe('Publicar pet agora');
    expect(settings.ui_text.feed_hero_description).toBe(PLATFORM_SETTINGS_DEFAULTS.ui_text.feed_hero_description);
    expect(settings.operational_limits.notifications_dropdown_limit).toBe(12);
    expect(settings.operational_limits.admin_notifications_limit).toBe(
      PLATFORM_SETTINGS_DEFAULTS.operational_limits.admin_notifications_limit,
    );
  });
});
