/**
 * @fileoverview PetRatingSummary — sumário de avaliações (V3, TASK-V3-PET-DETAIL-12).
 *
 * Renderiza estrelas médias + count + breakdown opcional.
 * Baseado em avaliações existentes (de adotantes e donos).
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Avaliação"
 */
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/core/lib/utils';

function StarRow({ rating, size = 14 }) {
  const filled = Math.floor(rating);
  const hasHalf = rating - filled >= 0.5;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i < filled;
        const isHalf = !isFilled && i === filled && hasHalf;
        if (isFilled) {
          return <Star key={i} className="h-3.5 w-3.5 fill-highlight text-highlight" aria-hidden="true" />;
        }
        if (isHalf) {
          return <StarHalf key={i} className="h-3.5 w-3.5 fill-highlight text-highlight" aria-hidden="true" />;
        }
        return <Star key={i} className="h-3.5 w-3.5 text-muted-foreground/40" aria-hidden="true" />;
      })}
    </div>
  );
}

export function PetRatingSummary({ rating, count, className }) {
  if (typeof rating !== 'number' || count === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5',
        className,
      )}
      data-testid="pet-rating-summary"
    >
      <StarRow rating={rating} />
      <span className="text-[12.5px] font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-[11.5px] text-muted-foreground">
        ({count} {count === 1 ? 'avaliação' : 'avaliações'})
      </span>
    </div>
  );
}
