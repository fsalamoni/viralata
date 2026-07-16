import { useReducedMotion } from 'framer-motion';

/**
 * DS_V2_MOTION — useReducedMotionSafe
 *
 * Hook que respeita `prefers-reduced-motion: reduce`. Quando o usuário tem
 * essa preferência ativada no SO, todos os wrappers de motion
 * (FadeIn, Stagger, HoverLift) desligam suas animações automaticamente.
 *
 * Spec v1.0 §5.1: "Sempre respeitar prefers-reduced-motion: reduce".
 *
 * @returns {boolean} true se o usuário prefere movimento reduzido
 *
 * @example
 * const reduce = useReducedMotionSafe();
 * return reduce ? <div>{children}</div> : <motion.div {...}>{children}</motion.div>;
 */
export function useReducedMotionSafe() {
  return useReducedMotion();
}
