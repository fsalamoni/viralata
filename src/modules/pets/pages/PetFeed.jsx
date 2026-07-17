/**
 * @fileoverview PetFeed — wrapper que escolhe a versão ativa (V3 | Enhanced | V1).
 *
 * Flag `V3_PAGE_FEED` (default OFF) → PetFeedV3 (DS_V2 + V3, TASK-V3-FEED-1)
 * Flag `PET_FEED_RELIABILITY_FIX` (default OFF) → PetFeedEnhanced (correção filtros)
 * Sem flag → PetFeed.v1 (fallback legado)
 *
 * Ordem de verificação:
 *  1. V3_PAGE_FEED ON → V3 (prioridade máxima)
 *  2. PET_FEED_RELIABILITY_FIX ON → Enhanced
 *  3. Senão → V1
 */
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import Seo from '@/components/Seo';
import { FEATURE_FLAG } from '@/core/featureFlags';
import PetFeedV3 from './PetFeedV3';
import PetFeedOriginal from './PetFeed.v1';
import PetFeedEnhanced from './PetFeedEnhanced';

export default function PetFeed() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_FEED);
  const useEnhanced = useFeatureFlag(FEATURE_FLAG.PET_FEED_RELIABILITY_FIX);

  if (useV3) return <PetFeedV3 />;
  if (useEnhanced) return <PetFeedEnhanced />;
  return <PetFeedOriginal />;
}
