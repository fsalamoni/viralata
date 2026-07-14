/**
 * @fileoverview Tests for LegalFooter (TASK-401).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
  usePlatformSettings: () => ({ settings: {}, isLoading: false }),
}));

vi.mock('@/core/hooks/useUiPreferences', () => ({
  useUiPreferences: () => [
    { footerMode: 'fixed', bottomTabBarMode: 'fixed' },
    vi.fn(),
    { saving: false, error: null, syncedAt: null },
  ],
  FOOTER_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
  BOTTOM_TAB_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
}));

const { default: LegalFooter } = await import('@/components/LegalFooter.jsx');

describe('LegalFooter (TASK-401)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof LegalFooter).toBe('function');
  });

  it('renderiza sem crash (smoke)', async () => {
    let err = null;
    try {
      await act(async () => {
        root.render(
          <MemoryRouter>
            <LegalFooter />
          </MemoryRouter>
        );
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
