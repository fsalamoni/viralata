/** Smoke test Comunidade (TASK-359). */
import { chromium } from 'playwright';
const BASE = process.env.SMOKE_BASE_URL || 'https://viralata.web.app';
const ROUTES = [
  { path: '/comunidades' },
  { path: '/comunidades/amigos-do-rj' },
  { path: '/comunidades/amigos-do-rj/mural' },
  { path: '/comunidades/amigos-do-rj/forum' },
  { path: '/comunidades/amigos-do-rj/eventos' },
  { path: '/comunidades/amigos-do-rj/admin', expect: [302, 307, 200] },
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newContext().then(c => c.newPage());
let fail = 0;
for (const r of ROUTES) {
  const res = await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => ({ status: () => 0 }));
  const s = res?.status?.() ?? 0;
  const ok = r.expect ? r.expect.includes(s) : s === 200;
  console.log(`  ${ok ? '✓' : '✗'} ${r.path} → ${s}`);
  if (!ok) fail++;
}
await browser.close();
process.exit(fail > 0 ? 1 : 0);
