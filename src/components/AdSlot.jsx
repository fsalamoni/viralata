/**
 * AdSlot — TASK-024.
 *
 * Renderiza anúncio baseado em:
 *  1. Feature flag `ad_slots` (master switch): se false, não renderiza nada.
 *  2. Provider configurado em platform_settings/global.adProvider.
 *  3. Config específica em platform_settings/global.adConfig.
 *
 * Providers suportados: none, adsense, adsterra, custom.
 * Se provider = 'none' ou config ausente, renderiza placeholder visual
 * (mantém UX: usuário sabe que ali vai anúncio, mesmo sem monetização).
 *
 * v2 (2026-07-24): Otimização de performance
 *  - useAdProvider só roda se flag AD_SLOTS ON (evita query desnecessária)
 *  - Mostra placeholder imediato (sem layout shift)
 *  - Lazy mount via defer (não bloqueia FCP/LCP)
 *
 * Props:
 *  - slotId (string): identificador único do slot. Default 'default'.
 *  - label (string): texto do placeholder (default 'Espaço para parceiros').
 *  - sub (string): subtítulo do placeholder.
 *  - className (string): classes extras.
 *  - minHeight (number): altura mínima em px (evita layout shift).
 *  - eager (boolean): se true, não usa defer (default: false)
 */
import { useEffect, useRef, useState } from 'react';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { useAdProvider } from '@/core/ads/useAdProvider';
import { PROVIDERS } from '@/core/ads/providers';

export default function AdSlot({
  slotId = 'default',
  label = 'Espaço para parceiros',
  sub = 'Este espaço é reservado para parceiros do Viralata.',
  className = '',
  minHeight = 90,
  eager = false,
}) {
  const flagEnabled = useFeatureFlag(FEATURE_FLAG.AD_SLOTS);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(eager);

  // Defer mount: só inicializa provider quando componente está montado
  // e o browser está idle (não compete com render principal).
  useEffect(() => {
    if (eager) {
      setIsReady(true);
      return;
    }
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setIsReady(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    // Fallback: setTimeout
    const id = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(id);
  }, [eager]);

  if (!flagEnabled) return null;
  if (!isReady) {
    // Placeholder imediato, sem fazer query. Mantém altura (sem CLS).
    return (
      <section
        className={`border border-dashed border-border bg-secondary/40 ${className}`}
        data-ad-slot={slotId}
        data-ad-defer="true"
        aria-hidden="true"
      >
        <div
          className="arena-section-card-body flex items-center justify-center"
          style={{ minHeight: `${minHeight}px` }}
        />
      </section>
    );
  }

  return <AdSlotInner slotId={slotId} label={label} sub={sub} className={className} minHeight={minHeight} containerRef={containerRef} />;
}

/**
 * Componente interno que faz a query. Só renderizado após defer.
 */
function AdSlotInner({ slotId, label, sub, className, minHeight, containerRef }) {
  const { provider, providerId, config, enabled, loading } = useAdProvider();

  useEffect(() => {
    if (loading) return;
    if (!provider) return;
    const el = containerRef.current;
    if (!el) return;
    try {
      if (enabled) {
        provider.render(el, { ...config.adConfig, slotId });
      } else {
        const noneProvider = PROVIDERS.none;
        noneProvider.render(el, {
          label: 'Ad slot configurado mas sem config',
          sub: `Provider '${providerId}' precisa de configuração em platform_settings.`,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[AdSlot] render error (${providerId}):`, err);
      const noneProvider = PROVIDERS.none;
      noneProvider.render(el, { label, sub });
    }
  }, [loading, provider, providerId, config, enabled, slotId, label, sub]);

  return (
    <section
      className={`border border-dashed border-border bg-secondary/40 ${className}`}
      data-ad-slot={slotId}
      data-ad-provider={providerId}
      data-ad-enabled={enabled ? 'true' : 'placeholder'}
    >
      <div
        ref={containerRef}
        className="arena-section-card-body flex items-center justify-center"
        style={{ minHeight: `${minHeight}px` }}
      />
    </section>
  );
}
