/**
 * @fileoverview Lightbox — modal acessível para visualização de
 * imagens (TASK-323).
 *
 * Suporta:
 *  - Keyboard: ←, →, Home, End, Esc
 *  - Touch: swipe left/right (mobile)
 *  - ARIA: dialog, aria-label, role=img
 *  - Fullscreen: opcional
 *  - Previne scroll do body quando aberto
 *
 * @example
 *   <Lightbox images={[{ url, alt, caption }]} open index={0} onClose={...} />
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

const SWIPE_THRESHOLD = 50; // px

export function Lightbox({
  images = [],
  open = false,
  index = 0,
  onClose,
  onIndexChange,
  className,
}) {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [touchStart, setTouchStart] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(index);
  }, [index]);

  const goNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((i) => {
      const next = (i + 1) % images.length;
      onIndexChange?.(next);
      return next;
    });
  }, [images.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((i) => {
      const prev = (i - 1 + images.length) % images.length;
      onIndexChange?.(prev);
      return prev;
    });
  }, [images.length, onIndexChange]);

  const goTo = useCallback((i) => {
    setCurrentIndex(i);
    onIndexChange?.(i);
  }, [onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNext();
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(images.length - 1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goPrev, goNext, goTo, images.length, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Focus on open
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await dialogRef.current?.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      // ignore
    }
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) goPrev();
      else goNext();
    }
    setTouchStart(null);
  }, [touchStart, goPrev, goNext]);

  if (!open || images.length === 0) return null;
  const current = images[currentIndex] || {};

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizador de imagem ${currentIndex + 1} de ${images.length}`}
      tabIndex={-1}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white outline-none',
        className,
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="lightbox"
    >
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-xs text-white/80">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
            aria-label={isFullscreen ? 'Sair de tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-white hover:bg-white/10"
            aria-label="Fechar"
            data-testid="lightbox-close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Prev/Next buttons */}
      {images.length > 1 && (
        <>
          <Button
            size="icon"
            variant="ghost"
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 text-white hover:bg-white/10"
            aria-label="Imagem anterior"
            data-testid="lightbox-prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 text-white hover:bg-white/10"
            aria-label="Próxima imagem"
            data-testid="lightbox-next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Image */}
      <figure className="flex flex-col items-center max-h-[80vh] max-w-[90vw]">
        <img
          src={current.url || current.src}
          alt={current.alt || current.caption || `Imagem ${currentIndex + 1}`}
          className="max-h-[75vh] max-w-full object-contain select-none"
          draggable={false}
          role="img"
          aria-label={current.alt || `Imagem ${currentIndex + 1} de ${images.length}`}
          data-testid="lightbox-image"
        />
        {(current.caption || current.title) && (
          <figcaption className="mt-3 max-w-[80vw] text-center text-sm text-white/80">
            {current.caption || current.title}
          </figcaption>
        )}
      </figure>

      {/* Thumbnails strip (se houver mais de 1) */}
      {images.length > 1 && images.length <= 12 && (
        <div className="absolute inset-x-0 bottom-3 px-3 overflow-x-auto">
          <ul className="flex justify-center gap-1.5">
            {images.map((img, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-12 w-12 overflow-hidden rounded border-2 transition-all',
                    i === currentIndex
                      ? 'border-white scale-110'
                      : 'border-white/30 opacity-60 hover:opacity-100',
                  )}
                  aria-label={`Ir para imagem ${i + 1}`}
                  aria-current={i === currentIndex ? 'true' : undefined}
                >
                  <img
                    src={img.thumb_url || img.thumb || img.url || img.src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Lightbox;
