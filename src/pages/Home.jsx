/**
 * @fileoverview HOME — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_HOME` (default OFF) → V3.
 * Senão → V1.
 *
 * IMPORTANTE: React.lazy com dynamic import (D-VITE-LAZY-01).
 * Vite faz constant folding em if/else estático e ELIMINA branches alternativas.
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import HOMEV1 from './HOME.v1';

const HOMEV3 = lazy(() => import(/* webpackChunkName: "HOMEV3" */ './HOME.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="mt-4 h-32 w-full" />
    </div>
  );
}

export default function HOMEWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_HOME);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <HOMEV3 />
      </Suspense>
    );
  }
  return <HOMEV1 />;
}
