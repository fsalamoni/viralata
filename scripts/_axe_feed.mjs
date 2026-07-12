import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext()).newPage();
await page.goto('http://127.0.0.1:4174/feed', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const r = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();
for (const v of r.violations.filter(v=>v.impact==='serious'||v.impact==='critical'))
  v.nodes.forEach(n=>console.log(v.id,'|',n.target.join(' '),'|',(n.failureSummary||'').split('\n')[1]?.trim()));
await browser.close();
