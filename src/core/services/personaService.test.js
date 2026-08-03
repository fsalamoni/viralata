/**
 * Testes para personaService (V4).
 *
 * @see src/core/services/personaService.js
 */

import { describe, it, expect } from 'vitest';
import {
  isPlatformAdminFromProfile,
  detectAvailablePersonas,
  canUsePlatformAdminPersona,
  getVisiblePersonasForSwitcher,
} from './personaService.js';
import { PERSONA_TYPE } from '@/core/domain/personas';

describe('personaService', () => {
  describe('isPlatformAdminFromProfile', () => {
    it('true se role = platform_admin', () => {
      expect(isPlatformAdminFromProfile({ role: 'platform_admin' })).toBe(true);
    });

    it('false se role = user', () => {
      expect(isPlatformAdminFromProfile({ role: 'user' })).toBe(false);
    });

    it('false se role ausente', () => {
      expect(isPlatformAdminFromProfile({})).toBe(false);
      expect(isPlatformAdminFromProfile(null)).toBe(false);
    });
  });

  describe('detectAvailablePersonas', () => {
    it('inclui apenas adopter para user novo (sem signals)', () => {
      const personas = detectAvailablePersonas({ profile_completed: false });
      expect(personas).toHaveLength(1);
      expect(personas[0]).toMatchObject({
        type: PERSONA_TYPE.ADOPTER,
        scopeId: null,
      });
    });

    it('inclui donor se petCount > 0', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { petCount: 2 },
      );
      const types = personas.map((p) => p.type);
      expect(types).toContain(PERSONA_TYPE.ADOPTER);
      expect(types).toContain(PERSONA_TYPE.DONOR);
    });

    it('inclui donor se donor_profile existe', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true, donor_profile: { bio: 'x' } },
        { petCount: 0 },
      );
      const types = personas.map((p) => p.type);
      expect(types).toContain(PERSONA_TYPE.DONOR);
    });

    it('cria 1 entrada por abrigo para shelter_staff', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { shelterMemberships: [{ clubId: 'club_a' }, { clubId: 'club_b' }] },
      );
      const shelterPersonas = personas.filter((p) => p.type === PERSONA_TYPE.SHELTER_STAFF);
      expect(shelterPersonas).toHaveLength(2);
      expect(shelterPersonas.map((p) => p.scopeId).sort()).toEqual(['club_a', 'club_b']);
      expect(shelterPersonas[0].hasOnboarding).toBe(true);
    });

    it('cria 1 entrada por comunidade para community_staff', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { communityMemberships: [{ communityId: 'comm_x' }] },
      );
      const communityPersonas = personas.filter((p) => p.type === PERSONA_TYPE.COMMUNITY_STAFF);
      expect(communityPersonas).toHaveLength(1);
      expect(communityPersonas[0].scopeId).toBe('comm_x');
    });

    it('inclui volunteer se hasVolunteerProfile = true', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { hasVolunteerProfile: true },
      );
      const types = personas.map((p) => p.type);
      expect(types).toContain(PERSONA_TYPE.VOLUNTEER);
    });

    it('inclui platform_admin se role = platform_admin', () => {
      const personas = detectAvailablePersonas(
        { role: 'platform_admin' },
      );
      const types = personas.map((p) => p.type);
      expect(types).toContain(PERSONA_TYPE.PLATFORM_ADMIN);
      expect(personas.find((p) => p.type === PERSONA_TYPE.PLATFORM_ADMIN).isPlatformAdmin).toBe(true);
    });

    it('user novo SEM profile_completed → adopter.hasOnboarding = false', () => {
      const personas = detectAvailablePersonas({});
      const adopter = personas.find((p) => p.type === PERSONA_TYPE.ADOPTER);
      expect(adopter.hasOnboarding).toBe(false);
    });

    it('user COM profile_completed → adopter.hasOnboarding = true', () => {
      const personas = detectAvailablePersonas({ profile_completed: true });
      const adopter = personas.find((p) => p.type === PERSONA_TYPE.ADOPTER);
      expect(adopter.hasOnboarding).toBe(true);
    });

    it('retorna [] para userProfile null', () => {
      expect(detectAvailablePersonas(null)).toEqual([]);
    });

    it('user com tudo: adopter + donor + 2 abrigos + 1 comunidade + volunteer + admin = 7 personas', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true, role: 'platform_admin' },
        {
          petCount: 3,
          shelterMemberships: [{ clubId: 'a' }, { clubId: 'b' }],
          communityMemberships: [{ communityId: 'c' }],
          hasVolunteerProfile: true,
        },
      );
      // adopter + donor + 2 shelters + 1 community + 1 volunteer + 1 admin = 7
      expect(personas).toHaveLength(7);
    });
  });

  describe('canUsePlatformAdminPersona', () => {
    it('true se role = platform_admin', () => {
      expect(canUsePlatformAdminPersona({ role: 'platform_admin' })).toBe(true);
    });

    it('false se role = user', () => {
      expect(canUsePlatformAdminPersona({ role: 'user' })).toBe(false);
    });

    it('false se profile é null', () => {
      expect(canUsePlatformAdminPersona(null)).toBe(false);
    });
  });

  describe('getVisiblePersonasForSwitcher', () => {
    it('user comum: 5 personas (sem platform_admin)', () => {
      const visible = getVisiblePersonasForSwitcher({ role: 'user' });
      expect(visible).toHaveLength(5);
      expect(visible).not.toContain(PERSONA_TYPE.PLATFORM_ADMIN);
    });

    it('platform_admin: 6 personas', () => {
      const visible = getVisiblePersonasForSwitcher({ role: 'platform_admin' });
      expect(visible).toHaveLength(6);
      expect(visible).toContain(PERSONA_TYPE.PLATFORM_ADMIN);
    });

    it('retorna cópia (não referência mutável)', () => {
      const visible1 = getVisiblePersonasForSwitcher({ role: 'user' });
      const visible2 = getVisiblePersonasForSwitcher({ role: 'user' });
      expect(visible1).not.toBe(visible2);
    });
  });
});
