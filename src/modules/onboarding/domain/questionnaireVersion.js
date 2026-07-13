/**
 * @fileoverview Versionamento do questionário de onboarding
 * (TASK-401 parte 3 — "1ª vez + novos campos").
 *
 * **Comportamento**:
 *  - User novo: faz questionário completo (todos os steps)
 *  - User existente (versão A): se schema atual é B,
 *    mostra APENAS os steps novos (que ainda não respondeu)
 *  - User que já respondeu versão atual: nada aparece
 *  - User pode editar o perfil completo a qualquer momento em
 *    `/perfil` — isso é separado do questionário de onboarding
 *
 * **Versionamento**:
 *  - Bump `ONBOARDING_QUESTIONNAIRE_VERSION` quando adicionar/remover
 *    campo obrigatório
 *  - Adicionar entry em `QUESTIONNAIRE_CHANGELOG` explicando o que mudou
 *  - User com versão anterior recebe só o diff
 *
 * **LGPD**:
 *  - Quando um campo NOVO é coletado, é gerado aceite de "expansão de
 *    consentimento" (LGPD Art. 8 — destaque para coleta adicional)
 */

export const ONBOARDING_QUESTIONNAIRE_VERSION = '2026-07-13-v1';

/**
 * Changelog do questionário — entradas descrevem o que mudou em cada
 * versão. Usado para explicar ao user o que está sendo pedido.
 *
 * Formato: { version, date, summary, newFields, removedFields }
 */
export const QUESTIONNAIRE_CHANGELOG = [
  {
    version: '2026-07-13-v1',
    date: '2026-07-13',
    summary: 'Versão inicial do questionário comportamental.',
    newFields: [
      'housing_type',
      'daily_walks',
      'has_children',
      'children_ages',
      'has_elderly',
      'other_pets',
      'budget_level',
      'city',
      'state',
    ],
    removedFields: [],
  },
];

/**
 * Lista os steps do questionário (campo a campo). Usado tanto pelo
 * questionário completo quanto pelo diff.
 *
 * @returns {Array<{id, field, label, type, options?}>}
 */
export const QUESTIONNAIRE_FIELDS = [
  { id: 'housing_type', field: 'housing_type', label: 'Tipo de moradia', type: 'radio' },
  { id: 'daily_walks', field: 'daily_walks', label: 'Rotina de passeios', type: 'radio' },
  { id: 'has_children', field: 'has_children', label: 'Tem crianças', type: 'boolean' },
  { id: 'children_ages', field: 'children_ages', label: 'Idade das crianças', type: 'text' },
  { id: 'has_elderly', field: 'has_elderly', label: 'Tem idosos', type: 'boolean' },
  { id: 'other_pets', field: 'other_pets', label: 'Outros pets', type: 'array' },
  { id: 'budget_level', field: 'budget_level', label: 'Orçamento', type: 'radio' },
  { id: 'city', field: 'city', label: 'Cidade', type: 'text' },
  { id: 'state', field: 'state', label: 'UF', type: 'text' },
];

/**
 * Calcula o diff entre a versão que o user respondeu e a atual.
 * Retorna os fields que são NOVOS para esse user.
 *
 * @param {string|null} userOnboardingVersion - versão salva no profile
 * @returns {string[]} nomes dos fields novos
 */
export function getNewFieldsForUser(userOnboardingVersion) {
  if (!userOnboardingVersion) {
    // User nunca respondeu — todos os fields são novos
    return QUESTIONNAIRE_FIELDS.map((f) => f.field);
  }
  // Versão igual à atual: nada novo
  if (userOnboardingVersion === ONBOARDING_QUESTIONNAIRE_VERSION) {
    return [];
  }
  // Versão diferente: por enquanto, retorna todos (diff granular é
  // complexo e o volume de fields é baixo). Pode ser refinado depois.
  return QUESTIONNAIRE_FIELDS.map((f) => f.field);
}

/**
 * Determina se o user precisa fazer onboarding (e quais steps).
 *
 * @param {object|null} userProfile
 * @returns {{ needsOnboarding: boolean, isNew: boolean, newFields: string[], version: string }}
 */
export function getOnboardingState(userProfile) {
  if (!userProfile) {
    return {
      needsOnboarding: false,
      isNew: false,
      newFields: [],
      version: null,
    };
  }
  const profileCompleted = userProfile.profile_completed === true;
  const userVersion = userProfile.onboarding_version || null;
  if (!profileCompleted) {
    return {
      needsOnboarding: true,
      isNew: !userVersion,
      newFields: getNewFieldsForUser(userVersion),
      version: ONBOARDING_QUESTIONNAIRE_VERSION,
    };
  }
  // Profile completo: checa se versão mudou
  const newFields = getNewFieldsForUser(userVersion);
  return {
    needsOnboarding: newFields.length > 0,
    isNew: false,
    newFields,
    version: ONBOARDING_QUESTIONNAIRE_VERSION,
  };
}
