/**
 * @fileoverview Skeleton — placeholder animado para estados de loading
 * (DS_V2 + V3).
 *
 * Componente base + variants prontas para uso em todas as páginas.
 * Cada variant respeita o aspect-ratio / estrutura do componente que
 * substitui, evitando layout shift quando os dados chegam.
 *
 * Variants:
 *  - `pet-card` — grid de pets (image 1.3 aspect + 3 linhas)
 *  - `swipe-card` — destaque do SwipeDeck (3:4 aspect + nome + cidade)
 *  - `list-item` — item de lista (avatar + 2 linhas)
 *  - `table-row` — linha de tabela (4 colunas)
 *  - `text` — linha de texto
 *  - `circle` — círculo (avatar, ícone)
 *
 * Tokens: `bg-muted` + `animate-pulse`. Sem cor hard-coded.
 * Dark mode: `bg-muted` propaga.
 *
 * @see docs/REGENCY_FEED_V3.md §3 (componentes) + §8 (performance)
 */
import { cn } from '@/core/lib/utils';

function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

function SkeletonPetCard({ className }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-[22px] border border-border bg-card p-4', className)}>
      <Skeleton className="aspect-[1.3] w-full rounded-[14px]" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function SkeletonSwipeCard({ className }) {
  return (
    <div className={cn('relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-border bg-muted', className)}>
      <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
        <Skeleton className="h-5 w-1/2 bg-foreground/20" />
        <Skeleton className="h-3 w-1/3 bg-foreground/20" />
      </div>
    </div>
  );
}

function SkeletonListItem({ className }) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
    </div>
  );
}

function SkeletonTableRow({ columns = 4, className }) {
  return (
    <div className={cn('flex items-center gap-4 border-b border-border px-4 py-3', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}

function SkeletonText({ className, lines = 1 }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

function SkeletonCircle({ className, size = 40 }) {
  return <Skeleton className={cn('rounded-full', className)} style={{ width: size, height: size }} />;
}

// Componente composto para o grid de skeletons
function SkeletonGrid({ count = 8, variant = 'pet-card', className }) {
  const Comp = {
    'pet-card': SkeletonPetCard,
    'list-item': SkeletonListItem,
  }[variant] || SkeletonPetCard;
  return (
    <div
      className={cn(
        'grid gap-4',
        variant === 'pet-card' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Comp key={i} />
      ))}
    </div>
  );
}

Skeleton.PetCard = SkeletonPetCard;
Skeleton.SwipeCard = SkeletonSwipeCard;
Skeleton.ListItem = SkeletonListItem;
Skeleton.TableRow = SkeletonTableRow;
Skeleton.Text = SkeletonText;
Skeleton.Circle = SkeletonCircle;
Skeleton.Grid = SkeletonGrid;

export { Skeleton, SkeletonPetCard, SkeletonSwipeCard, SkeletonListItem, SkeletonTableRow, SkeletonText, SkeletonCircle, SkeletonGrid };
export default Skeleton;
