import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_FEATURE_FLAGS } from '@/core/featureFlags';
import { PLATFORM_SETTINGS_DEFAULTS } from '@/core/platformSettings';
import { subscribePlatformSettings } from '@/core/services/platformSettingsService';

const FeatureFlagsContext = createContext({
  flags: DEFAULT_FEATURE_FLAGS,
  settings: PLATFORM_SETTINGS_DEFAULTS,
  isLoading: true,
});

/**
 * Provider global das feature flags. Observa o documento de configurações da
 * plataforma e expõe o mapa de flags para toda a árvore. Falha graciosamente
 * para os padrões (todas off) — nunca quebra a aplicação.
 */
export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [settings, setSettings] = useState(PLATFORM_SETTINGS_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePlatformSettings((settings) => {
      setSettings(settings);
      setFlags(settings.feature_flags);
      setIsLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    flags,
    settings,
    isLoading,
  }), [flags, settings, isLoading]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/** Mapa completo de flags + estado de carregamento. */
export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

/**
 * Conveniência: retorna o booleano de uma flag específica.
 * @param {string} flagKey
 * @returns {boolean}
 */
export function useFeatureFlag(flagKey) {
  const { flags } = useContext(FeatureFlagsContext);
  return Boolean(flags?.[flagKey]);
}

export function usePlatformSettings() {
  const { settings, isLoading } = useContext(FeatureFlagsContext);
  return { settings, isLoading };
}
