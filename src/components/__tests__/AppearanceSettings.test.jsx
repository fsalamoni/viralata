/**
 * @fileoverview Tests for AppearanceSettings (TASK-401).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const mockSetPrefs = vi.fn();
vi.mock('@/core/hooks/useUiPreferences', () => ({
  useUiPreferences: () => [
    { footerMode: 'fixed', bottomTabBarMode: 'fixed', compactMode: false, reduceMotion: false },
    mockSetPrefs,
    { saving: false, error: null, syncedAt: null },
  ],
  FOOTER_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
  BOTTOM_TAB_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
  TOPBAR_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
  CARDS_PER_PAGE_OPTIONS: { mobile: [4, 8, 12], tablet: [8, 12, 20], desktop: [12, 20, 40, 100] },
  GRID_COLUMNS_OPTIONS: { auto: 'auto', 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
}));

const { AppearanceSettings } = await import('@/components/AppearanceSettings.jsx');

describe('AppearanceSettings (TASK-401)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockSetPrefs.mockClear();
  });

  it('componente é função', () => {
    expect(typeof AppearanceSettings).toBe('function');
  });

  it('renderiza sem crash (smoke)', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(<AppearanceSettings />);
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
