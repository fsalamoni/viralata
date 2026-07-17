/**
 * @fileoverview PetGallery — galeria de fotos do pet (V3).
 *
 * TASK-V3-PET-DETAIL-2: substitui a galeria simples do V1.
 *
 * Features:
 *  - Aspect ratio 3:4 (não 1:1) — melhor para pets em pé
 *  - Swipe horizontal (touch + mouse drag)
 *  - Setas (← →) só visíveis em hover (desktop) ou sempre (touch)
 *  - Thumbs abaixo (1, 2 ou 3+ fotos)
 *  - Click na foto principal → modal zoom (Dialog)
 *  - Contador "1 de 5" discreto no canto
 *  - Skeleton com aspect-ratio enquanto carrega
 *  - EmptyState se pet sem fotos (SVG viralata)
 *  - Acessibilidade: aria-label, role, keyboard navigation
 *
 * Tokens: `bg-card`, `border-border`, `text-foreground`. Sem cores hard-coded.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Galeria"
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const SWIPE_THRESHOLD = 50; // px

function ViralataPlaceholder() {
  return (
    <svg viewBox="0 0 120 160" className="h-32 w-32 text-muted-foreground/40" aria-hidden="true">
      <ellipse cx="60" cy="50" rx="18" ry="20" fill="currentColor" opacity="0.3" />
      <ellipse cx="40" cy="35" rx="8" ry="10" fill="currentColor" opacity="0.3" />
      <ellipse cx="80" cy="35" rx="8" ry="10" fill="currentColor" opacity="0.3" />
      <ellipse cx="60" cy="90" rx="28" ry="35" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function PetGallery({ photos = [], petName = 'Pet', className }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState({});
  const containerRef = useRef(null);
  const dragStart = useRef(null);
  const dragDelta = useRef(0);

  const total = photos.length;

  const goTo = useCallback((idx) => {
    if (idx < 0) setActiveIdx(total - 1);
    else if (idx >= total) setActiveIdx(0);
    else setActiveIdx(idx);
  }, [total]);

  const goPrev = useCallback(() => goTo(activeIdx - 1), [activeIdx, goTo]);
  const goNext = useCallback(() => goTo(activeIdx + 1), [activeIdx, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (zoomOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape' && zoomOpen) setZoomOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, zoomOpen]);

  // Touch / mouse swipe
  const handleDragStart = (clientX) => {
    dragStart.current = clientX;
    dragDelta.current = 0;
  };
  const handleDragMove = (clientX) => {
    if (dragStart.current == null) return;
    dragDelta.current = clientX - dragStart.current;
  };
  const handleDragEnd = () => {
    if (Math.abs(dragDelta.current) > SWIPE_THRESHOLD) {
      if (dragDelta.current > 0) goPrev();
      else goNext();
    }
    dragStart.current = null;
    dragDelta.current = 0;
  };

  // Empty state (sem fotos)
  if (total === 0) {
    return (
      <div
        className={cn(
          'arena-panel flex aspect-[3/4] items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-card',
          className,
        )}
      >
        <EmptyState
          icon={ViralataPlaceholder}
          title="Sem fotos ainda"
          description={`${petName} ainda não tem fotos. Volte mais tarde!`}
          className="border-0 bg-transparent p-6"
          testId="pet-gallery-empty"
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)} data-testid="pet-gallery">
      {/* Foto principal */}
      <div
        ref={containerRef}
        className="arena-panel relative aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-card"
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => {
          if (dragStart.current != null) {
            e.preventDefault();
            handleDragMove(e.clientX);
          }
        }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {!imageLoaded[activeIdx] && (
          <Skeleton className="absolute inset-0 rounded-[1.25rem]" />
        )}
        <img
          key={activeIdx}
          src={photos[activeIdx]}
          alt={`${petName} — foto ${activeIdx + 1} de ${total}`}
          className={cn(
            'h-full w-full cursor-zoom-in object-cover transition-opacity duration-300',
            imageLoaded[activeIdx] ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setImageLoaded((s) => ({ ...s, [activeIdx]: true }))}
          onClick={() => setZoomOpen(true)}
          loading={activeIdx === 0 ? 'eager' : 'lazy'}
          fetchPriority={activeIdx === 0 ? 'high' : 'auto'}
        />

        {/* Contador */}
        {total > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {activeIdx + 1} de {total}
          </div>
        )}

        {/* Botão zoom */}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar foto"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Setas (só em hover ou touch) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbs (se 2+) */}
      {total > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Miniaturas"
        >
          {photos.map((url, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIdx}
              aria-label={`Ver foto ${i + 1} de ${total}`}
              onClick={() => goTo(i)}
              className={cn(
                'flex h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                i === activeIdx
                  ? 'border-primary'
                  : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Modal zoom */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${petName} — foto ampliada`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={photos[activeIdx]}
            alt={`${petName} — foto ${activeIdx + 1} de ${total} (ampliada)`}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {total > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label="Foto anterior"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">
                {activeIdx + 1} de {total}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label="Próxima foto"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
