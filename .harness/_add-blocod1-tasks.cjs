#!/usr/bin/env node
// Adiciona tasks granulares do Bloco D.1 (DS_V2_PAGES-HOME)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-pages-home-2026-07-16';
const WT = '.worktrees/wt-ds-v2-pages-home';

const newTasks = [
  {
    id: 'TASK-732',
    title: 'Auditar Home.jsx contra spec v1.0 (gap analysis)',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-HOME', worktree: WT, pr: null,
    tags: ['ds-v2', 'home', 'audit'], blockedBy: [],
    description: 'Ler src/pages/Home.jsx completo, comparar com spec v1.0 §3 (cards, hero, botões, tipografia, espaçamento). Listar divergências reais. Resultado: lista priorizada do que ajustar.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-733',
    title: 'Aplicar refinamentos: Icon (Material Symbols) no hero + Avatar nas histórias',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-HOME', worktree: WT, pr: null,
    tags: ['ds-v2', 'home', 'refactor', 'icon', 'avatar'], blockedBy: ['TASK-732'],
    description: 'Trocar PawPrint (lucide) do hero por <Icon kind="material" name="pets" filled> (spec §4.2 ícone de marca). Trocar stories avatares (gradient inline) por <Avatar><AvatarFallback>...</AvatarFallback></Avatar> usando o gradiente oficial.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-734',
    title: 'Refinar tipografia do hero (Sora 800, H1 spec §2.3)',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-HOME', worktree: WT, pr: null,
    tags: ['ds-v2', 'home', 'typography'], blockedBy: ['TASK-733'],
    description: 'Ajustar o h1 do hero para 50-56px (Display §2.3) com tracking -0.02em, font-sora. Manter responsivo (28/38/50). H2 das seções: 30px (Sora 800).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-735',
    title: 'Validar Home (build + lint + smoke test)',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-HOME', worktree: WT, pr: null,
    tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-734'],
    description: 'npm run build verde, lint sem regressões. Smoke test: Home carrega, hero renderiza, ícones Material Symbols aparecem (testar local ou via http-server).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-736',
    title: 'Commit + push do Bloco D.1',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-HOME', worktree: WT, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-735'],
    description: 'Commit único, mensagem descritiva. Push só do branch. PR com screenshots antes/depois do hero.',
    createdAt: today, updatedAt: today,
  },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-703') {
    t.status = 'in_progress';
    t.owner = OWNER;
    t.branch = BRANCH;
    t.worktree = WT;
    t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-pages-home',
  branch: BRANCH,
  head: 'aa57784',
  headTitle: 'merge: integrar scrum-topbar (auto) do origin/main',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-pages-home',
  status: 'ahead-of-main',
  commitsAhead: 0,
  primarySession: OWNER,
  sessionTitle: 'DS_V2_PAGES-HOME — refinar Home.jsx contra spec v1.0',
  focus: ['DS_V2_PAGES-HOME'],
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
    done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS'],
    inProgress: ['DS_V2_PAGES-HOME'],
    ready: ['DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'],
  },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco D.1 adicionadas (TASK-732..736).`);
console.log('✓ TASK-703 (macro) + TASK-732 (audit) in_progress');
