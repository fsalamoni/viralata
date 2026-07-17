/**
 * @fileoverview SwipeDeck — container de cartas tinder (V3).
 *
 * Mostra até 3 cartas empilhadas. Suporta:
 *  - Drag/swipe (via SwipeCard)
 *  - Botões X (passar) e ♥ (curtir)
 *  - Botão UNDO (volta o último que passou/curtiu)
 *  - Empty state quando não tem mais cartas
 *  - Anúncio a11y do que aconteceu ("Você curtiu Rex" etc)
 *
 * @see docs/REGENCY_FEED_V3.md §F1-F5
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Undo2, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SwipeCard } from './SwipeCard';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';
import { cn } from '@/core/lib/utils';

const MAX_VISIBLE = 3;

export function SwipeDeck({ pets, onLike, onPass, onOpenDetail, onUndo }) {
  const reduceMotion = useReducedMotionSafe();
  const [dismissedIds, setDismissedIds] = useState([]);
  const [lastDecision, setLastDecision] = useState(null); // {id, action}
  const lastIdRef = useRef(null);

  const visible = (pets || [])
    .filter((p) => !dismissedIds.includes(p.id))
    .slice(0, MAX_VISIBLE);

  const handleSwipe = useCallback((petId, decision) => {
    setDismissedIds((prev) => [...prev, petId]);
    setLastDecision({ id: petId, action: decision });
    lastIdRef.current = petId;
    if (decision === 'like') onLike?.(petId);
    else onPass?.(petId);
  }, [onLike, onPass]);

  const handleUndo = useCallback(() => {
    if (!lastDecision) return;
    setDismissedIds((prev) => prev.filter((id) => id !== lastDecision.id));
    onUndo?.(lastDecision.id, lastDecision.action);
    setLastDecision(null);
    lastIdRef.current = null;
  }, [lastDecision, onUndo]);

  const topId = visible[0]?.id;

  if (visible.length === 0) {
    return (
      <div className="mb-14">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-highlight" fill="currentColor" aria-hidden="true" />
          <h2 className="text-[17px] font-bold text-foreground">Descobrir</h2>
        </div>
        <EmptyState
          icon={CheckCircle2}
          title="Você viu todos os destaques!"
          description="Veja a lista completa logo abaixo."
          testId="swipe-deck-empty"
        />
      </div>
    );
  }

  return (
    <div className="mb-14">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-highlight" fill="currentColor" aria-hidden="true" />
          <h2 className="text-[17px] font-bold text-foreground">Descobrir</h2>
        </div>
        {lastDecision && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Desfazer último"
            data-testid="swipe-undo"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Desfazer</span>
          </Button>
        )}
      </div>
      <div
        className="relative mx-auto h-[460px] w-full max-w-[360px]"
        data-testid="swipe-deck"
        role="region"
        aria-label="Cartas de pets para descobrir"
      >
        <AnimatePresence>
          {visible.map((pet, i) => (
            <motion.div
              key={pet.id}
              className="absolute inset-0"
              initial={reduceMotion ? false : { scale: 1 - i * 0.04, y: i * 8 }}
              animate={{ scale: 1 - i * 0.04, y: i * 8 }}
              exit={reduceMotion ? { opacity: 0 } : { x: lastDecision?.action === 'like' ? 400 : -400, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <SwipeCard
                pet={pet}
                isTop={i === 0}
                onSwipeRight={(id) => handleSwipe(id, 'like')}
                onSwipeLeft={(id) => handleSwipe(id, 'pass')}
                onTap={onOpenDetail}
                onInfo={onOpenDetail}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center justify-center gap-6">
        <button
          type="button"
          disabled={!topId}
          onClick={() => topId && handleSwipe(topId, 'pass')}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-destructive shadow-md transition-all',
            'hover:scale-105 hover:shadow-lg active:scale-95',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
          aria-label="Passar este pet"
          data-testid="swipe-button-pass"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={!topId}
          onClick={() => topId && handleSwipe(topId, 'like')}
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-highlight text-primary-foreground shadow-lg transition-all',
            'hover:scale-105 hover:shadow-xl active:scale-95',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
          aria-label="Curtir este pet"
          data-testid="swipe-button-like"
        >
          <Heart className="h-7 w-7" fill="currentColor" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default SwipeDeck;
