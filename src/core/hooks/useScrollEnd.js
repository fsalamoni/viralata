/**
 * @fileoverview useScrollEnd — detecta quando o user rolou até o fim de
 * um container scrollável. Trata 3 casos:
 *
 * 1. Conteúdo MENOR que o container: scroll é desnecessário, retorna true
 *    IMEDIATAMENTE (checa via ResizeObserver + scrollHeight/clientHeight).
 * 2. Conteúdo MAIOR: detecta via scroll event quando scrollTop + clientHeight
 *    >= scrollHeight (com tolerância).
 * 3. Resize dinâmico: re-checa via ResizeObserver.
 *
 * Usado em VolunteerSignup para destravar o aceite do termo quando o texto
 * é menor que a altura do container (não há scroll possível).
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @returns {boolean} true se o conteúdo já está visível por completo
 */
import { useEffect, useState } from 'react';

export function useScrollEnd(ref, { tolerance = 8 } = {}) {
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;

    const check = () => {
      // Caso 1: conteúdo menor que container
      if (el.scrollHeight <= el.clientHeight + tolerance) {
        setIsAtEnd(true);
        return;
      }
      // Caso 2: já rolou até o fim
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - tolerance) {
        setIsAtEnd(true);
        return;
      }
      setIsAtEnd(false);
    };

    // Check inicial
    check();

    // Scroll event
    el.addEventListener('scroll', check, { passive: true });

    // Resize dinâmico (conteúdo pode mudar)
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        // Pequeno delay para o browser recalcular layout
        requestAnimationFrame(check);
      });
      ro.observe(el);
    } else {
      window.addEventListener('resize', check);
    }

    return () => {
      el.removeEventListener('scroll', check);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', check);
    };
  }, [ref, tolerance]);

  return isAtEnd;
}
