/**
 * @fileoverview Hook: use-toast (compat shadcn/ui).
 *
 * Wrapper em torno do toast do sonner para manter compatibilidade com
 * componentes que usam a API shadcn/ui `useToast()`.
 *
 * shadcn/ui original: https://ui.shadcn.com/docs/components/toast
 * Implementação via sonner: https://sonner.dev/
 */

import { toast as sonnerToast } from 'sonner';

/**
 * @returns {{ toast: typeof sonnerToast, dismiss: typeof sonnerToast.dismiss, toasts: [] }}
 */
export function useToast() {
  return {
    toast: sonnerToast,
    dismiss: sonnerToast.dismiss,
    toasts: [],
  };
}
