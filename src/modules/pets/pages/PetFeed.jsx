/**
 * @fileoverview PetFeed — wrapper que escolhe a versão ativa (V3 | Enhanced | V1).
 *
 * Flag `V3_PAGE_FEED` (default OFF) → PetFeedV3 (DS_V2 + V3, TASK-V3-FEED-1)
 * Flag `PET_FEED_RELIABILITY_FIX` (default OFF) → PetFeedEnhanced (correção filtros)
 * Sem flag → PetFeed.v1 (fallback legado)
 *
 * IMPORTANTE: usamos `React.lazy` com dynamic import para V3 e Enhanced.
 * Sem isso, o Vite faz constant folding e elimina essas branches do bundle
 * (porque `useFeatureFlag` retorna `false` por default e o Vite assume
 * esse valor em build-time, eliminando as branches alternativas).
 *
 * Ordem de verificação:
 *  1. V3_PAGE_FEED ON → V3 (prioridade máxima)
 *  2. PET_FEED_RELIABILITY_FIX ON → Enhanced
 *  3. Senão → V1
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import Seo from '@/components/Seo';
import { FEATURE_FLAG } from '@/core/featureFlags';
import PetFeedOriginal from './PetFeed.v1';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load: Vite preserva esses chunks no bundle (sem constant folding)
const PetFeedV3 = lazy(() => import(/* webpackChunkName: "PetFeedV3" */ './PetFeedV3'));
const PetFeedEnhanced = lazy(() => import(/* webpackChunkName: "PetFeedEnhanced" */ './PetFeedEnhanced'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-5 pb-12">
      <Skeleton className="mb-3 h-8 w-48" />
      <Skeleton className="mb-6 h-12 w-3/4" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function PetFeed() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_FEED);
  const useEnhanced = useFeatureFlag(FEATURE_FLAG.PET_FEED_RELIABILITY_FIX);

  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <PetFeedV3 />
      </Suspense>
    );
  }
  if (useEnhanced) {
    return (
      <Suspense fallback={<PageFallback />}>
        <PetFeedEnhanced />
      </Suspense>
    );
  }
  return (
    <>
      <Seo title="Pets para adoção" description="Feed de pets disponíveis para adoção responsável perto de você." />
      <PetFeedOriginal />
    </>
  );
}
