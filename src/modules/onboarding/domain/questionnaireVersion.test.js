/**
 * @fileoverview Tests do questionnaireVersion (TASK-401 parte 3).
 */
import { describe, it, expect } from 'vitest';
import {
  ONBOARDING_QUESTIONNAIRE_VERSION,
  getNewFieldsForUser,
  getOnboardingState,
} from './questionnaireVersion';

describe('getNewFieldsForUser', () => {
  it('user sem versão: todos os fields são novos', () => {
    const fields = getNewFieldsForUser(null);
    expect(fields).toContain('housing_type');
    expect(fields).toContain('budget_level');
  });

  it('user com versão atual: nada novo', () => {
    const fields = getNewFieldsForUser(ONBOARDING_QUESTIONNAIRE_VERSION);
    expect(fields).toEqual([]);
  });
});

describe('getOnboardingState', () => {
  it('sem profile: não precisa (ainda não logou)', () => {
    const s = getOnboardingState(null);
    expect(s.needsOnboarding).toBe(false);
  });

  it('profile sem profile_completed: precisa fazer', () => {
    const s = getOnboardingState({ uid: 'u1' });
    expect(s.needsOnboarding).toBe(true);
    expect(s.isNew).toBe(true);
  });

  it('profile completo com versão atual: nada a fazer', () => {
    const s = getOnboardingState({
      uid: 'u1',
      profile_completed: true,
      onboarding_version: ONBOARDING_QUESTIONNAIRE_VERSION,
    });
    expect(s.needsOnboarding).toBe(false);
  });

  it('profile completo com versão antiga: tem novos fields', () => {
    const s = getOnboardingState({
      uid: 'u1',
      profile_completed: true,
      onboarding_version: '2026-01-01-v0',
    });
    expect(s.needsOnboarding).toBe(true);
    expect(s.isNew).toBe(false);
    expect(s.newFields.length).toBeGreaterThan(0);
  });
});
