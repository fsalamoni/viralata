/**
 * AdSlot — testes (TASK-024)
 *
 * Cobre:
 *  - useAdProvider: lê config do Firestore, fallback em erro/offline
 *  - AdSlot: feature flag off = não renderiza
 *  - AdSlot: feature flag on + provider 'none' = placeholder
 *  - AdSlot: feature flag on + adsense config válida = renderiza <ins>
 *  - AdSlot: provider habilitado mas config ausente = placeholder com aviso
 *  - Providers registry: cada provider tem render() válido
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

// Mock do Firestore
const mockGetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: (...args) => mockGetDoc(...args),
  getFirestore: () => ({}),
}));

// Mock do feature flag
const mockUseFeatureFlag = vi.fn();
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (...args) => mockUseFeatureFlag(...args),
}));

import AdSlot from './AdSlot';
import { useAdProvider, PROVIDERS } from '@/core/ads/useAdProvider';

function mockSnap(data) {
  return { exists: () => data !== null, data: () => data || {} };
}

describe('AdSlot + useAdProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlag.mockReturnValue(false);
  });

  describe('useAdProvider', () => {
    it('inicia com provider default (none)', () => {
      mockGetDoc.mockReturnValue(new Promise(() => {})); // nunca resolve
      const { result } = renderHook(() => useAdProvider());
      expect(result.current.providerId).toBe('none');
      expect(result.current.loading).toBe(true);
    });

    it('lê adProvider e adConfig do Firestore', async () => {
      mockGetDoc.mockResolvedValueOnce(
        mockSnap({
          adProvider: 'adsense',
          adConfig: { adsenseClientId: 'ca-pub-123', adsenseSlotId: '456' },
        })
      );
      const { result } = renderHook(() => useAdProvider());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.providerId).toBe('adsense');
      expect(result.current.enabled).toBe(true);
    });

    it('fallback para "none" se Firestore offline', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('offline'));
      const { result } = renderHook(() => useAdProvider());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.providerId).toBe('none');
      expect(result.current.error).not.toBeNull();
    });

    it('enabled=false se provider existe mas config ausente', async () => {
      mockGetDoc.mockResolvedValueOnce(mockSnap({ adProvider: 'adsense' })); // sem adConfig
      const { result } = renderHook(() => useAdProvider());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.providerId).toBe('adsense');
      expect(result.current.enabled).toBe(false);
    });
  });

  describe('AdSlot rendering', () => {
    it('feature flag off → não renderiza nada', () => {
      mockUseFeatureFlag.mockReturnValue(false);
      const { container } = render(<AdSlot />);
      expect(container.firstChild).toBeNull();
    });

    it('feature flag on + provider none → renderiza placeholder', async () => {
      mockUseFeatureFlag.mockReturnValue(true);
      mockGetDoc.mockResolvedValueOnce(mockSnap({})); // sem adProvider
      const { container } = render(<AdSlot />);
      await waitFor(() => {
        const ph = container.querySelector('[data-ad-placeholder="true"]');
        expect(ph).not.toBeNull();
      });
      expect(container.querySelector('[data-ad-provider="none"]')).not.toBeNull();
    });

    it('feature flag on + adsense config → renderiza <ins class="adsbygoogle">', async () => {
      mockUseFeatureFlag.mockReturnValue(true);
      mockGetDoc.mockResolvedValueOnce(
        mockSnap({
          adProvider: 'adsense',
          adConfig: { adsenseClientId: 'ca-pub-test', adsenseSlotId: 'slot-1' },
        })
      );
      // Mock adsbygoogle
      window.adsbygoogle = window.adsbygoogle || [];
      const pushSpy = vi.spyOn(window.adsbygoogle, 'push');
      const { container } = render(<AdSlot />);
      await waitFor(() => {
        const ins = container.querySelector('ins.adsbygoogle');
        expect(ins).not.toBeNull();
      });
      const ins = container.querySelector('ins.adsbygoogle');
      expect(ins.getAttribute('data-ad-client')).toBe('ca-pub-test');
      expect(ins.getAttribute('data-ad-slot')).toBe('slot-1');
      expect(pushSpy).toHaveBeenCalled();
    });

    it('provider habilitado mas config ausente → placeholder com aviso', async () => {
      mockUseFeatureFlag.mockReturnValue(true);
      mockGetDoc.mockResolvedValueOnce(mockSnap({ adProvider: 'adsterra' })); // sem adsterraKey
      const { container } = render(<AdSlot />);
      await waitFor(() => {
        const ph = container.querySelector('[data-ad-placeholder="true"]');
        expect(ph).not.toBeNull();
      });
      const ph = container.querySelector('[data-ad-placeholder="true"]');
      expect(ph.textContent).toContain('Ad slot configurado');
    });
  });

  describe('PROVIDERS registry', () => {
    it('tem 4 providers: none, adsense, adsterra, custom', () => {
      expect(Object.keys(PROVIDERS).sort()).toEqual(['adsense', 'adsterra', 'custom', 'none']);
    });

    it('cada provider tem id, label, enabled(), render()', () => {
      for (const p of Object.values(PROVIDERS)) {
        expect(p.id).toBeTypeOf('string');
        expect(p.label).toBeTypeOf('string');
        expect(p.enabled).toBeTypeOf('function');
        expect(p.render).toBeTypeOf('function');
      }
    });

    it('adsense.enabled() requer clientId + slotId', () => {
      expect(PROVIDERS.adsense.enabled({})).toBe(false);
      expect(PROVIDERS.adsense.enabled({ adsenseClientId: 'ca-pub-1' })).toBe(false);
      expect(PROVIDERS.adsense.enabled({ adsenseClientId: 'ca-pub-1', adsenseSlotId: '1' })).toBe(true);
    });

    it('adsterra.enabled() requer adsterraKey', () => {
      expect(PROVIDERS.adsterra.enabled({})).toBe(false);
      expect(PROVIDERS.adsterra.enabled({ adsterraKey: 'abc' })).toBe(true);
    });

    it('custom.enabled() requer customHtml', () => {
      expect(PROVIDERS.custom.enabled({})).toBe(false);
      expect(PROVIDERS.custom.enabled({ customHtml: '<div>ad</div>' })).toBe(true);
    });
  });
});
