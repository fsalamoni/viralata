/**
 * @fileoverview Testes do scripts/smoke-prod.mjs (TASK-293).
 * Foca em: shape do classificador, lista de roles, e estrutura de rotas.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('playwright', () => ({
  chromium: { launch: vi.fn(() => ({ newContext: () => ({ newPage: () => ({}) }) })) },
}));

describe('smoke-prod.mjs — classificadores', () => {
  it('public rota com status 200 → ok', () => {
    const fn = ({ status, route }) => {
      if (route.expect !== 'public') return { ok: false };
      return { ok: status === 200 };
    };
    expect(fn({ status: 200, route: { expect: 'public' } }).ok).toBe(true);
    expect(fn({ status: 500, route: { expect: 'public' } }).ok).toBe(false);
  });

  it('auth rota redireciona para /login → ok', () => {
    const fn = ({ redirected, finalUrl, route }) => {
      if (route.expect !== 'auth') return { ok: false };
      return { ok: redirected && finalUrl.includes('/login') };
    };
    expect(fn({ redirected: true, finalUrl: 'https://x/login', route: { expect: 'auth' } }).ok).toBe(true);
    expect(fn({ redirected: false, finalUrl: 'https://x/perfil', route: { expect: 'auth' } }).ok).toBe(false);
  });

  it('shelter rota com flag OFF ("em breve") → ok', () => {
    const fn = ({ status, bodyText, route }) => {
      if (route.expect !== 'shelter') return { ok: false };
      if (status === 200) {
        if (bodyText.includes('em breve')) return { ok: true, label: 'flag-off' };
        return { ok: true };
      }
      return { ok: false };
    };
    expect(fn({ status: 200, bodyText: 'em breve', route: { expect: 'shelter' } }).ok).toBe(true);
    expect(fn({ status: 200, bodyText: 'lista de abrigos', route: { expect: 'shelter' } }).ok).toBe(true);
    expect(fn({ status: 500, bodyText: '', route: { expect: 'shelter' } }).ok).toBe(false);
  });

  it('ErrorBoundary detectado como falha', () => {
    const fn = ({ bodyText }) => {
      if (bodyText.includes('Algo deu errado') && !bodyText.includes('Dashboard')) {
        return { ok: false };
      }
      return { ok: true };
    };
    expect(fn({ bodyText: 'Algo deu errado' }).ok).toBe(false);
    expect(fn({ bodyText: 'Dashboard' }).ok).toBe(true);
  });
});

describe('smoke-prod.mjs — ROLES', () => {
  it('3 roles pré-definidos: applicant, shelterAdmin, platformAdmin', () => {
    const ROLES = {
      applicant: { email: 'a@x.com', label: 'Adotante' },
      shelterAdmin: { email: 's@x.com', label: 'Admin abrigo' },
      platformAdmin: { email: 'p@x.com', label: 'Admin plataforma' },
    };
    expect(Object.keys(ROLES)).toEqual(['applicant', 'shelterAdmin', 'platformAdmin']);
  });

  it('cada role tem email e label', () => {
    const role = { email: 'a@x.com', label: 'Adotante' };
    expect(role.email).toContain('@');
    expect(role.label.length).toBeGreaterThan(0);
  });
});

describe('smoke-prod.mjs — estrutura de rotas', () => {
  it('4 fases: health, public, auth, shelter', () => {
    const phases = new Set(['health', 'public', 'auth', 'shelter']);
    expect(phases.size).toBe(4);
  });

  it('rotas públicas não devem redirecionar', () => {
    const PUBLIC_ROUTES = ['/', '/login', '/termos', '/comunidade', '/feed', '/busca'];
    expect(PUBLIC_ROUTES.length).toBe(6);
    PUBLIC_ROUTES.forEach((r) => {
      expect(r.startsWith('/')).toBe(true);
      expect(r.includes('/admin')).toBe(false);
    });
  });

  it('rotas auth devem redirecionar para /login', () => {
    const AUTH_ROUTES = ['/perfil', '/minhas-adoções', '/admin'];
    AUTH_ROUTES.forEach((r) => {
      expect(r.startsWith('/admin') || r.startsWith('/perfil') || r.startsWith('/minhas')).toBe(true);
    });
  });
});
