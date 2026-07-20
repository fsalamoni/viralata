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

  // Bumped to sw-v67.js (2026-07-20) — MUST match vite.config.js filename.
  // v66→v67: TASK-V3-PET-DETAIL-VIEW — nova página PÚBLICA de visualização
  // de pet (/pet/:petId, singular). Sem abas, sem botões de editar/excluir.
  // Botão 'Administrar' SÓ visível para canManage. Flag PET_DETAIL_VIEW_V1.
  const swUrl = `${import.meta.env.BASE_URL || '/'}sw-v67.js`.replace(/\/{2,}/g, '/');

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
