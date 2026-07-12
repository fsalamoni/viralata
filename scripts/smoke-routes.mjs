/**
 * Smoke test do pente fino — versão corrigida.
 * Espera render real, não networkidle (que confunde com suspense).
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4174';

const ROUTES = [
  '/',
  '/login',
  '/politica-privacidade',
  '/termos',
  '/legislacao',
  '/feed',
  '/busca',
  '/voluntarios',
  '/voluntarios/termo',
  '/voluntarios/seja',
  '/organizacoes',
  '/comunidade',
  '/public-debug',
  '/page-not-found',
  '/admin',
  '/admin/saude',
  '/admin/security-alerts',
  '/admin/alertas',
  '/admin/admins',
  '/admin/pets',
  '/admin/denuncias',
  '/admin/usuarios',
  '/admin/organizacoes',
  '/admin/comunidades',
  '/admin/metricas',
  '/admin/auditoria',
  '/admin/notificacoes',
  '/admin/configuracoes',
  '/admin/flags',
];

function classify({ status, redirected, url, bodyText, route }) {
  if (bodyText.includes('Algo deu errado') && !bodyText.includes('Dashboard')) {
    return '💥 ERRO (ErrorBoundary)';
  }
  if (redirected && url.endsWith('/login')) {
    return '↪️ redirect→/login (correto, sem auth)';
  }
  if (status === 200) return '✅ 200';
  return `⚠️ status ${status}`;
}

(async () => {
  // Ambiente remoto: chromium pré-instalado em /opt/pw-browsers/chromium
  // (pode divergir da versão pinada do @playwright/test). Override via env.
  const executablePath = process.env.SMOKE_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  for (const route of ROUTES) {
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Espera real pra Suspense + lazy load
      await page.waitForTimeout(2500);
      const status = resp?.status() || 0;
      const finalUrl = page.url();
      const redirected = finalUrl !== BASE + route;
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const result = classify({ status, redirected, url: finalUrl, bodyText, route });
      results.push({ route, status, result });
    } catch (err) {
      results.push({ route, status: 'ERR', result: `❌ exception: ${String(err?.message || err).slice(0, 80)}` });
    }
  }

  console.log('\n=== Resumo do smoke test ===\n');
  for (const { route, result } of results) {
    console.log(`${result.padEnd(38)} ${route}`);
  }
  const broken = results.filter((r) => r.result.startsWith('🔴') || r.result.startsWith('💥') || r.result.startsWith('❌'));
  console.log(`\nTotal: ${results.length} | Quebradas: ${broken.length}`);

  await browser.close();
  process.exit(broken.length ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
