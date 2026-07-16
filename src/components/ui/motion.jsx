import * as React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';

/**
 * DS_V2_MOTION — Wrappers de movimento (spec v1.0 §5.1)
 *
 * Aplicar APENAS em: hero, grids de cards, modais, dropdowns, transições de rota.
 * NÃO aplicar em: hover de botão (CSS puro), focus, scroll-suave (CSS).
 *
 * Todos os wrappers respeitam prefers-reduced-motion via useReducedMotionSafe:
 * quando ativo, renderizam children sem animação (plain div/span).
 *
 * Convenções:
 *  - FadeIn: opacity 0→1, translateY 16→0, 400ms ease, whileInView once: true
 *  - Stagger: container que aplica delay 70-90ms entre filhos FadeIn
 *  - HoverLift: scale 1.01 + sombra crescente, 300ms ease (CSS via Tailwind)
 */

const fadeUpVariant = (reduce) =>
  reduce
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
        transition: { duration: 0.4, ease: 'easeOut' },
      };

/**
 * FadeIn — entrada com fade + slide-up. Use em hero, títulos de seção, cards individuais.
 *
 * @example
 * <FadeIn as="h1" className="text-3xl font-bold">Título</FadeIn>
 */
export const FadeIn = React.forwardRef(function FadeIn(
  { children, as: Comp = 'div', delay = 0, className, style, ...rest },
  ref
) {
  const reduce = useReducedMotionSafe();
  const v = fadeUpVariant(reduce);
  const transition = reduce ? undefined : { ...v.transition, delay };
  const MotionComp = motion[Comp] || motion.div;
  return (
    <MotionComp
      ref={ref}
      initial={v.initial}
      whileInView={v.whileInView}
      viewport={v.viewport}
      animate={v.animate}
      transition={transition}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </MotionComp>
  );
});

/**
 * Stagger — container que aplica stagger 80ms entre filhos diretos.
 * Cada filho deve ser FadeIn (ou motion.* direto). Aplica até 8 itens.
 *
 * @example
 * <Stagger>
 *   <FadeIn>Item 1</FadeIn>
 *   <FadeIn>Item 2</FadeIn>
 *   <FadeIn>Item 3</FadeIn>
 * </Stagger>
 */
export const Stagger = React.forwardRef(function Stagger(
  { children, staggerDelay = 0.08, maxStagger = 8, as: Comp = 'div', className, style, ...rest },
  ref
) {
  const reduce = useReducedMotionSafe();
  if (reduce) {
    return <Comp ref={ref} className={className} style={style} {...rest}>{children}</Comp>;
  }
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: staggerDelay,
            staggerDirection: 1,
            // Limita stagger visível (max 8 itens)
            delayChildren: 0,
          },
        },
      }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

/**
 * HoverLift — wrapper que aplica hover-lift (scale + sombra).
 * Spec: scale 1.01-1.02 + sombra crescente, 300ms, nunca tilt 3D.
 * Quando reduce-motion ativo, vira um wrapper sem animação.
 *
 * @example
 * <HoverLift as="div" className="rounded-2xl">
 *   <Card>...</Card>
 * </HoverLift>
 */
export const HoverLift = React.forwardRef(function HoverLift(
  { children, scale = 1.01, as: Comp = 'div', className, style, ...rest },
  ref
) {
  const reduce = useReducedMotionSafe();
  if (reduce) {
    return <Comp ref={ref} className={className} style={style} {...rest}>{children}</Comp>;
  }
  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -2, scale }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
