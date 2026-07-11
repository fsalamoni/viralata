// Testa a página real em browser com auth mock via script
// Injeta um token de Firebase Auth mock para ver o painel admin
import { chromium } from 'playwright';

const url = 'https://viralata.web.app/organizacoes/TM9MBn5aFXgObfRZ39m9/admin';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    errors.push({ msg: err.message, stack: err.stack });
    console.log('\n=== PAGE ERROR ===');
    console.log(err.message);
    console.log(err.stack);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('console.error:', msg.text());
    }
  });

  console.log('=== Navegando para:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Injeta auth mock no localStorage
  console.log('=== Injetando auth mock + flags');
  await page.evaluate(() => {
    // Tenta descobrir o schema do localStorage
    const keys = Object.keys(localStorage);
    console.log('LocalStorage keys:', keys);
    keys.forEach((k) => console.log(`  ${k}: ${localStorage.getItem(k).substring(0, 200)}`));
  });

  await page.screenshot({ path: 'test-debug.png', fullPage: true });
  console.log('=== Body:');
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log(bodyText.substring(0, 1000));
  console.log('=== Erros:', errors.length);

  await browser.close();
}

test().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
