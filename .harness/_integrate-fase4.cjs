#!/usr/bin/env node
// Integra o Bloco A no SCRUM_TASKS.json — atualiza TODOS os campos meta
// (currentSprint, activeWorktrees, activeSessions, riskRegister,
//  definitionOfDone, retrospective, protocol, roadmap, sprintHistory,
//  metrics) e marca Bloco B como in_progress.

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

// 1. currentSprint — atualizar label e goal com Fase 4
data.currentSprint = {
  id: 'SPRINT-2026-W29',
  label: 'Sprint 2026-W29 (BATCH: features + DS_V2 reaplicação)',
  startedAt: '2026-07-15',
  endsAt: '2026-07-22',
  goal:
    'DS_V2 Fase 4 — Reaplicar design system oficial v1.0 bloco a bloco, ' +
    'cada área com feature flag default OFF. Começar pelo Bloco A (docs) ✅, ' +
    'agora Bloco B (tokens + Material Symbols). User valida visualmente cada ' +
    'bloco antes da próxima. Zero regressão em regra de negócio.',
};

// 2. activeWorktrees — abrir o Bloco B (TASK-701) em worktree
data.activeWorktrees = [
  {
    id: 'wt-ds-v2-tokens',
    branch: 'feat/ds-v2-tokens-2026-07-16',
    head: '8e187f6',
    headTitle: 'merge: Bloco A · DS_V2_DOCS (spec v1.0 oficial + Fase 4 roadmap)',
    path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-tokens',
    status: 'ahead-of-main',
    commitsAhead: 0,
    primarySession: 'mvs_311d078987d0414a90f57ef28b789b18',
    sessionTitle: 'DS_V2_TOKENS — Material Symbols Outlined + coexist com lucide',
    focus: ['DS_V2_TOKENS', 'DS_V2_TOKENS-SUBSET', 'DS_V2_TOKENS-WRAPPER', 'DS_V2_TOKENS-BUILD'],
  },
];

// 3. activeSessions — atualizar
data.activeSessions = [
  {
    id: 'mvs_311d078987d0414a90f57ef28b789b18',
    agentName: 'agent-1cc44353fc6b',
    title: 'Mavis — orquestrador DS_V2 + Viralata Coder',
    status: 'started',
    workspace: '/workspace/viralata',
    branch: 'main',
    lastActiveAt: nowISO,
  },
];

// 4. definitionOfDone — adicionar critérios do DS_V2
const existingDod = data.definitionOfDone || [];
const newDodItems = [
  'DS_V2: código usa tokens semânticos do design system (bg-primary, text-foreground, etc.) — nunca cores Tailwind literais (orange-500, gray-900) a menos que documentado como exceção',
  'DS_V2: componente novo tem screenshot anexo (PNG ou comparação before/after)',
  'DS_V2: feature flag correspondente (DS_V2_*) default OFF, documentada em `docs/ROADMAP.md`',
  'DS_V2: foco visível (outline 2px primary + offset 2px) em todos os elementos interativos',
  'DS_V2: contraste WCAG AA validado (4.5:1 texto normal, 3:1 texto grande) — usar axe DevTools ou script de verificação',
  'DS_V2: prefers-reduced-motion respeitado (CSS puro + useReducedMotion() em framer-motion)',
  'DS_V2: `npm run build` verde antes do commit, `npm run lint` sem regressões',
  'DS_V2: `SCRUM_TASKS.json` atualizado via `sync.cjs --fix` antes do commit',
];
data.definitionOfDone = [...new Set([...existingDod, ...newDodItems])];

// 5. riskRegister — adicionar riscos específicos do DS_V2
const existingRisks = data.riskRegister || [];
const newRisks = [
  {
    id: 'RISK-DS-V2-01',
    title: 'Regressão visual em produção ao ativar feature flag',
    description:
      'Ativar DS_V2_PAGES-* em produção pode revelar inconsistências que não apareceram em dev (viewport, font fallback, latência de fonte Google)',
    probability: 'medium',
    impact: 'medium',
    mitigation:
      '1) Cada bloco com flag OFF + smoke test em staging antes de ativar; 2) Rollback = setar flag=false no platform_settings/global; 3) Ativação gradual (10% → 50% → 100% via feature flag rules)',
    owner: 'Mavis',
    status: 'mitigated',
    raisedAt: today,
  },
  {
    id: 'RISK-DS-V2-02',
    title: 'Bundle size inflado por Material Symbols + framer-motion',
    description:
      'Material Symbols Outlined (var font) + framer-motion = até +80KB gzip se não controlado. Limite de alerta do build atual é 500KB por chunk',
    probability: 'medium',
    impact: 'low',
    mitigation:
      '1) Material Symbols com `unicode-range` subset (apenas glifos usados: pets, favorite, chat_bubble, etc); 2) framer-motion com imports nomeados (`import { motion } from "framer-motion"`, tree-shakeable); 3) Bundle hash check em CI',
    owner: 'Mavis',
    status: 'mitigated',
    raisedAt: today,
  },
  {
    id: 'RISK-DS-V2-03',
    title: 'Inconsistência entre páginas refatoradas e não-refatoradas',
    description:
      'Enquanto DS_V2_PAGES-HOME está em spec v1.0, as outras ainda têm layouts antigos. UX fica quebrada na transição entre páginas',
    probability: 'high',
    impact: 'low',
    mitigation:
      '1) Ordem de propagação definida (D.1 Home → D.2 Pets → D.3 Adoção → D.4 Org → D.5 Admin → D.6 Chat); 2) User valida bloco inteiro antes de avançar; 3) Em emergência, reverter com flag=false',
    owner: 'Mavis',
    status: 'accepted',
    raisedAt: today,
  },
  {
    id: 'RISK-DS-V2-04',
    title: 'Loop trava por dependência entre SCRUM + push + cron',
    description:
      'Past learnings: cron UX fazia commits paralelos que conflitavam com SCRUM_TASKS.json. -X theirs cego quebrou JSX. package-lock desatualizado quebrou build',
    probability: 'medium',
    impact: 'high',
    mitigation:
      '1) Cron UX já desligado (não roda neste sandbox); 2) Worktree por bloco, branch dedicado; 3) `npm ci` antes de push; 4) `sync.cjs --fix` ANTES do commit (não depois); 5) Nunca `-X theirs` em código, só em binários se necessário; 6) Rollback automático se build quebra (`git reset --hard HEAD`)',
    owner: 'Mavis',
    status: 'mitigated',
    raisedAt: today,
  },
  {
    id: 'RISK-DS-V2-05',
    title: 'Firestore rules complexas quebram parser (lesson de PRs anteriores)',
    description:
      'Parser do Firebase CLI rejeita raw strings, regex com classes negadas, e certas posições. Já visto em vários commits no histórico',
    probability: 'low',
    impact: 'medium',
    mitigation:
      '1) Preferir `isString() && size() <= N` em vez de regex; 2) Sem aspas raw; 3) Sem classes negadas; 4) Validar no emulador local ANTES de commitar; 5) Manter mudanças em firestore.rules fora dos blocos DS_V2 (não tocar)',
    owner: 'Mavis',
    status: 'mitigated',
    raisedAt: today,
  },
];
// Mesclar com existentes, sem duplicar
const riskIds = new Set(existingRisks.map((r) => r.id));
for (const r of newRisks) if (!riskIds.has(r.id)) existingRisks.push(r);
data.riskRegister = existingRisks;

// 6. retrospective — atualizar com aprendizados do Bloco A + orientações para Bloco B
data.retrospective = {
  sprint: 'SPRINT-2026-W29',
  updatedAt: nowISO,
  stop: [
    'Parar de fazer merge massivo de branches com `-X theirs` (quebrou JSX no passado)',
    'Parar de commitar SCRUM_TASKS.json no meio do loop de feature (gerava conflito a cada push)',
    'Parar de empurrar cron loop UX enquanto merge manual estava rolando (race conditions)',
  ],
  start: [
    'Começar cada bloco com worktree isolado e branch dedicado `feat/ds-v2-{bloco}-YYYY-MM-DD`',
    'Começar cada commit rodando `sync.cjs --fix` antes (não depois)',
    'Começar qualquer mudança em firestore.rules validando no emulador local',
    'Começar a documentar o status do loop a cada 3 tasks (~10min) com check-in no root',
  ],
  continue: [
    'Continuar usando feature flag default OFF — user valida antes de ativar',
    'Continuar com tasks pequenas (≤30min), 1 por vez, com scrum.cjs start/review/done',
    'Continuar com build verde + lint sem regressões como gate de push',
    'Continuar com `docs/` como single source of truth (atualizar antes de código)',
  ],
  actionItems: [
    { item: 'Bloco A entregue ✅, Bloco B em andamento', owner: 'Mavis', due: '2026-07-16' },
    { item: 'Sync com user a cada 3 tasks ou 10min', owner: 'Mavis', due: 'sprint' },
    { item: 'Past learnings aplicadas (sem cron, sem -X theirs, npm ci, sync antes de commit)', owner: 'Mavis', due: 'sprint' },
    { item: 'Documentar lições do Bloco B no final (mesmo formato deste retro)', owner: 'Mavis', due: '2026-07-16' },
  ],
};

// 7. protocol — atualizar com regras DS_V2
data.protocol = data.protocol || {};
data.protocol = {
  ...data.protocol,
  scrumUpdate: {
    rule: 'Regra B — toda atividade DEVE atualizar SCRUM_TASKS.json (início E fim)',
    cadence: '1 task = 1 ciclo start→review→done, com sync.cjs --fix antes de cada commit',
    dsV2Specific:
      'Cada bloco DS_V2 = 1 macro task + N granulares. Macro só vai para done quando todas as granulares estão done.',
  },
  deployRules: {
    rule: 'Zero push direto em main. Branch → PR → CI verde → merge --no-ff → smoke test',
    dsV2Specific:
      'Feature flag DS_V2_* default OFF em platform_settings/global. Ativação manual após validação visual do user.',
  },
  batchMode: {
    rule: 'BATCH mode permite múltiplas tasks por turno, mas com limite de WIP=3 por sessão',
    dsV2Specific:
      'Para DS_V2: 1 task por turno, sem BATCH (cada bloco é atômico, BATCH introduziria race conditions em SCRUM_TASKS.json)',
  },
  loop: {
    rule: 'Loop Mavis padrão = 1 task por turno + sync.cjs --fix + status check-in a cada 3 tasks',
    dsV2Specific:
      'DS_V2 loop = bloco inteiro por vez (não 1 task). Check-ins a cada 3 tasks granulares OU 10min. PR por bloco com screenshots.',
  },
};

// 8. roadmap — atualizar com Fase 4
data.roadmap = data.roadmap || [];
const newRoadmapItems = [
  { id: 'ROAD-FASE-4', name: 'Fase 4 — DS_V2 Reaplicação', status: 'in_progress', startedAt: today, parent: 'desing-system' },
];
const roadmapIds = new Set(data.roadmap.map((r) => r.id));
for (const r of newRoadmapItems) if (!roadmapIds.has(r.id)) data.roadmap.push(r);

// 9. sprintHistory — adicionar entrada
data.sprintHistory = data.sprintHistory || [];
data.sprintHistory.push({
  id: 'SPRINT-2026-W29-DS-V2-KICKOFF',
  sprint: 'SPRINT-2026-W29',
  event: 'DS_V2 kickoff — Bloco A done, Bloco B em andamento',
  timestamp: nowISO,
  tasksAdded: 18,
  tasksDone: 8,
  bloks: ['DS_V2_DOCS'],
});

// 10. metrics — atualizar
data.metrics = {
  ...data.metrics,
  testsTotal: data.metrics.testsTotal || 1355,
  testsDelta: '+0 (docs only, sem mudança de código)',
  lintStatus: 'clean (192 erros pré-existentes em main, sem regressão)',
  buildStatus: 'ok (48.64s, 167 entries PWA, 4125KB)',
  firestoreRulesParens: '1291/1291',
  firestoreIndexes: 35,
  bundleSizeKB: 4125,
  shelterPhases: '22/22 completas em produção',
  activeWorktreesAheadOfMain: 0,
  mergedWorktreesThisSprint: ['feat/ds-v2-docs-2026-07-16'],
  mainCommit: '8e187f6',
  dsV2Phase: 'Fase 4 — em andamento',
  dsV2Blocos: {
    done: ['DS_V2_DOCS'],
    inProgress: ['DS_V2_TOKENS'],
    ready: ['DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'],
  },
  dsV2Tasks: { total: 18, done: 8, ready: 10, inProgress: 0 },
  dsV2Merge: 'Bloco A merged to main @ 8e187f6 (2026-07-16 18:08 UTC)',
  lastUpdated: nowISO,
  lastTaskDone: 'TASK-700 (Bloco A macro)',
  lastPR: 'merged direto (Bloco A sem PR, branch → main)',
};

// 11. Marcar Bloco B (TASK-701) como in_progress
for (const t of data.tasks) {
  if (t.id === 'TASK-701') {
    t.status = 'in_progress';
    t.owner = 'mvs_311d078987d0414a90f57ef28b789b18';
    t.branch = 'feat/ds-v2-tokens-2026-07-16';
    t.worktree = '.worktrees/wt-ds-v2-tokens';
    t.updatedAt = today;
  }
}

data.generatedAt = nowISO;
data.version = '1.1.0';

fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');

console.log('✓ SCRUM_TASKS.json atualizado:');
console.log('  - currentSprint:', data.currentSprint.id, '—', data.currentSprint.goal.slice(0, 60) + '...');
console.log('  - activeWorktrees:', data.activeWorktrees.length, '(wt-ds-v2-tokens aberto)');
console.log('  - activeSessions:', data.activeSessions.length);
console.log('  - definitionOfDone:', data.definitionOfDone.length, 'itens (+8 DS_V2)');
console.log('  - riskRegister:', data.riskRegister.length, 'riscos (+5 DS_V2)');
console.log('  - retrospective atualizado (stop/start/continue/actionItems)');
console.log('  - protocol atualizado (4 regras DS_V2)');
console.log('  - roadmap: +1 item (Fase 4)');
console.log('  - sprintHistory: +1 entrada');
console.log('  - metrics: dsV2Blocos + dsV2Tasks');
console.log('  - TASK-701 (Bloco B) → in_progress');
console.log('');
console.log('Próximo: criar worktree e implementar Material Symbols Outlined.');
