/**
 * @fileoverview Search — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_SEARCH` (default OFF) → V3.
 * Senão → V1.
 *
 * IMPORTANTE: React.lazy com dynamic import (D-VITE-LAZY-01).
 * Vite faz constant folding em if/else com flag estática e ELIMINA branches alternativas.
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Skeleton } from '@/components/ui/skeleton';
import SearchV1 from './SearchPage.v1';

const SearchV3 = lazy(() => import(/* webpackChunkName: "SearchV3" */ './SearchPage.v3.jsx'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="mt-4 h-32 w-full" />
    </div>
  );
}

export default function SearchWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_SEARCH);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <SearchV3 />
      </Suspense>
    );
  }
  return <SearchV1 />;
}
