/**
 * @fileoverview PersonaSwitcher — dentro do acesso de abrigo, o switch de
 * acessos só aparece para o admin master (D-SHELTER-SWITCH-ADMIN-ONLY). Em
 * outros acessos, o switch continua disponível normalmente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PERSONA_TYPE } from '@/core/domain/personas';

let mockProfile = { role: 'user' };
let mockActive = { type: PERSONA_TYPE.SHELTER_STAFF, key: 'shelter_staff:club-1' };

vi.mock('@/core/lib/FeatureFlagsContext', () => ({ useFeatureFlag: () => true }));
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, userProfile: mockProfile }),
}));
vi.mock('@/core/hooks/useActivePersona', () => ({
  useActivePersona: () => ({
    active: mockActive,
    visibleForSwitcher: [
      { key: 'adopter', type: PERSONA_TYPE.ADOPTER, hasOnboarding: true },
      { key: 'shelter_staff:club-1', type: PERSONA_TYPE.SHELTER_STAFF, hasOnboarding: true, scopeName: 'Pet lover' },
    ],
    setActive: vi.fn(),
    canSwitch: true,
    isLoading: false,
  }),
}));

import { PersonaSwitcher } from './PersonaSwitcher.jsx';

function renderSwitcher() {
  return render(<PersonaSwitcher onSelectPersona={vi.fn()} onAddPersona={vi.fn()} />);
}

describe('PersonaSwitcher — switch de acessos no acesso de abrigo', () => {
  beforeEach(() => {
    mockProfile = { role: 'user' };
    mockActive = { type: PERSONA_TYPE.SHELTER_STAFF, key: 'shelter_staff:club-1' };
  });

  it('NÃO mostra o switch para usuário comum no acesso de abrigo', () => {
    renderSwitcher();
    expect(screen.queryByTestId('persona-switcher-button')).toBeNull();
  });

  it('mostra o switch para o admin master no acesso de abrigo', () => {
    mockProfile = { role: 'platform_admin' };
    renderSwitcher();
    expect(screen.getByTestId('persona-switcher-button')).toBeInTheDocument();
  });

  it('mostra o switch para usuário comum em OUTRO acesso (ex.: adotante)', () => {
    mockActive = { type: PERSONA_TYPE.ADOPTER, key: 'adopter' };
    renderSwitcher();
    expect(screen.getByTestId('persona-switcher-button')).toBeInTheDocument();
  });
});
