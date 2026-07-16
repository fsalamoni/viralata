#!/usr/bin/env node
// Adiciona tasks granulares do Bloco E (DS_V2_MOTION)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-motion-2026-07-16';
const WT = '.worktrees/wt-ds-v2-motion';

const newTasks = [
  { id: 'TASK-771', title: 'Auditar uso de framer-motion (já instalado?)', type: 'feature', category: 'design', status: 'in_progress', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_MOTION', worktree: WT, pr: null, tags: ['ds-v2', 'motion', 'audit'], blockedBy: [], description: 'Verificar se framer-motion está instalado. Listar arquivos que usam.', createdAt: today, updatedAt: today },
  { id: 'TASK-772', title: 'Criar hook useReducedMotionSafe', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_MOTION', worktree: WT, pr: null, tags: ['ds-v2', 'motion', 'a11y'], blockedBy: ['TASK-771'], description: 'Hook que retorna true se prefers-reduced-motion: reduce. Usado por todos wrappers para desligar animações.', createdAt: today, updatedAt: today },
  { id: 'TASK-773', title: 'Criar wrappers <FadeIn>, <Stagger>, <HoverLift> (motion)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_MOTION', worktree: WT, pr: null, tags: ['ds-v2', 'motion', 'wrappers'], blockedBy: ['TASK-772'], description: 'FadeIn (opacity 0→1, translateY 16→0, 400ms ease, whileInView once: true). Stagger (delay 80ms, max 6-8 itens). HoverLift (scale 1.01 + sombra crescente, 300ms).', createdAt: today, updatedAt: today },
  { id: 'TASK-774', title: 'Documentar padrões de motion no DESIGN_SYSTEM.md', type: 'chore', category: 'docs', status: 'ready', priority: 'medium', owner: OWNER, branch: BRANCH, flag: 'DS_V2_MOTION', worktree: WT, pr: null, tags: ['ds-v2', 'motion', 'docs'], blockedBy: ['TASK-773'], description: 'Atualizar docs/DESIGN_SYSTEM.md §5.1 com exemplos de uso dos wrappers.', createdAt: today, updatedAt: today },
  { id: 'TASK-775', title: 'Validar Motion (build + lint + bundle size)', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_MOTION', worktree: WT, pr: null, tags: ['ds-v2', 'build', 'perf'], blockedBy: ['TASK-774'], description: 'Build verde, lint sem regressões, bundle size delta < +30KB. framer-motion é tree-shakeable.', createdAt: today, updatedAt: today },
  { id: 'TASK-776', title: 'Commit + push do Bloco E', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_MOTION', worktree: WT, pr: null, tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-775'], description: 'Commit único, push só do branch.', createdAt: today, updatedAt: today },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-709') {
    t.status = 'in_progress';
    t.owner = OWNER; t.branch = BRANCH; t.worktree = WT; t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-motion', branch: BRANCH, head: 'cde4c2f', headTitle: 'main sync',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-motion',
  status: 'ahead-of-main', commitsAhead: 0,
  primarySession: OWNER, sessionTitle: 'DS_V2_MOTION — useReducedMotionSafe + FadeIn/Stagger/HoverLift wrappers',
  focus: ['DS_V2_MOTION'],
}];

data.metrics = {
  ...data.metrics, lastUpdated: nowISO,
  dsV2Tasks: { total: data.metrics.dsV2Tasks.total + newTasks.length, done: data.metrics.dsV2Tasks.done, ready: data.metrics.dsV2Tasks.ready, inProgress: data.metrics.dsV2Tasks.inProgress + 2 },
  dsV2Blocos: { done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT'], inProgress: ['DS_V2_MOTION'], ready: ['DS_V2_AUDIT'] },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco E adicionadas (TASK-771..776).`);
