#!/usr/bin/env node
// Adiciona tasks granulares do Bloco D.6 (DS_V2_PAGES-CHAT)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-pages-chat-2026-07-16';
const WT = '.worktrees/wt-ds-v2-pages-chat';

const newTasks = [
  { id: 'TASK-764', title: 'Auditar ChatPage contra spec v1.0 §3.5 Navegação + Chat', type: 'feature', category: 'design', status: 'in_progress', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'chat', 'audit'], blockedBy: [], description: 'Gap analysis do ChatPage. Spec §3.5: mensagens próprias gradiente terracota→mostarda, outras Areia, raio 18/4, input pill 40px. Spec §3.4 Forms.', createdAt: today, updatedAt: today },
  { id: 'TASK-765', title: 'Refinar ChatPage (mensagens + input)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'chat', 'refactor'], blockedBy: ['TASK-764'], description: 'MessageBubble: própria = gradiente terracota→mostarda, raio 18 18 4 18. Outras = Areia, raio 18 18 18 4. Input: pill 40px, send button à direita. Avatar nos interlocutores.', createdAt: today, updatedAt: today },
  { id: 'TASK-766', title: 'Refinar Profile (tabs + form)', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'profile'], blockedBy: ['TASK-764'], description: 'Tabs pill, Avatar grande no header (56px com anel), form com Input/Textarea do Bloco C.', createdAt: today, updatedAt: today },
  { id: 'TASK-767', title: 'Refinar Login + OnboardingQuestionnaire', type: 'feature', category: 'design', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'login', 'onboarding'], blockedBy: ['TASK-764'], description: 'Login: card glass 22px + form centralizado. Onboarding: wizard steps com arena-tab-pill, Input 46px.', createdAt: today, updatedAt: today },
  { id: 'TASK-768', title: 'Refinar institucionais (Terms, Legislation, PrivacyPolicy)', type: 'feature', category: 'design', status: 'ready', priority: 'medium', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'legal', 'institutional'], blockedBy: ['TASK-764'], description: 'Texto em columnas com largura 720px, tipografia Sora H1 30px, corpo Manrope 16px, links primary. PageContainer.', createdAt: today, updatedAt: today },
  { id: 'TASK-769', title: 'Validar Chat/Profile/Login (build + lint + smoke test)', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'build', 'test'], blockedBy: ['TASK-768'], description: 'Build verde, lint sem regressões, smoke test do chat e login.', createdAt: today, updatedAt: today },
  { id: 'TASK-770', title: 'Commit + push do Bloco D.6', type: 'chore', category: 'ci', status: 'ready', priority: 'high', owner: OWNER, branch: BRANCH, flag: 'DS_V2_PAGES-CHAT', worktree: WT, pr: null, tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-769'], description: 'Commit único, push só do branch.', createdAt: today, updatedAt: today },
];

data.tasks.push(...newTasks);

for (const t of data.tasks) {
  if (t.id === 'TASK-708') {
    t.status = 'in_progress';
    t.owner = OWNER; t.branch = BRANCH; t.worktree = WT; t.updatedAt = today;
  }
}

data.activeWorktrees = [{
  id: 'wt-ds-v2-pages-chat', branch: BRANCH, head: 'f619b21', headTitle: 'main sync',
  path: '/run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/viralata/.worktrees/wt-ds-v2-pages-chat',
  status: 'ahead-of-main', commitsAhead: 0,
  primarySession: OWNER, sessionTitle: 'DS_V2_PAGES-CHAT — ChatPage, Profile, Login, Onboarding, institucionais',
  focus: ['DS_V2_PAGES-CHAT'],
}];

data.metrics = {
  ...data.metrics, lastUpdated: nowISO,
  dsV2Tasks: { total: data.metrics.dsV2Tasks.total + newTasks.length, done: data.metrics.dsV2Tasks.done, ready: data.metrics.dsV2Tasks.ready, inProgress: data.metrics.dsV2Tasks.inProgress + 2 },
  dsV2Blocos: { done: ['DS_V2_DOCS', 'DS_V2_TOKENS', 'DS_V2_COMPONENTS', 'DS_V2_PAGES-HOME', 'DS_V2_PAGES-PETS', 'DS_V2_PAGES-ADOPTION', 'DS_V2_PAGES-ORG', 'DS_V2_PAGES-ADMIN'], inProgress: ['DS_V2_PAGES-CHAT'], ready: ['DS_V2_MOTION', 'DS_V2_AUDIT'] },
};

data.generatedAt = nowISO;
fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${newTasks.length} tasks Bloco D.6 adicionadas (TASK-764..770).`);
