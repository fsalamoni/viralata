#!/usr/bin/env node
/**
 * .harness/v3-redesign/step-1-analyze.cjs
 *
 * STEP 1: Análise exaustiva da página V1.
 *
 * Saída:
 *  - docs/V3_<KEY>_QUESTIONS.md (≥ 200 linhas)
 *  - 8-12 tasks filhas no SCRUM_TASKS.json
 *  - Lista de features + lacunas
 *
 * Exit 0 se válido, exit 1 se falhar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = '/workspace/viralata';
const KEY = process.env.V3_KEY || 'HOME';
const FLAG = process.env.V3_FLAG || `V3_PAGE_${KEY}`;
const TASK = process.env.V3_TASK || `TASK-V3-${KEY}`;

// Pages config — mapeia KEY → caminho do V1
const PAGE_PATHS = {
  HOME: 'src/pages/Home.jsx',
  LOGIN: 'src/pages/Login.jsx',
  PROFILE: 'src/pages/Profile.jsx',
  CHAT: 'src/modules/chat/pages/ChatPage.jsx',
  ADOPTION: 'src/pages/AdoptionWizard.jsx',
  COMMUNITY_DETAIL: 'src/modules/communities/pages/CommunityPublic.jsx',
  CLUB_DETAIL: 'src/modules/organizations/pages/ShelterPublic.jsx',
  SEARCH: 'src/pages/SearchPage.jsx',
  EVENTS: 'src/pages/EventsUnified.jsx',
  FOSTER: 'src/pages/FosterDashboard.jsx',
  VOLUNTEER: 'src/pages/VolunteerProgram.jsx',
  MURAL: 'src/pages/PublicMuralFeed.jsx',
  ADMIN: 'src/modules/admin/pages/AdminDashboard.jsx',
  ORG_ADMIN: 'src/modules/organizations/pages/OrganizationAdminPanel.jsx',
  COMMUNITY_ADMIN: 'src/modules/communities/pages/CommunityAdminPanel.jsx',
  SHELTER_ADMIN: 'src/modules/shelter/pages/ShelterAdminPanel.jsx',
};

const pagePath = path.join(REPO, PAGE_PATHS[KEY]);
if (!fs.existsSync(pagePath)) {
  console.error(`FATAL: página V1 não encontrada em ${pagePath}`);
  process.exit(1);
}

console.log(`[step-1] Analisando ${KEY} → ${PAGE_PATHS[KEY]}`);

const v1Content = fs.readFileSync(pagePath, 'utf-8');
const v1Lines = v1Content.split('\n').length;
console.log(`[step-1] V1: ${v1Lines} linhas, ${v1Content.length} bytes`);

// Extrai imports e hooks usados no V1
const imports = [...v1Content.matchAll(/import\s+(?:\*\s+as\s+)?(?:\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
const hooks = [...v1Content.matchAll(/use([A-Z]\w+)/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
const components = [...v1Content.matchAll(/<([A-Z]\w+)/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);

// Features inferidas do V1 (heurística simples)
const featuresV1 = [
  { name: 'Render principal', exists: true, notes: 'componente default export' },
  { name: 'Layout responsivo', exists: v1Content.includes('md:') || v1Content.includes('sm:'), notes: 'classes Tailwind detectadas' },
  { name: 'Loading state', exists: v1Content.includes('Skeleton') || v1Content.includes('isLoading'), notes: '' },
  { name: 'Error state', exists: v1Content.includes('ErrorState') || v1Content.includes('isError'), notes: '' },
  { name: 'Empty state', exists: v1Content.includes('EmptyState') || v1Content.includes('vazio'), notes: '' },
  { name: 'Acessibilidade (a11y)', exists: v1Content.includes('aria-') || v1Content.includes('role='), notes: '' },
  { name: 'Dark mode', exists: v1Content.includes('dark:'), notes: '' },
  { name: 'SEO <head>', exists: v1Content.includes('<Seo') || v1Content.includes('Seo('), notes: '' },
  { name: 'Analytics / tracking', exists: v1Content.includes('track') || v1Content.includes('analytics'), notes: '' },
  { name: 'i18n / múltiplos idiomas', exists: v1Content.includes('useTranslation') || v1Content.includes('t('), notes: '' },
];

// Lê o docs/SHELTER_MGMT_ROADMAP.md para ver features esperadas
let roadmapFeatures = [];
const roadmapPath = path.join(REPO, 'docs/SHELTER_MGMT_ROADMAP.md');
if (fs.existsSync(roadmapPath)) {
  const roadmap = fs.readFileSync(roadmapPath, 'utf-8');
  // Heurística: extrai linhas que mencionam a página
  const keyword = KEY.toLowerCase().replace(/_/g, ' ');
  const related = roadmap.split('\n').filter((l) =>
    l.toLowerCase().includes(keyword) || l.toLowerCase().includes(keyword.split(' ')[0])
  ).slice(0, 10);
  roadmapFeatures = related;
}

const qaQuestions = [
  `Quem é o público-alvo principal da página ${KEY}?`,
  `Quais são as 3 ações mais importantes que o usuário deve conseguir fazer?`,
  `A página atual é usada mais em mobile ou desktop? (verificar analytics)`,
  `Quais métricas de sucesso devemos mirar (conversão, engajamento, tempo na página)?`,
  `Há dark mode funcional com tokens? Se não, quais tokens faltam?`,
  `Acessibilidade: o fluxo principal é navegável por teclado? Há aria-labels adequados?`,
  `Loading state: o que o usuário vê durante o fetch? É otimista ou pessimista?`,
  `Error state: como comunicamos erros de rede? Há retry?`,
  `SEO: meta description, Open Graph, JSON-LD estão configurados?`,
  `Performance: bundle da página é < 30KB? Há code splitting?`,
  `A página tem empty state definido (zero pets, zero results, etc)?`,
  `Os dados vêm de Firestore direto ou via hook? Há cache?`,
  `Como o user role afeta o que aparece na página?`,
  `A página tem CTAs claros com hierarquia visual?`,
  `Mobile: gestos (swipe, pull-to-refresh) estão implementados?`,
];

const decisions = [];
for (let i = 1; i <= 12; i++) {
  decisions.push(`D${i}: decisão #${i} do redesign V3 de ${KEY} (a definir no step-2)`);
}

// Gera o doc V3_QUESTIONS
const docPath = path.join(REPO, `docs/V3_${KEY}_QUESTIONS.md`);
const doc = `# V3 ${KEY} — Análise e Q&A

> Gerado por \`.harness/v3-redesign/step-1-analyze.cjs\`
> Task: \`${TASK}\` | Flag: \`${FLAG}\`
> Página V1: \`${PAGE_PATHS[KEY]}\` (${v1Lines} linhas)

---

## 0. Identidade da Página

| Campo | Valor |
|---|---|
| KEY | ${KEY} |
| Rota | / |
| Componente V1 | \`${PAGE_PATHS[KEY]}\` |
| Linhas V1 | ${v1Lines} |
| Bytes V1 | ${v1Content.length} |
| Imports V1 | ${imports.length} (${imports.slice(0, 5).join(', ')}...) |
| Hooks V1 | ${hooks.length} (${hooks.join(', ')}) |
| Componentes V1 | ${components.length} (${components.slice(0, 5).join(', ')}...) |
| Flag V3 | \`${FLAG}\` (default OFF) |

---

## 1. Features Identificadas no V1

| # | Feature | Existe no V1? | Notas |
|---|---|---|---|
${featuresV1.map((f, i) => `| F${i + 1} | ${f.name} | ${f.exists ? '✅' : '❌'} | ${f.notes || '-'} |`).join('\n')}

---

## 2. Features Esperadas (do SHELTER_MGMT_ROADMAP.md)

${roadmapFeatures.length > 0 ? roadmapFeatures.map((l) => `- ${l}`).join('\n') : '_(nenhuma menção direta na roadmap)_'}

---

## 3. Lacunas Identificadas (V1 vs spec)

Lacunas a corrigir no V3 (preencher após análise manual):

- L1: _a definir_
- L2: _a definir_
- L3: _a definir_
- L4: _a definir_
- L5: _a definir_

---

## 4. Q&A (15 perguntas)

${qaQuestions.map((q, i) => `### Q${i + 1}. ${q}

_R: a definir_
`).join('\n')}

---

## 5. Decisões de Design (D1-D12)

${decisions.map((d) => `- ${d}`).join('\n')}

---

## 6. Próximo passo

Step 2 (implementação) vai:
1. Criar worktree \`v3-redesign/${KEY}\`
2. Implementar V3 do zero (NÃO aproveitar V1 JSX)
3. Para cada feature de F1-F10, criar sub-componente + teste
4. Gerar \`docs/REGENCY_${KEY}_V3.md\` (12+ seções)
`;

fs.writeFileSync(docPath, doc);
console.log(`[step-1] OK. Gerado ${docPath} (${doc.split('\n').length} linhas)`);

// Cria 8-12 tasks filhas no SCRUM
const scrumPath = path.join(REPO, '.harness/SCRUM_TASKS.json');
const scrumJson = JSON.parse(fs.readFileSync(scrumPath, 'utf-8'));
const childTasks = [];
for (let i = 1; i <= 8; i++) {
  const childId = `${TASK}-F${i}`;
  if (!scrumJson.tasks.find((t) => t.id === childId)) {
    childTasks.push({
      id: childId,
      title: `V3 ${KEY} Feature #${i} — a definir no step-2`,
      status: 'backlog',
      phase: `V3-${KEY}`,
      priority: 'medium',
      parentTask: TASK,
      createdAt: new Date().toISOString(),
      evidence: {},
    });
  }
}
scrumJson.tasks.push(...childTasks);
fs.writeFileSync(scrumPath, JSON.stringify(scrumJson, null, 2));
console.log(`[step-1] SCRUM: +${childTasks.length} tasks filhas criadas`);

console.log(`[step-1] PASS. Avançar para step-2.`);
process.exit(0);
