#!/usr/bin/env node
// Adiciona tasks granulares do Bloco D.4 (DS_V2_PAGES-ORG)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-pages-org-2026-07-16';
const WT = '.worktrees/wt-ds-v2-pages-org';

const newTasks = [
  {
    id: 'TASK-750',
    title: 'Auditar páginas de Organizações contra spec v1.0',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'orgs', 'audit'], blockedBy: [],
    description: 'Gap analysis dos 30+ arquivos do módulo organizations. Verificar uso de arena-panel, tokens, Button/Card/Input do Bloco C. Foco em: ClubsDirectory, ClubDetail, EventDetail, OrganizationsHub, OrganizationAdminPanel.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-751',
    title: 'Refinar sub-abas do painel admin (Visão Geral, Animais, Mural, Doações, etc)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'orgs', 'admin', 'tabs'], blockedBy: ['TASK-750'],
    description: 'Padronizar sub-abas: arena-admin-tabs + arena-admin-tab-trigger. Cada sub-aba: arena-section-card + arena-stats-grid quando relevante.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-752',
    title: 'Refinar perfil público da ONG (ClubDetail)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'orgs', 'public', 'detail'], blockedBy: ['TASK-750'],
    description: 'Cover + arena-panel. Tabs (Membros, Eventos, Mural, Fóruns) com arena-tab-pill. Pets para adoção em grid 1/2/3/4.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-753',
    title: 'Refinar ClubsDirectory (diretório público)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'orgs', 'directory'], blockedBy: ['TASK-750'],
    description: 'Grid 1/2/3 colunas com Card size="default" + cover. Search bar com Input 46px.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-754',
    title: 'Refinar EventDetail + CreateClub + OrganizationsHub',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'orgs', 'event', 'create'], blockedBy: ['TASK-750'],
    description: 'EventDetail: arena-section-card + tabs. CreateClub: form wizard. OrganizationsHub: hub com stats + atalhos.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-755',
    title: 'Validar Org (build + lint + smoke test)',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-754'],
    description: 'Build verde, lint sem regressões, smoke test dos principais fluxos (diretório, perfil, painel admin).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-756',
    title: 'Commit + push do Bloco D.4',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ORG', worktree: WT, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-755'],
    description: 'Commit único, push só do branch.',
    createdAt: today, updatedAt: today,
  },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-706') {
    t.status = 'in_progress';
    t.owner = OWNER;
    t.branch = BRANCH;
    t.worktree = WT;
    t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-pages-org',
  branch: BRANCH,
  head: '08c2fa4',
  headTitle: 'merge: Bloco D.3 (audit only)',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-pages-org',
  status: 'ahead-of-main',
  commitsAhead: 0,
  primarySession: OWNER,
  sessionTitle: 'DS_V2_PAGES-ORG — ClubsDirectory, ClubDetail, OrganizationAdminPanel',
  focus: ['DS_V2_PAGES-ORG'],
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
    done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION'],
    inProgress: ['DS_V2_PAGES-ORG'],
    ready: ['DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'],
  },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco D.4 adicionadas (TASK-750..756).`);
