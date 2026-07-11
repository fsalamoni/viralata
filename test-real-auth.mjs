// Testa a página real em browser com auth mock
import { chromium } from 'playwright';

const url = 'https://viralata.web.app/organizacoes/TM9MBn5aFXgObfRZ39m9/admin';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  page.on('pageerror', (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
    console.log('PAGE ERROR STACK:', err.stack);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  console.log('=== Navegando para:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Injeta localStorage com feature flags
  console.log('=== Injetando flags no localStorage');
  await page.evaluate(() => {
    // Tenta diferentes keys de localStorage
    const flagsObj = {
      shelter_foundation: true,
      shelter_dashboard: true,
      shelter_kanban: true,
      shelter_reports: true,
      shelter_indicators: true,
      shelter_exhibitions: true,
      shelter_volunteers: true,
      shelter_health_records: true,
      shelter_medication: true,
      shelter_pet_timeline: true,
      shelter_foster: true,
      shelter_smart_search: true,
    };
    localStorage.setItem('viralata:feature_flags', JSON.stringify(flagsObj));
    localStorage.setItem('featureFlags', JSON.stringify(flagsObj));
    console.log('Flags injetadas');
  });

  // Recarrega
  console.log('=== Recarregando com flags');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(7000);

  await page.screenshot({ path: 'test-auth.png', fullPage: true });

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== Body (primeiros 800 chars)');
  console.log(bodyText.substring(0, 800));
  console.log('');
  console.log('=== Erros:', errors.length);
  errors.forEach((e) => console.log('  -', e));
  console.log('=== Warnings:', warnings.length);
  warnings.slice(0, 10).forEach((w) => console.log('  -', w));

  await browser.close();
}

test().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
