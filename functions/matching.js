/**
 * Cópia deliberada de src/modules/pets/domain/matching.js — lógica pura de
 * compatibilidade, sem dependências, para uso nas Cloud Functions (o Radar de
 * Pets precisa rodar no servidor, reagindo à criação de QUALQUER pet, não só
 * dos pets do próprio usuário). Mantenha as duas cópias em sincronia; se a
 * regra de match mudar, atualize aqui também.
 */

function isCompatible(profile, pet) {
  if (!profile || !pet) return false;
  if (pet.status !== 'available') return false;

  const isApartment = profile.housing_type === 'apartment_screened'
    || profile.housing_type === 'apartment_unscreened';

  if (isApartment && (pet.size === 'large' || pet.size === 'giant')) {
    return false;
  }

  if (pet.needs_yard === true) {
    const hasYard = profile.housing_type === 'house_with_yard' || profile.housing_type === 'farm';
    if (!hasYard) return false;
  }

  if (profile.housing_type === 'apartment_unscreened' && pet.needs_screened_apt === true) {
    return false;
  }

  if (profile.has_children === true && pet.good_with_kids === false) return false;

  const otherPets = Array.isArray(profile.other_pets) ? profile.other_pets : [];
  if (otherPets.includes('dog') && pet.good_with_dogs === false) return false;
  if (otherPets.includes('cat') && pet.good_with_cats === false) return false;

  if (
    pet.age_group === 'puppy'
    && (pet.size === 'large' || pet.size === 'giant')
    && profile.daily_walks === 'none'
  ) return false;

  if (pet.health_notes && pet.health_notes.trim().length > 0 && profile.budget_level === 'basic') {
    return false;
  }

  return true;
}

module.exports = { isCompatible };
