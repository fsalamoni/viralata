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
});

/** Valor padrão (todas as flags desligadas). */
export const DEFAULT_FEATURE_FLAGS = Object.freeze(
  Object.fromEntries(Object.values(FEATURE_FLAG).map((key) => [key, false])),
);

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