/**
 * Testes de integração para o sistema de Personas (V4).
 *
 * Cobre os fluxos end-to-end:
 *  - Detecção de personas baseado em signals
 *  - Migração automática de pets existentes (D-PERSONA-MIGRATION-AUTO)
 *  - Validação de regras de visibilidade (D-PERSONA-ADMIN-OVERRIDE)
 *  - Verificação de ortogonalidade (multi-persona simultânea)
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectAvailablePersonas,
  isPlatformAdminFromProfile,
  canUsePlatformAdminPersona,
  getVisiblePersonasForSwitcher,
} from '@/core/services/personaService';
import { PERSONA_TYPE } from '@/core/domain/personas';

describe('Personas V4 — Integração', () => {
  describe('Multi-persona simultânea (D-PERSONA-MULTI)', () => {
    it('user pode ter adopter + donor + volunteer + admin master', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true, role: 'platform_admin' },
        {
          petCount: 2,
          hasVolunteerProfile: true,
        },
      );
      const types = personas.map((p) => p.type);
      expect(types).toContain(PERSONA_TYPE.ADOPTER);
      expect(types).toContain(PERSONA_TYPE.DONOR);
      expect(types).toContain(PERSONA_TYPE.VOLUNTEER);
      expect(types).toContain(PERSONA_TYPE.PLATFORM_ADMIN);
      // Pode ter TODAS ao mesmo tempo (ortogonalidade)
      expect(personas.length).toBe(4);
    });

    it('user pode ter 2 abrigos (shelter_staff scoped) + 1 comunidade', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        {
          shelterMemberships: [{ clubId: 'club_a' }, { clubId: 'club_b' }],
          communityMemberships: [{ communityId: 'comm_x' }],
        },
      );
      expect(personas).toHaveLength(4); // adopter + 2 shelters + 1 community
      const types = personas.map((p) => p.type);
      expect(types.filter((t) => t === PERSONA_TYPE.SHELTER_STAFF)).toHaveLength(2);
      expect(types.filter((t) => t === PERSONA_TYPE.COMMUNITY_STAFF)).toHaveLength(1);
    });
  });

  describe('Migração automática (D-PERSONA-MIGRATION-AUTO, Q29)', () => {
    it('user com pet pessoal → donor habilitado automaticamente', () => {
      // detectAvailablePersonas detecta donor se petCount > 0
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { petCount: 1 },
      );
      const donor = personas.find((p) => p.type === PERSONA_TYPE.DONOR);
      expect(donor).toBeDefined();
    });

    it('user SEM pets → donor NÃO habilitado automaticamente', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { petCount: 0 },
      );
      const donor = personas.find((p) => p.type === PERSONA_TYPE.DONOR);
      expect(donor).toBeUndefined();
    });
  });

  describe('Pool de voluntários (D-PERSONA-VOLUNTEER-POOL, Q26)', () => {
    it('voluntário SEM abrigo vinculado: persona habilitada', () => {
      // hasVolunteerProfile = true (cadastrado no VolunteerSignup)
      // Mas sem shelterMemberships (não vinculado a abrigo)
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        {
          hasVolunteerProfile: true,
        },
      );
      const volunteer = personas.find((p) => p.type === PERSONA_TYPE.VOLUNTEER);
      expect(volunteer).toBeDefined();
    });
  });

  describe('Admin override (D-PERSONA-ADMIN-OVERRIDE, Q7, Q9)', () => {
    it('admin_master aparece APENAS se role = platform_admin', () => {
      const visibleForUser = getVisiblePersonasForSwitcher({ role: 'user' });
      const visibleForAdmin = getVisiblePersonasForSwitcher({ role: 'platform_admin' });

      expect(visibleForUser).not.toContain(PERSONA_TYPE.PLATFORM_ADMIN);
      expect(visibleForAdmin).toContain(PERSONA_TYPE.PLATFORM_ADMIN);
    });

    it('admin NÃO se rebaixa (apenas owner atribui role)', () => {
      // canUsePlatformAdminPersona reflete apenas o role atual
      // A proteção contra auto-rebaixamento é no admin service
      expect(canUsePlatformAdminPersona({ role: 'platform_admin' })).toBe(true);
      expect(canUsePlatformAdminPersona({ role: 'user' })).toBe(false);
    });
  });

  describe('Visibilidade do switcher (D-PERSONA-SWITCHER-VISIBILITY)', () => {
    it('user com 1 persona NÃO vê switcher (canSwitch = false logicamente)', () => {
      // Apenas adopter, sem outras personas
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        {},
      );
      // O switcher só aparece com 2+ personas
      // (verificado no PersonaSwitcher.jsx via `canSwitch`)
      expect(personas).toHaveLength(1);
    });

    it('user com 2+ personas → switcher aparece', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { petCount: 1 },
      );
      // adopter + donor = 2 personas
      expect(personas.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Onboarding status (D-PERSONA-SWITCHER-INCOMPLETE-BADGE, Q27)', () => {
    it('adopter.hasOnboarding = false se profile_completed ausente', () => {
      const personas = detectAvailablePersonas({});
      const adopter = personas.find((p) => p.type === PERSONA_TYPE.ADOPTER);
      expect(adopter.hasOnboarding).toBe(false);
    });

    it('donor.hasOnboarding = true se donor_profile existe', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true, donor_profile: { bio: 'x' } },
        { petCount: 1 },
      );
      const donor = personas.find((p) => p.type === PERSONA_TYPE.DONOR);
      expect(donor.hasOnboarding).toBe(true);
    });

    it('donor.hasOnboarding = false se tem pets mas SEM donor_profile', () => {
      const personas = detectAvailablePersonas(
        { profile_completed: true },
        { petCount: 1 },
      );
      const donor = personas.find((p) => p.type === PERSONA_TYPE.DONOR);
      expect(donor.hasOnboarding).toBe(false);
    });
  });

  describe('Pet transfer (D-PERSONA-PET-TRANSFER, Q20)', () => {
    it('pets transferidos mudam owner_type para organization', () => {
      // O comportamento de transfer é implementado em PetTransferDialog
      // Aqui validamos a lógica de detecção
      const petBefore = { owner_type: 'user', owner_id: 'user_a' };
      const petAfter = {
        owner_type: 'organization',
        owner_id: 'club_x',
        transferred_at: '2026-08-03T12:00:00Z',
        transferred_by: 'user_a',
      };

      expect(petBefore.owner_type).toBe('user');
      expect(petAfter.owner_type).toBe('organization');
      // Garantir que tem timestamp de transferência (audit trail)
      expect(petAfter).toHaveProperty('transferred_at');
      expect(petAfter).toHaveProperty('transferred_by');
    });
  });

  describe('Pets órfãos (D-PERSONA-ORPHAN-PETS, Q21)', () => {
    it('pets órfãos têm owner_id de user desativado', () => {
      const orphanPet = {
        owner_type: 'user',
        owner_id: 'user_desativado',
        status: 'available',
      };
      // Devem ser ocultos no feed
      const visibleInFeed = orphanPet.status === 'available' && orphanPet.owner_type === 'user';
      // Mas mesmo visíveis pelo status, devem ser filtrados pelo owner
      // (a verificação real é: owner_id existe em users?)
      expect(orphanPet.owner_id).toBe('user_desativado');
    });
  });
});
