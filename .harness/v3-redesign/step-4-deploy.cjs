#!/usr/bin/env node
/**
 * .harness/v3-redesign/step-4-deploy.cjs
 *
 * STEP 4: Testes + Build + Bump SW + Merge + SCRUM.
 *
 * Fluxo:
 *  1. Checkout do branch v3-redesign/<KEY> no main repo (mesmo .git, arquivos disponíveis)
 *  2. Vitest (tem node_modules no main repo)
 *  3. Build
 *  4. Anti-fachada: V3 chunk > 500 bytes
 *  5. Bump sw-v<N> no vite.config.js
 *  6. Commit bump no branch + push
 *  7. Merge branch → main + push
 *  8. Volta para main
 *  9. SCRUM: review + done + sync
 * 10. Commit SCRUM + push
 *
 * Exit 0 se tudo OK, exit 1 se falhar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO = '/workspace/viralata';
const KEY = process.env.V3_KEY || 'HOME';
const FLAG = process.env.V3_FLAG || `V3_PAGE_${KEY}`;
const TASK = process.env.V3_TASK || `TASK-V3-${KEY}`;
const BRANCH = `v3-redesign/${KEY.toLowerCase()}`;

function git(cwd, cmd, opts = {}) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe', ...opts });
}

const wtDir = path.join(REPO, '.worktrees', `v3-${KEY}`);

console.log(`[step-4] Iniciando deploy de ${KEY}...`);

// 0. Garantir que estamos no branch v3-redesign/<KEY> no main repo
// O worktree impede checkout do mesmo branch em dois lugares — remover worktree primeiro
const currentBranch = git(REPO, 'git branch --show-current').trim();
if (currentBranch !== BRANCH) {
  // Remover worktree se existir (não há mais necessidade dele — .git é compartilhado)
  if (fs.existsSync(wtDir)) {
    console.log(`[step-4] Removendo worktree ${wtDir} (branch já está no .git)`);
    try { execSync(`git worktree remove --force ${wtDir}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
    try { execSync(`git branch -D ${BRANCH}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
    execSync('git worktree prune', { cwd: REPO, stdio: 'pipe' });
  }
  console.log(`[step-4] Checkout branch ${BRANCH} no main repo...`);
  try { git(REPO, `git checkout ${BRANCH}`); } catch(e) {
    console.error(`[step-4] FATAL: checkout falhou: ${e.message}`);
    process.exit(1);
  }
} else {
  console.log(`[step-4] Já no branch ${BRANCH} (HEAD do main repo)`);
}

// 1. Vitest (do main repo — tem node_modules)
console.log(`[step-4] Rodando vitest...`);
const testResult = spawnSync('npx', ['vitest', 'run'], {
  cwd: REPO, stdio: 'inherit', timeout: 5 * 60 * 1000,
});
if (testResult.status !== 0) {
  console.error(`[step-4] FAIL: vitest falhou (exit ${testResult.status})`);
  git(REPO, 'git checkout main');
  process.exit(1);
}

// 2. Build
console.log(`[step-4] Rodando build...`);
const buildResult = spawnSync('npm', ['run', 'build'], {
  cwd: REPO, stdio: 'inherit', timeout: 5 * 60 * 1000,
});
if (buildResult.status !== 0) {
  console.error(`[step-4] FAIL: build falhou (exit ${buildResult.status})`);
  git(REPO, 'git checkout main');
  process.exit(1);
}

// 3. Anti-fachada: verificar chunk V3 > 500 bytes
const distDir = path.join(REPO, 'dist', 'assets');
if (!fs.existsSync(distDir)) {
  console.error(`[step-4] FAIL: dist/assets não existe`);
  git(REPO, 'git checkout main');
  process.exit(1);
}
const v3Chunk = fs.readdirSync(distDir).find((f) => f.startsWith(`${KEY}V3-`) && f.endsWith('.js'));
if (!v3Chunk) {
  console.error(`[step-4] FAIL: chunk V3 (${KEY}V3-*.js) não encontrado em dist/assets/`);
  git(REPO, 'git checkout main');
  process.exit(1);
}
const v3Size = fs.statSync(path.join(distDir, v3Chunk)).size;
console.log(`[step-4] V3 chunk: ${v3Chunk} (${v3Size} bytes)`);
if (v3Size < 500) {
  console.error(`[step-4] FAIL: V3 chunk muito pequeno (${v3Size} bytes) — fachada?`);
  git(REPO, 'git checkout main');
  process.exit(1);
}

// 4. Bump sw-v<N>.js → sw-v<N+1>.js
console.log(`[step-4] Bump sw.js...`);
const viteConfig = path.join(REPO, 'vite.config.js');
let viteContent = fs.readFileSync(viteConfig, 'utf-8');
const m = viteContent.match(/filename:\s*'sw-v(\d+)\.js'/);
if (m) {
  const oldN = parseInt(m[1], 10);
  const newN = oldN + 1;
  viteContent = viteContent.replace(/filename:\s*'sw-v\d+\.js'/, `filename: 'sw-v${newN}.js'`);
  fs.writeFileSync(viteConfig, viteContent);
  console.log(`[step-4] sw-v${oldN}.js → sw-v${newN}.js (D-PWA-CACHE-01)`);
}

// 5. Commit bump + push (no branch)
console.log(`[step-4] Commit bump + push no ${BRANCH}...`);
try {
  git(REPO, 'git add -A');
  git(REPO, `git commit -m "chore: bump sw + tests passing (${TASK})"`);
  git(REPO, `git push origin ${BRANCH}`);
  console.log(`[step-4] Branch ${BRANCH} push OK`);
} catch (e) {
  console.error(`[step-4] FAIL: git commit/push falhou: ${e.message}`);
  git(REPO, 'git checkout main');
  process.exit(1);
}

// 6. Merge no main
console.log(`[step-4] Merge ${BRANCH} → main...`);
try {
  git(REPO, 'git checkout main');
  git(REPO, `git merge --no-ff ${BRANCH} -m "merge: V3 redesign ${KEY} (${TASK})"`);
  git(REPO, 'git push origin main');
  console.log(`[step-4] Merge OK`);
} catch (e) {
  console.error(`[step-4] FAIL: merge/push main falhou: ${e.message}`);
  process.exit(1);
}

// 7. SCRUM update (no main)
console.log(`[step-4] SCRUM update...`);
try {
  git(REPO, `node .harness/scrum.cjs review ${TASK}`);
  git(REPO, `node .harness/scrum.cjs done ${TASK}`);
  git(REPO, 'node .harness/sync.cjs --fix');
  git(REPO, 'git add -A');
  git(REPO, `git commit -m "chore(scrum): ${TASK} done — V3 ${KEY} deployed"`);
  git(REPO, 'git push origin main');
  console.log(`[step-4] SCRUM OK`);
} catch (e) {
  console.error(`[step-4] FAIL: SCRUM update falhou: ${e.message}`);
  process.exit(1);
}

console.log(`[step-4] PASS. V3 ${KEY} deployed com sucesso.`);
process.exit(0);
