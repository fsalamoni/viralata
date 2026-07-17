import { Skeleton } from '@/components/ui/skeleton';

/**
 * DataGridSkeleton — skeleton loading para DataGrids/Tabelas.
 *
 * @param {Object} options
 * @param {number} [options.rows=5] - número de linhas de skeleton
 * @param {number} [options.cols=4] - número de colunas
 * @param {boolean} [options.hasHeader=true] - incluir header row
 * @param {string} [options.className]
 * @example
 *   <DataGridSkeleton rows={8} cols={3} hasHeader />
 */
export function DataGridSkeleton({ rows = 5, cols = 4, hasHeader = true, className }) {
  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* Header row */}
      {hasHeader && (
        <div className="flex gap-4 border-b border-border pb-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1 bg-muted/60" />
          ))}
        </div>
      )}

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          {/* Avatar/icon column */}
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

          {/* Text columns */}
          {Array.from({ length: cols - 1 }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={`h-4 flex-1 bg-muted/60 ${
                colIdx === 0 ? 'max-w-[180px]' : colIdx === 1 ? 'max-w-[120px]' : ''
              }`}
            />
          ))}

          {/* Actions column */}
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DataGridRowSkeleton — skeleton de 1 row para estados parciais.
 */
export function DataGridRowSkeleton({ cols = 4 }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      {Array.from({ length: cols - 1 }).map((_, colIdx) => (
        <Skeleton key={colIdx} className="h-4 flex-1 bg-muted/60 max-w-[150px]" />
      ))}
      <div className="ml-auto flex gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}
