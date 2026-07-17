/**
 * @fileoverview useSwipeGesture — hook de drag/swipe para cartões (V3).
 *
 * Detecta drag horizontal via pointer events. Suporta mouse e touch.
 * Chama `onSwipe(direction)` quando dx ultrapassa threshold.
 *
 * @param {object} options
 * @param {number} [options.threshold=90] - px para considerar swipe completo
 * @param {Function} options.onSwipeLeft - dx < -threshold
 * @param {Function} options.onSwipeRight - dx > +threshold
 * @param {Function} [options.onTap] - dx < threshold (clique)
 * @param {Function} [options.onDragStart]
 * @param {Function} [options.onDragEnd]
 *
 * @returns {object} {
 *   onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel,
 *   drag: { dx, isDragging, direction }
 * }
 *
 * @see docs/REGENCY_FEED_V3.md §F1 (drag)
 */
import { useState, useCallback, useRef } from 'react';

export function useSwipeGesture({
  threshold = 90,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onDragStart,
  onDragEnd,
} = {}) {
  const [drag, setDrag] = useState({ dx: 0, isDragging: false, direction: null });
  const dragRef = useRef({ startX: 0, startY: 0, active: false, dx: 0 });

  const onPointerDown = useCallback((e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* no-op */ }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      active: true,
      dx: 0,
    };
    setDrag({ dx: 0, isDragging: true, direction: null });
    onDragStart?.();
  }, [onDragStart]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const direction = Math.abs(dx) > 5 ? (dx > 0 ? 'right' : 'left') : null;
    dragRef.current.dx = dx;
    setDrag({ dx, isDragging: true, direction });
  }, []);

  const onPointerEnd = useCallback(() => {
    if (!dragRef.current.active) return;
    const dx = dragRef.current.dx;
    dragRef.current.active = false;
    setDrag({ dx: 0, isDragging: false, direction: null });
    onDragEnd?.();
    if (Math.abs(dx) < 6) {
      onTap?.();
    } else if (dx > threshold) {
      onSwipeRight?.();
    } else if (dx < -threshold) {
      onSwipeLeft?.();
    }
  }, [onSwipeLeft, onSwipeRight, onTap, onDragEnd, threshold]);

  const onPointerUp = onPointerEnd;
  const onPointerLeave = onPointerEnd;
  const onPointerCancel = onPointerEnd;

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    drag,
  };
}
