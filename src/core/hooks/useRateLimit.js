/**
 * @fileoverview useRateLimit — hook React para throttling de mutations.
 * (TASK-299)
 */
import { useCallback } from 'react';
import { checkRate, formatRetryIn } from '@/core/services/rateLimitService';
import { toast } from 'sonner';

/**
 * Hook que retorna uma função wrappada. Se o rate limit for atingido,
 * mostra toast e retorna { allowed: false }.
 *
 * @param {string} actionKey — ex: "adoption_application"
 * @param {string} scopeFn — função que retorna o scope (ex: () => user?.uid)
 * @returns {(payload?: any) => Promise<{allowed: boolean, retryInMs?: number}>}
 */
export function useRateLimit(actionKey, scopeFn) {
  const guard = useCallback(async (payload) => {
    const scope = scopeFn ? scopeFn() : 'global';
    const r = checkRate(actionKey, scope);
    if (!r.allowed) {
      toast.error(`Limite atingido (${r.limit.label}). Tente novamente ${formatRetryIn(r.retryInMs)}.`);
      return { allowed: false, retryInMs: r.retryInMs, payload };
    }
    return { allowed: true, payload };
  }, [actionKey, scopeFn]);

  return guard;
}
