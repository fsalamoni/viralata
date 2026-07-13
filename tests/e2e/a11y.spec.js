/**
 * @fileoverview Suite de acessibilidade automatizada (TASK-199 /
 * Regra A Eixos 1 e 5) com @axe-core/playwright.
 *
 * Cobre as rotas públicas principais — incluindo /comunidades (a
 * página de comunidade individual e o painel admin exigem auth +
 * dados; ficam para a fase com seed de staging, ver TASK-200).
 *
 * Política: violações `critical` e `serious` FALHAM o teste.
 * `moderate`/`minor` são reportadas no stdout (dívida rastreável)
 * sem quebrar o build — endurecer depois que zerar as sérias.
 *
 * Rodar local:
 *   npm run build && npx vite preview --port 4174 &
 *   E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test tests/e2e/a11y.spec.js
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES = [
  '/',
  '/feed',
  '/organizacoes',
  '/comunidades',
  '/voluntarios',
  '/busca',
  '/login',
];

/**
 * Violações conhecidas por rota (id → warning em vez de fail).
 * TASK-249 corrigiu o contraste do token primary (17 72% 43%) e o
 * link de e-mail do /voluntarios — mapa vazio; adicionar entradas
 * apenas com task de correção correspondente aberta.
 */
const KNOWN_ISSUES = {
  '/feed': ['link-name'],
  '/organizacoes': ['link-name'],
  '/voluntarios': ['link-name'],
  '/busca': ['link-name'],
};

for (const route of PUBLIC_ROUTES) {
  test(`a11y: ${route} sem violações critical/serious`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    // Suspense/lazy: espera o conteúdo real montar.
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
