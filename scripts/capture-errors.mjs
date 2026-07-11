/**
 * Testa rotas SEM ?debug=1 (modo usuário real) — captura erros
 * com tempo de espera maior e olha o DOM real (não só h1).
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4174';

const ROUTES = [
  '/politica-privacidade',
  '/legislacao',
  '/organizacoes',
  '/public-debug',
  '/page-not-found',
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const route of ROUTES) {
    console.log(`\n========== ${route} ==========`);
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(`[${err?.name || 'Error'}] ${err?.message || err}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        pageErrors.push(`[console.error] ${msg.text()}`);
      }
    });
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
      // Espera renderizar
      await page.waitForTimeout(2000);
      const body = await page.locator('body').innerText();
      const hasAlgoDeuErrado = body.includes('Algo deu errado');
      const has404 = body.includes('404') && body.includes('não encontrada');
      const snippet = body.replace(/\s+/g, ' ').slice(0, 300);
      console.log(`hasAlgoDeuErrado=${hasAlgoDeuErrado} has404=${has404}`);
      console.log(`body preview: ${snippet}`);
    } catch (err) {
      console.log(`navigation error: ${err.message}`);
    }
    if (pageErrors.length) {
      console.log('ERRORS:');
      pageErrors.slice(0, 5).forEach((m) => console.log('  ' + m.slice(0, 1000)));
    } else {
      console.log('(no page errors)');
    }
  }
  await browser.close();
})();
