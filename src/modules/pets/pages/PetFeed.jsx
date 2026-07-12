import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import Seo from '@/components/Seo';
import { FEATURE_FLAG } from '@/core/featureFlags';
import PetFeedOriginal from './PetFeed.v1';
import PetFeedEnhanced from './PetFeedEnhanced';

/**
 * Wrapper do Feed de pets. Mantém a implementação original como default
 * (comportamento atual intocado) e expõe a versão com correção de
 * confiabilidade quando o admin master liga a flag
 * `pet_feed_reliability_fix` em `platform_settings/global`.
 */
export default function PetFeed() {
  const useEnhanced = useFeatureFlag(FEATURE_FLAG.PET_FEED_RELIABILITY_FIX);
  return (
    <>
      <Seo title="Pets para adoção" description="Feed de pets disponíveis para adoção responsável perto de você." />
      {useEnhanced ? <PetFeedEnhanced /> : <PetFeedOriginal />}
    </>
  );
}