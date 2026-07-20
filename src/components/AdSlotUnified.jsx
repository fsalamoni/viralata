/**
 * @fileoverview AdSlotUnified — wrapper que escolhe entre AdSlotBanner (V1 parceiro)
 * e AdSlot legado (provider externo) baseado em flags.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §9
 */
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
 */
export function AdSlotUnified({
  slotId = 'default',
  position,
  page = '',
  label,
  sub,
  className = '',
  minHeight = 90,
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
  // Renderiza o componente que tem a sua própria lógica de flag AD_SLOTS
  return <AdSlot slotId={slotId} label={label} sub={sub} className={className} minHeight={minHeight} />;
}

export default AdSlotUnified;
