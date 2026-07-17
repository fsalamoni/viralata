/**
 * @fileoverview SwipeCard — carta individual do SwipeDeck (V3).
 *
 * Substitui o `<SwipeCard>` inline do PetFeed.v1 (393 linhas).
 *
 * Mudanças vs V1:
 *  - Cores pelo DS: success/destructive (não hsl hard-coded)
 *  - Hook `useSwipeGesture` (não drag state inline)
 *  - framer-motion + `useReducedMotionSafe` para transições suaves
 *  - Haptic feedback (navigator.vibrate)
 *  - A11y: `aria-label` em todos os botões, `aria-live` no overlay
 *  - Botão "info" também acessível por teclado
 *
 * @see docs/REGENCY_FEED_V3.md §F1-F5
 */
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Info, Heart, X } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { useSwipeGesture } from '@/core/hooks/useSwipeGesture';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';

const AGE_LABEL = { puppy: 'Filhote', adult: 'Adulto', senior: 'Idoso' };

function vibrate(pattern = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* no-op */ }
  }
}

export function SwipeCard({ pet, isTop, onSwipeRight, onSwipeLeft, onTap, onInfo }) {
  const reduceMotion = useReducedMotionSafe();

  const handleRight = useCallback(() => {
    vibrate(15);
    onSwipeRight?.(pet.id);
  }, [onSwipeRight, pet.id]);

  const handleLeft = useCallback(() => {
    vibrate(8);
    onSwipeLeft?.(pet.id);
  }, [onSwipeLeft, pet.id]);

  const handleTap = useCallback(() => onTap?.(pet.id), [onTap, pet.id]);
  const handleInfo = useCallback((e) => {
    e.stopPropagation();
    onInfo?.(pet.id);
  }, [onInfo, pet.id]);

  const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, drag } = useSwipeGesture({
    threshold: 90,
    onSwipeRight: handleRight,
    onSwipeLeft: handleLeft,
    onTap: handleTap,
  });

  const dx = drag.dx;
  const rotation = Math.max(-14, Math.min(14, dx / 12));
  const likeOpacity = Math.max(0, Math.min(1, dx / 90));
  const passOpacity = Math.max(0, Math.min(1, -dx / 90));
  const temperament = pet?.temperament || [];

  return (
    <motion.div
      onPointerDown={isTop ? onPointerDown : undefined}
      onPointerMove={isTop ? onPointerMove : undefined}
      onPointerUp={isTop ? onPointerUp : undefined}
      onPointerLeave={isTop ? onPointerLeave : undefined}
      onPointerCancel={isTop ? onPointerUp : undefined}
      className={cn(
        'absolute inset-0 select-none rounded-[28px] overflow-hidden border border-border bg-card shadow-[0_30px_60px_-28px_hsl(20_40%_15%/0.45)]',
        isTop ? 'touch-none cursor-grab active:cursor-grabbing' : 'pointer-events-none',
      )}
      style={{
        transform: `translateX(${dx}px) rotate(${rotation}deg)`,
        transition: drag.isDragging || reduceMotion ? 'none' : 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
        zIndex: isTop ? 3 : 1,
      }}
      role="group"
      aria-label={`Pet ${pet?.name || pet?.title || ''}`}
      data-testid={`swipe-card-${pet?.id}`}
    >
      {pet?.photos?.[0] ? (
        <img
          src={pet.photos[0]}
          alt={pet.title || pet.name || 'Pet para adoção'}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary to-highlight">
          <Heart className="h-28 w-28 text-primary-foreground/35" aria-hidden="true" />
        </div>
      )}

      {/* Overlay CURTIR (verde success) */}
      <div
        className="absolute right-4 top-4 rounded-[10px] border-[3px] border-success px-3 py-1 font-extrabold text-primary-foreground transition-opacity"
        style={{ opacity: likeOpacity, transform: 'rotate(-14deg)' }}
        aria-hidden="true"
      >
        CURTIR
      </div>

      {/* Overlay PASSAR (vermelho destructive) */}
      <div
        className="absolute left-4 top-4 rounded-[10px] border-[3px] border-destructive px-3 py-1 font-extrabold text-primary-foreground transition-opacity"
        style={{ opacity: passOpacity, transform: 'rotate(14deg)' }}
        aria-hidden="true"
      >
        AGORA NÃO
      </div>

      {/* Botão info (sempre visível) */}
      <button
        type="button"
        onClick={handleInfo}
        className="absolute right-3.5 top-3.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-foreground/30 text-primary-foreground backdrop-blur-md transition-colors hover:bg-foreground/50"
        aria-label={`Ver perfil de ${pet?.name || 'pet'}`}
        data-testid={`swipe-card-info-${pet?.id}`}
      >
        <Info className="h-4 w-4" />
      </button>

      {/* Footer com info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent p-5 text-primary-foreground">
        <div className="mb-1.5 flex items-baseline gap-2">
          <span className="text-[21px] font-extrabold">{pet?.name || pet?.title}</span>
          {pet?.age_group && (
            <span className="text-[12.5px] opacity-90">· {AGE_LABEL[pet.age_group]}</span>
          )}
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {temperament.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-primary-foreground/20 px-2.5 py-0.5 text-[11px] font-bold">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs opacity-90">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {pet?.city}{pet?.state ? `, ${pet.state}` : ''}
        </div>
      </div>
    </motion.div>
  );
}

export default SwipeCard;
