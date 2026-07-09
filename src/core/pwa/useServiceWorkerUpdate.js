import { useEffect, useState, useCallback } from 'react';

/**
 * Detecta quando há um Service Worker novo esperando para assumir controle
 * e expõe um `update()` para forçar a ativação imediata (com reload).
 *
 * Por que precisamos disso:
 *   - vite-plugin-pwa gera `autoUpdate` + `skipWaiting` + `clientsClaim`
 *     automaticamente. Em teoria, isso já garante que o usuário receba a
 *     nova versão assim que o SW novo for instalado.
 *   - MAS, se o usuário está com a página aberta há horas, o navegador só
 *     detecta o SW novo no próximo `reg.update()`. Sem feedback, o usuário
 *     pensa que o deploy não aconteceu.
 *   - Este hook mostra um banner "Nova versão disponível" e dá um botão
 *     "Recarregar agora" — UX explícita em vez de reload silencioso.
 *
 * Funciona junto com `registerPwa.js`. Quando o SW novo emite o evento
 * `controllerchange`, o hook marca `hasUpdate = true`. O componente decide
 * se exibe o banner ou se já recarrega direto.
 *
 * @returns {{ hasUpdate: boolean, update: () => void }}
 */
export function useServiceWorkerUpdate({ autoReload = false } = {}) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  const update = useCallback(() => {
    // Se o SW novo já está em estado "waiting", pede pra ele assumir.
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      // O controllerchange handler abaixo vai disparar reload.
      return;
    }
    // Senão, só força reload — o navegador vai buscar a versão nova.
    window.location.reload();
  }, [waitingWorker]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const onControllerChange = () => {
      if (autoReload) {
        window.location.reload();
      } else {
        setHasUpdate(true);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Procura um SW já em estado waiting (deploy entre carregamentos).
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setHasUpdate(true);
        }
        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener('statechange', () => {
            if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newSw);
              setHasUpdate(true);
            }
          });
        });
        // Força o navegador a checar por atualizações agora
        reg.update?.().catch(() => {});
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [autoReload]);

  return { hasUpdate, update };
}