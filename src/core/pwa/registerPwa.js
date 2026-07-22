/*
 * Registro do service worker do PWA — totalmente controlado pela flag
 * VITE_PWA_ENABLED. Quando a flag está desligada (padrão), nenhum service
 * worker é registrado e qualquer registro anterior é removido, garantindo
 * zero impacto no app.
 */

export const PWA_ENABLED = import.meta.env.VITE_PWA_ENABLED === 'true';

export function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // D-PWA-STALE-UNREGISTER (NEW, sw-v73.1): Limpa SWS antigos ANTES de
  // qualquer outra lógica. Sem isso, browsers com SW v72 (ou mais
  // antigo) ficam presos porque o SW antigo serve do cache e o register
  // novo nunca substitui.
  //
  // Roda SEMPRE (independente de PWA_ENABLED) porque:
  //  - PWA_ENABLED=true: queremos remover SW v72 stale antes de registrar v73
  //  - PWA_ENABLED=false: queremos garantir que NENHUM SW está ativo
  //
  // Sintoma do bug: 'MessageSquare is not defined' mesmo após o bundle
  // novo ser deployado, porque o SW v72 cacheado serve o bundle antigo.
  // Solução: unregister qualquer SW que não seja sw-v73.js, e se havia
  // controller stale, forçar reload para garantir próxima carga fresca.
  function unregisterStaleAndMaybeReload() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(false);
    return navigator.serviceWorker.getRegistrations().then((regs) => {
      let hadStaleSw = false;
      regs.forEach((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
        // Preserva apenas sw-v73.js (versão atual).
        // - Se url for vazia (registration sem worker ainda), é stale.
        // - Se url nao for sw-v73.js, é stale.
        if (!url || (!url.endsWith('/sw-v73.js') && !url.endsWith('/sw-v73'))) {
          hadStaleSw = true;
          r.unregister().catch(() => {});
        }
      });
      // Se havia SW antigo controlando a página, força reload. MAS só
      // se a página não tem interação em curso (formulário sendo
      // preenchido, click handler em andamento). Se o user está
      // digitando/marcando/clicando, NÃO reload — o user está fazendo
      // algo importante e o reload interromperia.
      //
      // D-PWA-STALE-UNREGISTER-DEFER: detectar atividade de input nos
      // últimos 5s. Se sim, NÃO reload. O SW unregistered = sem cache
      // na próxima navegação. Próxima F5/reload manual do user
      // (botão "Recarregar" do ErrorBoundary ou do SwUpdateBanner)
      // vai pegar o bundle fresh do servidor.
      if (hadStaleSw && navigator.serviceWorker.controller) {
        const lastActivity = Number(sessionStorage.getItem('pwa-stale-last-activity') || '0');
        const now = Date.now();
        const isInteracting = (now - lastActivity) < 5000;
        if (isInteracting) {
          // Adiar reload para daqui 5s (depois que user terminar)
          // ou até o user reload manual.
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              window.location.reload();
            }
          }, 5000);
          return true;
        }
        // Sem atividade recente: reload imediato (50ms)
        setTimeout(() => { window.location.reload(); }, 50);
        return true;
      }
      return false;
    }).catch(() => false);
  }

  // Track user activity para o reload inteligente acima
  if (typeof window !== 'undefined') {
    const trackActivity = () => {
      try { sessionStorage.setItem('pwa-stale-last-activity', String(Date.now())); } catch (_) {}
    };
    ['keydown', 'mousedown', 'touchstart', 'pointerdown', 'scroll', 'input', 'change'].forEach((evt) => {
      window.addEventListener(evt, trackActivity, { passive: true, capture: true });
    });
  }

  // Flag desligada: garante que não exista SW registrado (segurança / rollback).
  if (!PWA_ENABLED) {
    unregisterStaleAndMaybeReload();
    return;
  }

  // Em dev o SW não traz benefício e pode confundir o HMR; só em produção.
  if (import.meta.env.DEV) return;

  // Bumped to sw-v73.js (2026-07-22) — MUST match vite.config.js filename.
  const swUrl = `${import.meta.env.BASE_URL || '/'}sw-v73.js`.replace(/\/{2,}/g, '/');

  // IMPORTANTE: não recarregamos automaticamente quando o SW troca de
  // controller. O componente <SwUpdateBanner> (montado em Layout.jsx)
  // detecta esse evento e mostra um banner "Nova versão disponível
  // — Recarregar agora" com UX explícita. Auto-reload silencioso
  // interrompe o usuário no meio de algo (digitando, scroll, etc.).

  window.addEventListener('load', () => {
    // 1. Limpa SWS antigos (v72 e anteriores). Pode disparar reload.
    unregisterStaleAndMaybeReload();

    // 2. Registra o sw-v73.js (versão atual).
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        // Procura ativamente por uma versão nova do SW a cada carregamento.
        reg.update?.().catch(() => {});
      })
      .catch(() => {
        // Falha no registro não pode afetar o app — silenciosa por design.
      });
  });
}
