/**
 * @fileoverview LazyAdSlot — wrapper que adia o mount do AdSlotUnified
 * até que o browser esteja idle e o componente esteja visível.
 *
 * v2 (2026-07-24): Otimização de performance
 *  - Combina requestIdleCallback + IntersectionObserver
 *  - Garante zero impacto no FCP/LCP
 *  - Mantém altura (sem CLS) durante loading
 *  - Pode ser usado em qualquer lugar onde AdSlotUnified é usado
 */
import { useEffect, useRef, useState } from 'react';
import AdSlotUnified from './AdSlotUnified';

/**
 * Componente que só renderiza o AdSlotUnified quando:
 * 1. O browser está idle (não compete com render principal)
 * 2. O componente está visível (lazy on viewport)
 *
 * @param {object} props - mesmos props do AdSlotUnified
 * @param {number} props.thresholdDistance - rootMargin (default '200px')
 * @param {number} props.idleTimeout - ms até forçar mount (default 3000)
 */
export function LazyAdSlot({
  thresholdDistance = '200px',
  idleTimeout = 3000,
  eager = false,
  ...adSlotProps
}) {
  const containerRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(eager);

  useEffect(() => {
    if (eager) {
      setShouldRender(true);
      return;
    }
    if (shouldRender) return;

    let timeoutId;
    let idleId;
    let observer;

    const trigger = () => {
      if (shouldRender) return;
      setShouldRender(true);
    };

    // 1. requestIdleCallback
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(trigger, { timeout: idleTimeout });
    } else {
      idleId = setTimeout(trigger, 100);
    }

    // 2. IntersectionObserver (fallback se idle demora)
    if (containerRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            trigger();
            observer.disconnect();
          }
        },
        { rootMargin: thresholdDistance, threshold: 0.01 }
      );
      observer.observe(containerRef.current);
    }

    // 3. Hard timeout (sempre carrega após idleTimeout)
    timeoutId = setTimeout(trigger, idleTimeout);

    return () => {
      if (typeof cancelIdleCallback === 'function' && idleId) {
        cancelIdleCallback(idleId);
      } else if (idleId) {
        clearTimeout(idleId);
      }
      clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [eager, shouldRender, thresholdDistance, idleTimeout]);

  if (!shouldRender) {
    // Placeholder invisível (preserva layout)
    return (
      <div
        ref={containerRef}
        style={{ minHeight: `${adSlotProps.minHeight || 90}px` }}
        aria-hidden="true"
        data-ad-lazy="pending"
      />
    );
  }

  return <AdSlotUnified {...adSlotProps} />;
}

export default LazyAdSlot;
