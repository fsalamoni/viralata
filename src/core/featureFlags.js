/**
 * Catálogo de feature flags da plataforma.
 *
 * As flags são guardadas em um único documento do Firestore
 * (`platform_settings/global`, campo `feature_flags`) e podem ser ligadas/
 * desligadas em tempo de execução pelo admin master.
 *
 * TODAS as flags nascem DESLIGADAS (`false`). Enquanto uma flag está desligada
 * a funcionalidade associada fica completamente invisível e inerte — nada do
 * comportamento já existente é alterado. Isso garante que estas implementações
 * sejam puramente aditivas.
 */

export const FEATURE_FLAG = Object.freeze({
  /**
   * Espaço de anúncios: exibe um card "Conteúdo patrocinado" não intrusivo no
   * feed de pets e no painel de gestão de pets da ONG. Não há integração real
   * com uma rede de anúncios — é apenas o placeholder visual/estrutural,
   * pronto para receber um script de ads futuramente. Aditivo — desligado,
   * nenhum card aparece.
   */
  AD_SLOTS: 'ad_slots',

  /**
   * Correção de confiabilidade do Feed de pets: aplica filtros de espécie,
   * porte, cidade e raio client-side (em cima de uma única query no Firestore),
   * substituindo o cruzamento atual de índices compostos que falha com
   * `failed-precondition`. Enquanto desligada, o Feed original é renderizado
   * sem qualquer alteração de comportamento.
   */
  PET_FEED_RELIABILITY_FIX: 'pet_feed_reliability_fix',

  /**
   * Mural com curtidas e comentários: habilita o `MuralTabEnhanced`, que
   * permite curtir/descurtir posts e ler/adicionar/excluir comentários
   * diretamente na UI. Enquanto desligada, o mural original é renderizado
   * (somente leitura, sem like/comment).
   */
  MURAL_LIKES_AND_COMMENTS: 'mural_likes_and_comments',

  /**
   * Explicação de bloqueio de adoção/chat: na página do pet, mostra um card
   * ("Por que não posso adotar/chat?") listando os motivos do bloqueio
   * quando o usuário não pode registrar interesse nem abrir conversa com o
   * responsável (perfil incompleto, pet já adotado/em processo, você é o
   * dono, etc.). As validações de permissão ficam ativas independente da
   * flag — ela controla apenas a UX explicativa. Desligada, o usuário
   * recebe o botão desabilitado sem explicação.
   */
  PET_ADOPTION_GATING: 'pet_adoption_gating',

  /**
   * Mural com anexos: habilita o `MuralTabAdmin`, que permite ao admin da
   * comunidade (ou membros com permissão `feed`) criar posts com anexos
   * (imagens, vídeos, PDFs, documentos) além de curtidas e comentários.
   * Quando ligada, sobrescreve `MURAL_LIKES_AND_COMMENTS` (a versão Admin
   * já inclui tudo da Enhanced). Desligada, o mural renderiza em modo
   * somente leitura ou sem anexos (conforme as outras flags).
   */
  MURAL_RICH_POSTS: 'mural_rich_posts',

  /**
   * Cabeçalho-padrão das páginas (PageHero): quando ligada, as páginas que
   * já usam o componente `<PageHero>` (e as que forem migradas) passam a
   * renderizar o card gradiente laranja→rosa com o título da página DENTRO
   * do card, em vez de um h1 simples sem painel. O gradiente usa as CSS
   * vars `--cover-from`/`--cover-to` (`src/index.css`), que por padrão são
   * laranja→rosa (a cor-padrão da plataforma). A `<ClubDetail>` (capa da
   * ONG) e a `<Home>` (landing de marketing) ficam de fora — elas têm
   * padrões visuais próprios. Desligada, cada `<PageHero>` se degrada
   * para um `<header>` simples sem gradiente; páginas que ainda não usam
   * `<PageHero>` permanecem inalteradas. É puramente aditiva.
   */
  PAGE_HERO_ENABLED: 'page_hero_enabled',

  /**
   * Layout-padrão das páginas (largura, padding e espaçamento uniformes):
   * quando ligada, todas as páginas autenticadas passam a compartilhar o
   * mesmo wrapper raiz (`arena-page mx-auto max-w-6xl px-5 py-6 pb-12
   * space-y-6`) — 1152px de largura, 24px lateral e de topo, 24px de gap
   * entre seções filhas. Resolve as inconsistências históricas entre
   * páginas (algumas max-w-3xl, outras max-w-5xl, outras px-4, outras
   * px-5, outras com padding responsivo sm:px-6 lg:px-8). A navegação
   * entre páginas passa a sentir o mínimo de diferença estrutural.
   * Exceções controladas (mantidas como estão): `Home` e `ChatPage`
   * (full-bleed / split-pane) e o `success` de `ClubDetail` (a
   * `ClubCover` assume o topo com pt-0). Desligada, cada página mantém
   * seu wrapper original — puramente aditivo.
   */
  STANDARDIZED_PAGE_LAYOUT: 'standardized_page_layout',
});

/** Metadados de exibição para o painel de flags (admin master). */
export const FEATURE_FLAG_META = Object.freeze({
  [FEATURE_FLAG.AD_SLOTS]: {
    label: 'Espaço de anúncios',
    description:
      'Exibe um card "Conteúdo patrocinado" no feed de pets e no painel de '
      + 'gestão de pets da ONG. Apenas o placeholder visual — não há '
      + 'integração com uma rede de anúncios real. Desligado, nenhum card '
      + 'aparece.',
  },
  [FEATURE_FLAG.PET_FEED_RELIABILITY_FIX]: {
    label: 'Feed de pets · correção de confiabilidade',
    description:
      'Aplica os filtros (espécie, porte, cidade, raio) no cliente, sobre '
      + 'uma única query do Firestore. Elimina o cruzamento de índices '
      + 'compostos que vinha derrubando o feed com `failed-precondition`. '
      + 'Quando o filtro de localização zera a lista mas ainda há pets '
      + 'compatíveis, exibe um banner explicando o fallback e mantém os '
      + 'pets visíveis. Desligada, o feed original segue intacto.',
  },
  [FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS]: {
    label: 'Mural · curtidas e comentários',
    description:
      'Permite curtir/descurtir os posts do mural e ler/adicionar/excluir '
      + 'comentários diretamente na interface. Usa `community_post_likes` '
      + 'e `community_post_comments` (já existentes no Firestore). '
      + 'Desligada, o mural renderiza em modo somente leitura, sem '
      + 'qualquer alteração no comportamento atual.',
  },
[FEATURE_FLAG.PET_ADOPTION_GATING]: {
    label: 'Explicação de bloqueio na adoção/chat',
    description:
      'Mostra um card na página do pet com o(s) motivo(s) de o usuário não '
      + 'conseguir adotar nem abrir chat com o responsável (perfil '
      + 'incompleto, pet já adotado/em processo, você é o dono, etc.). '
      + 'As validações de permissão já ficam ativas mesmo com a flag '
      + 'desligada — ela apenas controla o texto explicativo. Desligada, '
      + 'o usuário recebe o botão desabilitado sem a explicação.',
  },
  [FEATURE_FLAG.MURAL_RICH_POSTS]: {
    label: 'Mural · posts com anexos',
    description:
      'Permite ao admin da comunidade (e membros com permissão `feed`) '
      + 'criar posts no mural com anexos (fotos, vídeos, PDFs, '
      + 'documentos), além de curtidas e comentários. Os anexos são '
      + 'armazenados via `storageService.uploadImage` (Firebase Storage). '
      + 'Desligada, o mural renderiza em modo somente leitura ou sem '
      + 'anexos (conforme as outras flags).',
  },
  [FEATURE_FLAG.PAGE_HERO_ENABLED]: {
    label: 'Cabeçalho-padrão das páginas (PageHero)',
    description:
      'Quando ligada, as páginas que usam `<PageHero>` passam a '
      + 'renderizar o card gradiente laranja→rosa (a cor-padrão da '
      + 'plataforma) com o título da página dentro do card. A Home, a '
      + 'capa da ONG (`ClubDetail`) e a capa de comunidade têm padrões '
      + 'visuais próprios e não são afetadas. Desligada, cada `<PageHero>` '
      + 'se degrada para um cabeçalho simples sem gradiente; páginas '
      + 'ainda não migradas ficam inalteradas. Puramente aditiva.',
  },
  [FEATURE_FLAG.STANDARDIZED_PAGE_LAYOUT]: {
    label: 'Layout-padrão das páginas (largura + espaçamento)',
    description:
      'Quando ligada, todas as páginas autenticadas passam a usar o '
      + 'mesmo wrapper raiz (`arena-page mx-auto max-w-6xl px-5 py-6 '
      + 'pb-12 space-y-6`) — 1152px de largura, 24px de padding '
      + 'lateral e vertical, 24px de gap entre seções. Resolve a '
      + 'inconsistência histórica entre páginas com max-w-3xl/4xl/5xl/6xl, '
      + 'px-4/px-5 e padding responsivo. Exceções mantidas: `Home`, '
      + '`ChatPage` e o topo da `ClubDetail` (que tem `ClubCover`). '
      + 'Desligada, cada página mantém o wrapper original. '
      + 'Puramente aditivo.',
  },
});

/**
 * Valor padrão das flags. Flags de UX e correção de bug nascem LIGADAS
 * (já entregam valor: mural com likes, explicação de bloqueio na adoção,
 * mural admin para criadores de comunidade, e o fix do feed). O admin pode
 * desligar a qualquer momento no /admin/flags — a chave continua existindo
 * no Firestore. Flags estruturais/placeholders (ex: AD_SLOTS) nascem
 * desligadas — não há conteúdo real por trás.
 */
export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  [FEATURE_FLAG.AD_SLOTS]: false,
  [FEATURE_FLAG.PET_FEED_RELIABILITY_FIX]: true,
  [FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS]: true,
  [FEATURE_FLAG.PET_ADOPTION_GATING]: true,
  [FEATURE_FLAG.MURAL_RICH_POSTS]: true,
  [FEATURE_FLAG.PAGE_HERO_ENABLED]: false,
  [FEATURE_FLAG.STANDARDIZED_PAGE_LAYOUT]: false,
});

/**
 * Normaliza um mapa de flags vindo do Firestore, garantindo booleanos e
 * preenchendo as ausentes com `false`. Ignora chaves desconhecidas.
 * @param {Record<string, unknown>|null|undefined} raw
 * @returns {Record<string, boolean>}
 */
export function normalizeFeatureFlags(raw) {
  const out = { ...DEFAULT_FEATURE_FLAGS };
  if (raw && typeof raw === 'object') {
    Object.values(FEATURE_FLAG).forEach((key) => {
      if (typeof raw[key] === 'boolean') out[key] = raw[key];
    });
  }
  return out;
}