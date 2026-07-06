import { describe, expect, it } from 'vitest';
import {
  PLATFORM_SETTINGS_DEFAULTS,
  normalizeOperationalLimits,
  normalizePlatformSettings,
} from './platformSettings';

describe('normalizeOperationalLimits', () => {
  it('clamps values that fall below the minimum limit', () => {
    expect(normalizeOperationalLimits({
      notifications_dropdown_limit: 2, // min is 5
      admin_notifications_limit: 25, // min is 50
    })).toEqual({
      notifications_dropdown_limit: 5,
      admin_notifications_limit: 50,
    });
  });

  it('clamps values that exceed the maximum limit', () => {
    expect(normalizeOperationalLimits({
      notifications_dropdown_limit: 100, // max is 50
      admin_notifications_limit: 999, // max is 500
    })).toEqual({
      notifications_dropdown_limit: 50,
      admin_notifications_limit: 500,
    });
  });

  it('keeps values that are within the allowed limits', () => {
    expect(normalizeOperationalLimits({
      notifications_dropdown_limit: 20,
      admin_notifications_limit: 150,
    })).toEqual({
      notifications_dropdown_limit: 20,
      admin_notifications_limit: 150,
    });
  });

  it('uses default values for invalid inputs (NaN, strings, etc)', () => {
    expect(normalizeOperationalLimits({
      notifications_dropdown_limit: 'invalid',
      admin_notifications_limit: NaN,
    })).toEqual({
      notifications_dropdown_limit: PLATFORM_SETTINGS_DEFAULTS.operational_limits.notifications_dropdown_limit,
      admin_notifications_limit: PLATFORM_SETTINGS_DEFAULTS.operational_limits.admin_notifications_limit,
    });
  });

  it('handles empty inputs or non-objects safely', () => {
    expect(normalizeOperationalLimits(null)).toEqual({
      notifications_dropdown_limit: PLATFORM_SETTINGS_DEFAULTS.operational_limits.notifications_dropdown_limit,
      admin_notifications_limit: PLATFORM_SETTINGS_DEFAULTS.operational_limits.admin_notifications_limit,
    });
    expect(normalizeOperationalLimits('not an object')).toEqual({
      notifications_dropdown_limit: PLATFORM_SETTINGS_DEFAULTS.operational_limits.notifications_dropdown_limit,
      admin_notifications_limit: PLATFORM_SETTINGS_DEFAULTS.operational_limits.admin_notifications_limit,
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
