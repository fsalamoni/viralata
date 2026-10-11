#!/usr/bin/env node
// Seed: PROJETO CONTINUIDADE 2026-Q4 — docs/AI_GUIDE/29-PROJETO-CONTINUIDADE-2026-Q4.md
// Idempotente: re-rodar remove/recria as tasks com a tag 'projeto-2026-q4'.
//
// O que faz:
//   1. Higiene do board: remove IDs duplicados (TASK-V3-HOME-F1..F8 x2),
//      dropa os 16 placeholders "a definir no step-2", normaliza o status
//      não-canônico `pending` -> `ready`.
//   2. Reenquadra TASK-931..945 (gaps do ROADMAP_SHELTER_ADMIN_V2) como
//      `ready` dentro do épico E2 (flags já ON desde o cutover PR #253).
//   3. Adiciona TASK-946..TASK-978 (8 épicos E1..E8).
//   4. Atualiza roadmap, currentSprint, sprintHistory e metrics.

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const today = new Date().toISOString().split('T')[0];
const TAG = 'projeto-2026-q4';
const DOC = 'docs/AI_GUIDE/29-PROJETO-CONTINUIDADE-2026-Q4.md';

/* ── 1. Higiene ─────────────────────────────────────────────────── */

// 1a. dedupe por id (mantém a primeira ocorrência)
const seen = new Set();
data.tasks = data.tasks.filter((t) => {
  if (seen.has(t.id)) return false;
  seen.add(t.id);
  return true;
});

// 1b. placeholders nunca definidos -> dropped
for (const t of data.tasks) {
  if (/^TASK-V3-(HOME|ADMIN)-F\d$/.test(t.id) && t.status === 'backlog') {
    t.status = 'dropped';
    t.owner = t.owner || 'unassigned';
    t.category = t.category || 'design';
    t.notes = `Dropped em ${today}: placeholder "a definir no step-2" nunca foi definido. Superseded pelo ${DOC}.`;
    t.updatedAt = today;
  }
}

// 1c. status não-canônico `pending` -> `ready` (tasks reais de teste/perf/validação)
for (const t of data.tasks) {
  if (t.status === 'pending') {
    t.status = 'ready';
    t.tags = Array.from(new Set([...(t.tags || []), TAG, 'E7']));
    t.createdAt = t.createdAt || '2026-07-20';
    t.updatedAt = today;
    t.evidence = t.evidence || DOC;
    if (t.id === 'TASK-V3-HOME-8') t.tags = Array.from(new Set([...(t.tags || []), 'E8']));
  }
}

/* ── 2. Reenquadrar TASK-931..945 ───────────────────────────────── */

const rolloutNote = 'NOTA 2026-10-11: a flag já está ON por default desde o cutover (PR #253, 2026-08-30). '
  + 'O que resta desta task é a VALIDAÇÃO pós-ativação: smoke (scripts/smoke-routes.mjs) na rota/aba da fase, '
  + 'checagem manual do critério abaixo em produção e 24h de observação (Sentry/Functions/billing). '
  + 'Registrar evidência (link do run + print) antes de marcar done.';

for (const t of data.tasks) {
  const n = parseInt((t.id.match(/^TASK-(\d+)$/) || [])[1] || '0', 10);
  if (n >= 931 && n <= 945 && t.status === 'backlog') {
    t.status = 'ready';
    t.owner = t.owner || 'unassigned';
    t.tags = Array.from(new Set([...(t.tags || []), TAG, 'E2']));
    t.updatedAt = today;
    if (n <= 938) {
      t.blockedBy = [];
      t.title = t.title.replace('smoke flag OFF → ativar → 24h', 'validação pós-cutover (smoke + 24h)');
      t.description = `${rolloutNote}\n\nCritério original: ${t.description}`;
    }
    if (n === 943) {
      t.title = 'GAP Fase 7: PIX manual no checkout da loja (chave + QR estático + comprovante) via registry de provedores';
      t.description = 'Decisão P5 (2026-07-15): PIX MANUAL, sem CNPJ e sem gateway. Implementar o provedor "pix_manual" no registry '
        + '(registerPaymentProvider em storeCart.js): instruções de pagamento com chave PIX do abrigo + QR estático (payload BR Code) '
        + '+ upload de comprovante no pedido + marcação manual "pago" pelo admin no fulfillment. Sem integração externa.';
    }
  }
}

/* ── 3. Novas tasks TASK-946..TASK-978 ──────────────────────────── */

const base = (o) => ({
  type: 'feature',
  category: 'core',
  status: 'ready',
  priority: 'medium',
  owner: 'unassigned',
  branch: null,
  flag: null,
  worktree: null,
  pr: null,
  blockedBy: [],
  relatedTasks: [],
  evidence: DOC,
  createdAt: today,
  updatedAt: today,
  ...o,
  tags: Array.from(new Set([TAG, ...(o.tags || [])])),
});

const NEW = [
  // ── E1 · Verdade do board e da documentação ──
  base({ id: 'TASK-946', type: 'chore', category: 'docs', priority: 'high', tags: ['E1', 'scrum'],
    title: 'E1: Higiene do board — dropar placeholders V3, dedupe IDs, normalizar status pending',
    description: 'Executado por .harness/_add-projeto-2026-q4-tasks.cjs: 8 IDs duplicados removidos, 16 placeholders "a definir no step-2" dropados, 6 tasks `pending` -> `ready`. Critério: `node .harness/sync.cjs --check` exit 0, 0 IDs duplicados, 0 status fora de `columns`.' }),
  base({ id: 'TASK-947', type: 'docs', category: 'docs', priority: 'high', tags: ['E1', 'docs'],
    title: 'E1: Regenerar docs/FEATURE_FLAGS.md com os defaults reais pós-cutover',
    description: 'docs/FEATURE_FLAGS.md (2026-07-14) diz que todas as SHELTER_* estão OFF; desde o PR #253 (2026-08-30) 19 páginas V3 + 44 flags de abrigo estão ON por default. Regenerar a tabela a partir de src/core/featureFlags.js (DEFAULT_FEATURE_FLAGS + META) e fazer scripts/audit-feature-flags.cjs validar default + descrição. Critério: tabela sem "TBD", default de cada flag igual ao código, audit script verde.' }),
  base({ id: 'TASK-948', type: 'chore', category: 'audit', priority: 'high', tags: ['E1', 'anti-fachada'],
    title: 'E1: Auditoria anti-fachada das tasks de decisão P1..P20 marcadas done sem código',
    description: 'Amostra encontrada em 2026-10-11: TASK-380 (/admin/cargos) done sem rota nem página; TASK-239 (Sentry) done sem @sentry/react no package.json; TASK-020..024 done apontando só para seções do ROADMAP. Verificar cada task derivada das decisões P1..P20 e D-01/04/07 com grep no código; para cada uma sem implementação real, reabrir como task nova (ou anotar `notes` com o que realmente existe). Critério: lista em docs com (task, evidência real, veredito).' }),

  // ── E2 · Fechar gaps do rollout V2 do painel do abrigo ──
  base({ id: 'TASK-949', category: 'shelter', priority: 'high', flag: 'SHELTER_FOSTER_V2', tags: ['E2', 'cloud-functions', 'firestore-rules'],
    title: 'E2: Writer + regra pública do espelho foster_placements_public (adiado no PR #253)',
    description: 'Mesma situação de exhibitions_public (TASK-939/940): fosterPublicService lê foster_placements_public mas nenhuma Function escreve e firestore.rules não tem regra. Implementar Cloud Function onWrite em clubs/{clubId}/foster_placements que espelha só campos públicos (sem PII do lar), regra `allow read: if true; allow write: if false`, backfill one-shot e índice composto se a query exigir. Critério: /lares-temporarios lista placements reais; teste de rules em tests/security.',
    relatedTasks: ['TASK-939', 'TASK-940'] }),
  base({ id: 'TASK-950', type: 'infra', category: 'ci', priority: 'high', tags: ['E2', 'smoke', 'evidencia'],
    title: 'E2: Smoke de produção pós-cutover (35 rotas) + evidência para TASK-931..938',
    description: 'Rodar `npm run smoke:routes` contra https://viralata.web.app (flags ON por default) e `npm run smoke:prod`; anexar saída ao campo evidence das tasks TASK-931..938. Critério: 35/35 rotas OK (200 ou redirect→/login nas protegidas), zero erro de console nas rotas públicas (scripts/capture-errors.mjs).',
    relatedTasks: ['TASK-931', 'TASK-932', 'TASK-933', 'TASK-934', 'TASK-935', 'TASK-936', 'TASK-937', 'TASK-938'] }),

  // ── E3 · Observabilidade e operação ──
  base({ id: 'TASK-951', type: 'infra', category: 'infra', priority: 'critical', tags: ['E3', 'sentry', 'observabilidade'],
    title: 'E3: Instalar @sentry/react e ligar errorTracker + auditService (TASK-239 ficou sem SDK)',
    description: 'src/core/services/errorTracker.js já faz dynamic import de @sentry/react, mas o pacote não está em package.json e VITE_SENTRY_DSN não existe em .env.example; auditService.js:315 ainda tem TODO "Wire Sentry.captureException". Fazer: npm i @sentry/react, VITE_SENTRY_DSN no .env.example + secret no GitHub Actions, initErrorTracker no main.jsx com release = bundle hash (scripts/bundle-hash.mjs), captureException no auditService. Critério: erro de teste aparece no Sentry com release e user id anonimizado; sem PII em breadcrumbs (LGPD).' }),
  base({ id: 'TASK-952', type: 'infra', category: 'infra', priority: 'high', tags: ['E3', 'healthz', 'uptime'],
    title: 'E3: Expor /healthz (Cloud Function HTTP) e configurar uptime check externo',
    description: 'functions/healthCheck.js + healthCheckCore.js existem mas index.js não exporta endpoint HTTP "healthz" e firebase.json não roteia. Exportar onRequest `healthz` (status Firestore/Auth/Storage, versão do bundle), rota /healthz no hosting rewrite, e um uptime check (Cloud Monitoring ou cron externo) com alerta por email. Critério: curl https://viralata.web.app/healthz retorna 200 JSON; alerta dispara em falha simulada.' }),
  base({ id: 'TASK-953', type: 'infra', category: 'infra', priority: 'high', tags: ['E3', 'alertas', 'billing'],
    title: 'E3: Alertas de erro/billing em produção chegando por email real',
    description: 'functions/adminAlerts.js + platformHealthCron.js existem, mas o emailProviderAdapter usa StubProvider por default (só console.log). Depende de TASK-960 (provedor de email configurado). Configurar thresholds (error rate, leituras Firestore/dia, custo), destinatário = email do DPO/owner, e testar um disparo real. Critério: email recebido com o alerta de teste; log em admin_alerts.',
    blockedBy: ['TASK-960'] }),
  base({ id: 'TASK-954', type: 'docs', category: 'docs', priority: 'medium', tags: ['E3', 'runbook'],
    title: 'E3: Runbook de incidente e rollback por flag (docs/AI_GUIDE/30-RUNBOOK-INCIDENTES.md)',
    description: 'Consolidar em um runbook: como ler Sentry/Functions logs, como desligar uma flag em /admin/flags (rollback sem deploy), como reverter um deploy no Firebase Hosting, como acionar o protocolo de breach ANPD 48h (TASK-187), quem é o DPO. Critério: doc revisado pelo owner e linkado no 00-START-HERE §1.4.' }),

  // ── E4 · Rollout V4 Personas (D-PERSONA-FLAG-GRADUAL) ──
  base({ id: 'TASK-955', type: 'feature', category: 'test', priority: 'high', flag: 'V4_PERSONA_ENABLED', tags: ['E4', 'e2e', 'personas'],
    title: 'E4 (etapa 1/5): E2E Playwright das 6 personas em preview/staging',
    description: 'D-PERSONA-FLAG-GRADUAL etapa 1. Cobrir: /acesso (seleção forçada no 1º acesso), switcher (só com 2+ personas), /entrar/abrigo, /entrar/comunidade, /onboarding/adotante, /onboarding/doador, /voluntarios/pool, gate de persona em rotas. Rodar contra o canal de preview com V4_PERSONA_ENABLED ON via settings de teste. Critério: specs verdes no preview; adicionadas a tests/e2e/personas.spec.mjs.' }),
  base({ id: 'TASK-956', type: 'infra', category: 'infra', priority: 'high', flag: 'V4_PERSONA_ENABLED', tags: ['E4', 'migration', 'personas'],
    title: 'E4 (etapa 2/5): Script de migração de dados em produção (dry-run + apply)',
    description: 'D-PERSONA-MIGRATION-AUTO: users com pets pessoais -> persona donor; membros de clube -> shelter_staff:clubId; roster -> volunteer:clubId; personas_enabled backfill (máx 16, regex das rules). Script em scripts/migrate-personas-v4.mjs com --dry-run (relatório) e --apply (batches de 400, idempotente). Critério: dry-run em produção sem erro; apply validado em 3 contas de teste antes do owner.',
    blockedBy: ['TASK-955'] }),
  base({ id: 'TASK-957', type: 'feature', category: 'core', priority: 'high', flag: 'V4_PERSONA_ENABLED', tags: ['E4', 'rollout', 'personas'],
    title: 'E4 (etapa 3/5): Ativar V4 para o owner e validar manualmente as 6 personas',
    description: 'Ligar V4_PERSONA_ENABLED + 11 sub-flags só para a conta do owner (override por user ou flag + allowlist). Percorrer o checklist de docs/REVISAO_PAGINAS.md por persona. Critério: nenhum item 🔄/⬜ pendente no REVISAO_PAGINAS; bugs abertos como tasks.',
    blockedBy: ['TASK-956'] }),
  base({ id: 'TASK-958', type: 'feature', category: 'design', priority: 'medium', tags: ['E4', 'ux', 'personas'],
    title: 'E4: Concluir docs/REVISAO_PAGINAS.md — páginas ainda 🔄 (ClubDetail público, ClubsDirectory, CommunityAdminPanel, ...)',
    description: 'Fechar a revisão página a página por persona iniciada em 2026-08-06. Para cada página 🔄: aplicar os ajustes listados em Observações, validar topbar/bottom tab bar por persona (D-PERSONA-SWITCHER-VISIBILITY), zero ponto de admin em página pública (§6.2). Critério: todas as linhas ✅ com data.' }),
  base({ id: 'TASK-959', type: 'feature', category: 'core', priority: 'high', flag: 'V4_PERSONA_ENABLED', tags: ['E4', 'rollout', 'flags-migration'],
    title: 'E4 (etapas 4-5/5): Liberação gradual 10% → 50% → 100% + migrateLegacyFlags + bump FLAGS_MIGRATION_VERSION',
    description: 'Após validação do owner: liberar por coorte (hash do uid) 10%/50%/100% com 48h entre etapas e monitoramento (Sentry, suporte). Ao chegar em 100%: default true em DEFAULT_FEATURE_FLAGS, critério em FeatureFlagsContext.migration.js, bump de FLAGS_MIGRATION_VERSION, teste em migration.test.js (regra §3.2/§3.3 das CORE-DIRECTIVES). Critério: 100% dos users com persona ativa; zero regressão nas rotas legadas (smoke).',
    blockedBy: ['TASK-957'] }),

  // ── E5 · Comunicação (email + push) ──
  base({ id: 'TASK-960', type: 'decision', category: 'infra', priority: 'critical', tags: ['E5', 'email', 'decisao'],
    title: 'E5: Provedor de email real em produção — Resend (decisão P1) vs SendGrid (código atual) e configurar EMAIL_PROVIDER',
    description: 'Conflito: decisão P1/D-04 (2026-07-15) escolheu Resend; functions/emailProviderAdapter.js só tem StubProvider (default) e SendGridProvider (@sendgrid/mail). Em produção hoje NENHUM email transacional sai (stub). Owner confirma o provedor; implementar ResendProvider (ou manter SendGrid e registrar D-* revogando P1); setar EMAIL_PROVIDER + API key como secret das Functions; domínio/remetente verificado; teste real de envio. Critério: email de convite de equipe chega em caixa real; bounce webhook ativo.',
    owner: 'human' }),
  base({ id: 'TASK-961', type: 'decision', category: 'infra', priority: 'high', flag: 'SHELTER_FCM_V1', tags: ['E5', 'push', 'decisao'],
    title: 'E5: Push — decisão P2 (Web Push API, sem FCM) vs código (fcmService + SHELTER_FCM_V1 ON): confirmar e alinhar',
    description: 'Decisão P2 diz "NÃO usar FCM"; o código entrega push via FCM (src/modules/notifications/services/fcmService.js, functions/sendPushNotification.js) com a flag ON. Owner decide: (a) manter FCM e registrar D-PUSH-FCM revogando P2, ou (b) migrar para Web Push puro (VAPID). Em ambos: validar entrega real em PWA instalado (Android/desktop), permissão pedida só após gesto do usuário, opt-out no /preferencias. Critério: push de teste recebido em 2 dispositivos; decisão registrada em 13-DECISIONS.md.',
    owner: 'human' }),
  base({ id: 'TASK-962', type: 'feature', category: 'core', priority: 'high', tags: ['E5', 'notificacoes', 'e2e'],
    title: 'E5: Notificações transacionais ponta a ponta em produção (convite equipe/voluntário, status de adoção, lembrete de escala)',
    description: 'Com email (TASK-960) e push (TASK-961) reais: percorrer os fluxos onVolunteerCreatedNotifyAdmin, onAdoptionWorkflowStatusUpdated, sendShiftReminders, convites de equipe (SHELTER_TEAM_V2) com contas de teste e confirmar sino + email + push. Critério: matriz fluxo × canal preenchida com evidência; falhas viram tasks.',
    blockedBy: ['TASK-960', 'TASK-961'] }),

  // ── E6 · LGPD e legal: fechamento ──
  base({ id: 'TASK-963', type: 'feature', category: 'admin', priority: 'high', tags: ['E6', 'lgpd', 'admin', 'anti-fachada'],
    title: 'E6: Implementar /admin/cargos de verdade (P11/P12) — TASK-380 estava done sem rota nem página',
    description: 'Não existe rota /admin/cargos em src/App.jsx nem página em src/modules/admin/pages (2026-10-11). Criar AdminRoles.jsx: tabela de papéis da plataforma (platform_admin, DPO/Encarregado, admin de abrigo, membro, voluntário, lar temporário, adotante) com responsabilidades e acessos (ler de docs/PERSONA_CAPABILITIES.md), bloco "Encarregado (DPO)" com nome + email editáveis (platform_settings.dpo_contact, default fsalamoni@gmail.com), audit_log na edição, rules só platform_admin escreve. Critério: rota no AdminDashboard, smoke:routes inclui /admin/cargos, teste runtime.' }),
  base({ id: 'TASK-964', type: 'docs', category: 'legal', priority: 'high', tags: ['E6', 'juridico'],
    title: 'E6: Resolver os 8 TODO(JURÍDICO) nos textos legais (revisão humana)',
    description: 'Arquivos com TODO(JURÍDICO) em src/modules/shelter/domain/legal/texts/: shelterOnboardingTerms.v1.js, cookies.js, avisosLegais.js, politicaDePrivacidade.js, termosDeUso.js, codigoDeConduta.js, adoptionTerms.v1.js, volunteerTerms.v2.js. Revisão por humano/jurídico; após aprovação, remover os TODOs, bump de versão do texto (content_hash muda -> re-aceite onde a lei exige). Critério: grep "TODO(JURÍDICO)" vazio; versões registradas em docs/legal/README.md.',
    owner: 'human-jurídico', status: 'blocked', notes: 'Bloqueio externo: depende de revisão jurídica humana (RISK-007).' }),
  base({ id: 'TASK-965', type: 'feature', category: 'lgpd', priority: 'medium', tags: ['E6', 'lgpd', 'dpo'],
    title: 'E6: Contato do DPO lido de platform_settings em rodapé, política de privacidade e cookies (sem hardcode)',
    description: 'Hoje o email do DPO está hardcoded em textos legais (cookies.js, shelterOnboardingTerms, donationTerms) e em AdminFlags.jsx. Centralizar em platform_settings.dpo_contact (editável em /admin/cargos, TASK-963) e interpolar nos textos/rodapé. Critério: trocar o email no admin reflete em todas as superfícies sem deploy.',
    blockedBy: ['TASK-963'] }),
  base({ id: 'TASK-966', type: 'security', category: 'lgpd', priority: 'medium', tags: ['E6', 'lgpd', 'evidencia'],
    title: 'E6: Validar em produção "Baixar meus dados" (Art. 18 V) e "Excluir conta" (Art. 18 VI, soft delete 30d + purge)',
    description: 'Com uma conta de teste: exportar dados (JSON completo, sem dados de terceiros), solicitar exclusão, confirmar soft delete e anonimização; forçar accountPurgeCron em janela de teste e confirmar purge + audit_log. Critério: checklist em docs/AI_GUIDE/25-LGPD.md com evidência datada.' }),

  // ── E7 · Qualidade, performance e acessibilidade ──
  base({ id: 'TASK-967', type: 'feature', category: 'a11y', priority: 'medium', flag: 'A11Y_IMPROVEMENTS_V1', tags: ['E7', 'a11y', 'rollout'],
    title: 'E7: Ativar A11Y_IMPROVEMENTS_V1 (Kanban) + auditoria axe nas rotas públicas',
    description: 'Flag OFF com 3 readers (KanbanBoard/Column/Card). Rodar tests/e2e/a11y.spec.js e scripts/_axe_feed.mjs nas rotas públicas, corrigir violações sérias/críticas, ativar a flag, bump migração. Critério: 0 violações critical/serious no axe em /, /feed, /pets/:id, /organizacoes/:id, /login; flag ON.' }),
  base({ id: 'TASK-968', type: 'feature', category: 'perf', priority: 'medium', tags: ['E7', 'perf', 'lighthouse'],
    title: 'E7: Lighthouse ≥ 90 (performance e a11y) nas 5 rotas públicas principais + orçamento de bundle',
    description: 'Precache PWA está em ~5,5 MB (metrics.bundleSizeKB). Medir Lighthouse em /, /feed, /pets/:id, /organizacoes/:id, /busca (mobile, 4G); aplicar code-splitting por rota (lazy), remover páginas *.v1.jsx do bundle quando a V3 estiver estável (TASK-978), imagens com srcset. Critério: relatório com antes/depois commitado em docs/AUDITS; orçamento de bundle checado em CI (scripts/bundle-hash.mjs).',
    relatedTasks: ['TASK-V3-PROFILE-7', 'TASK-978'] }),
  base({ id: 'TASK-969', type: 'feature', category: 'perf', priority: 'medium', tags: ['E7', 'perf', 'feed', 'risk-004'],
    title: 'E7: RISK-004 — paginação por cursor no feed de pets (hoje limit 500 client-side)',
    description: 'usePets carrega até 500 pets e filtra no cliente. Implementar paginação por cursor (startAfter) com infinite scroll e filtros server-side onde houver índice; manter haversine client-side para raio. Critério: feed com 2.000 pets de mock (loadMockData) carrega a 1ª página < 1,5 s em 4G; índices novos em firestore.indexes.json (sem single-field collectionGroup).' }),
  base({ id: 'TASK-970', type: 'infra', category: 'ci', priority: 'high', tags: ['E7', 'ci', 'e2e'],
    title: 'E7: Rodar Playwright (smoke + public-routes + legal) no CI contra o canal de preview de cada PR',
    description: '.github/workflows/deploy.yml roda vitest + build + deploy, mas nunca executa tests/e2e. Adicionar job pós "Deploy Preview" com E2E_BASE_URL = URL do preview, specs: smoke.spec.js, public-routes.spec.js, legal.spec.js, a11y.spec.js (chromium). Critério: job obrigatório verde em PR; falha bloqueia merge.' }),
  base({ id: 'TASK-971', type: 'bug', category: 'core', priority: 'medium', tags: ['E7', 'todo', 'dados-reais'],
    title: 'E7: Fechar TODOs de produto no código (adoptedCount 500 fixo, VolunteerPool sem busca, contracts collectionGroup, 1º pet do wizard)',
    description: 'src/core/hooks/useHomeStats.js:37 retorna adoptedCount 500 hardcoded; src/pages/VolunteerPool.jsx:92 TODO busca real por região/raio/espécie; src/modules/contracts/services/contractsService.js:176 query manual no lugar de collectionGroup + índice; ShelterOnboardingWizard.jsx:367 não cria o 1º pet. Resolver cada um (contagem real via getCountFromServer em adoptions, etc.). Critério: grep "TODO" nesses 4 pontos vazio; testes cobrindo.' }),

  // ── E8 · Produto e crescimento ──
  base({ id: 'TASK-972', type: 'feature', category: 'shelter', priority: 'medium', flag: 'PLATFORM_MARKETPLACE_V1', tags: ['E8', 'rollout', 'marketplace'],
    title: 'E8: Rollout do marketplace /mercado (PLATFORM_MARKETPLACE_V1, hoje OFF)',
    description: 'Flag OFF com readers em MarketplacePage.jsx, PersonaTopbar.jsx e App.jsx. Pré-requisito: SHELTER_STORE_V1 ON (ok) e ao menos 1 loja com produtos públicos reais. Smoke com flag OFF, ativar em /admin/flags, 24h, depois default true + migração. Critério: /mercado lista produtos reais com filtros; item de menu visível em todas as personas exceto abrigo.' }),
  base({ id: 'TASK-973', type: 'feature', category: 'core', priority: 'low', flag: 'HOME_STATS_V1', tags: ['E8', 'home'],
    title: 'E8: HOME_STATS_V1 com números reais (depende de TASK-971) e ativar',
    description: 'Após adoptedCount real: validar contagens (pets, abrigos, cidades, adoções) e ativar HOME_STATS_V1 na landing. Critério: números batem com /admin/metricas; flag ON.',
    blockedBy: ['TASK-971'] }),
  base({ id: 'TASK-974', type: 'feature', category: 'ux', priority: 'high', tags: ['E8', 'piloto', 'go-to-market'],
    title: 'E8: Piloto com 3 abrigos reais (onboarding assistido + feedback estruturado)',
    description: 'Selecionar 3 abrigos/ONGs, criar os clubes via /abrigo/:clubId/onboarding (ShelterOnboardingWizard), importar planilha de animais, publicar 1 vitrine, cadastrar 2 voluntários. Coletar feedback com roteiro (docs/AI_GUIDE/31-PILOTO-ABRIGOS.md) e abrir tasks dos achados. Critério: 3 abrigos ativos com pets publicados; relatório do piloto commitado.',
    owner: 'human', relatedTasks: ['TASK-V3-HOME-8'] }),
  base({ id: 'TASK-975', type: 'feature', category: 'core', priority: 'medium', tags: ['E8', 'seo'],
    title: 'E8: SEO — meta tags por pet/abrigo/vitrine, sitemap com rotas dinâmicas e Search Console',
    description: 'scripts/generate-sitemap.mjs roda no prebuild só com rotas estáticas. Gerar entradas dinâmicas (pets disponíveis, abrigos, vitrines publicadas) via Function agendada que grava public/sitemap.xml ou endpoint /sitemap.xml; Open Graph/Twitter por pet (já existe share image) e por abrigo; registrar no Search Console. Critério: sitemap com URLs dinâmicas válido; OG preview correto em 3 páginas.' }),
  base({ id: 'TASK-976', type: 'docs', category: 'docs', priority: 'medium', tags: ['E8', 'faq', 'regra-a'],
    title: 'E8: FAQ institucional e guia do abrigo (Regra A §1 "FAQ institucional")',
    description: 'Páginas públicas /ajuda (FAQ do adotante, do abrigo, do voluntário, do lar temporário) renderizadas a partir de Markdown via AdminContentEditor (CMS já existente), com link no rodapé e no onboarding do abrigo. Critério: 4 FAQs publicadas; rota no smoke:routes; sem HTML cru (sanitização).' }),
  base({ id: 'TASK-977', type: 'decision', category: 'design', priority: 'medium', tags: ['E8', 'decisao', 'flags'],
    title: 'E8: Decidir destino das flags de layout ainda OFF (PAGE_HERO_ENABLED, STANDARDIZED_PAGE_LAYOUT, COMMUNITY_NGO_PARITY, AD_SLOTS, COMMUNITY_EVENT_DETAIL_V1)',
    description: 'Cinco flags continuam OFF com readers no código desde julho. Para cada uma o owner decide: ativar (com smoke + 24h) ou remover flag + código morto. Critério: decisão registrada em 13-DECISIONS.md; PR de ativação ou remoção por flag.',
    owner: 'human' }),
  base({ id: 'TASK-978', type: 'refactor', category: 'refactor', priority: 'low', tags: ['E8', 'divida', 'v1-cleanup'],
    title: 'E8: Remover páginas *.v1.jsx e flags v3_page_* após 30 dias de cutover estável',
    description: 'Cutover V3 em 2026-08-30 com as 19 flags v3_page_* ON. Após estabilidade (sem rollback em 30 dias e TASK-950 verde): remover os componentes *.v1.jsx, os gates por flag e as 19 flags (com migração que ignora chaves removidas), reduzindo o bundle (TASK-968). Critério: build sem *.v1.jsx; smoke 35/35; migration test cobrindo remoção.',
    blockedBy: ['TASK-950'] }),
];

// remove e recria (idempotente) — só as novas (TASK-946..978)
const newIds = new Set(NEW.map((t) => t.id));
data.tasks = data.tasks.filter((t) => !newIds.has(t.id));
data.tasks.push(...NEW);

/* ── 4. Roadmap, sprint, métricas ──────────────────────────────── */

const EPICS = [
  ['E1', 'Verdade do board e da documentação', ['TASK-946', 'TASK-947', 'TASK-948']],
  ['E2', 'Fechar gaps do rollout V2 do painel do abrigo', ['TASK-931..938 (validação pós-cutover)', 'TASK-939/940/949 (espelhos públicos)', 'TASK-941 (form de adoção in-app)', 'TASK-943 (PIX manual)', 'TASK-944', 'TASK-945', 'TASK-950']],
  ['E3', 'Observabilidade e operação', ['TASK-951 (Sentry)', 'TASK-952 (/healthz)', 'TASK-953 (alertas)', 'TASK-954 (runbook)']],
  ['E4', 'Rollout V4 Personas (5 etapas)', ['TASK-955', 'TASK-956', 'TASK-957', 'TASK-958', 'TASK-959']],
  ['E5', 'Comunicação: email + push alinhados às decisões', ['TASK-960', 'TASK-961', 'TASK-962']],
  ['E6', 'LGPD e legal: fechamento', ['TASK-963 (/admin/cargos)', 'TASK-964 (TODO jurídico)', 'TASK-965', 'TASK-966']],
  ['E7', 'Qualidade, performance e acessibilidade', ['TASK-V3-PROFILE-5/6/7', 'TASK-V3-ADOPTION-7/8', 'TASK-967', 'TASK-968', 'TASK-969', 'TASK-970', 'TASK-971']],
  ['E8', 'Produto e crescimento', ['TASK-972 (/mercado)', 'TASK-973', 'TASK-974 (piloto 3 abrigos)', 'TASK-V3-HOME-8', 'TASK-975 (SEO)', 'TASK-976 (FAQ)', 'TASK-977', 'TASK-978']],
];

data.roadmap = (data.roadmap || []).filter((r) => !String(r.id).startsWith('PROJ-2026Q4-'));
// fases antigas: fechar o que já fechou
for (const r of data.roadmap) {
  if (r.id === 'FASE-23-AVALIACAO-360' || r.id === 'FASE-24-MODELO-VOLUNTARIOS' || r.id === 'FASE-26-DECISOES-PENDENTES') {
    r.status = 'done';
    r.note = `Fechada em ${today}: tasks listadas estão done no board (ver ${DOC} §2).`;
  }
  if (r.id === 'FASE-25-CARGOS-PIX') {
    r.status = 'in_progress';
    r.note = `${today}: PIX manual (TASK-386) done; /admin/cargos reaberto como TASK-963 (TASK-380 sem implementação); Web Push virou TASK-961.`;
  }
  if (r.id === 'FASE-22-CONSOLIDACAO') {
    r.status = 'in_progress';
    r.note = `${today}: Sentry reaberto como TASK-951 (TASK-239 sem SDK). Demais entregáveis done.`;
  }
}
for (const [key, title, deliverables] of EPICS) {
  data.roadmap.push({
    id: `PROJ-2026Q4-${key}`,
    title: `Projeto 2026-Q4 · ${key} — ${title}`,
    status: key === 'E1' ? 'in_progress' : 'ready',
    deliverables,
    doc: DOC,
  });
}

data.currentSprint = {
  id: 'SPRINT-2026-W42',
  label: 'Sprint 2026-W42/W43 (Projeto 2026-Q4 · kickoff E1 + E2 + E3)',
  startedAt: '2026-10-12',
  endsAt: '2026-10-25',
  goal: 'Verdade do board (E1), smoke/evidência pós-cutover e espelhos públicos (E2), Sentry + /healthz (E3). Decisões humanas destravadas: email (TASK-960), push (TASK-961), flags de layout (TASK-977).',
};

data.sprintHistory = data.sprintHistory || [];
for (const s of data.sprintHistory) {
  if (s.id === 'SPRINT-2026-W29' && s.status === 'active') s.status = 'completed';
}
data.sprintHistory.push({
  id: 'SPRINT-2026-W42',
  period: '2026-10-12 → 2026-10-25',
  status: 'active',
  event: `Kickoff Projeto Continuidade 2026-Q4 (${DOC})`,
  timestamp: new Date().toISOString(),
  tasksAdded: NEW.length,
});

// métricas (mesmas chaves do scrum.cjs recalcMetrics)
const by = {};
for (const t of data.tasks) by[t.status] = (by[t.status] || 0) + 1;
data.metrics = data.metrics || {};
Object.assign(data.metrics, {
  totalTasks: data.tasks.length,
  done: by.done || 0,
  inProgress: by.in_progress || 0,
  inReview: by.in_review || 0,
  blocked: by.blocked || 0,
  ready: by.ready || 0,
  backlog: by.backlog || 0,
  dropped: by.dropped || 0,
  lastUpdate: `${new Date().toISOString()} — seed projeto-2026-q4 (_add-projeto-2026-q4-tasks.cjs)`,
  projeto2026Q4: {
    doc: DOC,
    epics: EPICS.map(([k, t]) => `${k} — ${t}`),
    tasksSeeded: NEW.length,
    tasksTotal: data.tasks.filter((t) => (t.tags || []).includes(TAG)).length,
  },
});
data.metrics.counts = {
  total: data.tasks.length,
  done: by.done || 0,
  ready: by.ready || 0,
  inProgress: by.in_progress || 0,
  inReview: by.in_review || 0,
  blocked: by.blocked || 0,
  backlog: by.backlog || 0,
  dropped: by.dropped || 0,
};
data.generatedAt = new Date().toISOString();

fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n');
console.log(`[seed projeto-2026-q4] tasks=${data.tasks.length}`, by);
