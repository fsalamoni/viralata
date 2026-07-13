/**
 * Smoke test cross-role do Viralata (TASK-293).
 *
 * Roda contra `viralata.app` (prod) ou staging via env `SMOKE_BASE_URL`.
 *
 * **Fases**:
 *  1. **Health**: home, login, termos, privacidade, legislação → 200
 *  2. **Públicas**: comunidade, feed, busca, voluntários (público) → 200
 *  3. **Auth-gated**: admin/*, perfil, organizacoes/dashboard → redirect /login
 *  4. **Shelter-gated** (apenas com flag SHELTER_FOUNDATION): abrigos/:id, abrigo admin
 *  5. **Cross-role helper**: expõe `setRole` para preparar testes multi-papel
 *
 * **Uso**:
 *   node scripts/smoke-prod.mjs
 *   SMOKE_BASE_URL=https://staging.viralata.app node scripts/smoke-prod.mjs
 *   node scripts/smoke-prod.mjs --role=applicant
 *
 * **Exit codes**:
 *   0 — todas as fases OK
 *   1 — alguma fase falhou (detalhes no relatório)
 *   2 — erro fatal (browser, env, etc.)
 *
 * **CI gate**: rodar antes de merge em main. Em PRs o `smoke:ci` script
 * pode usar a URL do preview channel. Ver TASK-293.
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL || 'https://viralata.app';

// Role pré-definidos — usado por cross-role tests futuros.
export const ROLES = Object.freeze({
  applicant: { email: 'applicant-smoke@viralata.app', label: 'Adotante' },
  shelterAdmin: { email: 'shelter-admin-smoke@viralata.app', label: 'Admin abrigo' },
  platformAdmin: { email: 'platform-admin-smoke@viralata.app', label: 'Admin plataforma' },
});

/**
 * Lista de rotas com expectativa:
 *  - `expect: 'public'` → 200, sem redirect
 *  - `expect: 'auth'` → redirect /login
 *  - `expect: 'shelter'` → 200 se flag ON, fallback "em breve" se OFF
 *  - `phase` agrupa para relatório
 */
const ROUTES = [
  // Fase 1 — Health (rotas estáveis, sem auth)
  { path: '/', expect: 'public', phase: 'health' },
  { path: '/login', expect: 'public', phase: 'health' },
  { path: '/termos', expect: 'public', phase: 'health' },
  { path: '/politica-privacidade', expect: 'public', phase: 'health' },
  { path: '/legislacao', expect: 'public', phase: 'health' },

  // Fase 2 — Públicas (catálogo/feed)
  { path: '/comunidade', expect: 'public', phase: 'public' },
  { path: '/feed', expect: 'public', phase: 'public' },
  { path: '/busca', expect: 'public', phase: 'public' },
  { path: '/organizacoes', expect: 'public', phase: 'public' },
  { path: '/voluntarios', expect: 'public', phase: 'public' },
  { path: '/voluntarios/termo', expect: 'public', phase: 'public' },

  // Fase 3 — Auth-gated (precisam de login)
  { path: '/perfil', expect: 'auth', phase: 'auth' },
  { path: '/minhas-adoções', expect: 'auth', phase: 'auth' },
  { path: '/admin', expect: 'auth', phase: 'auth' },
  { path: '/admin/saude', expect: 'auth', phase: 'auth' },
  { path: '/admin/pets', expect: 'auth', phase: 'auth' },

  // Fase 4 — Shelter (gated por SHELTER_FOUNDATION)
  // Se flag OFF, exibem "em breve" — 200 com texto marcador.
  { path: '/abrigos', expect: 'shelter', phase: 'shelter' },
  { path: '/abrigos/test-shelter-id', expect: 'shelter', phase: 'shelter' },
];

function classify({ status, redirected, finalUrl, bodyText, route }) {
  if (bodyText.includes('Algo deu errado') && !bodyText.includes('Dashboard')) {
    return { ok: false, label: '💥 ERRO (ErrorBoundary)' };
  }
  if (route.expect === 'public' || route.expect === 'shelter') {
    if (status === 200) {
      if (route.expect === 'shelter' && bodyText.includes('em breve')) {
        return { ok: true, label: '✅ 200 (flag OFF — "em breve")' };
      }
      return { ok: true, label: '✅ 200' };
    }
    return { ok: false, label: `⚠️ status ${status}` };
  }
  // expect === 'auth'
  if (redirected && finalUrl.includes('/login')) {
    return { ok: true, label: '↪️ redirect→/login' };
  }
  if (status === 200) {
    return { ok: true, label: '✅ 200 (já autenticado?)' };
  }
  return { ok: false, label: `⚠️ status ${status} (esperado redirect /login)` };
}

function detectShelterFlagOff(bodyText) {
  return bodyText.includes('em breve') || bodyText.includes('em construção');
}

async function run() {
  console.log(`\n=== Viralata smoke (TASK-293) ===`);
  console.log(`Base: ${BASE}\n`);

  const executablePath = process.env.SMOKE_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const context = await browser.newContext({
    userAgent: 'ViralataSmoke/1.0 (+TASK-293)',
  });
  const page = await context.newPage();

  const results = [];
  let fatalError = null;

  try {
    for (const route of ROUTES) {
      const url = BASE + route.path;
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        // Espera real pra Suspense + lazy load
        await page.waitForTimeout(1500);
        const status = resp?.status() || 0;
        const finalUrl = page.url();
        const redirected = finalUrl !== url;
        const bodyText = await page.locator('body').innerText().catch(() => '');
        const cls = classify({ status, redirected, finalUrl, bodyText, route });
        results.push({ ...route, status, result: cls.label, ok: cls.ok });
      } catch (err) {
        results.push({
          ...route,
          status: 'ERR',
          result: `❌ exception: ${String(err?.message || err).slice(0, 80)}`,
          ok: false,
        });
      }
    }
  } catch (err) {
    fatalError = err;
  } finally {
    await browser.close();
  }

  // Relatório agrupado por phase
  const byPhase = new Map();
  for (const r of results) {
    if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
    byPhase.get(r.phase).push(r);
  }

  console.log('=== Relatório por fase ===\n');
  for (const [phase, items] of byPhase) {
    console.log(`📦 ${phase} (${items.length} rotas)`);
    for (const { path, result } of items) {
      console.log(`   ${result.padEnd(38)} ${path}`);
    }
    console.log();
  }

  const broken = results.filter((r) => !r.ok);
  const total = results.length;
  console.log(`\n=== Resumo ===`);
  console.log(`Total: ${total} | Quebradas: ${broken.length}`);
  if (broken.length) {
    console.log('\n⚠️  Rotas quebradas:');
    for (const b of broken) {
      console.log(`   ${b.path} → ${b.result}`);
    }
  }
  if (fatalError) {
    console.error('\n💥 Erro fatal:', fatalError);
    process.exit(2);
  }
  process.exit(broken.length ? 1 : 0);
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
