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
