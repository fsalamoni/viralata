#!/usr/bin/env node
// Adiciona tasks granulares do Bloco B (DS_V2_TOKENS) e marca como in_progress

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-tokens-2026-07-16';
const WT = '.worktrees/wt-ds-v2-tokens';

const newTasks = [
  {
    id: 'TASK-720',
    title: 'Adicionar subset Material Symbols Outlined em src/index.css',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_TOKENS', worktree: WT, pr: null,
    tags: ['ds-v2', 'tokens', 'material-symbols'], blockedBy: [],
    description: 'Adicionar @import do Google Fonts para Material Symbols Outlined (var, opsz 20-48, wght 500, FILL 0-1, GRAD -25-0). Adicionar classe `.material-symbols-outlined` em @layer base com font-family, font-variation-settings padrão (FILL 0, wght 500, GRAD 0, opsz 24). Adicionar classe `.material-symbols-filled` para FILL 1 (logo, ativo).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-721',
    title: 'Criar <Icon> wrapper component com coexistência lucide + material',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_TOKENS', worktree: WT, pr: null,
    tags: ['ds-v2', 'tokens', 'icon', 'wrapper'], blockedBy: ['TASK-720'],
    description: 'Componente `src/components/ui/icon.jsx` que aceita `name` (string) e `kind` ("material" | "lucide", default "lucide"). Para "material", renderiza <span class="material-symbols-outlined">{name}</span>. Para "lucide", delega para lucide-react. Props: size, className, filled (boolean, só para material).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-722',
    title: 'Validar tokens WCAG AA + build do Bloco B',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_TOKENS', worktree: WT, pr: null,
    tags: ['ds-v2', 'build', 'a11y'], blockedBy: ['TASK-721'],
    description: 'Rodar `npm run build` e validar (a) bundle size delta < +30KB, (b) tokens oficiais da spec batem com src/index.css (TASK-249), (c) classe .material-symbols-outlined aplica corretamente, (d) ícone de teste renderiza.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-723',
    title: 'Commit + push do Bloco B no branch feat/ds-v2-tokens-2026-07-16',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_TOKENS', worktree: WT, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-722'],
    description: 'Commit único, mensagem descritiva, sem --force. Push só do branch (não para main). PR aberto contra main com screenshot do Icon funcionando.',
    createdAt: today, updatedAt: today,
  },
];

data.tasks.push(...newTasks);

data.metrics = {
  ...data.metrics,
  lastUpdated: nowISO,
  dsV2Tasks: {
    total: data.metrics.dsV2Tasks.total + newTasks.length,
    done: data.metrics.dsV2Tasks.done,
    ready: data.metrics.dsV2Tasks.ready,
    inProgress: data.metrics.dsV2Tasks.inProgress + 1,
  },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco B adicionadas (TASK-720..723). TASK-720 in_progress.`);
