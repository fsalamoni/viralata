import { Skeleton } from '@/components/ui/skeleton';

/**
 * StatCardSkeleton — skeleton para StatCards (cards de métricas).
 *
 * @param {Object} options
 * @param {number} [options.count=4] - número de stat cards
 * @param {string} [options.className]
 * @example
 *   <div className="grid grid-cols-2 gap-4">
 *     <StatCardSkeleton count={4} />
 *   </div>
 */
export function StatCardSkeleton({ count = 4, className }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className || ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          {/* Icon + label */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 bg-muted/60" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>

          {/* Value */}
          <Skeleton className="mt-3 h-8 w-16 bg-muted/60" />

          {/* Trend/description */}
          <div className="mt-2 flex items-center gap-1">
            <Skeleton className="h-3 w-12 bg-muted/40" />
            <Skeleton className="h-3 w-20 bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * StatCardSkeletonRow — skeleton em linha (ex: em tabs).
 */
export function StatCardSkeletonRow({ count = 3 }) {
  return (
    <div className={`flex gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20 bg-muted/60" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-7 w-14 bg-muted/60" />
          <div className="mt-2 flex items-center gap-1">
            <Skeleton className="h-3 w-10 bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
