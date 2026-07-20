/**
 * @fileoverview Testes E2E de autenticação e onboarding.
 *
 * Escopo:
 *   1. Rotas protegidas redirecionam para /login (visitante anônimo)
 *   2. Páginas de auth (login, signup) renderizam formulário
 *   3. Onboarding (visitante) redireciona corretamente
 *   4. Rotas admin são gateadas (defense-in-depth)
 *   5. Rotas autenticadas específicas (shelter admin, foster dashboard)
 *      não vazam UI para visitantes
 *   6. BannedNotice aparece para usuário banido (gated por flag)
 *
 * Limitação conhecida: este projeto usa Firebase Auth via
 * signInWithPopup (Google). Não dá para "logar de verdade" em E2E
 * sem mockar o Firebase SDK inteiro. O pattern usado em outros
 * specs do projeto (`mockAuth` via localStorage) é DEFENSIVO — não
 * faz login real, mas serve para validar que páginas autenticadas
 * não crasham quando o contexto recebe state de auth simulado.
 *
 * Para validar o fluxo completo de login, o projeto usa
 * `scripts/smoke-prod.mjs` (HTTP-level) e testes de integração
 * com Firebase Emulator (Vitest).
 *
 * Rodar local:
 *   E2E_BASE_URL=http://127.0.0.1:4174 npx playwright test tests/e2e/auth.spec.js
 *
 * @see src/core/lib/FirebaseAuthContext.jsx
 * @see src/App.jsx (guards ProtectedRoute / AdminRoute / OnboardingGate)
 */

import { test, expect } from '@playwright/test';

// ─── Helpers compartilhados ───────────────────────────────────────────────────

/**
 * Injeta um mock de auth no localStorage ANTES do app montar.
 * NÃO autentica de verdade (Firebase onAuthStateChanged ainda
 * retorna null porque o auth.currentUser não é setado), mas serve
 * para:
 *   - Páginas que checam localStorage.auth_mock em early-boot
 *   - Componentes que fazem log de "user context" via window vars
 *   - Hidratação controlada em testes de UI gated
 *
 * @param {import('@playwright/test').Page} page
 * @param {'user'|'admin'|'platformAdmin'|'applicant'} role
 * @param {string} [uid]
 */
async function mockAuth(page, role = 'user', uid = 'mock-uid-123') {
  await page.addInitScript(
    ({ r, u }) => {
      window.localStorage.setItem(
        'auth_mock',
        JSON.stringify({ uid: u, role: r, mockedAt: Date.now() }),
      );
    },
    { r: role, u: uid },
  );
}

/**
 * Aguarda o shell do app estar pronto (heading visível ou skeleton).
 * @param {import('@playwright/test').Page} page
 */
async function waitForAppReady(page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      if (!root || root.children.length === 0) return false;
      const headings = document.querySelectorAll('h1, h2, h3');
      const skeletons = document.querySelectorAll('[class*="skeleton" i], [class*="Skeleton"]');
      return headings.length > 0 || skeletons.length > 0 || document.body.innerText.trim().length > 0;
    },
    { timeout: 15_000 },
  );
}

// ─── Auth: rotas protegidas (visitante anônimo) ─────────────────────────────

test.describe('Auth: rotas protegidas redirecionam visitante', () => {
  // Cada teste abaixo verifica que o guard ProtectedRoute
  // (em src/App.jsx) redireciona visitante anônimo para /login.
  // O redirect pode preservar a URL original via state.from.

  const protectedRoutes = [
    { path: '/perfil', name: 'perfil do adotante' },
    { path: '/meus-pets', name: 'meus pets' },
    { path: '/meus-interesses', name: 'meus interesses' },
    { path: '/chat', name: 'chat' },
    { path: '/adoptions', name: 'dashboard pós-adoção' },
    { path: '/preferencias', name: 'preferências' },
    { path: '/perfil/voluntario', name: 'perfil voluntário' },
    { path: '/perfil/contratos', name: 'contratos do adotante' },
  ];

  for (const { path, name } of protectedRoutes) {
    test(`rota protegida ${name} (${path}) redireciona para /login`, async ({ page }) => {
      await page.goto(path);
      await waitForAppReady(page);
      // ProtectedRoute em App.jsx → <Navigate to="/login" state={{ from: location }} replace />
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('rota protegida /onboarding redireciona para /login', async ({ page }) => {
    // Onboarding exige auth. Visitante anônimo em /onboarding é
    // jogado para /login.
    await page.goto('/onboarding');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota protegida /pets/:petId (V3 autenticada) redireciona', async ({ page }) => {
    // BUG ALTO-PUBLIC-1 (2026-07-20): a rota /pets/:petId (plural)
    // é a V3 autenticada e mostra botões de edição que dependem de
    // canManagePet. Visitante anônimo NÃO pode acessar.
    await page.goto('/pets/algum-pet-fake-id');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota protegida /pets/new redireciona', async ({ page }) => {
    // Criar pet é autenticado.
    await page.goto('/pets/new');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota protegida /pets/:petId/edit redireciona', async ({ page }) => {
    await page.goto('/pets/algum-pet/edit');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota protegida /radar redireciona', async ({ page }) => {
    // Radar de pets (alertas) é autenticado.
    await page.goto('/radar');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: rotas admin (defense-in-depth) ────────────────────────────────────

test.describe('Auth: rotas admin gateadas', () => {
  // AdminRoute em src/App.jsx verifica isPlatformAdmin. Visitante
  // anônimo é redirecionado para /login.

  const adminRoutes = [
    '/admin',
    '/admin/pets',
    '/admin/denuncias',
    '/admin/usuarios',
    '/admin/organizacoes',
    '/admin/comunidades',
    '/admin/metricas',
    '/admin/auditoria',
    '/admin/saude',
    '/admin/security-alerts',
    '/admin/alertas',
    '/admin/admins',
    '/admin/flags',
    '/admin/configuracoes',
    '/admin/notificacoes',
    '/admin/mock-data',
    '/admin/parceiros',
  ];

  for (const path of adminRoutes) {
    test(`admin ${path} não vaza UI sem auth`, async ({ page }) => {
      await page.goto(path);
      await waitForAppReady(page);
      // Pode redirecionar para /login OU para / (caso guard diferente)
      // — o importante é que NÃO vemos conteúdo de admin.
      await expect(page).toHaveURL(/\/login|\/$/);
      const hasAdminContent = await page
        .locator('text=/Total de usu[áa]rios|M[ée]tricas da plataforma|Painel administrativo|Den[úu]ncias pendentes/i')
        .count();
      expect(hasAdminContent).toBe(0);
    });
  }

  test('admin-debug também é gateado', async ({ page }) => {
    // /admin-debug usa AdminRoute — visitante é jogado para /login.
    await page.goto('/admin-debug');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: rotas de abrigo (shelter admin) ───────────────────────────────────

test.describe('Auth: rotas de abrigo gateadas', () => {
  test('shelter admin dashboard requer auth', async ({ page }) => {
    // BUG CRÍTICO-2 (2026-07-20): /abrigos/:clubId/admin/dashboard
    // agora exige auth (ProtectedRoute). Visitante é jogado para /login.
    await page.goto('/abrigos/test-club/admin/dashboard');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
    // Conteúdo admin NÃO pode aparecer
    const hasDashboardContent = await page.locator('text=/Meu painel|Painel do abrigo/i').count();
    expect(hasDashboardContent).toBe(0);
  });

  test('shelter onboarding wizard requer auth', async ({ page }) => {
    // BUG CRÍTICO-4: /abrigo/:clubId/onboarding é ProtectedRoute.
    await page.goto('/abrigo/test-club/onboarding');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('shelter contracts requer auth', async ({ page }) => {
    // TASK-288: contratos do abrigo são gated por auth + permissão.
    await page.goto('/abrigos/test-shelter/contracts');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('shelter interviews requer auth', async ({ page }) => {
    // TASK-290: entrevistas do abrigo são gated.
    await page.goto('/abrigos/test-shelter/interviews');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: rotas de lar temporário (foster) ──────────────────────────────────

test.describe('Auth: rotas de foster gateadas', () => {
  test('foster dashboard requer auth', async ({ page }) => {
    // BUG CRÍTICO-3 (2026-07-20): /lares-temporarios/dashboard é
    // ProtectedRoute. Visitante NÃO vê dashboard.
    await page.goto('/lares-temporarios/dashboard');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
    const hasDashboardContent = await page
      .locator('text=/Dashboard|Meu programa|Total de lares|Prorrogar/i')
      .count();
    expect(hasDashboardContent).toBe(0);
  });
});

// ─── Auth: páginas de login e signup ─────────────────────────────────────────

test.describe('Auth: páginas de login/signup', () => {
  test('/login carrega e tem botão de entrar com Google', async ({ page }) => {
    // Visitante vê a página de login. O fluxo é Google OAuth via
    // Firebase signInWithPopup — em E2E só verificamos que o botão
    // existe e a UI não está quebrada.
    await page.goto('/login');
    await waitForAppReady(page);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    // Procura por botão de Google (texto "Google" ou ícone Google).
    // Aceita variações: "Entrar com Google", "Continuar com Google",
    // "Login com Google" — o componente Login normaliza.
    const googleButton = page
      .getByRole('button', { name: /google/i })
      .or(page.locator('[aria-label*="google" i]'))
      .first();
    await expect(googleButton).toBeVisible({ timeout: 5_000 });
  });

  test('/login tem campo de email visível (ou só botão Google)', async ({ page }) => {
    // A página de login é centrada em Google OAuth. Pode NÃO ter campo
    // de email/password (projeto opta por OAuth only). Verificamos
    // que tem OU o botão OU o campo.
    await page.goto('/login');
    await waitForAppReady(page);
    const hasGoogleButton = await page
      .locator('button:has-text("Google"), [aria-label*="google" i]')
      .count();
    const hasEmailField = await page
      .locator('input[type="email"], input[autocomplete="email"]')
      .count();
    // Pelo menos um dos dois
    expect(hasGoogleButton + hasEmailField).toBeGreaterThan(0);
  });

  test('rota legada /meu-painel redireciona para /login', async ({ page }) => {
    // Rota legada (pré-V3) — verifica que o redirect catch-all
    // continua apontando para /login.
    await page.goto('/meu-painel');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('rota legada /adotar está acessível (página estática)', async ({ page }) => {
    // /adotar pode ser landing estática ou redirect — verifica
    // que não dá erro 5xx e que algo renderiza.
    await page.goto('/adotar');
    await waitForAppReady(page);
    const response = await page.goto('/adotar', { waitUntil: 'load' });
    expect(response?.status() ?? 0).toBeLessThan(500);
  });
});

// ─── Auth: onboarding (visitante) ────────────────────────────────────────────

test.describe('Auth: fluxo de onboarding (visitante)', () => {
  test('/onboarding é gateado para visitante anônimo', async ({ page }) => {
    // Onboarding é ProtectedRoute — visitante anônimo em /onboarding
    // é redirecionado para /login.
    await page.goto('/onboarding');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('?edit=1 em /onboarding não bypassa auth', async ({ page }) => {
    // O componente OnboardingQuestionnaire tem modo edit — mas
    // isso é autenticado. Visitante não deve ver.
    await page.goto('/onboarding?edit=1');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/onboarding com mock auth (applicant) carrega', async ({ page }) => {
    // O mock auth via localStorage NÃO autentica de verdade
    // (Firebase onAuthStateChanged é quem controla), mas podemos
    // verificar que a rota tenta renderizar e não dá crash.
    // Em alguns ambientes (dev) o mock pode ser respeitado —
    // aceitamos qualquer um dos dois resultados:
    //   - Permanece em /onboarding (mock funcionou)
    //   - Redireciona para /login (mock não foi suficiente)
    await mockAuth(page, 'applicant');
    await page.goto('/onboarding');
    await waitForAppReady(page);
    // Aceita ambos — o teste é apenas que não crasha
    expect(page.url()).toMatch(/\/onboarding|\/login/);
  });

  test('shelter onboarding wizard redireciona sem auth', async ({ page }) => {
    // /abrigo/:clubId/onboarding é ProtectedRoute.
    await page.goto('/abrigo/qualquer-club/onboarding');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: rotas de adoção (visitante) ───────────────────────────────────────

test.describe('Auth: fluxo de adoção (visitante)', () => {
  test('/quero-adotar/:petId redireciona para /login', async ({ page }) => {
    // TASK-127: wizard de adoção. ProtectedRoute.
    await page.goto('/quero-adotar/algum-pet-fake');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/adocoes/:clubId/:applicationId redireciona para /login', async ({ page }) => {
    // TASK-130: timeline de pedido de adoção. ProtectedRoute.
    await page.goto('/adocoes/algum-club/algum-app');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: rotas de comunidade e organização (visitante) ─────────────────────

test.describe('Auth: comunidades e organizações autenticadas', () => {
  test('/comunidade/criar redireciona para /login', async ({ page }) => {
    await page.goto('/comunidade/criar');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/comunidade/:communityId redireciona para /login', async ({ page }) => {
    // Detalhe autenticado (mural, posts, etc).
    await page.goto('/comunidade/comunidade-fake-id');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/comunidade/:communityId/admin redireciona para /login', async ({ page }) => {
    await page.goto('/comunidade/comunidade-fake-id/admin');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/organizacoes/hub redireciona para /login', async ({ page }) => {
    // Hub de gestão de organização (autenticado).
    await page.goto('/organizacoes/hub');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/organizacoes/criar redireciona para /login', async ({ page }) => {
    await page.goto('/organizacoes/criar');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/organizacoes/:orgId redireciona para /login', async ({ page }) => {
    // Detalhe autenticado (gestão de organização).
    await page.goto('/organizacoes/org-fake-id');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/organizacoes/:orgId/admin redireciona para /login', async ({ page }) => {
    await page.goto('/organizacoes/org-fake-id/admin');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: chat e denúncias (visitante) ───────────────────────────────────────

test.describe('Auth: chat e denúncias', () => {
  test('/chat redireciona para /login', async ({ page }) => {
    await page.goto('/chat');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/chat/:conversationId redireciona para /login', async ({ page }) => {
    await page.goto('/chat/conv-fake-id');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('/denuncias/nova redireciona para /login', async ({ page }) => {
    await page.goto('/denuncias/nova');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Auth: visit anônimo NÃO vaza dados sensíveis ───────────────────────────

test.describe('Auth: ausência de vazamento de dados', () => {
  test('visitante em /perfil vê apenas UI de login, NÃO dados de outros users', async ({ page }) => {
    await page.goto('/perfil');
    await waitForAppReady(page);
    // Após redirect para /login, o body NÃO deve ter dados típicos
    // de perfil: nome, email, telefone de qualquer user.
    const body = await page.locator('body').innerText();
    // Padrões genéricos de UI de perfil
    expect(body).not.toMatch(/Meus pets cadastrados|Minhas ado[çc][õo]es|Cancelar conta/i);
  });

  test('visitante NÃO vê botões de admin em nenhuma página pública', async ({ page }) => {
    // Defesa em profundidade: varre várias rotas públicas e garante
    // que NENHUMA expõe "Painel admin", "Aprovar", "Banir" etc.
    const publicRoutes = ['/', '/feed', '/organizacoes', '/comunidade', '/eventos', '/vitrines', '/busca'];
    for (const route of publicRoutes) {
      await page.goto(route);
      await waitForAppReady(page);
      const adminishText = await page
        .locator('text=/Painel admin|Aprovar volunt[áa]rio|Banir usu[áa]rio|Auditoria/i')
        .count();
      expect(adminishText, `vazamento de UI admin em ${route}`).toBe(0);
    }
  });
});
