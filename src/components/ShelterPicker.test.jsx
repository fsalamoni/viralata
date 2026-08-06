/**
 * @fileoverview ShelterPicker — a indicação/seleção de abrigo no topbar só
 * aparece para o admin master (D-SHELTER-SWITCH-ADMIN-ONLY).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PERSONA_TYPE } from '@/core/domain/personas';

let mockProfile = { role: 'platform_admin' };
let mockActive = { type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'club-1' };
let mockMemberships = [{ club: { id: 'club-1', name: 'Pet lover' }, role: 'admin' }];

vi.mock('@/core/lib/FeatureFlagsContext', () => ({ useFeatureFlag: () => true }));
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, userProfile: mockProfile }),
}));
vi.mock('@/core/hooks/useActivePersona', () => ({
  useActivePersona: () => ({ active: mockActive, setActive: vi.fn() }),
}));
vi.mock('@/modules/organizations/hooks/useUserClubMemberships', () => ({
  useUserClubMemberships: () => ({ data: mockMemberships, isLoading: false }),
}));

import ShelterPicker from './ShelterPicker.jsx';

function renderPicker() {
  return render(<MemoryRouter><ShelterPicker /></MemoryRouter>);
}

describe('ShelterPicker — só admin master vê a indicação/seleção de abrigo', () => {
  beforeEach(() => {
    mockProfile = { role: 'platform_admin' };
    mockActive = { type: PERSONA_TYPE.SHELTER_STAFF, scopeId: 'club-1' };
    mockMemberships = [{ club: { id: 'club-1', name: 'Pet lover' }, role: 'admin' }];
  });

  it('mostra a indicação do abrigo para o admin master', () => {
    renderPicker();
    expect(screen.getByTestId('shelter-picker-button')).toBeInTheDocument();
  });

  it('NÃO mostra para usuário comum, mesmo membro de abrigo', () => {
    mockProfile = { role: 'user' };
    renderPicker();
    expect(screen.queryByTestId('shelter-picker-button')).toBeNull();
  });

  it('NÃO mostra para usuário comum com múltiplos abrigos', () => {
    mockProfile = { role: 'user' };
    mockMemberships = [
      { club: { id: 'club-1', name: 'Pet lover' }, role: 'admin' },
      { club: { id: 'club-2', name: 'Abrigo 2' }, role: 'member' },
    ];
    renderPicker();
    expect(screen.queryByTestId('shelter-picker-button')).toBeNull();
  });

  it('NÃO mostra quando não há perfil carregado', () => {
    mockProfile = null;
    renderPicker();
    expect(screen.queryByTestId('shelter-picker-button')).toBeNull();
  });
});
