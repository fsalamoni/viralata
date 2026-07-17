import { useState, useEffect } from 'react';

/**
 * useOfflineDetector — detecta se o browser está offline.
 *
 * @returns {{ isOffline, isOnline }}
 *
 * ⚠️ navigator.onLine é pessimista — pode retornar true mesmo sem internet real.
 * Para validação real, combinar com uma verificação ativa (ex: ping a um endpoint).
 * Este hook é útil para UI (banner "sem conexão") mas não para lógica de negócio.
 *
 * Uso:
 *   const { isOffline, isOnline } = useOfflineDetector();
 *   // <Banner>Você está offline</Banner> quando isOffline=true
 */
export function useOfflineDetector() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true);
    }
    function handleOnline() {
      setIsOffline(false);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Sync state on mount (navigator.onLine pode ter mudado enquanto component
    // estava desmontado)
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
  };
}
