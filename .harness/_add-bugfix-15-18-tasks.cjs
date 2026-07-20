#!/usr/bin/env node
/**
 * .harness/_add-bugfix-15-18-tasks.cjs
 *
 * Seeds the SCRUM_TASKS.json with 4 parent + 12 child tasks for the
 * BUG-15..18 fix mission (2026-07-20).
 *
 * BUG-15: ShelterAdminDashboard não funciona (flag missing + collection errada)
 * BUG-16: VolunteerSignup trava com texto curto (scroll detection)
 * BUG-17: Pet permissions defense-in-depth (3 layers)
 * BUG-18: Documentos legais (verificação completa)
 *
 * Run: node .harness/_add-bugfix-15-18-tasks.cjs
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'SCRUM_TASKS.json');
const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const now = new Date().toISOString().slice(0, 19);

const parents = [
  {
    id: 'TASK-FIX-BUG-15',
    title: '[BUG-15] ShelterAdminDashboard não funciona',
    description: 'Componente V3 do dashboard pessoal do admin estava sempre mostrando empty state "rollout gradual". Causa raiz: feature flag SHELTER_ADMIN_DASHBOARD_V1 NÃO EXISTIA, e a query de applications usava coleção errada (adoption_applications vs adoption_workflow).',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-BUG-16',
    title: '[BUG-16] VolunteerSignup trava após ler termo + check',
    description: 'User reportou que o checkbox de aceite ficava disabled quando o texto do termo cabia em max-h-[50vh]. Causa raiz: onScroll handler só disparava em scroll event, mas texto curto não tem evento de scroll.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-BUG-17',
    title: '[BUG-17] Pet permissions defense-in-depth',
    description: 'Subcoleções de pet (vet_visits, treatments, care_log, medications, devolutions, adopters_history) tinham services que faziam deleteDoc/updateDoc DIRETO sem checar canManage. UI tinha canManage mas service não, e Firestore rule canManagePet não incluía platform admin.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-BUG-18',
    title: '[BUG-18] Documentos legais (verificação completa)',
    description: 'Verificar que 6 v2.js files existem, 3 static fallbacks (200+ linhas cada), 6 PUBLIC_SLUGS em LegalPageViewer e LegalFooter, legal_docs collection OK no Firestore.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
];

const children = [
  // BUG-15 (5 tasks)
  { parent: 'TASK-FIX-BUG-15', id: 'TASK-FIX-15-1', title: 'Adicionar flag SHELTER_ADMIN_DASHBOARD_V1 (constants + meta + default ON)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-15', id: 'TASK-FIX-15-2', title: 'Bump FLAGS_MIGRATION_VERSION 4 → 5 (usuários existentes migram)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-15', id: 'TASK-FIX-15-3', title: 'Atualizar teste FeatureFlagsContext.migration.test.js (5 expected)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-15', id: 'TASK-FIX-15-4', title: 'Trocar adoption_applications → adoption_workflow no ShelterAdminDashboard', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-15', id: 'TASK-FIX-15-5', title: 'Trocar string flag por SHELTER_FEATURE_FLAG.SHELTER_ADMIN_DASHBOARD_V1 constant', phase: 'FIX' },
  // BUG-16 (3 tasks)
  { parent: 'TASK-FIX-BUG-16', id: 'TASK-FIX-16-1', title: 'Criar useScrollEnd hook com ResizeObserver (src/core/hooks/useScrollEnd.js)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-16', id: 'TASK-FIX-16-2', title: 'Refatorar VolunteerSignup.jsx para usar useScrollEnd + allowAccept', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-16', id: 'TASK-FIX-16-3', title: 'Criar 3 testes useScrollEnd.test.js (curto, longo, scroll-to-end)', phase: 'FIX' },
  // BUG-17 (4 tasks)
  { parent: 'TASK-FIX-BUG-17', id: 'TASK-FIX-17-1', title: 'Exportar ensureCanMutatePet + adicionar isPlatformOwnerAuth check (petService)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-17', id: 'TASK-FIX-17-2', title: 'Adicionar ensureCanMutatePet em petMedicalService (vet_visits, treatments, care_log, medications)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-17', id: 'TASK-FIX-17-3', title: 'Adicionar ensureCanMutatePet em petHistoryService (devolutions, adopters_history)', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-17', id: 'TASK-FIX-17-4', title: 'Refatorar usePetHistory + usePetMedical para usar useAuth().uid (não payload)', phase: 'FIX' },
];

// Add parents
parents.forEach((p) => {
  if (!j.tasks.find((t) => t.id === p.id)) {
    j.tasks.push(p);
  }
});

// Add children
children.forEach((c) => {
  if (!j.tasks.find((t) => t.id === c.id)) {
    j.tasks.push({
      ...c,
      parent_id: c.parent,
      status: 'done',
      created_at: now,
      title: `[${c.id.split('-').slice(-2).join('.')}] ${c.title}`,
    });
  }
});

fs.writeFileSync(JSON_PATH, JSON.stringify(j, null, 2));
console.log(`Added ${parents.length} parents + ${children.length} children to SCRUM_TASKS.json`);
console.log(`Total tasks: ${j.tasks.length}`);
