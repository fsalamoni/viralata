/**
 * @fileoverview Suite de acessibilidade automatizada completa
 * (TASK-191 / TASK-199 / Regra A Eixos 1 e 5) com @axe-core/playwright.
 *
 * Cobre as rotas públicas principais + rotas autenticadas (com mock
 * de auth via localStorage cookie). Política: violações `critical`
 * e `serious` FALHAM o teste. `moderate`/`minor` são reportadas no
 * stdout (dívida rastreável) sem quebrar o build — endurecer depois
 * que zerar as sérias.
 *
 * Rodar local:
 *   npm run build && npx vite preview --port 4174 &
 *   E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test tests/e2e/a11y.spec.js
 *
 * @see docs/A11Y_AUDIT.md
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Rotas públicas testadas. */
const PUBLIC_ROUTES = [
  '/',
  '/feed',
  '/organizacoes',
  '/comunidades',
  '/comunidade/demo',     // pública (mock communityId)
  '/voluntarios',
  '/voluntarios/termo',
  '/voluntarios/seja',
  '/busca',
  '/login',
  '/cadastro',
  '/termos',
  '/politica-privacidade',
  '/legislacao',
  '/ajuda',
  '/page-not-found',
];

/** Rotas autenticadas (precisam de mock auth). */
const AUTH_ROUTES = [
  '/perfil',
  '/minhas-adoções',
  '/meus-pets',
  '/meus-interesses',
  '/adoptions',
];

/** Rotas admin. */
const ADMIN_ROUTES = [
  '/admin',
  '/admin/saude',
  '/admin/pets',
  '/admin/denuncias',
  '/admin/usuarios',
  '/admin/organizacoes',
  '/admin/comunidades',
  '/admin/metricas',
  '/admin/auditoria',
];

/**
 * Violações conhecidas por rota (id → warning em vez de fail).
 * Adicionar entradas apenas com task de correção correspondente aberta.
 */
const KNOWN_ISSUES = {
  '/feed': ['link-name'],
  '/organizacoes': ['link-name'],
  '/voluntarios': ['link-name'],
  '/busca': ['link-name'],
  '/comunidade/demo': ['link-name'],
  '/meus-pets': ['link-name'],
  '/perfil': ['link-name'],
  '/admin/pets': ['link-name'],
};

/** Mock auth via localStorage/cookies para rotas autenticadas. */
async function mockAuth(page, role = 'user') {
  // Cookies fake + localStorage para enganar o AuthContext
  await page.addInitScript((r) => {
    window.localStorage.setItem('auth_mock', JSON.stringify({ uid: 'mock-uid', role: r }));
  }, role);
}

for (const route of PUBLIC_ROUTES) {
  test(`a11y [public]: ${route} sem violações critical/serious`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const known = new Set(KNOWN_ISSUES[route] || []);
    const bySeverity = (impact) => results.violations.filter((v) => v.impact === impact);
    const blocking = [...bySeverity('critical'), ...bySeverity('serious')]
      .filter((v) => !known.has(v.id));
    const advisory = [
      ...bySeverity('moderate'), ...bySeverity('minor'),
      ...[...bySeverity('critical'), ...bySeverity('serious')].filter((v) => known.has(v.id)),
    ];

    if (advisory.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[a11y:${route}] avisos (não bloqueiam):`,
        advisory.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}`).join(', '));
    }

    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
    ).toEqual([]);
  });
}

for (const route of AUTH_ROUTES) {
  test(`a11y [auth]: ${route} sem violações critical/serious`, async ({ page }) => {
    await mockAuth(page, 'applicant');
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const known = new Set(KNOWN_ISSUES[route] || []);
    const bySeverity = (impact) => results.violations.filter((v) => v.impact === impact);
    const blocking = [...bySeverity('critical'), ...bySeverity('serious')]
      .filter((v) => !known.has(v.id));
    const advisory = [
      ...bySeverity('moderate'), ...bySeverity('minor'),
      ...[...bySeverity('critical'), ...bySeverity('serious')].filter((v) => known.has(v.id)),
    ];

    if (advisory.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[a11y:${route}] avisos (não bloqueiam):`,
        advisory.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}`).join(', '));
    }

    // Rotas auth: pode redirecionar para /login se mock não bastar
    // Aceita se redirect (Status 200 da redirect page é OK)
    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
    ).toEqual([]);
  });
}

for (const route of ADMIN_ROUTES) {
  test(`a11y [admin]: ${route} sem violações critical/serious`, async ({ page }) => {
    await mockAuth(page, 'platformAdmin');
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const known = new Set(KNOWN_ISSUES[route] || []);
    const bySeverity = (impact) => results.violations.filter((v) => v.impact === impact);
    const blocking = [...bySeverity('critical'), ...bySeverity('serious')]
      .filter((v) => !known.has(v.id));

    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
    ).toEqual([]);
  });
}
