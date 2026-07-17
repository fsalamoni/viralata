/**
 * @fileoverview PetDetail — wrapper que escolhe a versão (V3 | V1).
 *
 * Flag `V3_PAGE_PET_DETAIL` (default OFF) → PetDetailV3 (DS_V2 + V3, TASK-V3-PET-DETAIL)
 * Sem flag → PetDetailOriginal (V1)
 *
 * IMPORTANTE: usamos `React.lazy` com dynamic import para V3.
 * Sem isso, o Vite faz constant folding e elimina o V3 do bundle
 * (porque `useFeatureFlag` retorna `false` por default e o Vite assume
 * esse valor em build-time, eliminando as branches alternativas).
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import PetDetailSkeleton from '../components/PetDetailSkeleton';
import PetDetailOriginal from './PetDetail.v1';

// Lazy load: Vite preserva esse chunk no bundle (sem constant folding)
const PetDetailV3 = lazy(() => import(/* webpackChunkName: "PetDetailV3" */ './PetDetailV3'));

function PageFallback() {
  return <PetDetailSkeleton />;
}

export default function PetDetail() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_PET_DETAIL);

  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <PetDetailV3 />
      </Suspense>
    );
  }
  return <PetDetailOriginal />;
}
