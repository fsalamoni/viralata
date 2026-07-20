function hasText(value, min = 1) {
  return String(value || '').trim().length >= min;
}

export function isAdopterProfileComplete(profile) {
  if (!profile) return false;

  return (
    // full_name: pode vir do Google displayName (no login) OU do
    // questionário de onboarding. Se user fez login com Google e tem
    // displayName, já conta.
    hasText(profile.full_name)
    && hasText(profile.city, 2)
    && hasText(profile.state, 2)
    && hasText(profile.housing_type)
    && hasText(profile.daily_walks)
    && hasText(profile.budget_level)
    && (profile.lgpd_consent === true || Boolean(profile.lgpd_consent_at))
  );
}

/**
 * Retorna a lista de campos que FALTAM para o profile estar completo.
 * Útil para mostrar ao user quais perguntas ele ainda precisa responder
 * no onboarding.
 *
 * @param {object} profile
 * @returns {Array<{field: string, label: string, minLength?: number}>}
 */
export function getMissingProfileFields(profile) {
  if (!profile) return [];
  const missing = [];
  if (!hasText(profile.full_name)) missing.push({ field: 'full_name', label: 'Nome completo', minLength: 2 });
  if (!hasText(profile.city, 2)) missing.push({ field: 'city', label: 'Cidade', minLength: 2 });
  if (!hasText(profile.state, 2)) missing.push({ field: 'state', label: 'Estado (UF)', minLength: 2 });
  if (!hasText(profile.housing_type)) missing.push({ field: 'housing_type', label: 'Tipo de moradia' });
  if (!hasText(profile.daily_walks)) missing.push({ field: 'daily_walks', label: 'Rotina de passeios' });
  if (!hasText(profile.budget_level)) missing.push({ field: 'budget_level', label: 'Orçamento para cuidados' });
  if (!(profile.lgpd_consent === true || Boolean(profile.lgpd_consent_at))) {
    missing.push({ field: 'lgpd_consent', label: 'Aceite LGPD' });
  }
  return missing;
}
