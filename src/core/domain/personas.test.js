/**
 * Testes para personas (V4).
 *
 * @see src/core/domain/personas.js
 * @see docs/PLAN_PERSONAS_V4.md
 */

import { describe, it, expect } from 'vitest';
import {
  PERSONA_TYPE,
  ALL_PERSONAS,
  SCOPELESS_PERSONAS,
  SCOPED_PERSONAS,
  PERSONA_LABEL,
  PUBLIC_PERSONAS,
  PLATFORM_ADMIN_PERSONAS,
  DEFAULT_PERSONA,
  parsePersonaKey,
  buildPersonaKey,
  getPersonaType,
  isScopedPersona,
  isPersonaOnboardingComplete,
  personaHome,
  personaEntryRoute,
} from './personas.js';

describe('personas (V4)', () => {
  describe('constants', () => {
    it('tem exatamente 6 personas canônicas', () => {
      expect(ALL_PERSONAS).toHaveLength(6);
    });

    it('inclui todas as personas esperadas', () => {
      expect(ALL_PERSONAS).toEqual([
        'adopter',
        'donor',
        'shelter_staff',
        'community_staff',
        'volunteer',
        'platform_admin',
      ]);
    });

    it('SCOPELESS_PERSONAS = adopter, donor, platform_admin', () => {
      expect(SCOPELESS_PERSONAS).toEqual(['adopter', 'donor', 'platform_admin']);
    });

    it('SCOPED_PERSONAS = shelter_staff, community_staff, volunteer', () => {
      expect(SCOPED_PERSONAS).toEqual(['shelter_staff', 'community_staff', 'volunteer']);
    });

    it('DEFAULT_PERSONA = adopter', () => {
      expect(DEFAULT_PERSONA).toBe('adopter');
    });

    it('PUBLIC_PERSONAS NÃO inclui platform_admin', () => {
      expect(PUBLIC_PERSONAS).not.toContain('platform_admin');
      expect(PUBLIC_PERSONAS).toHaveLength(5);
    });

    it('PLATFORM_ADMIN_PERSONAS inclui platform_admin', () => {
      expect(PLATFORM_ADMIN_PERSONAS).toContain('platform_admin');
      expect(PLATFORM_ADMIN_PERSONAS).toHaveLength(6);
    });

    it('PERSONA_LABEL tem todas as 6 personas (D-PERSONA-NAMES-UX)', () => {
      ALL_PERSONAS.forEach((p) => {
        expect(PERSONA_LABEL[p]).toBeTruthy();
      });
      expect(PERSONA_LABEL.adopter).toBe('Adotar / Ajudar');
      expect(PERSONA_LABEL.donor).toBe('Doar um pet');
      expect(PERSONA_LABEL.shelter_staff).toBe('Meu abrigo');
      expect(PERSONA_LABEL.community_staff).toBe('Minha comunidade');
      expect(PERSONA_LABEL.volunteer).toBe('Ser voluntário');
      expect(PERSONA_LABEL.platform_admin).toBe('Admin master');
    });
  });

  describe('parsePersonaKey', () => {
    it('parse key sem escopo', () => {
      expect(parsePersonaKey('adopter')).toEqual({ type: 'adopter', scopeId: null });
    });

    it('parse key com escopo', () => {
      expect(parsePersonaKey('shelter_staff:club_abc')).toEqual({
        type: 'shelter_staff',
        scopeId: 'club_abc',
      });
    });

    it('parse key vazia retorna default', () => {
      expect(parsePersonaKey('')).toEqual({ type: 'adopter', scopeId: null });
    });

    it('parse null retorna default', () => {
      expect(parsePersonaKey(null)).toEqual({ type: 'adopter', scopeId: null });
    });

    it('parse undefined retorna default', () => {
      expect(parsePersonaKey(undefined)).toEqual({ type: 'adopter', scopeId: null });
    });

    it('parse key com tipo inválido retorna tipo original (sem validação)', () => {
      // Não validamos tipo — acceptamos qualquer string como tipo válido
      expect(parsePersonaKey('invalid_type:scope_xyz')).toEqual({
        type: 'invalid_type',
        scopeId: 'scope_xyz',
      });
    });

    it('parse key com ":" no final (scopeId vazio) → null', () => {
      expect(parsePersonaKey('shelter_staff:')).toEqual({
        type: 'shelter_staff',
        scopeId: null,
      });
    });
  });

  describe('buildPersonaKey', () => {
    it('monta key sem escopo', () => {
      expect(buildPersonaKey('adopter', null)).toBe('adopter');
    });

    it('monta key com escopo', () => {
      expect(buildPersonaKey('shelter_staff', 'club_abc')).toBe('shelter_staff:club_abc');
    });

    it('monta key com escopo undefined → sem escopo', () => {
      expect(buildPersonaKey('donor', undefined)).toBe('donor');
    });

    it('monta key com type vazio → default', () => {
      expect(buildPersonaKey('', 'club_abc')).toBe('adopter');
    });

    it('round-trip: build → parse', () => {
      const key = buildPersonaKey('volunteer', 'club_xyz');
      expect(parsePersonaKey(key)).toEqual({ type: 'volunteer', scopeId: 'club_xyz' });
    });
  });

  describe('getPersonaType', () => {
    it('extrai tipo de key com escopo', () => {
      expect(getPersonaType('shelter_staff:club_abc')).toBe('shelter_staff');
    });

    it('retorna a key inteira se não tem escopo', () => {
      expect(getPersonaType('adopter')).toBe('adopter');
    });

    it('retorna default para entrada inválida', () => {
      expect(getPersonaType(null)).toBe('adopter');
      expect(getPersonaType(undefined)).toBe('adopter');
      expect(getPersonaType('')).toBe('adopter');
    });
  });

  describe('isScopedPersona', () => {
    it('true para shelter_staff, community_staff, volunteer', () => {
      expect(isScopedPersona('shelter_staff')).toBe(true);
      expect(isScopedPersona('community_staff')).toBe(true);
      expect(isScopedPersona('volunteer')).toBe(true);
    });

    it('false para adopter, donor, platform_admin', () => {
      expect(isScopedPersona('adopter')).toBe(false);
      expect(isScopedPersona('donor')).toBe(false);
      expect(isScopedPersona('platform_admin')).toBe(false);
    });

    it('false para tipo inválido', () => {
      expect(isScopedPersona('invalid')).toBe(false);
    });
  });

  describe('isPersonaOnboardingComplete', () => {
    it('true se hasOnboarding = true', () => {
      expect(isPersonaOnboardingComplete('adopter', true)).toBe(true);
      expect(isPersonaOnboardingComplete('donor', true)).toBe(true);
    });

    it('false se hasOnboarding = false', () => {
      expect(isPersonaOnboardingComplete('adopter', false)).toBe(false);
      expect(isPersonaOnboardingComplete('donor', false)).toBe(false);
    });

    it('false se hasOnboarding = undefined', () => {
      expect(isPersonaOnboardingComplete('adopter', undefined)).toBe(false);
    });
  });

  describe('personaHome', () => {
    it('rota-home por tipo de persona', () => {
      expect(personaHome({ type: PERSONA_TYPE.ADOPTER })).toBe('/feed');
      expect(personaHome({ type: PERSONA_TYPE.DONOR })).toBe('/meus-pets');
      expect(personaHome({ type: PERSONA_TYPE.VOLUNTEER })).toBe('/perfil/voluntario');
      expect(personaHome({ type: PERSONA_TYPE.PLATFORM_ADMIN })).toBe('/admin');
    });

    it('personas com escopo usam o scopeId na rota', () => {
      expect(personaHome({ type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'club1' }))
        .toBe('/organizacoes/club1/admin');
      expect(personaHome({ type: PERSONA_TYPE.COMMUNITY_STAFF, scopeId: 'com1' }))
        .toBe('/comunidade/com1/admin');
    });

    it('aceita PersonaKey string e faz fallback seguro', () => {
      expect(personaHome('shelter_staff:abc')).toBe('/organizacoes/abc/admin');
      expect(personaHome('adopter')).toBe('/feed');
      expect(personaHome(null)).toBe('/feed');
      // escopo ausente → diretório
      expect(personaHome({ type: PERSONA_TYPE.SHELTER_STAFF })).toBe('/organizacoes');
    });
  });

  describe('personaEntryRoute', () => {
    it('persona com onboarding completo → home', () => {
      expect(personaEntryRoute({ type: PERSONA_TYPE.DONOR, hasOnboarding: true })).toBe('/meus-pets');
      expect(personaEntryRoute({ type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'c1', hasOnboarding: true }))
        .toBe('/organizacoes/c1/admin');
    });

    it('persona sem onboarding → tela de cadastro da persona', () => {
      expect(personaEntryRoute({ type: PERSONA_TYPE.ADOPTER, hasOnboarding: false })).toBe('/onboarding/adotante');
      expect(personaEntryRoute({ type: PERSONA_TYPE.DONOR, hasOnboarding: false })).toBe('/onboarding/doador');
      expect(personaEntryRoute({ type: PERSONA_TYPE.SHELTER_STAFF, hasOnboarding: false })).toBe('/entrar/abrigo');
      expect(personaEntryRoute({ type: PERSONA_TYPE.COMMUNITY_STAFF, hasOnboarding: false })).toBe('/entrar/comunidade');
      expect(personaEntryRoute({ type: PERSONA_TYPE.VOLUNTEER, hasOnboarding: false })).toBe('/voluntarios/seja');
    });
  });
});
