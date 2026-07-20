#!/usr/bin/env node
/**
 * .harness/_add-bugfix-v64-tasks.cjs
 *
 * Seeds the SCRUM_TASKS.json with 4 parent + 8 child tasks for the
 * v64 bugfix mission (2026-07-20).
 *
 * BUG-23 (CRÍTICO-1): /public-debug removido (vazava admin UI sem auth)
 * BUG-24 (CRÍTICO-2/3/4): ProtectedRoute em 3 rotas admin/abrigo
 * BUG-25 (CRÍTICO-5): ONBOARDING_ALLOWED_PATHS inclui /legal/
 * BUG-26 (ALTO-NAV-11): Mobile menu expandido (perfil/preferencias/radar)
 * BUG-27 (ALTO-PUBLIC-1): /pets/:petId agora exige auth
 * BUG-28 (ALTO-ONBOARD-5): full_name fallback para email + novo step
 * BUG-29 (MÉDIO-LOGIN): Login.v1 useRef (era objeto literal)
 * BUG-19/20/21 (ONBOARD): Onboarding detecta 1ª vez vs upgrade vs edit
 *
 * Run: node .harness/_add-bugfix-v64-tasks.cjs
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'SCRUM_TASKS.json');
const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const now = new Date().toISOString().slice(0, 19);

const parents = [
  {
    id: 'TASK-FIX-BUG-23',
    title: '[BUG-23 CRÍTICO] /public-debug vazava admin UI sem auth',
    description: 'Rota /public-debug?debug=1 renderizava OrganizationAdminPanel completo (Dashboard/Kanban/Volunteers/Medical/Reports/Indicators) sem nenhuma auth gate. Removido por vazamento de admin UI.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-BUG-24',
    title: '[BUG-24 CRÍTICO] 3 rotas admin/abrigo sem ProtectedRoute',
    description: '/abrigos/:clubId/admin/dashboard, /abrigo/:clubId/onboarding, /lares-temporarios/dashboard estavam públicas. Adicionado ProtectedRoute em todas.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-BUG-25',
    title: '[BUG-25 CRÍTICO] ONBOARDING_ALLOWED_PATHS não incluía /legal/',
    description: 'User durante onboarding não conseguia abrir /legal/<slug> (links target=_blank do consent step). Adicionado /legal/ na whitelist.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-ONBOARD-V2',
    title: '[BUG-19/20/21] Onboarding detecta 1ª vez vs upgrade vs edit',
    description: 'OnboardingQuestionnaire não diferenciava 1ª vez de upgrade. User com profile_completed=true caía em loop. Adicionado: 1) pickStepsToShow() filtra por version+fields novos; 2) ?edit=1 mostra todos steps com pré-preenchimento; 3) step full_name novo (LGPD Art. 8 + displayName Google pode ser vazio); 4) profileCompletion.getMissingProfileFields() helper.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-MISC-V64',
    title: '[BUG-26/27/28/29] Outros fixes v64',
    description: '26=mobile menu expandido (perfil/preferencias/radar), 27=/pets/:petId agora auth, 28=full_name fallback email, 29=Login.v1 useRef correto (era objeto literal).',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
];

const children = [
  // BUG-23
  { parent: 'TASK-FIX-BUG-23', id: 'TASK-FIX-23-1', title: 'Remover /public-debug do App.jsx + componente', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-23', id: 'TASK-FIX-23-2', title: 'Atualizar useArenaPageClasses test (whitelist)', phase: 'FIX' },
  // BUG-24
  { parent: 'TASK-FIX-BUG-24', id: 'TASK-FIX-24-1', title: 'ProtectedRoute em /abrigos/:clubId/admin/dashboard', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-24', id: 'TASK-FIX-24-2', title: 'ProtectedRoute em /abrigo/:clubId/onboarding', phase: 'FIX' },
  { parent: 'TASK-FIX-BUG-24', id: 'TASK-FIX-24-3', title: 'ProtectedRoute em /lares-temporarios/dashboard', phase: 'FIX' },
  // BUG-25
  { parent: 'TASK-FIX-BUG-25', id: 'TASK-FIX-25-1', title: 'ONBOARDING_ALLOWED_PATHS inclui /legal/', phase: 'FIX' },
  // BUG-19/20/21
  { parent: 'TASK-FIX-ONBOARD-V2', id: 'TASK-FIX-ONBOARD-1', title: 'pickStepsToShow() filtra por version+newFields', phase: 'FIX' },
  { parent: 'TASK-FIX-ONBOARD-V2', id: 'TASK-FIX-ONBOARD-2', title: '?edit=1 mode no /onboarding', phase: 'FIX' },
  { parent: 'TASK-FIX-ONBOARD-V2', id: 'TASK-FIX-ONBOARD-3', title: 'Step full_name novo (displayName Google fallback)', phase: 'FIX' },
  { parent: 'TASK-FIX-ONBOARD-V2', id: 'TASK-FIX-ONBOARD-4', title: 'Profile "Editar" link → /onboarding?edit=1', phase: 'FIX' },
  { parent: 'TASK-FIX-ONBOARD-V2', id: 'TASK-FIX-ONBOARD-5', title: 'getMissingProfileFields() helper', phase: 'FIX' },
  { parent: 'TASK-FIX-ONBOARD-V2', id: 'TASK-FIX-ONBOARD-6', title: 'Full name fallback para email no AuthContext', phase: 'FIX' },
  // BUG-26/27/28/29
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-26-1', title: 'MOBILE_MENU_EXTRA_ITEMS: perfil/preferencias/radar', phase: 'FIX' },
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-27-1', title: 'ProtectedRoute em /pets/:petId (V3 autenticado)', phase: 'FIX' },
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-29-1', title: 'Login.v1 useRef (era objeto literal) + useRef import', phase: 'FIX' },
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-30-1', title: 'vitest.setup: matchMedia + ResizeObserver polyfills', phase: 'FIX' },
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-30-2', title: 'useArenaPageClasses test whitelist atualizada', phase: 'FIX' },
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-30-3', title: 'Layout.legal-links.test: useLegalFooterHeight mock', phase: 'FIX' },
  { parent: 'TASK-FIX-MISC-V64', id: 'TASK-FIX-30-4', title: 'sw-v63 → sw-v64 + cleanupStaleCaches + registerPwa', phase: 'FIX' },
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
