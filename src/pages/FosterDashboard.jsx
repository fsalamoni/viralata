/**
 * @fileoverview Foster — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_FOSTER` (default OFF) → V3.
 * Senão → V1.
 *
 * IMPORTANTE: React.lazy com dynamic import (D-VITE-LAZY-01).
 * Vite faz constant folding em if/else com flag estática e ELIMINA branches alternativas.
 */
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import FosterV1 from './FosterDashboard.v1';

const FosterV3 = lazy(() => import(/* webpackChunkName: "FosterV3" */ './FosterDashboard.v3.jsx'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="mt-4 h-32 w-full" />
    </div>
  );
}

export default function FosterWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_FOSTER);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <FosterV3 />
      </Suspense>
    );
  }
  return <FosterV1 />;
}
