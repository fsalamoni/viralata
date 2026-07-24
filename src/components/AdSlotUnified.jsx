/**
 * @fileoverview AdSlotUnified — wrapper que escolhe entre AdSlotBanner (V1 parceiro)
 * e AdSlot legado (provider externo) baseado em flags.
 *
 * v2 (2026-07-24): Otimização de performance
 *  - Lazy rendering via IntersectionObserver
 *  - Não bloqueia FCP/LCP
 *  - Mostra placeholder imediato, carrega conteúdo depois
 *  - Skip query se slot não está visível
 *
 * @see docs/PARTNER_SPACES_PLAN.md §9
 */
import { useEffect, useRef, useState } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useActiveBannersForPosition } from '@/modules/partners/hooks/usePartners';
import AdSlot from '@/components/AdSlot';
import { AdSlotBanner } from '@/components/AdSlotBanner';

/**
 * Decide qual componente de anúncio renderizar.
 *
 * Hierarquia:
 * 1. PUBLIC_PARTNER_BANNERS_V1 ON + tem banners ativos → AdSlotBanner
 *    (rotação client-side + tracking LGPD)
 * 2. AD_SLOTS ON + provider configurado → AdSlot legado (AdSense/Adsterra)
 * 3. Senão → nada (retorna null)
 *
 * @param {object} props
 * @param {string} props.slotId - identificador único do slot (ex: 'feed_top')
 * @param {string} props.position - posição dos banners (BANNER_POSITIONS)
 * @param {string} props.page - pathname atual para tracking
 * @param {string} props.label - label do placeholder (AdSlot legado)
 * @param {string} props.sub - sub do placeholder
 * @param {string} props.className - classes extras
 * @param {number} props.minHeight - altura mínima em px
 * @param {boolean} props.lazy - se true, só carrega quando visível (default: true)
 */
export function AdSlotUnified({
  slotId = 'default',
  position,
  page = '',
  label,
  sub,
  className = '',
  minHeight = 90,
  lazy = true,
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(!lazy);

  // IntersectionObserver para lazy load
  useEffect(() => {
    if (!lazy) return;
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Só carrega dados quando visível
  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ minHeight: `${minHeight}px` }}
        aria-hidden="true"
        data-ad-slot={slotId}
        data-ad-loading="lazy"
      />
    );
  }

  return (
    <AdSlotUnifiedContent
      slotId={slotId}
      position={position}
      page={page}
      label={label}
      sub={sub}
      className={className}
      minHeight={minHeight}
    />
  );
}

/**
 * Componente interno que faz as queries. Só renderizado após visibilidade.
 */
function AdSlotUnifiedContent({
  slotId,
  position,
  page,
  label,
  sub,
  className,
  minHeight,
}) {
  const partnerFlag = useFeatureFlag(FEATURE_FLAG.PUBLIC_PARTNER_BANNERS_V1);
  const { data: banners = [], isLoading } = useActiveBannersForPosition(
    partnerFlag && position ? position : '__disabled__',
  );

  // 1. Partner banners ativos (rotacionados)
  if (partnerFlag && position && !isLoading && banners.length > 0) {
    return <AdSlotBanner position={position} page={page} className={className} />;
  }

  // 2. AdSlot legado (provider externo)
  return (
    <AdSlot
      slotId={slotId}
      label={label}
      sub={sub}
      className={className}
      minHeight={minHeight}
    />
  );
}

export default AdSlotUnified;
