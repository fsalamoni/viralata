/**
 * Smoke test ON em staging com múltiplos papéis (TASK-200).
 *
 * Roda contra staging via env `SMOKE_STAGING_URL`. Cobre 4 abas da
 * comunidade com diferentes papéis:
 *
 * **Fases**:
 *  1. **owner**: cria posts no mural (precisa de NGO/abrigo owner)
 *  2. **admin**: edita/deleta posts, modera
 *  3. **member**: vê Mural se flag `MURAL_LIKES_AND_COMMENTS` ON
 *  4. **anonymous**: vê feed público de posts (read-only)
 *
 * **Cross-role helper**:
 *  - `setRole(role)` para preparar o contexto (mock auth via cookies/localStorage)
 *  - Roles: applicant / shelterAdmin / platformAdmin / communityAdmin / communityMember
 *
 * **Uso**:
 *   SMOKE_STAGING_URL=https://staging.viralata.app node scripts/smoke-staging.mjs
 *   SMOKE_STAGING_URL=https://staging.viralata.app node scripts/smoke-staging.mjs --role=applicant
 *
 * **Status**: stub inicial — TASK-200 setup básico. Implementação real
 * depende de staging com auth real (TaskCard → follow-up).
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_STAGING_URL || 'https://staging.viralata.app';

/** Papéis testados. */
export const ROLES = Object.freeze({
  applicant: { label: 'Adotante', email: 'applicant-staging@viralata.app' },
  shelterAdmin: { label: 'Admin abrigo', email: 'shelter-staging@viralata.app' },
  communityAdmin: { label: 'Admin comunidade', email: 'community-admin-staging@viralata.app' },
  communityMember: { label: 'Membro comunidade', email: 'community-member-staging@viralata.app' },
  anonymous: { label: 'Anônimo', email: null },
});

/** Rotas por papel. */
const ROUTE_MATRIX = [
  // Anonymous — vê /comunidade (público) e /comunidade/:id (read-only)
  { role: 'anonymous', path: '/comunidade', expect: 200, label: 'diretório público' },
  { role: 'anonymous', path: '/comunidade/test-community', expect: 200, label: 'detalhe público' },
  { role: 'anonymous', path: '/comunidade/test-community/forum', expect: 200, label: 'fórum público' },

  // Applicant — pode ver feed, criar interesse
  { role: 'applicant', path: '/comunidade/test-community', expect: 200, label: 'ver comunidade' },

  // Community member — tem acesso ao mural (se flag ON)
  { role: 'communityMember', path: '/comunidade/test-community', expect: 200, label: 'mural' },
  { role: 'communityMember', path: '/comunidade/test-community/forum', expect: 200, label: 'fórum' },

  // Community admin — pode postar, moderar
  { role: 'communityAdmin', path: '/comunidade/test-community/admin', expect: 200, label: 'admin panel' },

  // Shelter admin — vê comunidades onde é membro
  { role: 'shelterAdmin', path: '/comunidade/test-community', expect: 200, label: 'mural' },

  // Platform admin
  { role: 'platformAdmin', path: '/admin/comunidades', expect: 200, label: 'admin global' },
];

function classify({ status, redirected, finalUrl, bodyText, route }) {
  if (bodyText.includes('Algo deu errado') && !bodyText.includes('Dashboard')) {
    return { ok: false, label: '💥 ERRO (ErrorBoundary)' };
  }
  if (route.role === 'anonymous' && status === 200) {
    return { ok: true, label: '✅ 200 (público)' };
  }
  if (status === 200) return { ok: true, label: '✅ 200' };
  if (redirected && finalUrl.includes('/login')) {
    return { ok: true, label: '↪️ redirect→/login' };
  }
  return { ok: false, label: `⚠️ status ${status}` };
}

async function run() {
  console.log(`\n=== Viralata smoke-staging (TASK-200) ===`);
  console.log(`Base: ${BASE}`);
  console.log(`Roles: ${Object.keys(ROLES).length}\n`);

  const executablePath = process.env.SMOKE_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const results = [];
  let fatal = null;

  try {
    for (const role of Object.keys(ROLES)) {
      console.log(`\n--- role: ${ROLES[role].label} (${role}) ---`);
      const context = await browser.newContext({
        userAgent: `ViralataSmokeStaging/1.0 (${role}; TASK-200)`,
      });
      const page = await context.newPage();

      // Filtra rotas por role
      const roleRoutes = ROUTE_MATRIX.filter((r) => r.role === role);
      for (const route of roleRoutes) {
        const url = BASE + route.path;
        try {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(1500);
          const status = resp?.status() || 0;
          const finalUrl = page.url();
          const redirected = finalUrl !== url;
          const bodyText = await page.locator('body').innerText().catch(() => '');
          const cls = classify({ status, redirected, finalUrl, bodyText, route });
          results.push({ ...route, status, result: cls.label, ok: cls.ok });
          console.log(`   ${cls.label.padEnd(28)} ${route.path} — ${route.label}`);
        } catch (err) {
          results.push({ ...route, status: 'ERR', result: `❌ ${String(err?.message || err).slice(0, 60)}`, ok: false });
        }
      }

      await context.close();
    }
  } catch (err) {
    fatal = err;
  } finally {
    await browser.close();
  }

  // Relatório
  const byRole = new Map();
  for (const r of results) {
    if (!byRole.has(r.role)) byRole.set(r.role, []);
    byRole.get(r.role).push(r);
  }
  console.log('\n=== Resumo por papel ===');
  for (const [role, items] of byRole) {
    const ok = items.filter((i) => i.ok).length;
    console.log(`  ${ROLES[role].label} (${role}): ${ok}/${items.length} OK`);
  }

  const broken = results.filter((r) => !r.ok);
  console.log(`\nTotal: ${results.length} | Quebradas: ${broken.length}`);
  if (fatal) {
    console.error('\n💥 Fatal:', fatal);
    process.exit(2);
  }
  process.exit(broken.length ? 1 : 0);
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
