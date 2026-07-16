#!/usr/bin/env node
// Adiciona tasks granulares do Bloco D.2 (DS_V2_PAGES-PETS)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-pages-pets-2026-07-16';
const WT = '.worktrees/wt-ds-v2-pages-pets';

const newTasks = [
  {
    id: 'TASK-737',
    title: 'Auditar PetCard, PetFeed, PetDetail contra spec v1.0',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'pets', 'audit'], blockedBy: [],
    description: 'Gap analysis dos 3 arquivos centrais de pets. Listar divergências vs spec §3.3 (Card de Pet: aspect-ratio 1.3, raio 22, padding 16, título Sora 16, metadados Manrope 12, botão terciário full-width, hover-lift).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-738',
    title: 'Refinar PetCard.jsx (referência da spec §3.3 Card de Pet)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'pets', 'card'], blockedBy: ['TASK-737'],
    description: 'Aplicar spec §3.3 exatamente: aspect-ratio 1.3, raio 22, padding 16, título Sora 16, metadados Manrope 12, botão terciário full-width, hover-lift (scale 1.01-1.02 + sombra crescente). Adicionar Card size="pet" do Bloco C.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-739',
    title: 'Refinar PetFeed.jsx (grid responsivo + alinhamento com header)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'pets', 'feed', 'grid'], blockedBy: ['TASK-738'],
    description: 'Ajustar grid: sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4. Garantir que as bordas laterais coincidam com o trilho do header (PageContainer). Aplicar empty state consistente (EmptyState component).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-740',
    title: 'Refinar PetDetail.jsx (galeria + tabs + abas consistentes)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'pets', 'detail'], blockedBy: ['TASK-738'],
    description: 'Galeria em grid responsivo, abas (Sobre, Saúde, Localização) usando arena-tabs. Aplicar avatar com Image+Fallback. Refinar InterestPanel (botões consistentes com a spec).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-741',
    title: 'Refinar CreatePet + MyPets + RadarSettings (forms e listas)',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'pets', 'forms', 'list'], blockedBy: ['TASK-738'],
    description: 'CreatePet: form wizard com Input 46px (já do Bloco C), Textarea 80px+, segmented control. MyPets: lista de cards (Card size="pet"). RadarSettings: toggle 46x26 (spec §3.4).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-742',
    title: 'Validar Pets (build + lint + smoke test)',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-741'],
    description: 'npm run build verde, lint sem regressões. Smoke test: Feed carrega, PetCard renderiza com aspect-ratio 1.3, PetDetail mostra galeria + tabs.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-743',
    title: 'Commit + push do Bloco D.2',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-PETS', worktree: WT, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-742'],
    description: 'Commit único, mensagem descritiva. Push só do branch. PR com screenshots antes/depois de cada página.',
    createdAt: today, updatedAt: today,
  },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-704') {
    t.status = 'in_progress';
    t.owner = OWNER;
    t.branch = BRANCH;
    t.worktree = WT;
    t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-pages-pets',
  branch: BRANCH,
  head: '0d77e30',
  headTitle: 'merge: Bloco D.1 · DS_V2_PAGES-HOME',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-pages-pets',
  status: 'ahead-of-main',
  commitsAhead: 0,
  primarySession: OWNER,
  sessionTitle: 'DS_V2_PAGES-PETS — refinar PetCard/PetFeed/PetDetail/CreatePet/MyPets/RadarSettings',
  focus: ['DS_V2_PAGES-PETS'],
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
    done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME'],
    inProgress: ['DS_V2_PAGES-PETS'],
    ready: ['DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'],
  },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco D.2 adicionadas (TASK-737..743).`);
console.log('✓ TASK-704 (macro) + TASK-737 (audit) in_progress');
