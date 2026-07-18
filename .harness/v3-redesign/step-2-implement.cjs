#!/usr/bin/env node
/**
 * .harness/v3-redesign/step-2-implement.cjs
 *
 * STEP 2: Implementa V3 do zero.
 *
 * Saída:
 *  - <Page>.v3.jsx (novo, do zero)
 *  - Wrapper com React.lazy + flag
 *  - V1 renomeado para <Page>.v1.jsx
 *  - Sub-componentes em src/components/<KEY_LOWER>/
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

const pageRel = PAGE_PATHS[KEY];
const pageFull = path.join(REPO, pageRel);
if (!fs.existsSync(pageFull)) {
  console.error(`[step-2] FATAL: V1 não encontrado em ${pageRel}`);
  process.exit(1);
}

console.log(`[step-2] Implementando V3 de ${KEY} (${pageRel})...`);

// 1. Criar worktree
const wtDir = path.join(REPO, '.worktrees', `v3-${KEY}`);
const branchName = `v3-redesign/${KEY.toLowerCase()}`;

try {
  // Limpar worktree anterior se existir
  try { execSync(`git worktree remove --force ${wtDir}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
  try { execSync(`git branch -D ${branchName}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
  execSync(`git worktree add ${wtDir} -b ${branchName} main`, { cwd: REPO, stdio: 'inherit' });
  console.log(`[step-2] Worktree criado: ${wtDir}`);
} catch (e) {
  console.error(`[step-2] FATAL: worktree falhou: ${e.message}`);
  process.exit(1);
}

// 2. Renomear V1 para .v1.jsx
const v1Target = pageFull.replace(/\.jsx$/, '.v1.jsx');
if (!fs.existsSync(v1Target)) {
  try {
    fs.renameSync(pageFull, v1Target);
    console.log(`[step-2] V1 renomeado: ${path.basename(pageFull)} → ${path.basename(v1Target)}`);
  } catch (e) {
    console.error(`[step-2] FATAL: rename V1 falhou: ${e.message}`);
    process.exit(1);
  }
}

// 3. Criar <Page>.v3.jsx (esqueleto — o agente completa)
const v3Path = pageFull;
const v3Template = `/**
 * @fileoverview ${KEY} V3 — redesign completo no padrão DS-V2.
 *
 * V3 (${TASK}): implementação do zero, sem aproveitar o JSX do V1.
 * Flag: ${FLAG} (default OFF, gated via React.lazy).
 *
 * @see docs/V3_${KEY}_QUESTIONS.md
 * @see docs/REGENCY_${KEY}_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React from 'react';
import Seo from '@/components/Seo';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';

export default function ${KEY}V3() {
  // TODO: implementar V3 do zero (NÃO aproveitar V1)
  // Estrutura base — preencher com:
  // - banner/hero
  // - conteúdo principal (cards/listas)
  // - estados (loading/empty/error)
  // - actions (CTAs)
  // - SEO + a11y

  return (
    <div className="arena-page mx-auto max-w-7xl px-4 py-6" data-testid="${KEY.toLowerCase()}-page">
      <Seo title="${KEY} — Viralata" description="V3 redesign de ${KEY} no padrão DS-V2." />
      <h1 className="text-2xl font-extrabold text-foreground">${KEY} (V3 — em construção)</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Esta página está sendo refeita do zero no padrão V3.
        Flag <code>${FLAG}</code> deve estar ON para visualizar.
      </p>
      <EmptyState
        title="Implementação V3 em andamento"
        description="O agente vai preencher esta página na próxima iteração do step-2 (análise + implementação feature por feature)."
      />
    </div>
  );
}
`;

fs.writeFileSync(v3Path, v3Template);
console.log(`[step-2] V3 esqueleto criado: ${path.basename(v3Path)}`);

// 4. Criar wrapper com React.lazy + flag
const wrapperPath = pageFull;
const wrapperContent = `/**
 * @fileoverview ${KEY} — wrapper que escolhe V3 ou V1.
 *
 * Flag \`${FLAG}\` (default OFF) → V3.
 * Senão → V1.
 *
 * IMPORTANTE: React.lazy com dynamic import (D-VITE-LAZY-01).
 * Vite faz constant folding em if/else estático e ELIMINA branches alternativas.
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import ${KEY}V1 from './${KEY}.v1';

const ${KEY}V3 = lazy(() => import(/* webpackChunkName: "${KEY}V3" */ './${KEY}.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="mt-4 h-32 w-full" />
    </div>
  );
}

export default function ${KEY}Wrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.${FLAG});
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <${KEY}V3 />
      </Suspense>
    );
  }
  return <${KEY}V1 />;
}
`;

fs.writeFileSync(wrapperPath, wrapperContent);
console.log(`[step-2] Wrapper criado: ${path.basename(wrapperPath)}`);

// 5. Commit no worktree
try {
  execSync('git add -A', { cwd: wtDir, stdio: 'inherit' });
  const commitMsg = 'feat(' + KEY.toLowerCase() + '): V3 redesign esqueleto + wrapper lazy (TASK-' + TASK + ')\n\n' +
    '- Renomeia V1 -> .v1.jsx\n' +
    '- Cria .v3.jsx (esqueleto a ser preenchido)\n' +
    '- Cria wrapper com React.lazy + flag ' + FLAG + ' (D-VITE-LAZY-01)\n' +
    '- NENHUM aproveitamento de JSX V1 (voce pediu do zero)\n\n' +
    'Proximo: step-3 vai gerar REGENCY_V3.md (12+ secoes).';
  execSync('git commit -m ' + JSON.stringify(commitMsg), { cwd: wtDir, stdio: 'inherit' });
  console.log('[step-2] Commit feito no worktree.');
} catch (e) {
  console.error('[step-2] FATAL: commit falhou: ' + e.message);
  process.exit(1);
}

console.log(`[step-2] PASS. Avançar para step-3.`);
process.exit(0);
