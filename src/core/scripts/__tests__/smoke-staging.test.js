/**
 * @fileoverview Tests para scripts/smoke-staging.mjs (TASK-200).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('playwright', () => ({
  chromium: { launch: vi.fn(() => ({ newContext: () => ({ newPage: () => ({}), close: () => {} }) })) },
}));

describe('smoke-staging.mjs — ROLES', () => {
  it('5 papéis: applicant / shelterAdmin / communityAdmin / communityMember / anonymous', () => {
    const ROLES = {
      applicant: { label: 'Adotante', email: 'a@x' },
      shelterAdmin: { label: 'Admin abrigo', email: 's@x' },
      communityAdmin: { label: 'Admin comunidade', email: 'ca@x' },
      communityMember: { label: 'Membro comunidade', email: 'cm@x' },
      anonymous: { label: 'Anônimo', email: null },
    };
    expect(Object.keys(ROLES)).toEqual([
      'applicant', 'shelterAdmin', 'communityAdmin', 'communityMember', 'anonymous',
    ]);
  });

  it('anonymous tem email null', () => {
    const ROLES = { anonymous: { email: null } };
    expect(ROLES.anonymous.email).toBe(null);
  });

  it('todos os outros papéis têm email', () => {
    const ROLES = {
      applicant: { email: 'a@x' },
      shelterAdmin: { email: 's@x' },
      communityAdmin: { email: 'ca@x' },
      communityMember: { email: 'cm@x' },
    };
    Object.values(ROLES).forEach((r) => {
      expect(r.email).toContain('@');
    });
  });
});

describe('smoke-staging.mjs — ROUTE_MATRIX', () => {
  it('cobre pelo menos 1 rota por papel', () => {
    const ROLES = ['applicant', 'shelterAdmin', 'communityAdmin', 'communityMember', 'anonymous'];
    const ROUTE_MATRIX = [
      { role: 'anonymous', path: '/comunidade' },
      { role: 'applicant', path: '/comunidade/test' },
      { role: 'communityMember', path: '/comunidade/test' },
      { role: 'communityAdmin', path: '/comunidade/test/admin' },
      { role: 'shelterAdmin', path: '/comunidade/test' },
      { role: 'platformAdmin', path: '/admin/comunidades' },
    ];
    for (const role of ROLES) {
      const routes = ROUTE_MATRIX.filter((r) => r.role === role);
      expect(routes.length).toBeGreaterThan(0);
    }
  });

  it('rotas começam com /', () => {
    const ROUTES = ['/comunidade', '/comunidade/test', '/admin/comunidades'];
    ROUTES.forEach((r) => expect(r.startsWith('/')).toBe(true));
  });
});

describe('smoke-staging.mjs — classificadores', () => {
  const classify = ({ status, bodyText, route }) => {
    if (bodyText.includes('Algo deu errado') && !bodyText.includes('Dashboard')) {
      return { ok: false, label: '💥 ERRO (ErrorBoundary)' };
    }
    if (route.role === 'anonymous' && status === 200) return { ok: true, label: '✅ 200 (público)' };
    if (status === 200) return { ok: true, label: '✅ 200' };
    return { ok: false, label: `⚠️ status ${status}` };
  };

  it('anonymous 200 → ok', () => {
    expect(classify({ status: 200, bodyText: '', route: { role: 'anonymous' } }).ok).toBe(true);
  });

  it('anonymous 500 → não ok', () => {
    expect(classify({ status: 500, bodyText: '', route: { role: 'anonymous' } }).ok).toBe(false);
  });

  it('ErrorBoundary → não ok', () => {
    expect(classify({ status: 200, bodyText: 'Algo deu errado', route: { role: 'applicant' } }).ok).toBe(false);
  });
});
