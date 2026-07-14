/**
 * @fileoverview Tests for useUiPreferences (TASK-401).
 */
import { describe, it, expect } from 'vitest';

import {
  FOOTER_MODES,
  BOTTOM_TAB_MODES,
  UI_PREFERENCES_DEFAULTS,
} from '@/core/hooks/useUiPreferences.js';

describe('useUiPreferences constants (TASK-401)', () => {
  it('FOOTER_MODES exporta fixed/autohide/hidden', () => {
    expect(FOOTER_MODES.FIXED).toBe('fixed');
    expect(FOOTER_MODES.AUTOHIDE).toBe('autohide');
    expect(FOOTER_MODES.HIDDEN).toBe('hidden');
  });

  it('BOTTOM_TAB_MODES exporta fixed/autohide/hidden', () => {
    expect(BOTTOM_TAB_MODES.FIXED).toBe('fixed');
    expect(BOTTOM_TAB_MODES.AUTOHIDE).toBe('autohide');
    expect(BOTTOM_TAB_MODES.HIDDEN).toBe('hidden');
  });

  it('UI_PREFERENCES_DEFAULTS tem defaults seguros', () => {
    expect(UI_PREFERENCES_DEFAULTS.footerMode).toBe('fixed');
    expect(UI_PREFERENCES_DEFAULTS.bottomTabBarMode).toBe('fixed');
    expect(UI_PREFERENCES_DEFAULTS.compactMode).toBe(false);
    expect(UI_PREFERENCES_DEFAULTS.reduceMotion).toBe(false);
  });
});
