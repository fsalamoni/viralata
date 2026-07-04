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

  it('ordena comunidades por destaque, prioridade e nome', () => {
    const result = sortCommunities([
      { id: '3', name: 'Zona Norte', featured: false, priority: 9 },
      { id: '2', name: 'Centro', featured: true, priority: 1 },
      { id: '1', name: 'Bairro Sul', featured: true, priority: 5 },
    ]);
    expect(result.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('gera mapa só com comunidades públicas', () => {
    const result = getVisibleCommunityMap([
      { id: 'a', name: 'A', visibility: 'public' },
      { id: 'b', name: 'B', visibility: 'hidden' },
    ]);
    expect(Object.keys(result)).toEqual(['a']);
  });
});
