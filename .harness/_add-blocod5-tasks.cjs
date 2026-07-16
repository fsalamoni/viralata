#!/usr/bin/env node
// Adiciona tasks granulares do Bloco D.5 (DS_V2_PAGES-ADMIN)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-pages-admin-2026-07-16';
const WT = '.worktrees/wt-ds-v2-pages-admin';

const newTasks = [
  { id: 'TASK-757', title: 'Auditar AdminDashboard + AdminMetrics + AdminPets + AdminUsers + AdminReports', type: 'feature', category: 'design', status: 'in_progress', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'admin', 'audit'], blockedBy: [], description: 'Gap analysis dos 8+ arquivos /admin/*. Verificar arena-admin-header, arena-stats-grid, arena-admin-tabs, Table do Bloco C.', createdAt: today, updatedAt: today },
  { id: 'TASK-758', title: 'Refinar AdminDashboard (header + stats + atalhos)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'admin', 'dashboard'], blockedBy: ['TASK-757'], description: 'arena-admin-header com avatar, título, badge. arena-stats-grid 2/3/4 colunas. arena-section-card para atalhos.', createdAt: today, updatedAt: today },
  { id: 'TASK-759', title: 'Refinar tabelas admin (AdminPets, AdminUsers, AdminReports)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'admin', 'table'], blockedBy: ['TASK-757'], description: 'Trocar tabelas pelo Table component do Bloco C (zebragem, hover, uppercase header). Usar Avatar nas linhas de users. Badge de status.', createdAt: today, updatedAt: today },
  { id: 'TASK-760', title: 'Refinar AdminMetrics (gráficos com arena-panel)', type: 'feature', category: 'design', status: 'ready', priority: 'medium', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'admin', 'metrics'], blockedBy: ['TASK-757'], description: 'Gráficos recharts dentro de arena-section-card. Filtros com arena-tab-pill. Métricas com arena-stat-card.', createdAt: today, updatedAt: today },
  { id: 'TASK-761', title: 'Refinar AdminContentEditor (CMS Markdown)', type: 'feature', category: 'design', status: 'ready', priority: 'medium', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'admin', 'cms'], blockedBy: ['TASK-757'], description: 'Editor de páginas institucionais. Textarea 80px+ com markdown preview. arena-section-card para layout.', createdAt: today, updatedAt: today },
  { id: 'TASK-762', title: 'Validar Admin (build + lint + smoke test)', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-761'], description: 'Build verde, lint sem regressões, smoke test do painel admin.', createdAt: today, updatedAt: today },
  { id: 'TASK-763', title: 'Commit + push do Bloco D.5', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-ADMIN', worktree: WT, pr: null, tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-762'], description: 'Commit único, push só do branch.', createdAt: today, updatedAt: today },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-707') {
    t.status = 'in_progress';
    t.owner = OWNER; t.branch = BRANCH; t.worktree = WT; t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-pages-admin', branch: BRANCH, head: 'e4c1e6a', headTitle: 'main sync',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-pages-admin',
  status: 'ahead-of-main', commitsAhead: 0,
  primarySession: OWNER, sessionTitle: 'DS_V2_PAGES-ADMIN — AdminDashboard, AdminMetrics, AdminPets, AdminUsers, etc',
  focus: ['DS_V2_PAGES-ADMIN'],
}];

data.metrics = {
  ...data.metrics, lastUpdated: nowISO,
  dsV2Tasks: { total: data.metrics.dsV2Tasks.total + newTasks.length, done: data.metrics.dsV2Tasks.done, ready: data.metrics.dsV2Tasks.ready, inProgress: data.metrics.dsV2Tasks.inProgress + 2 },
  dsV2Blocos: { done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG'], inProgress: ['DS_V2_PAGES-ADMIN'], ready: ['DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'] },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco D.5 adicionadas (TASK-757..763).`);
