/**
 * useAdProvider — hook para acessar provider + config atual.
 *
 * TASK-024: AdSlot com rede real.
 *
 * Lê a config de ads do Firestore (platform_settings/global.adProvider e
 * adConfig). Tem fallback graceful se nada estiver configurado: usa
 * provider 'none' (placeholder visual).
 *
 * IMPORTANTE: este hook NÃO deve ser chamado em Server Components
 * (depende de useEffect). Em SSR, retorna config default.
 */
import { useEffect, useState } from 'react';
import { getProvider, PROVIDERS, DEFAULT_PROVIDER } from './providers';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const DEFAULT_CONFIG = {
  adProvider: DEFAULT_PROVIDER,
  adConfig: null,
};

export function useAdProvider() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const db = getFirestore();
    const ref = doc(db, 'platform_settings', 'global');
    getDoc(ref)
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data() || {};
        setConfig({
          adProvider: data.adProvider || DEFAULT_PROVIDER,
          adConfig: data.adConfig || null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[useAdProvider] fetch failed, using default:', err?.message);
        setError(err);
        setConfig(DEFAULT_CONFIG);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provider = getProvider(config.adProvider);
  const enabled = provider.enabled(config.adConfig);

  return {
    provider,
    providerId: provider.id,
    config,
    enabled,
    loading,
    error,
  };
}

export { PROVIDERS, DEFAULT_PROVIDER };
