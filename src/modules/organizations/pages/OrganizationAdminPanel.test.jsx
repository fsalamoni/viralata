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

// Feature flags: o mock precisa refletir a API real — useFeatureFlag
// retorna **um booleano**, NÃO um tuple `[value, setter]`. Versões
// anteriores deste teste retornavam `[true, () => {}]`, o que mascarava
// o bug de runtime que só aparece com `false` (v1 do componente usava
// `const [x] = useFeatureFlag(...)` que crasha em produção quando a
// flag está OFF). Mantemos o mock controlado por uma flag para que cada
// test set o valor desejado.
const mockFeatureFlags = { enabled: false };
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => mockFeatureFlags.enabled,
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
    mockFeatureFlags.enabled = true;
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

  it('não quebra com TODAS as flags SHELTER OFF (regressão do bug prod)', () => {
    // Caso real: usuário com a flag SHELTER_LEGAL_TERMS_V1 OFF. Antes do
    // fix, `useFeatureFlag` retornava `false` e o destructuring
    // `const [x] = useFeatureFlag(...)` quebrava o painel inteiro com
    // "TypeError: G is not a function or its return value is not iterable".
    // Este test garante que isso nunca mais aconteça.
    mockFeatureFlags.enabled = false;
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
      // Sanity: o HTML deve ter pelo menos o nome do abrigo mesmo com todas flags off
      expect(html).toContain('Abrigo Teste');
      // E não deve renderizar nenhuma aba SHELTER (todas off)
      expect(html).not.toContain('Pendências'); // kanban tab
      expect(html).not.toContain('Vitrines');  // exhibitions tab
      expect(html).not.toContain('Voluntários'); // volunteers tab
    }).not.toThrow();
  });
});
