#!/usr/bin/env node
// Adiciona tasks granulares da TASK-V3-PARTNER-1 (Espaço de Parceiros)

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const now = new Date();
const nowISO = now.toISOString();
const today = nowISO.split('T')[0];

const OWNER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'main';
const WT = 'main';

const PARENT_TASK = {
  id: 'TASK-V3-PARTNER-1',
  title: 'TASK-V3-PARTNER-1: Espaço de Parceiros V1 (admin + public + tracking)',
  status: 'done',
  parent: 'TASK-V3-REDESIGN',
  milestone: 'FEATURE COMPLETA',
  type: 'feature',
  category: 'partners',
  priority: 'high',
  owner: OWNER,
  branch: BRANCH,
  flag: 'ADMIN_PARTNER_SPACES_V1+PUBLIC_PARTNER_BANNERS_V1',
  worktree: WT,
  pr: null,
  tags: ['partners', 'ads', 'banners', 'analytics', 'admin', 'public'],
  blockedBy: [],
  createdAt: today,
  updatedAt: today,
  description: 'Sistema completo de gestão de parceiros publicitários: admin CRUD + rotação pública + tracking LGPD-compliant.',
  children: [
    { id: 'TASK-V3-PARTNER-1-1', title: 'Feature flags + schemas Zod + domain constants', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-2', title: 'Storage service (upload 1200x240 desktop / 600x200 mobile + compressão)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-3', title: 'Partners service (CRUD + audit + cascade + counters)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-4', title: 'Banners service (CRUD + status toggle + counters)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-5', title: 'Analytics service (track view/click + agregações)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-6', title: 'Hooks React Query (11 hooks)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-7', title: 'Firestore rules (partners + banners + events)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-8', title: 'AdminPartners (lista com busca + filtros)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-9', title: 'AdminPartnerDetail (4 tabs: Geral/Banners/Stats/Histórico)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-10', title: 'AdminPartnerNew (criação)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-11', title: 'AdminPartnerReports (métricas agregadas + Top 5)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-12', title: 'PartnerForm + BannerForm (modais com validação completa)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-13', title: 'AdSlotBanner (rotação client-side + tracking + LGPD)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-14', title: 'Integração no AdminDashboard V3 (seção Conteúdo)', status: 'done' },
    { id: 'TASK-V3-PARTNER-1-15', title: 'Build + deploy + force push + 3 trigger rebuilds (sw-v61)', status: 'done' },
  ],
};

// Adiciona parent
data.tasks.push(PARENT_TASK);

// Update metrics
const partnerTasks = 1 + PARENT_TASK.children.length;
data.metrics = {
  ...data.metrics,
  lastUpdated: nowISO,
  v3RedesignTasks: {
    total: (data.metrics.v3RedesignTasks?.total || 0) + partnerTasks,
    done: (data.metrics.v3RedesignTasks?.done || 0) + partnerTasks,
    ready: data.metrics.v3RedesignTasks?.ready || 0,
    inProgress: data.metrics.v3RedesignTasks?.inProgress || 0,
  },
  totalTasks: (data.metrics.totalTasks || 0) + partnerTasks,
  completedTasks: (data.metrics.completedTasks || 0) + partnerTasks,
};

data.generatedAt = nowISO;

fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2));
console.log('Adicionadas', partnerTasks, 'tasks para TASK-V3-PARTNER-1');
console.log('Total tasks agora:', data.tasks.length);
