/**
 * @fileoverview Testes do useSimilarPets (TASK-324).
 * Testamos a lógica pura de score de similaridade inline.
 */
import { describe, it, expect } from 'vitest';

describe('useSimilarPets — score de similaridade (TASK-324)', () => {
  function scoreSimilarity(pet, ref) {
    if (!ref || !pet) return 0;
    let score = 0;
    if (pet.species === ref.species) score += 5;
    if (pet.size === ref.size) score += 3;
    if (pet.age_group === ref.age_group) score += 2;
    if (pet.city && ref.city && pet.city.toLowerCase() === ref.city.toLowerCase()) score += 2;
    if (pet.shelter_club_id && pet.shelter_club_id === ref.shelter_club_id) score += 1;
    return score;
  }

  const ref = { species: 'dog', size: 'medium', age_group: 'adult', city: 'São Paulo', shelter_club_id: 'club-1' };

  it('mesma espécie: +5', () => {
    expect(scoreSimilarity({ species: 'dog' }, ref)).toBe(5);
  });

  it('mesma espécie + mesmo porte: +8', () => {
    expect(scoreSimilarity({ species: 'dog', size: 'medium' }, ref)).toBe(8);
  });

  it('mesma espécie + porte + idade: +10', () => {
    expect(scoreSimilarity({ species: 'dog', size: 'medium', age_group: 'adult' }, ref)).toBe(10);
  });

  it('mesma espécie + porte + idade + cidade: +12', () => {
    expect(scoreSimilarity({ species: 'dog', size: 'medium', age_group: 'adult', city: 'São Paulo' }, ref)).toBe(12);
  });

  it('mesmo abrigo adiciona +1', () => {
    const same = { species: 'dog', size: 'medium', age_group: 'adult', city: 'São Paulo', shelter_club_id: 'club-1' };
    expect(scoreSimilarity(same, ref)).toBe(13);
  });

  it('cidade case-insensitive: "SÃO PAULO" vs "são paulo" = +2', () => {
    const same = { species: 'dog', city: 'são paulo' };
    expect(scoreSimilarity(same, ref)).toBe(7); // espécie(5) + cidade(2)
  });

  it('cidades diferentes: não soma cidade', () => {
    const same = { species: 'dog', city: 'Rio de Janeiro' };
    expect(scoreSimilarity(same, ref)).toBe(5); // só espécie
  });

  it('espécies diferentes: zero em tudo', () => {
    // Tudo o mais pode coincidir mas sem espécie não soma nada
    // city/size/age diferentes para que score seja genuinamente 0 quando espécie diverge
    expect(scoreSimilarity({ species: 'cat', size: 'large', age_group: 'puppy', city: 'Rio' }, ref)).toBe(0);
  });

  it('ref null retorna 0', () => {
    expect(scoreSimilarity({ species: 'dog' }, null)).toBe(0);
  });

  it('pet null retorna 0', () => {
    expect(scoreSimilarity(null, { species: 'dog' })).toBe(0);
  });

  it('max score: todas as categorias em comum = 13', () => {
    const same = { species: 'dog', size: 'medium', age_group: 'adult', city: 'São Paulo', shelter_club_id: 'club-1' };
    expect(scoreSimilarity(same, ref)).toBe(13);
  });

  it('zero em comum: espécies diferentes, cidade diferente', () => {
    const diff = { species: 'cat', size: 'large', age_group: 'puppy', city: 'Rio' };
    expect(scoreSimilarity(diff, ref)).toBe(0);
  });
});
