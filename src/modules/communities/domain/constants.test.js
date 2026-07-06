import { describe, expect, it } from 'vitest';
import { COMMUNITY_VISIBILITY, normalizeCommunityVisibility } from './constants.js';

describe('communities/constants domain', () => {
  describe('normalizeCommunityVisibility', () => {
    it('returns HIDDEN when value is HIDDEN', () => {
      expect(normalizeCommunityVisibility(COMMUNITY_VISIBILITY.HIDDEN)).toBe(COMMUNITY_VISIBILITY.HIDDEN);
    });

    it('returns PUBLIC when value is PUBLIC', () => {
      expect(normalizeCommunityVisibility(COMMUNITY_VISIBILITY.PUBLIC)).toBe(COMMUNITY_VISIBILITY.PUBLIC);
    });

    it('returns PUBLIC as default when value is undefined, null, or unknown', () => {
      expect(normalizeCommunityVisibility(undefined)).toBe(COMMUNITY_VISIBILITY.PUBLIC);
      expect(normalizeCommunityVisibility(null)).toBe(COMMUNITY_VISIBILITY.PUBLIC);
      expect(normalizeCommunityVisibility('unknown')).toBe(COMMUNITY_VISIBILITY.PUBLIC);
      expect(normalizeCommunityVisibility(123)).toBe(COMMUNITY_VISIBILITY.PUBLIC);
    });
  });
});
