/**
 * @fileoverview CollapsibleCard — card com header que expande/colapsa o body
 * (V3).
 *
 * Usado em "Ver todos os pets disponíveis" (Feed), e em outras páginas onde
 * uma seção é opcional/detalhe. Respeita `prefers-reduced-motion` via
 * `useReducedMotionSafe` — sem FadeIn se user preferir sem animação.
 *
 * v2 (2026-07-24): Otimização de performance
 *  - Body só é MONTADO quando expandido pela primeira vez (lazy mount)
 *  - Mantém montado depois de expandir (evita re-mount a cada abrir/fechar)
 *  - Mantém altura animada (sem CLS) para UX consistente
 *
 * @see docs/REGENCY_FEED_V3.md §3 (F8: collapsible)
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';

/**
 * @param {object} props
 * @param {string} props.title - texto do header
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.badge] - badge à direita do title
 * @param {React.ReactNode} props.children - body (mostrado quando aberto)
 * @param {boolean} [props.defaultOpen=false]
 * @param {boolean} [props.controlled] - se true, usa `open` em vez de estado interno
 * @param {boolean} [props.open]
 * @param {Function} [props.onOpenChange]
 * @param {string} [props.className]
 * @param {string} [props.testId]
 * @param {string} [props.icon] - lucide icon name como 'pets' (Material Symbols)
 * @param {boolean} [props.lazyMount=true] - só monta body após primeira expansão
 */
export function CollapsibleCard({
  title,
  subtitle,
  badge,
  children,
  defaultOpen = false,
  controlled,
  open: openProp,
  onOpenChange,
  className,
  testId = 'collapsible-card',
  chevronSize = 'h-5 w-5',
  lazyMount = true,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen);
  const isControlled = controlled === true;
  const open = isControlled ? Boolean(openProp) : internalOpen;

  const setOpen = (next) => {
    if (!isControlled) setInternalOpen(next);
    if (next && !hasBeenOpened) setHasBeenOpened(true);
    onOpenChange?.(next);
  };

  const bodyRef = useRef(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const reduceMotion = useReducedMotionSafe();

  useEffect(() => {
    if (!bodyRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setBodyHeight(e.contentRect.height);
    });
    ro.observe(bodyRef.current);
    setBodyHeight(bodyRef.current.offsetHeight);
    return () => ro.disconnect();
  }, [children, hasBeenOpened]);

  return (
    <section
      className={cn('arena-section-card overflow-hidden', className)}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="arena-section-card-header group flex w-full cursor-pointer items-center justify-between gap-4 text-left transition-colors hover:bg-muted/40"
        aria-expanded={open}
        aria-controls={`${testId}-body`}
      >
        <div className="min-w-0 flex-1">
          <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
            {title}
            {badge}
          </h3>
          {subtitle && <p className="arena-section-card-description">{subtitle}</p>}
        </div>
        <ChevronDown
          className={cn(
            chevronSize,
            'shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
            !reduceMotion && 'transition-transform',
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={`${testId}-body`}
        style={{
          maxHeight: open ? `${bodyHeight}px` : '0px',
          transition: reduceMotion ? 'none' : 'max-height 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="overflow-hidden"
        aria-hidden={!open}
      >
        {/* Lazy mount: só renderiza children após primeira expansão */}
        <div ref={bodyRef} className="arena-section-card-body">
          {hasBeenOpened ? children : null}
        </div>
      </div>
    </section>
  );
}
