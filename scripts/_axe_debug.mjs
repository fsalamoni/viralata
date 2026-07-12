import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext()).newPage();
for (const route of ['/feed', '/organizacoes', '/voluntarios']) {
  await page.goto('http://127.0.0.1:4174' + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  for (const v of r.violations.filter(v => ['critical','serious'].includes(v.impact))) {
    console.log(`\n== ${route} ${v.id} (${v.impact})`);
    v.nodes.slice(0,4).forEach(n => console.log('  target:', n.target.join(' '), '\n  summary:', (n.failureSummary||'').split('\n')[1]?.trim()));
  }
}
await browser.close();
