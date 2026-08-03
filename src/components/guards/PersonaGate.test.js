/**
 * Testes para PersonaGate (V4).
 *
 * @see src/components/guards/PersonaGate.jsx
 */

import { describe, it, expect } from 'vitest';
import { checkPersonaRequirement } from './PersonaGate.jsx';
import { PERSONA_TYPE } from '@/core/domain/personas';

describe('PersonaGate (V4) — checkPersonaRequirement', () => {
  it('aceita persona com tipo correspondente', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.DONOR, scopeId: null, hasOnboarding: true },
      PERSONA_TYPE.DONOR,
    )).toBe(true);
  });

  it('aceita persona em lista de tipos permitidos', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.DONOR, scopeId: null, hasOnboarding: true },
      [PERSONA_TYPE.ADOPTER, PERSONA_TYPE.DONOR],
    )).toBe(true);
  });

  it('rejeita persona com tipo diferente', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.DONOR, scopeId: null, hasOnboarding: true },
      PERSONA_TYPE.ADOPTER,
    )).toBe(false);
  });

  it('rejeita persona com scopeId diferente do exigido', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'club_a', hasOnboarding: true },
      PERSONA_TYPE.SHELTER_STAFF,
      'club_b',
    )).toBe(false);
  });

  it('aceita persona com scopeId correto', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'club_a', hasOnboarding: true },
      PERSONA_TYPE.SHELTER_STAFF,
      'club_a',
    )).toBe(true);
  });

  it('rejeita persona com scopeId null quando é exigida (shelter scoped)', () => {
    // Quando é scoped, scopeId null é problema
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.SHELTER_STAFF, scopeId: null, hasOnboarding: true },
      PERSONA_TYPE.SHELTER_STAFF,
      'club_a',
    )).toBe(false);
  });

  it('aceita função customizada que retorna true', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.DONOR, scopeId: null, hasOnboarding: true },
      (p) => p.type === PERSONA_TYPE.DONOR,
    )).toBe(true);
  });

  it('rejeita função customizada que retorna false', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.DONOR, scopeId: null, hasOnboarding: true },
      (p) => p.type === PERSONA_TYPE.ADOPTER,
    )).toBe(false);
  });

  it('captura erro em função customizada e retorna false', () => {
    expect(checkPersonaRequirement(
      { type: PERSONA_TYPE.DONOR, scopeId: null, hasOnboarding: true },
      () => { throw new Error('test'); },
    )).toBe(false);
  });

  it('rejeita persona null', () => {
    expect(checkPersonaRequirement(
      null,
      PERSONA_TYPE.DONOR,
    )).toBe(false);
  });
});
