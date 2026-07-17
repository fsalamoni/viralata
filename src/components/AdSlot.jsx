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
 * Props:
 *  - slotId (string): identificador único do slot. Default 'default'.
 *  - label (string): texto do placeholder (default 'Espaço para parceiros').
 *  - sub (string): subtítulo do placeholder.
 *  - className (string): classes extras.
 *  - minHeight (number): altura mínima em px (evita layout shift).
 */
import { useEffect, useRef } from 'react';
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
}) {
  const flagEnabled = useFeatureFlag(FEATURE_FLAG.AD_SLOTS);
  const { provider, providerId, config, enabled, loading } = useAdProvider();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!flagEnabled) return;
    if (loading) return;
    if (!provider) return;
    const el = containerRef.current;
    if (!el) return;
    try {
      if (enabled) {
        provider.render(el, { ...config.adConfig, slotId });
      } else {
        // Provider existe mas config ausente → placeholder com aviso
        const noneProvider = PROVIDERS.none;
        noneProvider.render(el, {
          label: 'Ad slot configurado mas sem config',
          sub: `Provider '${providerId}' precisa de configuração em platform_settings.`,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[AdSlot] render error (${providerId}):`, err);
      // Fallback para placeholder
      const noneProvider = PROVIDERS.none;
      noneProvider.render(el, { label, sub });
    }
  }, [flagEnabled, loading, provider, providerId, config, enabled, slotId, label, sub]);

  if (!flagEnabled) return null;

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
