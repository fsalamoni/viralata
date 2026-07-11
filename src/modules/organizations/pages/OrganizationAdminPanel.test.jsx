/**
 * @fileoverview Teste do OrganizationAdminPanel com todas as flags ativas.
 *
 * ESTE TESTE É A PROVA REAL: monta o painel com todas as feature flags
 * de shelter ativas, mockando useMyPets/useClub/useMyMembership, e
 * verifica que não há crash.
 *
 * Se o teste passar, o painel carrega sem erro. Se quebrar, sabemos
 * EXATAMENTE onde está o bug.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mocks DEVEM vir antes dos imports do componente sob teste
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoadingAuth: false,
    isPlatformAdmin: false,
    user: { uid: 'test-user', email: 'test@example.com' },
  }),
}));

vi.mock('@/modules/pets/hooks/usePets', () => ({
  useMyPets: () => ({
    data: [
      { id: 'p1', name: 'Rex', species: 'Cachorro', breed: 'Vira-lata' },
      { id: 'p2', name: 'Mia', species: 'Gato', breed: 'Siamês' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/modules/organizations/hooks/useClubs', () => ({
  useClub: () => ({
    data: {
      id: 'club-1',
      name: 'Abrigo Teste',
      city: 'São Paulo',
      state: 'SP',
      description: 'Abrigo de teste',
      member_count: 10,
      community_name: 'Comunidade Teste',
      created_at: { toDate: () => new Date('2024-01-01') },
    },
    isLoading: false,
  }),
  useMyMembership: () => ({
    data: { role: 'admin', permissions: ['animals', 'feed', 'donations', 'finance', 'team'] },
    isLoading: false,
  }),
}));

// TODAS as flags ativas
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (key) => {
    if (typeof key === 'string') {
      // Ativa tudo que é SHELTER_
      return [key.startsWith('SHELTER_'), () => {}];
    }
    return [true, () => {}];
  },
  FEATURE_FLAG: new Proxy({}, { get: (_, k) => k }),
}));

vi.mock('@/core/lib/useArenaPageClasses', () => ({
  useArenaPageClasses: (cls) => cls,
}));

vi.mock('@/core/featureFlags', () => ({
  FEATURE_FLAG_META: {},
}));

vi.mock('@/core/services/platformSettingsService', () => ({
  setFeatureFlag: vi.fn(),
  markFlagsMigrationApplied: vi.fn(),
}));

// SONNER
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Agora importa o componente
import OrganizationAdminPanel from '@/modules/organizations/pages/OrganizationAdminPanel';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

describe('OrganizationAdminPanel - com TODAS flags ativas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não quebra com todas as flags SHELTER ativas', () => {
    expect(() => {
      const html = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/organizacoes/club-1/admin'] },
          React.createElement(Routes, null,
            React.createElement(Route, {
              path: '/organizacoes/:orgId/admin',
              element: React.createElement(OrganizationAdminPanel),
            })
          )
        )
      );
      // Sanity: o HTML deve ter pelo menos o nome do abrigo
      expect(html).toContain('Abrigo Teste');
    }).not.toThrow();
  });
});
