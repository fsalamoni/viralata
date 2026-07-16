#!/usr/bin/env node
// Adiciona tasks granulares do Bloco D.3 (DS_V2_PAGES-ADOPTION)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-pages-adoption-2026-07-16';
const WT = '.worktrees/wt-ds-v2-pages-adoption';

const newTasks = [
  {
    id: 'TASK-744',
    title: 'Auditar AdoptionDetail + AdoptionWizard contra spec v1.0',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADOPTION', worktree: WT, pr: null,
    tags: ['ds-v2', 'adoption', 'audit'], blockedBy: [],
    description: 'Gap analysis dos 2 arquivos principais. Verificar uso de arena-section-card, tokens semânticos, Button/Card/Input do Bloco C.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-745',
    title: 'Refinar AdoptionDetail (timeline + cards de status)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADOPTION', worktree: WT, pr: null,
    tags: ['ds-v2', 'adoption', 'detail'], blockedBy: ['TASK-744'],
    description: 'Refinar uso de Card size="default" no container principal. Avatar do candidato se houver. Botões consistentes (primary, secondary, destructive).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-746',
    title: 'Refinar AdoptionWizard (form wizard com Input/Textarea)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADOPTION', worktree: WT, pr: null,
    tags: ['ds-v2', 'adoption', 'wizard', 'forms'], blockedBy: ['TASK-744'],
    description: 'Garantir que campos usem Input 46px e Textarea 80px do Bloco C. Progresso do wizard (steps) com arena-tab-pill ou arena-section-card. Botão primário único por step.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-747',
    title: 'Refinar MyApplications (lista de pedidos)',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADOPTION', worktree: WT, pr: null,
    tags: ['ds-v2', 'adoption', 'list'], blockedBy: ['TASK-744'],
    description: 'Lista de pedidos com Card size="default" + Avatar + Badge de status. Empty state consistente com EmptyState component.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-748',
    title: 'Validar Adoption (build + lint + smoke test)',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADOPTION', worktree: WT, pr: null,
    tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-747'],
    description: 'Build verde, lint sem regressões, smoke test dos fluxos.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-749',
    title: 'Commit + push do Bloco D.3',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADOPTION', worktree: WT, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-748'],
    description: 'Commit único, mensagem descritiva. Push só do branch.',
    createdAt: today, updatedAt: today,
  },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-705') {
    t.status = 'in_progress';
    t.owner = OWNER;
    t.branch = BRANCH;
    t.worktree = WT;
    t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-pages-adoption',
  branch: BRANCH,
  head: '17e4ad0',
  headTitle: 'merge: Bloco D.2 · DS_V2_PAGES-PETS',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-pages-adoption',
  status: 'ahead-of-main',
  commitsAhead: 0,
  primarySession: OWNER,
  sessionTitle: 'DS_V2_PAGES-ADOPTION — AdoptionDetail, AdoptionWizard, MyApplications',
  focus: ['DS_V2_PAGES-ADOPTION'],
}];

data.metrics = {
  ...data.metrics,
  lastUpdated: nowISO,
  dsV2Tasks: {
    total: data.metrics.dsV2Tasks.total + newTasks.length,
    done: data.metrics.dsV2Tasks.done,
    ready: data.metrics.dsV2Tasks.ready,
    inProgress: data.metrics.dsV2Tasks.inProgress + 2,
  },
  dsV2Blocos: {
    done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS'],
    inProgress: ['DS_V2_PAGES-ADOPTION'],
    ready: ['DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'],
  },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco D.3 adicionadas (TASK-744..749).`);
