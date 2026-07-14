/**
 * @fileoverview Algoritmo de Match Comportamental — Viralata
 * Lógica pura: sem React, sem Firebase. Testável com Vitest.
 *
 * Regra de ouro: um pet só aparece no feed de um adotante se isCompatible() retornar true.
 */

/**
 * Verifica se um pet é compatível com o perfil do adotante.
 * @param {import('@/core/domain/types').UserProfile} profile
 * @param {import('@/core/domain/types').Pet} pet
 * @returns {boolean}
 */
export function isCompatible(profile, pet) {
  if (!profile || !pet) return false;
  if (pet.status !== 'available') return false;

  // --- Regras de moradia ---
  const isApartment = profile.housing_type === 'apartment_screened'
    || profile.housing_type === 'apartment_unscreened';

  // Pet grande/gigante não é indicado para apartamento
  if (isApartment && (pet.size === 'large' || pet.size === 'giant')) return false;

  // Pet que precisa de pátio: requer casa com pátio ou sítio
  if (pet.needs_yard === true) {
    const hasYard = profile.housing_type === 'house_with_yard' || profile.housing_type === 'farm';
    if (!hasYard) return false;
  }

  // Apartamento sem tela: não pode ter gato ou pet que precise de tela
  if (profile.housing_type === 'apartment_unscreened' && pet.needs_screened_apt === true) {
    return false;
  }

  // --- Regras de crianças ---
  if (profile.has_children === true && pet.good_with_kids === false) return false;

  // --- Regras de outros pets ---
  const otherPets = Array.isArray(profile.other_pets) ? profile.other_pets : [];
  if (otherPets.includes('dog') && pet.good_with_dogs === false) return false;
  if (otherPets.includes('cat') && pet.good_with_cats === false) return false;

  // --- Regras de passeio ---
  // Pet muito energético (puppies de porte grande) requer passeios longos
  if (
    pet.age_group === 'puppy'
    && (pet.size === 'large' || pet.size === 'giant')
    && profile.daily_walks === 'none'
  ) return false;

  // --- Regras de orçamento ---
  // Pet com necessidades especiais de saúde requer orçamento moderado ou alto
  if (pet.health_notes && pet.health_notes.trim().length > 0 && profile.budget_level === 'basic') {
    return false;
  }

  return true;
}

/**
 * Filtra uma lista de pets compatíveis com o perfil do adotante.
 * @param {import('@/core/domain/types').Pet[]} pets
 * @param {import('@/core/domain/types').UserProfile} profile
 * @returns {import('@/core/domain/types').Pet[]}
 */
export function filterCompatiblePets(pets, profile) {
  if (!Array.isArray(pets) || !profile) return [];
  return pets.filter((pet) => isCompatible(profile, pet));
}

/**
 * Ordena pets por relevância: prioridade (super like) primeiro, depois por data de criação.
 * @param {import('@/core/domain/types').Pet[]} pets
 * @returns {import('@/core/domain/types').Pet[]}
 */
export function sortByRelevance(pets) {
  return [...pets].sort((a, b) => {
    const scoreA = a.priority_score ?? 0;
    const scoreB = b.priority_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Mais recentes por último (prioridade para os mais antigos)
    const dateA = a.created_at?.seconds ?? 0;
    const dateB = b.created_at?.seconds ?? 0;
    return dateA - dateB;
  });
}

/**
 * Calcula score de compatibilidade 0-100 entre perfil do adotante e pet.
 * Reutiliza as mesmas regras de isCompatible(), mas retorna um percentual
 * em vez de booleano. Usado no card da application (TASK-310).
 *
 * @param {object} profile - applicant_snapshot (UserProfile)
 * @param {object} pet - dados do pet (pode vir de Firestore ou applicant_snapshot)
 * @returns {number} score de 0 a 100 (arredondado)
 */
export function calculateMatchScore(profile, pet) {
  if (!profile || !pet) return 0;

  let score = 100;

  // --- Moradia ---
  const isApartment = profile.housing_type === 'apartment_screened'
    || profile.housing_type === 'apartment_unscreened';
  const isApartmentUnscreened = profile.housing_type === 'apartment_unscreened';
  const hasYard = profile.housing_type === 'house_with_yard'
    || profile.housing_type === 'farm';

  // Pet grande/gigante em apartamento: -30
  if (isApartment && (pet.size === 'large' || pet.size === 'giant')) {
    score -= 30;
  }
  // Pet que precisa de pátio mas não tem: -25
  if (pet.needs_yard === true && !hasYard) {
    score -= 25;
  }
  // Apartamento sem tela + pet precisa de tela: -20
  if (isApartmentUnscreened && pet.needs_screened_apt === true) {
    score -= 20;
  }

  // --- Crianças ---
  const hasChildren = profile.household_children > 0 || profile.has_children === true;
  if (hasChildren && pet.good_with_kids === false) {
    score -= 30;
  }

  // --- Outros pets ---
  const otherPets = Array.isArray(profile.other_pets) ? profile.other_pets : [];
  if (otherPets.includes('dog') && pet.good_with_dogs === false) {
    score -= 20;
  }
  if (otherPets.includes('cat') && pet.good_with_cats === false) {
    score -= 20;
  }

  // --- Passeios ---
  // Puppy grande sem passeios: -20
  if (
    pet.age_group === 'puppy'
    && (pet.size === 'large' || pet.size === 'giant')
    && profile.daily_walks === 'none'
  ) {
    score -= 20;
  }

  // --- Orçamento ---
  // Pet com necessidades especiais + orçamento básico: -20
  if (pet.health_notes && pet.health_notes.trim().length > 0 && profile.budget_level === 'basic') {
    score -= 20;
  }

  // --- Bônus ---
  // Tamanho adequado para apartamento: +10
  if (isApartment && (pet.size === 'small' || pet.size === 'medium')) {
    score += 10;
  }
  // Pet se dá bem com crianças E há crianças: +5
  if (hasChildren && pet.good_with_kids === true) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Retorna o nível do match como string + variante de cor.
 * @param {number} score 0-100
 * @returns {{ label: string, variant: string }}
 */
export function getMatchBadge(score) {
  if (score >= 75) return { label: 'Match alto', variant: 'high' };
  if (score >= 40) return { label: 'Match médio', variant: 'medium' };
  return { label: 'Match baixo', variant: 'low' };
}
