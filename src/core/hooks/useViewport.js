/**
 * @fileoverview useViewport — hook para detectar o viewport atual (V3).
 *
 * Retorna 'mobile' | 'tablet' | 'desktop' baseado no `window.innerWidth`.
 * Mobile: < 640px (sm do Tailwind)
 * Tablet: 640-1024px
 * Desktop: >= 1024px
 *
 * @see docs/REGENCY_FEED_V3.md §D2 (cards por página responsivo)
 */
import { useState, useEffect } from 'react';

const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
};

function getViewport() {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < BREAKPOINTS.tablet) return 'mobile';
  if (w < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}

export function useViewport() {
  const [viewport, setViewport] = useState(getViewport);
  useEffect(() => {
    const onResize = () => setViewport(getViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { viewport };
}

export default useViewport;
