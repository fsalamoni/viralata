#!/usr/bin/env node
// Adiciona as tasks da Fase 4 (DS_V2) ao SCRUM_TASKS.json
// Estrutura: 1 task por bloco + tasks granulares por unidade de trabalho
// IDs: TASK-700+

const fs = require('fs');
const path = require('path');

const SCRUM = path.join(__dirname, 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(SCRUM, 'utf-8'));

const SPRINT = 'SPRINT-2026-W29';
const OWNER_CODER = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'feat/ds-v2-docs-2026-07-16';

const now = new Date().toISOString().split('T')[0];

// Macro tasks (1 por bloco)
const macroTasks = [
  {
    id: 'TASK-700', title: 'Bloco A · DS_V2_DOCS — Reescrever design system docs com spec v1.0',
    type: 'feature', category: 'design', status: 'in_progress', priority: 'critical',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'docs', 'bloco-a'], blockedBy: [],
    description: 'Reescrever `docs/DESIGN_SYSTEM.md` com a spec v1.0 oficial (paleta terracota/creme/oliva/mostarda, componentes, motion, ícones, voz). Sincronizar `docs/ROADMAP.md` (Fase 4), `docs/AI_CONTEXT.md` (refs), `docs/MODULES.md` (refs). Salvar material de referência em `docs/design-system-v2/` (5 formatos). Adicionar tasks SCRUM para todos os blocos. Commit isolado.',
    evidence: 'branch feat/ds-v2-docs-2026-07-16',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-701', title: 'Bloco B · DS_V2_TOKENS — Tokens + integração Material Symbols',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_TOKENS', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'tokens', 'bloco-b'], blockedBy: ['TASK-700'],
    description: '`src/index.css` já tem os tokens oficiais (validado TASK-249). Adicionar subset da fonte Material Symbols Outlined via @import, expor como utility `.material-symbols-outlined` com `font-variation-settings: \'FILL\' 0/1, \'wght\' 500`. Atualizar `tailwind.config.js` se necessário. Criar wrapper component `<Icon>` que decide entre lucide e Material Symbols por prop `kind="material"`. Validar com build.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-702', title: 'Bloco C · DS_V2_COMPONENTS — Refatorar biblioteca de componentes',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_COMPONENTS', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'components', 'bloco-c'], blockedBy: ['TASK-701'],
    description: 'Refatorar `src/components/ui/button.jsx` (já tem base, garantir 7 variantes da spec: primary, secondary, tertiary, admin, destructive, disabled, icon-circle). Refatorar `card.jsx`, `input.jsx`, `textarea.jsx`, `dialog.jsx`, `dropdown-menu.jsx`, `badge.jsx`, `avatar.jsx`, `tabs.jsx`, `table.jsx`, `progress.jsx` contra spec v1.0. Cada componente vira a fonte canônica para os Blocos D. Cobertura: não quebrar story atual, mas ajustar padding/raio/peso/contraste.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-703', title: 'Bloco D.1 · DS_V2_PAGES-HOME — Reescrever Home.jsx do zero contra spec',
    type: 'feature', category: 'design', status: 'ready', priority: 'critical',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_PAGES-HOME', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'home', 'bloco-d1', 'vitrine'], blockedBy: ['TASK-702'],
    description: 'Reescrever `src/pages/Home.jsx` do zero contra a spec v1.0. Hero assimétrico (texto+CTA à esquerda, foto+blob à direita), cards de feature, seções de Vitrine, banner herói escuro, CTA final. Sem emoji gigante. Validar com `npm run build` + screenshot. Feature flag default OFF — user ativa após validar visualmente.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-704', title: 'Bloco D.2 · DS_V2_PAGES-PETS — Propagar spec para PetFeed/PetCard/PetDetail/CreatePet/MyPets/RadarSettings',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_PAGES-PETS', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'pets', 'bloco-d2'], blockedBy: ['TASK-703'],
    description: 'Reescrever/ajustar `PetCard.jsx` (referência citada no DESIGN_SYSTEM.md v1.0: aspect-ratio 1.3, raio 22, padding 16, título Sora 16, metadados Manrope 12, botão terciário full-width, hover-lift 1.01+). Ajustar `PetFeed` (grid 3-4 colunas), `PetDetail` (galeria + abas), `CreatePet` (form 720px max), `MyPets` (lista), `RadarSettings` (toggle 46x26). Flag default OFF.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-705', title: 'Bloco D.3 · DS_V2_PAGES-ADOPTION — Propagar spec para fluxo de adoção',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_PAGES-ADOPTION', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'adoption', 'bloco-d3'], blockedBy: ['TASK-704'],
    description: 'Ajustar `AdoptionDetail` (timeline + cards de status), `AdoptionWizard` (form wizard com controle segmentado 38px, input 46px), fluxo de interesse, avaliação pós-adoção. Manter 100% das regras de negócio (LGPD, validações, permissões). Flag default OFF.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-706', title: 'Bloco D.4 · DS_V2_PAGES-ORG — Propagar spec para Organizações (ONGs/lojas)',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_PAGES-ORG', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'orgs', 'bloco-d4'], blockedBy: ['TASK-705'],
    description: 'Ajustar `ClubsDirectory`, `ClubDetail`, `CreateClub`, `EventDetail`, `OrganizationsHub`, `OrganizationAdminPanel` + sub-abas (Visão Geral, Animais, Mural, Doações, Prestação de Contas, Equipe, Configurações). A maioria já usa `arena-panel` — só repaletar/reposicionar. ~30+ arquivos. Flag default OFF.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-707', title: 'Bloco D.5 · DS_V2_PAGES-ADMIN — Propagar spec para painel admin',
    type: 'feature', category: 'design', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_PAGES-ADMIN', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'admin', 'bloco-d5'], blockedBy: ['TASK-706'],
    description: 'Ajustar `AdminDashboard`, `AdminPets`, `AdminReports`, `AdminUsers`, `AdminOrganizations`, `AdminCommunities`, `AdminMetrics`, `AdminContentEditor`. Tabelas com header Areia, zebragem Background Alt, hover Areia claro. Métricas com label pequeno cinza, valor Sora 28px. Flag default OFF.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-708', title: 'Bloco D.6 · DS_V2_PAGES-CHAT — Propagar spec para Chat/Perfil/Login/Onboarding/Institucionais',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_PAGES-CHAT', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'chat', 'profile', 'onboarding', 'bloco-d6'], blockedBy: ['TASK-707'],
    description: 'Ajustar `ChatPage` (mensagens próprias gradiente terracota→mostarda, outras Areia, raio 18/4, input pill 40px), `Profile` (tabs pill), `Login` (card glass 22px), `OnboardingQuestionnaire` (wizard), institucionais (`Terms`, `Legislation`, `PrivacyPolicy` — texto em columnas). Flag default OFF.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-709', title: 'Bloco E · DS_V2_MOTION — Instalar framer-motion + padrões de movimento',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_MOTION', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'motion', 'framer-motion', 'bloco-e'], blockedBy: ['TASK-708'],
    description: 'Instalar `framer-motion` (tree-shakeable, ~30KB gzip). Criar hook `useReducedMotionSafe` que retorna true se `prefers-reduced-motion: reduce`. Criar wrappers: `<FadeIn>` (opacity 0→1, translateY 16→0, 400ms ease, whileInView once: true), `<Stagger>` (delay 80ms, max 6-8 itens), `<HoverLift>` (scale 1.01 + sombra crescente). Aplicar em hero (Home, PetDetail, ClubDetail), grids de cards, modais, dropdowns. NÃO aplicar em hover de botão (CSS puro).',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-710', title: 'Bloco F · DS_V2_AUDIT — Auditoria final (contraste, foco, semântica, performance)',
    type: 'feature', category: 'design', status: 'ready', priority: 'medium',
    owner: OWNER_CODER, branch: null, flag: 'DS_V2_AUDIT', worktree: null, pr: null,
    tags: ['ds-v2', 'fase-4', 'audit', 'a11y', 'perf', 'bloco-f'], blockedBy: ['TASK-709'],
    description: 'Rodar grep automatizado por tokens antigos: `bg-emerald-*`, `bg-green-*`, `bg-orange-500` sem ser de DS, classes hardcoded, emojis como imagem. Validar contraste WCAG AA (4.5:1 texto, 3:1 grande) em todas as páginas. Validar foco visível (outline 2px primary + offset 2px). Validar hierarquia semântica (h1, h2, h3 em ordem). Lighthouse score > 90 a11y, > 85 performance. Bundle size delta < +50KB.',
    createdAt: now, updatedAt: now,
  },
];

// Granular sub-tasks for the current block (TASK-700) — already in progress
const granularTasks = [
  {
    id: 'TASK-711', title: 'Salvar docs/design-system-v2/ com 5 formatos (.md, .json, .html, .fig, .pdf)',
    type: 'feature', category: 'design', status: 'done', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'docs'], blockedBy: [],
    description: 'Criar `docs/design-system-v2/` e copiar 5 formatos da spec v1.0. Material de referência, não editado.',
    evidence: 'docs/design-system-v2/{DESIGN_SYSTEM.md, design-tokens.json, design-system-preview.html, design-system.fig, DESIGN_SYSTEM.pdf}',
    createdAt: now, updatedAt: now, resolvedAt: now,
  },
  {
    id: 'TASK-712', title: 'Reescrever docs/DESIGN_SYSTEM.md com spec v1.0 oficial (15 KB)',
    type: 'feature', category: 'design', status: 'done', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'docs'], blockedBy: ['TASK-711'],
    description: 'Substituir o plano de aplicação antigo pela spec v1.0 oficial. Manter nota de "implementação atual" para cada bloco (paleta, fontes, classes arena).',
    evidence: 'docs/DESIGN_SYSTEM.md (14988 bytes)',
    createdAt: now, updatedAt: now, resolvedAt: now,
  },
  {
    id: 'TASK-713', title: 'Atualizar docs/ROADMAP.md com Fase 4 (DS_V2) e tabela de blocos',
    type: 'feature', category: 'design', status: 'done', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'docs'], blockedBy: ['TASK-712'],
    description: 'Adicionar seção "Fase 4 — DS_V2 Reaplicação" com contexto, tabela de 11 sub-blocos, workflow por bloco, garantias.',
    evidence: 'docs/ROADMAP.md (Fase 4)',
    createdAt: now, updatedAt: now, resolvedAt: now,
  },
  {
    id: 'TASK-714', title: 'Sincronizar docs/AI_CONTEXT.md e docs/MODULES.md com refs v1.0',
    type: 'feature', category: 'design', status: 'done', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'docs'], blockedBy: ['TASK-712'],
    description: 'AI_CONTEXT: refs DS v1.0, lucide coexiste, framer-motion via DS_V2_MOTION, design-system-v2/. MODULES: ref DESIGN_SYSTEM.md v1.0.',
    evidence: 'docs/AI_CONTEXT.md + docs/MODULES.md',
    createdAt: now, updatedAt: now, resolvedAt: now,
  },
  {
    id: 'TASK-715', title: 'Adicionar 11 tasks DS_V2 (700-710) + 5 granulares (711-715) ao SCRUM',
    type: 'chore', category: 'design', status: 'done', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'scrum'], blockedBy: ['TASK-714'],
    description: 'Adicionar bloco macro + sub-tasks granulares do bloco A. Rodar sync.cjs --fix para recalcular metrics.',
    evidence: '.harness/SCRUM_TASKS.json (TASK-700..715)',
    createdAt: now, updatedAt: now, resolvedAt: now,
  },
  {
    id: 'TASK-716', title: 'Build de produção + validação de rotas após Bloco A',
    type: 'chore', category: 'ci', status: 'in_progress', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'build', 'validation'], blockedBy: ['TASK-715'],
    description: 'Rodar `npm install` (lockfile atual), `npm run build`, validar que mudanças de docs não quebraram nada. Confirmar antes de push.',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'TASK-717', title: 'Commit + push do Bloco A no branch feat/ds-v2-docs-2026-07-16',
    type: 'chore', category: 'ci', status: 'ready', priority: 'high',
    owner: OWNER_CODER, branch: BRANCH, flag: 'DS_V2_DOCS', worktree: null, pr: null,
    tags: ['ds-v2', 'git', 'commit'], blockedBy: ['TASK-716'],
    description: 'Commit único, mensagem descritiva, sem `--force`. Push só do branch (não para main). PR aberto contra main com screenshots da preview HTML.',
    createdAt: now, updatedAt: now,
  },
];

const allNew = [...macroTasks, ...granularTasks];
data.tasks.push(...allNew);
data.metrics = data.metrics || {};
data.metrics.totalTasks = data.tasks.length;
data.metrics.lastTaskId = allNew[allNew.length - 1].id;
data.metrics.lastUpdated = now;
data.generatedAt = new Date().toISOString();

fs.writeFileSync(SCRUM, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ ${allNew.length} tasks adicionadas (TASK-700..717). Total: ${data.tasks.length}`);
console.log(`  Bloco A macro: TASK-700 (in_progress)`);
console.log(`  Bloco A granular: TASK-711..717`);
console.log(`  Próximos blocos: TASK-701..710 (ready, dependentes)`);
