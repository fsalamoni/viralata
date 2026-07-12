// .harness/_orchestrator-2026-07-11.cjs
// Adiciona 7 tasks de orquestração ao SCRUM_TASKS.json
// Regra B §2.2 — toda task começa com status=in_progress + owner=sessionId
// Lock: já avisado via mavis communication send (broadcast)
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const SESSION = 'mvs_311d078987d0414a90f57ef28b789b18';
const BRANCH = 'wt/e79e15ca';
const WT = '.worktrees/wt-e79e15ca';
const TODAY = '2026-07-11';
const NOW_ISO = '2026-07-11T21:35:00-03:00';

const newTasks = [
  {
    id: 'TASK-134',
    title: 'Criar AGENTS.md (Regra A 5 eixos + Regra B auto SCRUM update)',
    type: 'docs',
    category: 'infra',
    status: 'in_progress',
    priority: 'critical',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    tags: ['regra-A', 'regra-B', 'mandamento', 'governance'],
    description: 'Gravar AGENTS.md como mandamento permanente: Regra A (avaliação plena por funcionalidade nos 5 eixos UX/Papéis/Regras/Integrações/Pós-deploy) + Regra B (auto SCRUM update em toda task, início e fim, com lock em batch). Inclui processo de 5 passos (planejar→pesquisar→reavaliar→polish→persistir), anti-patterns proibidos, e schema de task com auto-campos. Atende pedido do usuário 2026-07-11 21:30.',
    createdAt: TODAY,
    updatedAt: TODAY,
    startedAt: TODAY,
  },
  {
    id: 'TASK-135',
    title: 'Orquestrar 3 Task agents em paralelo: mapping Regra A de funcionalidades',
    type: 'chore',
    category: 'infra',
    status: 'in_progress',
    priority: 'critical',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    tags: ['regra-A', 'orquestração', 'paralelo'],
    description: 'Spawnar 3 Task agents (general subagent) em paralelo pra mapear TODAS as necessidades plenas de cada funcionalidade. Cada agente é READ-ONLY (pesquisa, análise, mapeamento). Frentes: (1) Voluntários — ex. user: UI em painel abrigo + página pública + perfil + vínculo com vitrines/eventos + atribuições. (2) Abrigos + Foster + Adoção — fluxo pet→vitrine→application→entrevista→match→contrato→pós. (3) Comunidade + Adotante + Eventos — feed, eventos, adimplência, patrocínio, busca, perfil adotante. Cada agente volta com: (a) lista de arquivos atuais por eixo, (b) gaps identificados, (c) plano de implementação (tasks, worktrees, ordem), (d) total de tasks novas estimadas.',
    createdAt: TODAY,
    updatedAt: TODAY,
    startedAt: TODAY,
  },
  {
    id: 'TASK-136',
    title: 'Mapeamento Regra A: VOLUNTÁRIOS (5 eixos: UX, Papéis, Regras, Integrações, Pós-deploy)',
    type: 'docs',
    category: 'shelter',
    status: 'in_progress',
    priority: 'high',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    tags: ['regra-A', 'mapeamento', 'voluntários', '5-eixos'],
    description: 'Task do Agente A. Mapear estado atual + gaps da feature Voluntários em TODOS os 5 eixos. Eixos: (1) UX — página pública do abrigo com CTA, perfil do voluntário, vitrine/evento com campo "vincular voluntários", painel admin com aba, empty/error/loading states, mobile, a11y. (2) Papéis — anonymous, adopter, volunteer, foster, shelter_admin, team_member, platform_admin, system. (3) Regras — Zod schema, Firestore rules com return, auditoria, LGPD, snapshot, multi-tenant, rate limit. (4) Integrações — Cloud Function email, FCM, search, Storage docs, Google Forms opcional. (5) Pós-deploy — flag SHELTER_VOLUNTEERS_V1 default OFF, smoke em 1 abrigo canário, Sentry, rollback. Output: lista de tasks novas pra SCRUM_TASKS com prioridade/owner estimados.',
    createdAt: TODAY,
    updatedAt: TODAY,
    startedAt: TODAY,
  },
  {
    id: 'TASK-137',
    title: 'Mapeamento Regra A: ABRIGOS + FOSTER + ADOÇÃO (fluxo pet→application→match→pós)',
    type: 'docs',
    category: 'shelter',
    status: 'in_progress',
    priority: 'high',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    tags: ['regra-A', 'mapeamento', 'abrigos', 'foster', 'adoção', '5-eixos'],
    description: 'Task do Agente B. Mapear fluxo completo de adoção + foster + gestão de abrigo em TODOS os 5 eixos. Etapas: pet intake → cadastro (com fotos, docs, vaccines) → vitrine (público + search) → application (formulário dinâmico, applicant_snapshot) → entrevista (chat/email/FCM) → match (admin escolhe, contrato) → contrato (assinatura eletrônica Lei 14.063/2020) → onboarding (termos, doações) → pós (milestones 7/30/90 dias via cron). Por eixo: UX (público + admin + perfil adotante + perfil pet), Papéis (todos os 7), Regras (Zod, rules, LGPD, snapshot, multi-tenant), Integrações (Forms, Storage, Functions, email, FCM, search), Pós-deploy (flag por fase, smoke por abrigo, monitoramento, rollback).',
    createdAt: TODAY,
    updatedAt: TODAY,
    startedAt: TODAY,
  },
  {
    id: 'TASK-138',
    title: 'Mapeamento Regra A: COMUNIDADE + ADOTANTE + EVENTOS (feed, eventos, adimplência, busca)',
    type: 'docs',
    category: 'community',
    status: 'in_progress',
    priority: 'high',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    tags: ['regra-A', 'mapeamento', 'comunidade', 'adotante', 'eventos', '5-eixos'],
    description: 'Task do Agente C. Mapear Comunidade (organizações/clubes), perfil do Adotante, e Eventos em TODOS os 5 eixos. Comunidade: feed, mural, posts, comentários, permissões por papel, padronização visual ONG/comunidade. Adotante: perfil (bio, pets anteriores, preferências), dashboard, histórico de applications, mensagens, notificações. Eventos: criação (admin abrigo/platform), inscrição, presença, certificados, vínculo com pets/voluntários. Por eixo: UX (público + painel), Papéis, Regras, Integrações, Pós-deploy.',
    createdAt: TODAY,
    updatedAt: TODAY,
    startedAt: TODAY,
  },
  {
    id: 'TASK-139',
    title: 'Coordenar merge do auto-import do painel-scrum.html (TASK-202) do wt-auto-import',
    type: 'chore',
    category: 'infra',
    status: 'ready',
    priority: 'high',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    blockedBy: ['TASK-202'],
    tags: ['auto-import', 'painel-scrum', 'merge', 'coordenação'],
    description: 'O wt-auto-import (branch feat/harness-auto-import @ a6445ed) tem 4 commits ahead de main com auto-import do SCRUM_TASKS no painel-scrum.html (TASK-202, sync.cjs --watch --serve, pill de status, botão reload, script autoSync()). Coordenar com mvs_44f2762343f94f28b506f2f4c8c12eae (peer wt-auto-import) o merge. Caminhos: (a) peer faz merge próprio dele (preferido), (b) cherry-pick dos 4 commits em main local, (c) rebase wt-auto-import em main. Smoke test após merge. Atualizar esta task → done quando mergeado.',
    createdAt: TODAY,
    updatedAt: TODAY,
  },
  {
    id: 'TASK-140',
    title: 'Avaliação independente (4 olhos) + consolidação + atualizar SCRUM_TASKS com achados',
    type: 'docs',
    category: 'infra',
    status: 'ready',
    priority: 'high',
    owner: SESSION,
    branch: BRANCH,
    worktree: WT,
    blockedBy: ['TASK-136', 'TASK-137', 'TASK-138'],
    tags: ['regra-A', 'avaliação-4-olhos', 'consolidação'],
    description: 'Após 3 Task agents (TASK-136, TASK-137, TASK-138) voltarem com relatórios: (1) Avaliação independente dos 3 relatórios (verificar cobertura dos 5 eixos, identificar gaps não mapeados, cross-check entre frentes — ex: voluntário vinculado a evento da comunidade). (2) Consolidação: lista única priorizada de tasks novas com base nos achados. (3) Adicionar tasks novas ao SCRUM_TASKS.json (sequencial, com Regra B §2.2). (4) Smoke test: typecheck + build + test verdes. (5) Commit + push. Esta task implementa Regra A §1.6 passo 3 (4 olhos).',
    createdAt: TODAY,
    updatedAt: TODAY,
  },
];

// Merge: adicionar só se não existir
let added = 0, skipped = 0;
for (const t of newTasks) {
  const exists = data.tasks.find(x => x.id === t.id);
  if (exists) {
    skipped++;
    continue;
  }
  data.tasks.push(t);
  added++;
}

// Atualizar generatedAt
data.generatedAt = NOW_ISO;

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`OK: added=${added} skipped=${skipped} total=${data.tasks.length}`);
console.log(`TASK-134..140: ${newTasks.map(t => `${t.id}(${t.status})`).join(' ')}`);
