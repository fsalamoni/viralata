/**
 * @fileoverview Profile — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_PROFILE` (default OFF) → V3.
 * Senão → V1.
 *
 * IMPORTANTE: React.lazy com dynamic import (D-VITE-LAZY-01).
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Skeleton } from '@/components/ui/skeleton';
import ProfileV1 from './Profile.v1';

const ProfileV3 = lazy(() => import(/* webpackChunkName: "ProfileV3" */ './Profile.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
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
