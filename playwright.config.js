import { defineConfig, devices } from '@playwright/test';

// E2E_BASE_URL — permite apontar para o app rodando local (`vite preview`),
// staging ou produção. Default: produção em https://viralata.web.app.
//   - Local dev (build + preview):  E2E_BASE_URL=http://127.0.0.1:4174
//   - Staging:                       E2E_BASE_URL=https://staging.viralata.web.app
//   - Prod:                          (vazio) → https://viralata.web.app
const baseURL = process.env.E2E_BASE_URL || 'https://viralata.web.app';

// Detecta se está rodando contra um servidor local (precisa de webServer
// automático para subir `vite preview` antes dos testes). Em CI/Prod
// o servidor já existe — não tenta subir nada.
const isLocalServer = baseURL.startsWith('http://127.0.0.1') || baseURL.startsWith('http://localhost');

export default defineConfig({
  testDir: './tests/e2e',
  // Exclui specs não-e2e (ex.: testes de regras firestore em tests/security).
  testIgnore: ['**/security/**', '**/node_modules/**'],
  // Timeout generoso para SPAs React + Firestore (cold start do feed).
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // Fully parallel: cada teste é idempotente (não compartilha state entre
  // arquivos) e usa contextos Playwright isolados — sem necessidade de
  // serial mode. Workers configurados dinamicamente.
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  // forbidOnly: protege contra `test.only` commitado em CI.
  forbidOnly: Boolean(process.env.CI),
  // 2 retries em CI para tolerar flakes de rede/asset (Firestore cold
  // start). Local: 0 retries para feedback rápido.
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    // Headless por padrão (obrigatório em CI; local pode passar
    // E2E_HEADED=1 para debug visual).
    headless: process.env.E2E_HEADED !== '1',
    // Ambiente remoto: permite apontar para o Chromium pré-instalado
    // quando a versão pinada do @playwright/test não está baixada.
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
    // Screenshot apenas em falha — evita 99% de lixo em runs verdes.
    screenshot: 'only-on-failure',
    // Trace apenas no primeiro retry — útil para investigar flakes.
    trace: 'on-first-retry',
    // Vídeo retido em falha (vai pro test-results/).
    video: 'retain-on-failure',
    // Locale pt-BR: casa com o conteúdo do app e evita ambiguidades em
    // datas/números nos snapshots de teste.
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Timeouts individuais para ações de página (não do teste inteiro).
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  // webServer: em runs locais contra http://127.0.0.1:* sobemos um
  // `vite preview` automaticamente. Em prod/CI, nada disso é necessário.
  ...(isLocalServer
    ? {
        webServer: {
          command: 'npm run preview -- --port 4174 --strictPort',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }
    : {}),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
