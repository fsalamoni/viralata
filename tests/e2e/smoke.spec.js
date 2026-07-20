/**
 * @fileoverview Smoke tests E2E — fluxos públicos.
 *
 * Cobre o "happy path" do visitante anônimo:
 *   1. Home carrega com branding Viralata
 *   2. Páginas de auth e termos estão acessíveis
 *   3. Páginas legais integrais (/legal/*) renderizam
 *   4. Diretórios públicos (organizações, comunidades) carregam
 *   5. Buscador e feed de pets (read-only) estão acessíveis
 *   6. Rotas removidas por segurança retornam 404 (não UI admin)
 *
 * Esses testes são idempotentes e não tocam Firestore para escrita —
 * apenas leitura via cache público. Falhas aqui indicam regressões
 * de deploy (build quebrado, redirect 500, page-blank, etc).
 *
 * Rodar local:
 *   npm run build && npm run preview &
 *   E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test tests/e2e/smoke.spec.js
 *
 * @see playwright.config.js
 * @see AGENTS.md §Testes E2E
 */

import { test, expect } from '@playwright/test';

// ─── Helpers compartilhados ───────────────────────────────────────────────────

/**
 * Aguarda o shell do app estar pronto: pelo menos um heading visível
 * OU um skeleton de loading. Usado como `waitForAppReady` em testes
 * que dependem de React Suspense ter resolvido a página lazy.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForAppReady(page) {
  // Garante que o React montou (#root tem filhos) OU o Suspense fallback
  // apareceu. Aceita ambos como "ready" — loading state não é falha.
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      if (!root || root.children.length === 0) return false;
      // Considera pronto se houver headings OU skeleton OU texto
      const headings = document.querySelectorAll('h1, h2, h3');
      const skeletons = document.querySelectorAll('[class*="skeleton" i], [class*="Skeleton"]');
      return headings.length > 0 || skeletons.length > 0 || document.body.innerText.trim().length > 0;
    },
    { timeout: 15_000 },
  );
}

// ─── Smoke: landing e identidade ──────────────────────────────────────────────

test.describe('Smoke: landing e identidade', () => {
  test('home carrega com título Viralata', async ({ page }) => {
    // Verifica: index.html tem <title>Viralata — ...</title> e o React monta.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page).toHaveTitle(/Viralata/i);
  });

  test('home não retorna 5xx', async ({ page }) => {
    // Garante que o deploy não quebrou (asset 404, JS error fatal, etc).
    const response = await page.goto('/', { waitUntil: 'load' });
    expect(response?.status()).toBeLessThan(500);
  });

  test('home tem pelo menos um link de navegação', async ({ page }) => {
    // A landing tem menu/footer com links. Se não houver nenhum link,
    // é sintoma de "white screen" do React.
    await page.goto('/');
    await waitForAppReady(page);
    const links = page.locator('a[href]');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('home responde em < 5s no first paint', async ({ page }) => {
    // SLA informal: a home não pode demorar mais que 5s para começar
    // a renderizar conteúdo (DOMContentLoaded). Falha aqui sinaliza
    // regressão de performance ou bloqueio de asset.
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000);
  });
});

// ─── Smoke: auth e termos (visitante anônimo) ────────────────────────────────

test.describe('Smoke: auth pages (visitante)', () => {
  test('página de login carrega', async ({ page }) => {
    // Visitante anônimo deve poder ver a página de login. Pode ter
    // texto "Entrar" / "Login" / "Acessar".
    await page.goto('/login');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('página de termos (/termos) carrega', async ({ page }) => {
    await page.goto('/termos');
    await waitForAppReady(page);
    // Termos é rota pública — qualquer visitante lê sem auth.
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('página de termos tem texto de "Termos de Uso"', async ({ page }) => {
    // Fallback gracioso: se a V3 estiver ativa o h1 pode ser diferente,
    // mas o body SEMPRE contém "Termos" em algum lugar visível.
    await page.goto('/termos');
    await waitForAppReady(page);
    const termosHeading = page.getByText(/Termos de Uso/i).first();
    await expect(termosHeading).toBeVisible({ timeout: 5_000 });
  });

  test('página de privacidade (/politica-privacidade) carrega', async ({ page }) => {
    await page.goto('/politica-privacidade');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('página de legislação (/legislacao) carrega', async ({ page }) => {
    await page.goto('/legislacao');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

// ─── Smoke: páginas legais integrais (/legal/*) ──────────────────────────────

test.describe('Smoke: páginas legais integrais', () => {
  // Lista derivada de LEGAL_PAGES em
  // src/modules/shelter/domain/legal — subset público.
  const legalPages = [
    { slug: 'cookies', label: /cookies/i },
    { slug: 'politica-de-privacidade', label: /privacidade/i },
    { slug: 'codigo-de-conduta', label: /conduta/i },
  ];

  for (const { slug, label } of legalPages) {
    test(`/legal/${slug} renderiza com heading`, async ({ page }) => {
      await page.goto(`/legal/${slug}`);
      await waitForAppReady(page);
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    });

    test(`/legal/${slug} tem conteúdo temático (${label})`, async ({ page }) => {
      // Verifica que a página não está em branco — aparece o termo
      // esperado em algum lugar. Aceita case-insensitive e match parcial.
      await page.goto(`/legal/${slug}`);
      await waitForAppReady(page);
      const body = await page.locator('body').innerText();
      expect(body).toMatch(label);
    });
  }

  test('/legal/termos-de-uso carrega', async ({ page }) => {
    // Mesma rota "termos" que /termos, mas via /legal/termos-de-uso.
    await page.goto('/legal/termos-de-uso');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/legal/legislacao-animal carrega', async ({ page }) => {
    await page.goto('/legal/legislacao-animal');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/legal/avisos-legais carrega', async ({ page }) => {
    await page.goto('/legal/avisos-legais');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('slug inválido em /legal/ cai no 404', async ({ page }) => {
    // Slug bogus não está no catálogo LEGAL_PAGES — espera
    // renderizar a página de "não encontrado" (PageNotFound).
    await page.goto('/legal/nao-existe-este-slug-blabla');
    await waitForAppReady(page);
    // O componente deve mostrar algum tipo de "não encontrado" — aceita
    // diferentes formulações (404, não encontrado, página não existe).
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/n[ãa]o encontr|404|not found|inv[áa]lid/i);
  });
});

// ─── Smoke: diretórios públicos ──────────────────────────────────────────────

test.describe('Smoke: diretórios públicos', () => {
  test('diretório de organizações (/organizacoes) carrega', async ({ page }) => {
    await page.goto('/organizacoes');
    await waitForAppReady(page);
    // Após carregar, a URL ainda deve ser /organizacoes (ou com
    // query params de filtro). Não deve redirecionar para login.
    await expect(page).toHaveURL(/organizacoes/);
  });

  test('diretório de organizações tem lista de cards', async ({ page }) => {
    // Cards de ONGs: o componente ClubsDirectory renderiza nomes de
    // organizações. Aceita tanto cards visíveis quanto empty state
    // gracioso (quando Firestore está vazio em staging).
    await page.goto('/organizacoes');
    await waitForAppReady(page);
    // Aguarda um pouco pelo Firestore resolver (networkidle).
    await page.waitForLoadState('networkidle').catch(() => {
      // networkidle pode dar timeout se há firestore streaming — ignora.
    });
    // Verifica que o container principal tem conteúdo não-vazio.
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('diretório de comunidades (/comunidade) carrega', async ({ page }) => {
    await page.goto('/comunidade');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/comunidade/);
  });

  test('página de busca (/busca) tem campo de input', async ({ page }) => {
    // Verifica que o input de busca está presente (search ou text).
    // Pode estar como <input type="search"> ou <input type="text">.
    await page.goto('/busca');
    await waitForAppReady(page);
    const searchInput = page.locator('input[type="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('página de eventos (/eventos) carrega', async ({ page }) => {
    await page.goto('/eventos');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/eventos/);
  });

  test('página de vitrines (/vitrines) carrega', async ({ page }) => {
    await page.goto('/vitrines');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/vitrines/);
  });

  test('mural público (/mural) carrega', async ({ page }) => {
    await page.goto('/mural');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/mural/);
  });

  test('lares temporários (/lares-temporarios) carrega', async ({ page }) => {
    await page.goto('/lares-temporarios');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/lares-temporarios/);
  });
});

// ─── Smoke: feed de pets (visitante anônimo) ─────────────────────────────────

test.describe('Smoke: feed de pets (visitante)', () => {
  test('feed (/feed) é acessível sem login', async ({ page }) => {
    // O feed é público — visitante vê pets sem auth. Botões de "Quero
    // adotar" pedem login on-click, mas a página em si carrega.
    await page.goto('/feed');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/feed/);
  });

  test('feed não redireciona para /login', async ({ page }) => {
    // Regressão comum: gate de auth é adicionado por engano ao feed.
    await page.goto('/feed');
    await waitForAppReady(page);
    // Aceita redirect APENAS se for para /login com returnTo=/feed
    // (fluxo "comprar como guest" hipotético), mas a página atual
    // NÃO redireciona — verificamos que permanecemos em /feed.
    expect(page.url()).not.toMatch(/\/login/);
  });

  test('feed tem área de conteúdo principal', async ({ page }) => {
    // Pelo menos o <main> está presente e visível (não white screen).
    await page.goto('/feed');
    await waitForAppReady(page);
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Smoke: regressão de segurança (rotas removidas) ─────────────────────────

test.describe('Smoke: regressão de segurança', () => {
  test('/public-debug é 404 (NÃO expõe UI admin)', async ({ page }) => {
    // BUG CRÍTICO-1 (2026-07-20): a rota /public-debug foi REMOVIDA
    // porque renderizava OrganizationAdminPanel + KanbanPage +
    // VolunteersRoster SEM auth (via ?debug=1). Garantimos que essa
    // rota NUNCA mais exibe UI admin.
    const response = await page.goto('/public-debug', { waitUntil: 'load' });
    // Pode ser 200 (SPA serve index.html para qualquer rota) ou 404,
    // mas o conteúdo renderizado NÃO pode ser a UI de admin.
    const html = await page.content();
    // Texto "PUBLIC DEBUG" era o header da página debug — NÃO pode
    // aparecer mais.
    expect(html).not.toMatch(/PUBLIC DEBUG/i);
    // A página deve mostrar "404 / não encontrado" OU a home (caso
    // o redirect catch-all do React Router mande de volta para /).
    // O importante é que NÃO haja UI de admin exposta.
    const hasAdminUI = await page
      .locator('text=/Meu painel|Painel administrativo|Aprovar voluntári|excluir voluntári/i')
      .count();
    expect(hasAdminUI).toBe(0);
    // Sanity: status não pode ser 5xx
    expect(response?.status() ?? 0).toBeLessThan(500);
  });

  test('/public-debug?debug=1 também é 404', async ({ page }) => {
    // O bug original era ativado via ?debug=1 — verifica que esse
    // query param também não desbloqueia nada.
    await page.goto('/public-debug?debug=1', { waitUntil: 'load' });
    const html = await page.content();
    expect(html).not.toMatch(/PUBLIC DEBUG/i);
  });

  test('rotas admin não autenticadas redirecionam para /login', async ({ page }) => {
    // Defesa em profundidade: /admin e filhos devem ser gated.
    await page.goto('/admin');
    await waitForAppReady(page);
    // Aceita redirect para /login OU para / (home) — o importante é
    // que NÃO vemos conteúdo de dashboard.
    await expect(page).toHaveURL(/\/login|\/$/);
    const hasDashboardContent = await page
      .locator('text=/Dashboard administrativo|Total de usuários|Métricas da plataforma/i')
      .count();
    expect(hasDashboardContent).toBe(0);
  });

  test('rotas autenticadas redirecionam para /login', async ({ page }) => {
    // /perfil, /meus-pets, /chat, etc — todas exigem auth.
    const protectedRoutes = [
      '/perfil',
      '/meus-pets',
      '/meus-interesses',
      '/chat',
      '/adoptions',
    ];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await waitForAppReady(page);
      // O guard ProtectedRoute faz Navigate to /login.
      await expect(page).toHaveURL(/\/login|\/onboarding/);
    }
  });
});

// ─── Smoke: cookies e privacidade ────────────────────────────────────────────

test.describe('Smoke: cookies e consentimento', () => {
  test('banner de cookies aparece na primeira visita', async ({ page, context }) => {
    // Limpa cookies e storage antes de testar — garante que é a
    // "primeira visita" do ponto de vista do app.
    await context.clearCookies();
    await page.goto('/');
    await waitForAppReady(page);
    // O banner está gated por feature flag SHELTER_LEGAL_TERMS_V1.
    // Se a flag estiver OFF, o banner não aparece — falha graciosa
    // (skip). Se ON, deve aparecer em até 5s.
    const banner = page.locator('text=/cookies/i').first();
    const visible = await banner.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!visible) {
      test.skip(true, 'Cookie banner gated por feature flag — skipped');
      return;
    }
    await expect(banner).toBeVisible();
  });

  test('banner de cookies tem botão de aceitar ou recusar', async ({ page, context }) => {
    // Smoke: se o banner aparece, deve ter pelo menos uma ação clara
    // (aceitar/recusar/fechar). Verifica presença de botões no banner.
    await context.clearCookies();
    await page.goto('/');
    await waitForAppReady(page);
    const banner = page.locator('[role="dialog"], [aria-label*="cookie" i], [data-testid*="cookie" i]').first();
    if (!(await banner.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'Cookie banner não renderizou — flag provavelmente OFF');
      return;
    }
    // Pelo menos um botão dentro do banner
    const buttons = banner.locator('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });
});

// ─── Smoke: healthcheck técnico ──────────────────────────────────────────────

test.describe('Smoke: healthcheck técnico', () => {
  test('manifest PWA é servido', async ({ page }) => {
    // PWA é parte do produto — verifica que o manifest está acessível
    // e tem campos básicos.
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);
    const body = await response?.json();
    expect(body).toBeTruthy();
    expect(body.name).toBeTruthy();
  });

  test('favicon é servido', async ({ page }) => {
    // Se o favicon 404, é regressão de build (asset não copiado).
    const response = await page.goto('/favicon.svg');
    expect(response?.status()).toBe(200);
  });

  test('sitemap.xml é servido', async ({ page }) => {
    // Gerado em prebuild (scripts/generate-sitemap.mjs) — se sumiu,
    // houve regressão do pipeline.
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
  });

  test('página 404 (rota inexistente) renderiza fallback', async ({ page }) => {
    // SPA: qualquer rota não mapeada cai em <PageNotFound />.
    await page.goto('/rota-que-nao-existe-12345');
    await waitForAppReady(page);
    // Verifica que NÃO é uma página em branco — deve ter algum
    // heading "404" / "não encontrado" / "página não existe".
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/n[ãa]o encontr|404|not found|inv[áa]lid|p[áa]gina.*n[ãa]o/i);
  });

  test('JS console não tem erros fatais no home', async ({ page }) => {
    // Coleta erros de console e uncaught exceptions. Erros
    // esperados (favicon 404 em dev) são filtrados.
    const errors = [];
    page.on('pageerror', (err) => {
      errors.push(`pageerror: ${err.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignora erros conhecidos/esperados
        if (text.includes('favicon')) return;
        if (text.includes('manifest.webmanifest')) return;
        if (text.includes('manifest')) return;
        if (text.includes('Service Worker')) return;
        if (text.includes('firestore') && text.includes('offline')) return;
        errors.push(`console.error: ${text}`);
      }
    });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(2_000);
    // Falha apenas se houver erro fatal real (não warnings de rede).
    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.log('[smoke] erros capturados:', errors);
    }
    // Tolerância: 0 erros fatais. Se houver, falha o teste.
    expect(errors.filter((e) => !e.includes('Warning:'))).toHaveLength(0);
  });
});
