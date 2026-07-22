import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
});
const page = await context.newPage();

const logs = [];
const errors = [];
page.on('console', (msg) => {
  logs.push(`[${msg.type()}] ${msg.text().substring(0, 300)}`);
});
page.on('pageerror', (err) => {
  errors.push(`[PAGE ERROR] ${err.message.substring(0, 500)}`);
});

console.log('=== Going to / ===');
try {
  await page.goto('https://viralata.web.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
} catch (e) {
  console.log('Error:', e.message);
}

console.log('=== Service Worker state ===');
const swState = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'no SW API';
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.map(r => ({
    scope: r.scope,
    active: r.active?.scriptURL,
    waiting: r.waiting?.scriptURL,
    installing: r.installing?.scriptURL,
  }));
});
console.log('SW Registrations:', JSON.stringify(swState, null, 2));

console.log('\n=== Page has "Nova versão disponível"? ===');
const hasBanner = await page.locator('text=Nova versão disponível').count();
console.log('Banner count:', hasBanner);

console.log('\n=== Errors ===');
errors.forEach((e) => console.log(e));

console.log('\n=== Console errors/warnings ===');
logs.filter(l => l.includes('[error]') || l.includes('[warning]')).forEach(l => console.log(l));

await browser.close();
