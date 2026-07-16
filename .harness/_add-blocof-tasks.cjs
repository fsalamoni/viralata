#!/usr/bin/env node
// Adiciona tasks granulares do Bloco F (DS_V2_AUDIT)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-audit-2026-07-16';
const WT = '.worktrees/wt-ds-v2-audit';

const newTasks = [
  { id: 'TASK-777', title: 'Grep final: tokens literais divergentes', type: 'feature', category: 'design', status: 'in_progress', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'audit', 'tokens'], blockedBy: [], description: 'Rodar grep em src/ por: bg-emerald-*, bg-green-*, bg-orange-500, text-orange-*, bg-red-500, cores Tailwind literais (sem ser do DS). Listar resultados.', createdAt: today, updatedAt: today },
  { id: 'TASK-778', title: 'Substituir tokens literais por tokens semânticos (badge, admin)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'audit', 'fix'], blockedBy: ['TASK-777'], description: 'Substituir bg-emerald-100 → bg-success/15, text-emerald-800 → text-success em badge.jsx, user-avatar.jsx, AdminMockData.jsx. Manter InstallAppButton se for número de passo (semântica separada).', createdAt: today, updatedAt: today },
  { id: 'TASK-779', title: 'Validar foco visível (outline 2px primary + offset 2px)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'audit', 'a11y'], blockedBy: ['TASK-777'], description: 'Verificar que todos os elementos interativos têm focus-visible:outline ou focus-visible:ring. Spec §5.3.', createdAt: today, updatedAt: today },
  { id: 'TASK-780', title: 'Validar hierarquia semântica (h1, h2, h3)', type: 'feature', category: 'design', status: 'ready', priority: 'medium', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'audit', 'a11y'], blockedBy: ['TASK-777'], description: 'Verificar que páginas usam h1, h2, h3 em ordem lógica, sem pular níveis. Spec §5.3.', createdAt: today, updatedAt: today },
  { id: 'TASK-781', title: 'Validar prefers-reduced-motion (CSS + framer-motion)', type: 'feature', category: 'design', status: 'ready', priority: 'medium', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'audit', 'a11y'], blockedBy: ['TASK-777'], description: 'Confirmar que media query prefers-reduced-motion: reduce desliga animações (CSS já tem em index.css; framer-motion via useReducedMotionSafe). Spec §5.1.', createdAt: today, updatedAt: today },
  { id: 'TASK-782', title: 'Escrever docs/AUDIT_DS_V2.md com relatório final', type: 'chore', category: 'docs', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'audit', 'docs'], blockedBy: ['TASK-781'], description: 'Documento com: (1) resumo do que foi feito na Fase 4; (2) métricas WCAG; (3) bundle size delta; (4) lista de melhorias futuras; (5) como ativar cada feature flag.', createdAt: today, updatedAt: today },
  { id: 'TASK-783', title: 'Validar Audit (build + lint + bundle size)', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-782'], description: 'Build verde, lint sem regressões, bundle size delta aceitável.', createdAt: today, updatedAt: today },
  { id: 'TASK-784', title: 'Commit + push do Bloco F', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_AUDIT', worktree: WT, pr: null, tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-783'], description: 'Commit único, push só do branch. PR final da Fase 4 com relatório + screenshots.', createdAt: today, updatedAt: today },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-710') {
    t.status = 'in_progress';
    t.owner = OWNER; t.branch = BRANCH; t.worktree = WT; t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-audit', branch: BRANCH, head: '277c0e0', headTitle: 'main sync',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-audit',
  status: 'ahead-of-main', commitsAhead: 0,
  primarySession: OWNER, sessionTitle: 'DS_V2_AUDIT — auditoria final (tokens, a11y, contraste)',
  focus: ['DS_V2_AUDIT'],
}];

data.metrics = {
  ...data.metrics, lastUpdated: nowISO,
  dsV2Tasks: { total: data.metrics.dsV2Tasks.total + newTasks.length, done: data.metrics.dsV2Tasks.done, ready: data.metrics.dsV2Tasks.ready, inProgress: data.metrics.dsV2Tasks.inProgress + 2 },
  dsV2Blocos: { done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION'], inProgress: ['DS_V2_AUDIT'], ready: [] },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco F adicionadas (TASK-777..784).`);
