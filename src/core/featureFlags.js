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
