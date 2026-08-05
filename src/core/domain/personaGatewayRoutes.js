/**
 * @fileoverview Rotas "gateway" de persona — páginas onde o usuário está
 * ESCOLHENDO um acesso, mas ainda NÃO entrou em um escopo específico
 * (abrigo/comunidade). Ex.: `/entrar/abrigo` lista os abrigos do usuário +
 * "inserir código" + "criar novo" — nesse momento ele ainda não está no
 * painel de nenhum abrigo.
 *
 * Nessas páginas a topbar não deve exibir a navegação escopada
 * (Painel/Pets/Mural) nem a indicação do abrigo/comunidade ativo — apenas o
 * switch de acesso (D-PERSONA-GATEWAY-NO-SCOPE-NAV).
 */

/** Prefixos de rota considerados "gateway" de escolha de acesso. */
export const PERSONA_GATEWAY_ROUTES = Object.freeze([
  '/entrar/abrigo',
  '/entrar/comunidade',
  '/acesso',
  // Criação de abrigo/comunidade: o usuário ainda não está no painel de um
  // escopo, então também é um gateway (topbar sem navegação escopada).
  '/organizacoes/criar',
  '/comunidade/criar',
]);

/**
 * @param {string} pathname caminho atual (location.pathname)
 * @returns {boolean} true se é uma rota gateway (sem escopo entrado ainda)
 */
export function isPersonaGatewayPath(pathname) {
  if (!pathname) return false;
  return PERSONA_GATEWAY_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );
}

export default isPersonaGatewayPath;
