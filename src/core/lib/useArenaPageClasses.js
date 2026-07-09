import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

/**
 * Wrapper padrão para todas as páginas autenticadas da plataforma.
 *
 *   arena-page mx-auto max-w-6xl px-5 py-6 pb-12 space-y-6
 *
 * - `arena-page`: classe semântica da plataforma (mantém o comportamento
 *   visual comum: fundo, suavização de cores).
 * - `mx-auto`: centraliza horizontalmente no viewport.
 * - `max-w-6xl`: largura máxima de 1152px — fixa o "fim" do conteúdo
 *   mesmo em monitores muito grandes, evitando que linhas de texto
 *   fiquem desconfortáveis de ler.
 * - `px-5 py-6`: 20px lateral, 24px no topo (espaço entre a barra de
 *   navegação superior e o primeiro conteúdo).
 * - `pb-12`: 48px no rodapé, para folga com elementos sticky / FAB.
 * - `space-y-6`: 24px de gap vertical entre seções filhas diretas
 *   (mantém simetria com o `py-6`).
 *
 * Exceções controladas (não usam este wrapper, têm o próprio):
 * - `Home` (landing de marketing com hero próprio full-bleed)
 * - `ChatPage` (split-pane full-bleed, exige viewport cheia)
 * - `ClubDetail` (a `ClubCover` assume o topo com `pt-0`)
 *
 * A flag `STANDARDIZED_PAGE_LAYOUT` controla o gate. Com a flag
 * desligada (default), cada página retorna o seu wrapper original;
 * com a flag ligada, retorna este wrapper padronizado. Não há
 * regressão visual até o admin ligar.
 */
export const ARENA_PAGE_STANDARD_CLASS =
  'arena-page mx-auto max-w-6xl px-5 py-6 pb-12 space-y-6';

/**
 * Hook que devolve a string de classes do wrapper raiz de uma página.
 *
 * - Se a flag `STANDARDIZED_PAGE_LAYOUT` estiver ligada, devolve SEMPRE
 *   o wrapper padrão (`ARENA_PAGE_STANDARD_CLASS`) — todas as páginas
 *   passam a compartilhar largura, padding e espaçamento.
 * - Se a flag estiver desligada, devolve o `originalClass` passado pelo
 *   caller — comportamento idêntico ao da página antes desta mudança.
 *
 * @param {string} originalClass — o conjunto original de classes do
 *   wrapper raiz. Preservado como fallback.
 * @returns {string}
 *
 * @example
 *   // ANTES:
 *   <div className="arena-page mx-auto max-w-4xl px-4 py-6 space-y-6">
 *
 *   // DEPOIS:
 *   const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-4xl px-4 py-6 space-y-6');
 *   return (
 *     <div className={wrapperClass}>
 *       ...
 *     </div>
 *   );
 */
export function useArenaPageClasses(originalClass) {
  const standardEnabled = useFeatureFlag(FEATURE_FLAG.STANDARDIZED_PAGE_LAYOUT);
  return standardEnabled ? ARENA_PAGE_STANDARD_CLASS : originalClass;
}
