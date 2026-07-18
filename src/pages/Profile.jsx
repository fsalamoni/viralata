/**
 * @fileoverview Profile — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_PROFILE` (default OFF) → V3.
 * Senão → V1.
 *
 * IMPORTANTE: React.lazy com dynamic import (D-VITE-LAZY-01).
 * Vite faz constant folding em if/else com flag estática e ELIMINA branches alternativas.
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import ProfileV1 from './Profile.v1';

const ProfileV3 = lazy(() => import(/* webpackChunkName: "ProfileV3" */ './Profile.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="mt-4 h-32 w-full" />
    </div>
  );
}

export default function ProfileWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_PROFILE);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ProfileV3 />
      </Suspense>
    );
  }
  return <ProfileV1 />;
}
