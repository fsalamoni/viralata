// Testa a página real em browser
import { chromium } from 'playwright';

const url = process.argv[2] || 'https://viralata.web.app/organizacoes/TM9MBn5aFXgObfRZ39m9/admin';
const email = process.env.TEST_EMAIL || 'fsalamoni@gmail.com';

async function test() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });

  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForTimeout(5000); // espera 5s para React montar

  // Tira print
  await page.screenshot({ path: 'test-page.png', fullPage: true });
  console.log('Screenshot saved to test-page.png');

  // Verifica se há erro
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('---');
  console.log('Body text (first 500):', bodyText.substring(0, 500));
  console.log('---');
  console.log('Errors:');
  errors.forEach((e) => console.log('  -', e));

  await browser.close();

  if (errors.length > 0) {
    process.exit(1);
  }
}

test().catch((err) => {
  console.error('Fatal:', err);
  process.exit(2);
});
