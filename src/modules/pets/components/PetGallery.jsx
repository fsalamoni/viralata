/**
 * @fileoverview PetGallery — galeria de fotos do pet (V3 refinado).
 *
 * TASK-V3-PET-DETAIL-FULL-REFINE: ajuste do zoom/lightbox para que a
 * IMAGEM seja o destaque (não os controles).
 *
 * Mudanças vs versão anterior:
 *  - Lightbox com imagem 95vh × 95vw (max maior)
 *  - Controles SEMI-TRANSPARENTES no fundo (não compete com imagem)
 *  - X button canto superior direito (mantido)
 *  - Setas embaixo (mantido)
 *  - Click fora da imagem fecha
 *  - Galeria principal com aspect 4:5 (mais natural p/ fotos de pets)
 *  - Thumbs mantidas
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
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
    if (total === 0) return;
    setActiveIdx(((idx % total) + total) % total);
  }, [total]);

  const goPrev = useCallback(() => goTo(activeIdx - 1), [goTo, activeIdx]);
  const goNext = useCallback(() => goTo(activeIdx + 1), [goTo, activeIdx]);

  // Drag/swipe
  const handleDragStart = useCallback((clientX) => {
    if (zoomOpen) return;
    dragStart.current = clientX;
    dragDelta.current = 0;
  }, [zoomOpen]);

  const handleDragMove = useCallback((clientX) => {
    if (dragStart.current == null) return;
    dragDelta.current = clientX - dragStart.current;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragStart.current == null) return;
    if (Math.abs(dragDelta.current) > SWIPE_THRESHOLD) {
      if (dragDelta.current > 0) goPrev();
      else goNext();
    }
    dragStart.current = null;
    dragDelta.current = 0;
  }, [goNext, goPrev]);

  // Keyboard
  useEffect(() => {
    function onKey(e) {
      if (zoomOpen && e.key === 'Escape') {
        setZoomOpen(false);
        return;
      }
      if (zoomOpen) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, zoomOpen]);

  // Travar scroll do body quando lightbox está aberto
  useEffect(() => {
    if (zoomOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [zoomOpen]);

  if (total === 0) {
    return (
      <div
        className={cn(
          'arena-panel flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-border bg-card',
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
    <div className={cn('space-y-2.5', className)} data-testid="pet-gallery">
      {/* Foto principal */}
      <div
        ref={containerRef}
        className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-card shadow-sm cursor-zoom-in select-none"
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
        onClick={() => setZoomOpen(true)}
      >
        {!imageLoaded[activeIdx] && (
          <Skeleton className="absolute inset-0 rounded-2xl" />
        )}
        <img
          key={activeIdx}
          src={photos[activeIdx]}
          alt={`${petName} — foto ${activeIdx + 1} de ${total}`}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            imageLoaded[activeIdx] ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setImageLoaded((s) => ({ ...s, [activeIdx]: true }))}
          loading={activeIdx === 0 ? 'eager' : 'lazy'}
          fetchPriority={activeIdx === 0 ? 'high' : 'auto'}
          draggable={false}
        />

        {/* Contador discreto (canto) */}
        {total > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/95 backdrop-blur-sm">
            {activeIdx + 1} / {total}
          </div>
        )}

        {/* Botão zoom (canto inferior direito) */}
        <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </div>

        {/* Setas (hover/touch) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/55 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/55 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Thumbs (se 2+) */}
      {total > 1 && (
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
          role="tablist"
          aria-label="Miniaturas"
        >
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              aria-label={`Ver foto ${i + 1} de ${total}`}
              onClick={() => goTo(i)}
              className={cn(
                'flex h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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

      {/* ============================================================ */}
      {/* LIGHTBOX — A IMAGEM É O DESTAQUE                              */}
      {/* ============================================================ */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${petName} — foto ampliada`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-2 sm:p-4"
          onClick={() => setZoomOpen(false)}
        >
          {/* IMAGEM — z-index 1, ocupa quase toda a tela */}
          <img
            src={photos[activeIdx]}
            alt={`${petName} — foto ${activeIdx + 1} de ${total} (ampliada)`}
            className="relative z-10 max-h-[95vh] max-w-[95vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Controles com opacidade baixa, aumentam no hover */}
          {/* X (canto superior direito) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
            aria-label="Fechar"
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/60 transition-all hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5 sm:top-5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Setas + contador embaixo */}
          {total > 1 && (
            <div
              className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:bottom-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={goPrev}
                aria-label="Foto anterior"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/60 transition-all hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
                {activeIdx + 1} / {total}
              </span>
              <button
                type="button"
                onClick={goNext}
                aria-label="Próxima foto"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/60 transition-all hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Hint discreto (canto inferior esquerdo) */}
          <div className="absolute bottom-4 left-3 z-20 text-[10.5px] text-white/40 sm:bottom-6 sm:left-5">
            ESC para fechar
          </div>
        </div>
      )}
    </div>
  );
}
