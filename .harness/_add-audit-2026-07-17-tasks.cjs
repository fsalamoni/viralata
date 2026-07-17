#!/usr/bin/env node
/**
 * .harness/_add-audit-2026-07-17-tasks.cjs
 *
 * Seeds the SCRUM_TASKS.json with 100+ tasks for the FULL_AUDIT_2026-07-17 mission.
 *
 * Run: node .harness/_add-audit-2026-07-17-tasks.cjs
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'SCRUM_TASKS.json');
const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const now = new Date().toISOString().slice(0, 19);
const today = new Date().toISOString().slice(0, 10);

const missions = [
  // Fase 0 — Diagnóstico AGORA (30 min) — CRÍTICA
  { id: 'TASK-813', title: '[AUDIT-0.1] Investigar OrganizationAdminPanel "Algo deu errado"', phase: 'Fase 0' },
  { id: 'TASK-814', title: '[AUDIT-0.2] Investigar subscribePlatformSettings + Firestore flags', phase: 'Fase 0' },
  { id: 'TASK-815', title: '[AUDIT-0.3] Investigar ClubDetail/CommunityDetail DS_V2 ainda não aplicado', phase: 'Fase 0' },
  { id: 'TASK-816', title: '[AUDIT-0.4] Adicionar flag SHOW_DEBUG_ERRORS para stack trace em produção', phase: 'Fase 0' },
  { id: 'TASK-817', title: '[AUDIT-0.5] Aplicar fix emergencial para admin abrigo com base no diagnóstico', phase: 'Fase 0' },

  // Fase 1 — Auditoria de erros runtime (1h)
  { id: 'TASK-818', title: '[AUDIT-1.1] ErrorBoundary global — sempre mostrar erro real (com toggle)', phase: 'Fase 1' },
  { id: 'TASK-819', title: '[AUDIT-1.2] TabErrorBoundary local — não isolar erro crítico', phase: 'Fase 1' },
  { id: 'TASK-820', title: '[AUDIT-1.3] Validar todas as rotas em App.jsx — nenhuma rota quebrada', phase: 'Fase 1' },
  { id: 'TASK-821', title: '[AUDIT-1.4] useArenaPageClasses — uso consistente em TODAS páginas', phase: 'Fase 1' },
  { id: 'TASK-822', title: '[AUDIT-1.5] useFeatureFlag — chave correta em todos os usos', phase: 'Fase 1' },
  { id: 'TASK-823', title: '[AUDIT-1.6] useAuth / useMyMembership — fallback de loading + error', phase: 'Fase 1' },
  { id: 'TASK-824', title: '[AUDIT-1.7] React.lazy / Suspense — fallback de loading consistente', phase: 'Fase 1' },
  { id: 'TASK-825', title: '[AUDIT-1.8] react-query — error/loading states em todos os hooks', phase: 'Fase 1' },

  // Fase 2 — Auditoria de feature flags (1h)
  { id: 'TASK-826', title: '[AUDIT-2.1] DEFAULT_FEATURE_FLAGS vs FEATURE_FLAG_META — todas flags documentadas', phase: 'Fase 2' },
  { id: 'TASK-827', title: '[AUDIT-2.2] migrateLegacyFlags v3 — test com Firestore persistido real', phase: 'Fase 2' },
  { id: 'TASK-828', title: '[AUDIT-2.3] setFeatureFlag / markFlagsMigrationApplied — fluxo completo', phase: 'Fase 2' },
  { id: 'TASK-829', title: '[AUDIT-2.4] FLAGS_MIGRATION_VERSION — bump em cada mudança de critério', phase: 'Fase 2' },
  { id: 'TASK-830', title: '[AUDIT-2.5] platformSettingsService — todas as 4 entradas sincronizadas', phase: 'Fase 2' },
  { id: 'TASK-831', title: '[AUDIT-2.6] AdminFlags — UI mostra todas as flags + histórico + auto-save', phase: 'Fase 2' },
  { id: 'TASK-832', title: '[AUDIT-2.7] getPlatformSettings / subscribePlatformSettings — fallback gracioso', phase: 'Fase 2' },
  { id: 'TASK-833', title: '[AUDIT-2.8] Adicionar flag SHOW_DEBUG_ERRORS — mostra stack trace em produção', phase: 'Fase 2' },

  // Fase 3 — Auditoria de PWA e cache (30 min)
  { id: 'TASK-834', title: '[AUDIT-3.1] vite.config.js PWA — versionar sw filename em cada deploy crítico', phase: 'Fase 3' },
  { id: 'TASK-835', title: '[AUDIT-3.2] firebase.json headers — index.html e registerSW.js com TTL adequado', phase: 'Fase 3' },
  { id: 'TASK-836', title: '[AUDIT-3.3] Adicionar navigateFallback network-first para HTML', phase: 'Fase 3' },
  { id: 'TASK-837', title: '[AUDIT-3.4] Adicionar cleanupOutdatedCaches + skipWaiting no workbox', phase: 'Fase 3' },
  { id: 'TASK-838', title: '[AUDIT-3.5] manifest.webmanifest — ícones, start_url, scope, display', phase: 'Fase 3' },
  { id: 'TASK-839', title: '[AUDIT-3.6] Bump sw-v7.js para garantir invalidação da v6', phase: 'Fase 3' },
  { id: 'TASK-840', title: '[AUDIT-3.7] Adicionar caches.keys() cleanup mais agressivo', phase: 'Fase 3' },

  // Fase 4 — Auditoria visual de páginas públicas (2h)
  { id: 'TASK-841', title: '[AUDIT-4.1] / Home — DS_V2 + arena-stats-grid + arena-section-card', phase: 'Fase 4' },
  { id: 'TASK-842', title: '[AUDIT-4.2] /feed — DS_V2 + arena-pet-card + hover states', phase: 'Fase 4' },
  { id: 'TASK-843', title: '[AUDIT-4.3] /abrigos — DS_V2 + arena-stat-card + grid responsivo', phase: 'Fase 4' },
  { id: 'TASK-844', title: '[AUDIT-4.4] /organizacoes/{id} — DS_V2 + 2-layer tabs + arena-cover', phase: 'Fase 4' },
  { id: 'TASK-845', title: '[AUDIT-4.5] /comunidade/{id} — DS_V2 + 2-layer tabs', phase: 'Fase 4' },
  { id: 'TASK-846', title: '[AUDIT-4.6] /pet/{id} — DS_V2 + arena-pet-profile + gallery', phase: 'Fase 4' },
  { id: 'TASK-847', title: '[AUDIT-4.7] /evento/{id} — DS_V2 + arena-event-detail + RSVP', phase: 'Fase 4' },
  { id: 'TASK-848', title: '[AUDIT-4.8] /vitrines — DS_V2 + arena-card-grid', phase: 'Fase 4' },
  { id: 'TASK-849', title: '[AUDIT-4.9] /voluntarios — DS_V2 + arena-cta-card', phase: 'Fase 4' },
  { id: 'TASK-850', title: '[AUDIT-4.10] /busca — DS_V2 + arena-search-bar + facets', phase: 'Fase 4' },
  { id: 'TASK-851', title: '[AUDIT-4.11] /comunidades — DS_V2 + arena-card-grid', phase: 'Fase 4' },
  { id: 'TASK-852', title: '[AUDIT-4.12] /adocoes — DS_V2 + arena-adoption-card', phase: 'Fase 4' },
  { id: 'TASK-853', title: '[AUDIT-4.13] /eventos — DS_V2 + arena-event-card', phase: 'Fase 4' },
  { id: 'TASK-854', title: '[AUDIT-4.14] /chat — DS_V2 + arena-message-bubble', phase: 'Fase 4' },
  { id: 'TASK-855', title: '[AUDIT-4.15] /login — DS_V2 + arena-form + arena-input', phase: 'Fase 4' },

  // Fase 5 — Auditoria de páginas admin (1.5h)
  { id: 'TASK-856', title: '[AUDIT-5.1] /admin/flags — DS_V2 + arena-stat-card + history', phase: 'Fase 5' },
  { id: 'TASK-857', title: '[AUDIT-5.2] /admin/dashboard — DS_V2 + arena-stats-grid', phase: 'Fase 5' },
  { id: 'TASK-858', title: '[AUDIT-5.3] /admin/metrics — DS_V2 + recharts + arena-chart-card', phase: 'Fase 5' },
  { id: 'TASK-859', title: '[AUDIT-5.4] /admin/audit — DS_V2 + filters + export', phase: 'Fase 5' },
  { id: 'TASK-860', title: '[AUDIT-5.5] /admin/security — DS_V2 + runbooks', phase: 'Fase 5' },
  { id: 'TASK-861', title: '[AUDIT-5.6] /admin/notifications — DS_V2 + templates', phase: 'Fase 5' },
  { id: 'TASK-862', title: '[AUDIT-5.7] /admin/reports — DS_V2 + filters', phase: 'Fase 5' },
  { id: 'TASK-863', title: '[AUDIT-5.8] /admin/users — DS_V2 + ban workflow', phase: 'Fase 5' },
  { id: 'TASK-864', title: '[AUDIT-5.9] /admin/content — DS_V2 + rich text harmonizado', phase: 'Fase 5' },
  { id: 'TASK-865', title: '[AUDIT-5.10] /admin/organizations — DS_V2 + filters', phase: 'Fase 5' },
  { id: 'TASK-866', title: '[AUDIT-5.11] /admin/communities — DS_V2 + filters', phase: 'Fase 5' },
  { id: 'TASK-867', title: '[AUDIT-5.12] /admin/pets — DS_V2 + filters', phase: 'Fase 5' },
  { id: 'TASK-868', title: '[AUDIT-5.13] /admin/platform-health — DS_V2 + métricas', phase: 'Fase 5' },

  // Fase 6 — Auditoria de painel admin abrigo (1.5h)
  { id: 'TASK-869', title: '[AUDIT-6.1] OrganizationAdminPanel — 19→6 grupos + ErrorBoundary robusto', phase: 'Fase 6' },
  { id: 'TASK-870', title: '[AUDIT-6.2] OverviewTab — 4 stat cards + ShortcutCards + Loading/Empty', phase: 'Fase 6' },
  { id: 'TASK-871', title: '[AUDIT-6.3] ClubGeneralAdminTab — dirty state + sticky save + logo + CNPJ', phase: 'Fase 6' },
  { id: 'TASK-872', title: '[AUDIT-6.4] ClubPetsDataGrid — DS_V2 + arena-pet-card', phase: 'Fase 6' },
  { id: 'TASK-873', title: '[AUDIT-6.5] ClubFeedTab — DS_V2 + composer harmonizado', phase: 'Fase 6' },
  { id: 'TASK-874', title: '[AUDIT-6.6] ClubDonationsTab — CRUD de campanhas (TASK-790)', phase: 'Fase 6' },
  { id: 'TASK-875', title: '[AUDIT-6.7] ClubFinanceTab — sistema de lançamentos (TASK-791)', phase: 'Fase 6' },
  { id: 'TASK-876', title: '[AUDIT-6.8] ClubChatAdminTab — DS_V2 + chat harmonizado', phase: 'Fase 6' },
  { id: 'TASK-877', title: '[AUDIT-6.9] ClubTeamTab — DS_V2 + permissões granulares', phase: 'Fase 6' },
  { id: 'TASK-878', title: '[AUDIT-6.10] ClubAdminTab (settings) — DS_V2 + danger zone', phase: 'Fase 6' },
  { id: 'TASK-879', title: '[AUDIT-6.11] DashboardPage (shelter) — DS_V2 + KPIs', phase: 'Fase 6' },
  { id: 'TASK-880', title: '[AUDIT-6.12] KanbanPage — DS_V2 + columns + cards harmonizados', phase: 'Fase 6' },
  { id: 'TASK-881', title: '[AUDIT-6.13] ExhibitionsList — DS_V2 + arena-event-card', phase: 'Fase 6' },
  { id: 'TASK-882', title: '[AUDIT-6.14] VolunteersAdminTab — DS_V2 + roster + auditoria', phase: 'Fase 6' },
  { id: 'TASK-883', title: '[AUDIT-6.15] MedicalRecordsList — DS_V2 + arena-med-card', phase: 'Fase 6' },
  { id: 'TASK-884', title: '[AUDIT-6.16] MedicationsList — DS_V2 + arena-med-card', phase: 'Fase 6' },
  { id: 'TASK-885', title: '[AUDIT-6.17] TimelineList — DS_V2 + arena-timeline', phase: 'Fase 6' },
  { id: 'TASK-886', title: '[AUDIT-6.18] FostersList — DS_V2 + arena-foster-card', phase: 'Fase 6' },
  { id: 'TASK-887', title: '[AUDIT-6.19] ReportsTab — DS_V2 + export cards', phase: 'Fase 6' },
  { id: 'TASK-888', title: '[AUDIT-6.20] IndicatorsTab — DS_V2 + KPI cards', phase: 'Fase 6' },

  // Fase 7 — Auditoria de painel admin comunidade (1h)
  { id: 'TASK-889', title: '[AUDIT-7.1] CommunityAdminPanel — DS_V2 + 2-layer tabs', phase: 'Fase 7' },
  { id: 'TASK-890', title: '[AUDIT-7.2] MuralTabAdmin — DS_V2 + composer + moderação', phase: 'Fase 7' },
  { id: 'TASK-891', title: '[AUDIT-7.3] CommunityEventParticipantsPanel — DS_V2 + RSVP', phase: 'Fase 7' },
  { id: 'TASK-892', title: '[AUDIT-7.4] CommunityTeamTab — DS_V2 + permissões', phase: 'Fase 7' },
  { id: 'TASK-893', title: '[AUDIT-7.5] CreateForumThreadDialog — DS_V2', phase: 'Fase 7' },
  { id: 'TASK-894', title: '[AUDIT-7.6] AboutTab — DS_V2', phase: 'Fase 7' },
  { id: 'TASK-895', title: '[AUDIT-7.7] EventsTab — DS_V2 + arena-event-card', phase: 'Fase 7' },

  // Fase 8 — Auditoria de banco de dados (1h)
  { id: 'TASK-896', title: '[AUDIT-8.1] firestore.rules — todas collections + return explícito', phase: 'Fase 8' },
  { id: 'TASK-897', title: '[AUDIT-8.2] firestore.indexes.json — sem collectionGroup single-field', phase: 'Fase 8' },
  { id: 'TASK-898', title: '[AUDIT-8.3] storage.rules — paths + tipos de mídia', phase: 'Fase 8' },
  { id: 'TASK-899', title: '[AUDIT-8.4] Cloud Functions — todas com global.__viralataInitialized guard', phase: 'Fase 8' },
  { id: 'TASK-900', title: '[AUDIT-8.5] CORS — cors: true + IAM=allUsers em callable v2', phase: 'Fase 8' },
  { id: 'TASK-901', title: '[AUDIT-8.6] db exports — todos os services usando db consistente', phase: 'Fase 8' },
  { id: 'TASK-902', title: '[AUDIT-8.7] Timestamps — serverTimestamp() em writes + parseTimestamp() em reads', phase: 'Fase 8' },
  { id: 'TASK-903', title: '[AUDIT-8.8] Realtime listeners — cleanup em unmount (sem memory leaks)', phase: 'Fase 8' },

  // Fase 9 — Refatoração de código (1h)
  { id: 'TASK-904', title: '[AUDIT-9.1] ClubDetail — extrair hooks + subcomponentes', phase: 'Fase 9' },
  { id: 'TASK-905', title: '[AUDIT-9.2] CommunityDetail — extrair hooks + subcomponentes', phase: 'Fase 9' },
  { id: 'TASK-906', title: '[AUDIT-9.3] OrganizationAdminPanel — extrair subcomponentes por grupo', phase: 'Fase 9' },
  { id: 'TASK-907', title: '[AUDIT-9.4] CommunityAdminPanel — extrair subcomponentes por grupo', phase: 'Fase 9' },
  { id: 'TASK-908', title: '[AUDIT-9.5] PetDetail — extrair hooks de data fetching', phase: 'Fase 9' },
  { id: 'TASK-909', title: '[AUDIT-9.6] EventDetail — extrair hooks', phase: 'Fase 9' },
  { id: 'TASK-910', title: '[AUDIT-9.7] Criar src/components/arena/ com todos os componentes DS_V2', phase: 'Fase 9' },
  { id: 'TASK-911', title: '[AUDIT-9.8] Mover arena-* CSS de index.css para arquivo separado', phase: 'Fase 9' },

  // Fase 10 — Documentação completa (1h)
  { id: 'TASK-912', title: '[AUDIT-10.1] Doc de cada módulo (funcionalidade, arquivos, hooks, services)', phase: 'Fase 10' },
  { id: 'TASK-913', title: '[AUDIT-10.2] Doc de cada hook custom (props, retorno, exemplo)', phase: 'Fase 10' },
  { id: 'TASK-914', title: '[AUDIT-10.3] Doc de cada service (métodos, parâmetros, retorno)', phase: 'Fase 10' },
  { id: 'TASK-915', title: '[AUDIT-10.4] Doc do fluxo de feature flags (DEFAULT + META + Firestore + migration)', phase: 'Fase 10' },
  { id: 'TASK-916', title: '[AUDIT-10.5] Doc do fluxo de PWA (cache + versionamento + invalidação)', phase: 'Fase 10' },
  { id: 'TASK-917', title: '[AUDIT-10.6] Doc do fluxo de SCRUM (tasks, transitions, metrics, sync)', phase: 'Fase 10' },
  { id: 'TASK-918', title: '[AUDIT-10.7] Doc do fluxo de git (worktree, merge, cleanup, deploy)', phase: 'Fase 10' },
  { id: 'TASK-919', title: '[AUDIT-10.8] Doc do fluxo de UI (DS_V2, arena-*, 2-layer, mobile-first)', phase: 'Fase 10' },
];

// Add all as backlog
missions.forEach(m => {
  if (j.tasks.find(t => t.id === m.id)) {
    console.log(`[skip] ${m.id} already exists`);
    return;
  }
  j.tasks.push({
    id: m.id,
    title: m.title,
    status: 'backlog',
    priority: 'P1',
    owner: 'unassigned',
    createdAt: today,
    updatedAt: now,
    phase: m.phase,
    tags: ['full-audit', '2026-07-17'],
    evidence: `Mission: FULL_AUDIT_2026-07-17 — see docs/FULL_AUDIT_2026-07-17.md §${m.phase}`,
  });
});

// Update metrics
j.metrics.totalTasks = j.tasks.length;
const byStatus = {};
j.tasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
j.metrics.done = byStatus.done || 0;
j.metrics.inProgress = byStatus.in_progress || 0;
j.metrics.inReview = byStatus.in_review || 0;
j.metrics.blocked = byStatus.blocked || 0;
j.metrics.ready = byStatus.ready || 0;
j.metrics.backlog = byStatus.backlog || 0;
j.metrics.dropped = byStatus.dropped || 0;
j.generatedAt = new Date().toISOString();
j.metrics.lastUpdate = `${now} — via .harness/_add-audit-2026-07-17-tasks.cjs (FULL_AUDIT_2026-07-17)`;

// Atomic write
const tmp = JSON_PATH + '.tmp.' + process.pid;
fs.writeFileSync(tmp, JSON.stringify(j, null, 2) + '\n', 'utf8');
fs.renameSync(tmp, JSON_PATH);

console.log(`[seed] ${missions.length} tasks added (TASK-813..TASK-919)`);
console.log(`[seed] Total: ${j.tasks.length} tasks`);
console.log(`[seed] Backlog: ${j.metrics.backlog} | Ready: ${j.metrics.ready} | Done: ${j.metrics.done}`);
