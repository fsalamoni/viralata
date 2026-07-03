import { describe, expect, it } from 'vitest';
import { isAdopterProfileComplete } from './profileCompletion';

function buildProfile(overrides = {}) {
  return {
    full_name: 'Ana Silva',
    city: 'Porto Alegre',
    state: 'RS',
    housing_type: 'house_with_yard',
    daily_walks: 'short',
    budget_level: 'moderate',
    lgpd_consent: true,
    ...overrides,
  };
}

describe('isAdopterProfileComplete', () => {
  it('retorna true quando os campos mínimos do onboarding estão preenchidos', () => {
    expect(isAdopterProfileComplete(buildProfile())).toBe(true);
  });

  it('retorna false para perfis legados com apenas dados básicos', () => {
    expect(isAdopterProfileComplete({
      full_name: 'Ana Silva',
      city: 'Porto Alegre',
      state: 'RS',
    })).toBe(false);
  });

  it('aceita consentimento legado salvo apenas com timestamp', () => {
    expect(isAdopterProfileComplete(buildProfile({
      lgpd_consent: false,
      lgpd_consent_at: '2026-07-03T00:00:00.000Z',
    }))).toBe(true);
  });

  it('retorna false quando algum campo obrigatório do onboarding falta', () => {
    expect(isAdopterProfileComplete(buildProfile({ housing_type: '' }))).toBe(false);
    expect(isAdopterProfileComplete(buildProfile({ budget_level: '' }))).toBe(false);
  });
});
