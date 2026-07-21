/*
 * Registro do service worker do PWA — totalmente controlado pela flag
 * VITE_PWA_ENABLED. Quando a flag está desligada (padrão), nenhum service
 * worker é registrado e qualquer registro anterior é removido, garantindo
 * zero impacto no app.
 */

export const PWA_ENABLED = import.meta.env.VITE_PWA_ENABLED === 'true';

export function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Flag desligada: garante que não exista SW registrado (segurança / rollback).
  if (!PWA_ENABLED) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  // Em dev o SW não traz benefício e pode confundir o HMR; só em produção.
  if (import.meta.env.DEV) return;

  // Bumped to sw-v72.js (2026-07-20) — MUST match vite.config.js filename.
  // v70→v71: Platform admin NÃO vê botão 'Administrar' em /pet/<id> (público). canShowAdminButton = canManage v69→v70: AUDITORIA completa — todas as páginas verificadas, canManage em 12 edge cases de teste. Bump para forçar reload.v69→v70: AUDITORIA completa — todas as páginas verificadas, canManage em 12 edge cases de teste. Bump para forçar reload. !isPlatformAdmin. Platform admin usa /admin/pets para moderar.
  // de consistência. handleChatClick da V3/V1 vai para /chat?pet=<id> (não mais
  // para /pets/<id> que dependia de canManage). Força reload para limpar
  // qualquer cache antigo.
  // completa: UI + service + Firestore rules + route guard.
  const swUrl = `${import.meta.env.BASE_URL || '/'}sw-v72.js`.replace(/\/{2,}/g, '/');

  // IMPORTANTE: não recarregamos automaticamente quando o SW troca de
  // controller. O componente <SwUpdateBanner> (montado em Layout.jsx)
  // detecta esse evento e mostra um banner "Nova versão disponível
  // — Recarregar agora" com UX explícita. Auto-reload silencioso
  // interrompe o usuário no meio de algo (digitando, scroll, etc.).

  window.addEventListener('load', () => {
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
