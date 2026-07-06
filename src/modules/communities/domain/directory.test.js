import { describe, expect, it } from 'vitest';
import {
  CLUB_DIRECTORY_STATUS,
  getVisibleCommunityMap,
  isClubPubliclyVisible,
  isCommunityPubliclyVisible,
  normalizeClubDirectoryStatus,
  sortCommunities,
} from './directory.js';

describe('communities/directory domain', () => {
  it('normaliza o status do diretório com fallback seguro', () => {
    expect(normalizeClubDirectoryStatus(CLUB_DIRECTORY_STATUS.REVIEW)).toBe(CLUB_DIRECTORY_STATUS.REVIEW);
    expect(normalizeClubDirectoryStatus(CLUB_DIRECTORY_STATUS.SUSPENDED)).toBe(CLUB_DIRECTORY_STATUS.SUSPENDED);
    expect(normalizeClubDirectoryStatus('qualquer-coisa')).toBe(CLUB_DIRECTORY_STATUS.ACTIVE);
  });

  it('expõe apenas organizações ativas publicamente', () => {
    expect(isClubPubliclyVisible({ directory_status: CLUB_DIRECTORY_STATUS.ACTIVE })).toBe(true);
    expect(isClubPubliclyVisible({ directory_status: CLUB_DIRECTORY_STATUS.REVIEW })).toBe(false);
    expect(isClubPubliclyVisible({ directory_status: CLUB_DIRECTORY_STATUS.SUSPENDED })).toBe(false);
  });

  it('filtra apenas comunidades públicas', () => {
    expect(isCommunityPubliclyVisible({ visibility: 'public' })).toBe(true);
    expect(isCommunityPubliclyVisible({ visibility: 'hidden' })).toBe(false);
  });

  describe('sortCommunities', () => {
    it('ordena comunidades por destaque (featured) decrescente', () => {
      const result = sortCommunities([
        { id: '2', name: 'B', featured: false },
        { id: '1', name: 'A', featured: true },
      ]);
      expect(result.map((item) => item.id)).toEqual(['1', '2']);
    });

    it('ordena comunidades por prioridade (priority) decrescente quando destaque é igual', () => {
      const result = sortCommunities([
        { id: '3', name: 'C', priority: 1 },
        { id: '1', name: 'A', priority: 10 },
        { id: '2', name: 'B', priority: 5 },
      ]);
      expect(result.map((item) => item.id)).toEqual(['1', '2', '3']);
    });

    it('ordena comunidades por nome (name) crescente (pt-BR) quando destaque e prioridade são iguais', () => {
      const result = sortCommunities([
        { id: '3', name: 'Zebra' },
        { id: '1', name: 'Árvore' },
        { id: '2', name: 'Bolo' },
        { id: '4', name: 'Égua' },
      ]);
      expect(result.map((item) => item.id)).toEqual(['1', '2', '4', '3']);
    });

    it('lida corretamente com propriedades ausentes, nulas ou indefinidas', () => {
      const result = sortCommunities([
        { id: '3', name: null },
        { id: '1', name: 'A' },
        { id: '2' },
      ]);
      expect(result.map((item) => item.id)).toEqual(['3', '2', '1']);
    });

    it('lida corretamente com lista vazia ou argumentos não informados', () => {
      expect(sortCommunities()).toEqual([]);
      expect(sortCommunities([])).toEqual([]);
    });

    it('é uma função pura e não muta o array original', () => {
      const originalArray = [
        { id: '2', name: 'B', featured: false },
        { id: '1', name: 'A', featured: true },
      ];
      const copyArray = [...originalArray];

      const result = sortCommunities(originalArray);

      expect(result).not.toBe(originalArray); // Different reference
      expect(originalArray).toEqual(copyArray); // Original unchanged
      expect(result.map((item) => item.id)).toEqual(['1', '2']); // Sorted correctly
    });
  });

  it('gera mapa só com comunidades públicas', () => {
    const result = getVisibleCommunityMap([
      { id: 'a', name: 'A', visibility: 'public' },
      { id: 'b', name: 'B', visibility: 'hidden' },
    ]);
    expect(Object.keys(result)).toEqual(['a']);
  });
});
