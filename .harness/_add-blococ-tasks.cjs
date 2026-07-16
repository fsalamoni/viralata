#!/usr/bin/env node
// Adiciona tasks granulares do Bloco C (DS_V2_COMPONENTS) e marca TASK-702 + TASK-724 como in_progress

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-components-2026-07-16';
const WT = '.worktrees/wt-ds-v2-components';

const newTasks = [
  {
    id: 'TASK-724',
    title: 'Refatorar Button (button.jsx) com 7 variantes da spec v1.0',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'components', 'button'], blockedBy: [],
    description: 'Spec §3.1: primary (gradiente marca, #fff), secondary (white 90%, border 2px primary 30%), tertiary (areia, 36px), admin (escuro, 46px), destructive (vermelho), disabled (cinza, opacity 55%), icon-circle (46-52px, círculo perfeito, gradiente marca). Atualizar buttonVariants em cva. Manter compat com variant/size atuais.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-725',
    title: 'Refatorar Card (card.jsx) com cantos 22px + sombra colorida',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'components', 'card'], blockedBy: ['TASK-724'],
    description: 'Spec §3.3: cantos 20-24px (default 22), fundo quase-branco translúcido, sombra difusa (não cinza puro). Hover: leve elevação (scale 1.01-1.02 + sombra crescente), nunca tilt 3D. Variantes: pet (aspect-ratio 1.3 imagem, padding 16), feature (ícone 44px, padding 22), testimonial (avatar 40px, padding 22).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-726',
    title: 'Refatorar Input/Textarea (input.jsx, textarea.jsx) com spec §3.4',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'components', 'input', 'textarea', 'forms'], blockedBy: ['TASK-724'],
    description: 'Spec §3.4: Input altura 46px, raio 12px, borda hsl(var(--input)). Focus: borda primary + ring outline 3px hsla primary 10%. Textarea: min-height 80px, raio 12px, padding 12px 14px, resize vertical. Toggle: 46x26px, bg success on / bg cinza off, knob 20x20 branco. NÃO mexer em FormField (form-field.jsx) por enquanto.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-727',
    title: 'Refatorar Modal/Dialog (dialog.jsx) com spec §3.6',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'components', 'modal', 'dialog'], blockedBy: ['TASK-725'],
    description: 'Spec §3.6: Modal raio 24px, padding 32px, max-width 480px, sombra "Painel flutuante". Header em Sora 20px. Overlay com rgba(0,0,0,0.4-0.5) + backdrop-blur 4px. Dropdown: raio 18px, bg branco, sombra "Painel flutuante", itens padding 9px 12px, gap 10px para ícone.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-728',
    title: 'Refatorar Table (table.jsx) com spec §3.7',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'components', 'table'], blockedBy: ['TASK-725'],
    description: 'Spec §3.7: Raio externo 18px, borda fina. Header: bg Secondary (Areia), texto 12px uppercase (Eyebrow). Linhas: padding 14px 16px, borda inferior fina. Linhas pares com bg Background Alt para zebragem. Hover com bg Areia claro. Aplicar nas tabelas já existentes (AuditLogTable, ClubPetsDataGrid, etc).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-729',
    title: 'Refatorar Avatar (avatar.jsx) com spec §3.9',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'components', 'avatar'], blockedBy: ['TASK-725'],
    description: 'Spec §3.9: Iniciais com gradiente Avatar (oliva→terracota), texto branco bold. Imagem com borda 2px branca/cinza, object-fit cover. Status: bolinha 12px canto inferior direito com borda branca (Verde=online, Cinza=offline, Mostarda=away). Tamanhos 28/36/44/56px (a maior com anel branco no header).',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-730',
    title: 'Validar componentes refatorados (build, lint, snapshot test)',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-729'],
    description: 'Rodar npm run build (verde obrigatório), npm run lint (sem regressões), npm test (componentes afetados). Smoke test visual: abrir Home, Profile, Admin, e validar que as variantes (primary, secondary, tertiary, admin, destructive, disabled) renderizam corretamente.',
    createdAt: today, updatedAt: today,
  },
  {
    id: 'TASK-731',
    title: 'Commit + push do Bloco C',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER, branch: BRANCH, flag: 'DS_V2_COMPONENTS', worktree: WT, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-730'],
    description: 'Commit único, mensagem descritiva. Push só do branch. PR com screenshots antes/depois de cada componente. Merge em main após user validar.',
    createdAt: today, updatedAt: today,
  },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-702') {
    t.status = 'in_progress';
    t.owner = OWNER;
    t.branch = BRANCH;
    t.worktree = WT;
    t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-components',
  branch: BRANCH,
  head: '29fec2a',
  headTitle: 'merge: Bloco B · DS_V2_TOKENS',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-components',
  status: 'ahead-of-main',
  commitsAhead: 0,
  primarySession: OWNER,
  sessionTitle: 'DS_V2_COMPONENTS — refatorar Button, Card, Input, Modal, Table, Avatar',
  focus: ['DS_V2_COMPONENTS'],
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
    done: ['DS_V2_DOCS', 'DS_V2_TOKENS'],
    inProgress: ['DS_V2_COMPONENTS'],
    ready: ['DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN', 'DS_V2_PAGES-CHAT', 'DS_V2_MOTION', 'DS_V2_AUDIT'],
  },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco C adicionadas (TASK-724..731).`);
console.log('✓ TASK-702 (macro) + TASK-724 (Button) in_progress');
console.log('✓ activeWorktree atualizado: wt-ds-v2-components');
