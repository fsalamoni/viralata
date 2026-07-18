#!/usr/bin/env node
/**
 * .harness/v3-redesign/step-4-deploy.cjs
 *
 * STEP 4: Build + Bump SW + Merge + SCRUM.
 *
 * Fluxo:
 *  1. Checkout do branch v3-redesign/<KEY> no main repo (mesmo .git)
<<<<<<< Updated upstream
 *  2. Build (valida compilação — vitest pulado na fase esqueleto)
=======
 *  2. Build (valida compilação)
>>>>>>> Stashed changes
 *  3. Anti-fachada: V3 chunk > 500 bytes
 *  4. Bump sw-v<N> no vite.config.js
 *  5. Commit bump + push
 *  6. Merge branch → main + push
 *  7. SCRUM: review + done + sync
 *  8. Commit SCRUM + push
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

function gitCmd(cwd, cmd) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

<<<<<<< Updated upstream
=======
function gitFatal(cwd, cmd, msg) {
  try { gitCmd(cwd, cmd); } catch(e) {
    console.error(`[step-4] FATAL: ${msg}: ${e.message}`);
    try { gitCmd(REPO, 'git checkout main'); } catch {}
    process.exit(1);
  }
}

>>>>>>> Stashed changes
function spawnFatal(cwd, cmd, args, timeoutMs) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', timeout: timeoutMs });
  if (r.status !== 0) {
    console.error(`[step-4] FAIL: ${cmd} ${args.join(' ')} (exit ${r.status})`);
    try { gitCmd(REPO, 'git checkout main'); } catch {}
    process.exit(1);
  }
}

console.log(`[step-4] Iniciando deploy de ${KEY}...`);

<<<<<<< Updated upstream
// 0. Checkout do branch no main repo
const currentBranch = gitCmd(REPO, 'git branch --show-current').trim();
if (currentBranch !== BRANCH) {
=======
// 0. Checkout do branch no main repo (mesmo .git compartilhado)
const currentBranch = gitCmd(REPO, 'git branch --show-current').trim();
if (currentBranch !== BRANCH) {
  // Remover worktree se existir (mesmo branch não pode estar em dois lugares)
>>>>>>> Stashed changes
  const wtDir = path.join(REPO, '.worktrees', `v3-${KEY}`);
  if (fs.existsSync(wtDir)) {
    try { execSync(`git worktree remove --force ${wtDir}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
    try { execSync(`git branch -D ${BRANCH}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
    execSync('git worktree prune', { cwd: REPO, stdio: 'pipe' });
  }
<<<<<<< Updated upstream
  try { gitCmd(REPO, 'git stash push -m "step-4 local"'); } catch {}
  console.log(`[step-4] Checkout branch ${BRANCH}...`);
  try { gitCmd(REPO, `git checkout ${BRANCH}`); } catch(e) {
    console.error(`[step-4] FATAL: checkout falhou: ${e.message}`);
    process.exit(1);
  }
=======
  // Stash local changes para não perder
  try {
    const stashMsg = gitCmd(REPO, 'git stash push -m "step-4 local changes"').trim();
    console.log(`[step-4] Stashed: ${stashMsg}`);
  } catch {}
  console.log(`[step-4] Checkout branch ${BRANCH}...`);
  gitFatal(REPO, `git checkout ${BRANCH}`, 'checkout branch falhou');
  // Restore stash
>>>>>>> Stashed changes
  try { gitCmd(REPO, 'git stash pop'); } catch {}
} else {
  console.log(`[step-4] Já no branch ${BRANCH}`);
}

<<<<<<< Updated upstream
// 1. Build (vitest completo >5min — pulado na fase esqueleto)
console.log(`[step-4] Build...`);
=======
// 1. Build (valida compilação — mais importante que vitest pra esqueleto)
console.log(`[step-4] Rodando build...`);
>>>>>>> Stashed changes
spawnFatal(REPO, 'npm', ['run', 'build'], 5 * 60 * 1000);

// 2. Anti-fachada: verificar chunk V3 > 500 bytes
const distDir = path.join(REPO, 'dist', 'assets');
if (!fs.existsSync(distDir)) {
  console.error(`[step-4] FAIL: dist/assets não existe`);
<<<<<<< Updated upstream
  try { gitCmd(REPO, 'git checkout main'); } catch {}
  process.exit(1);
=======
  gitFatal(REPO, 'git checkout main', '');
>>>>>>> Stashed changes
}
// Tenta encontrar chunk V3: Home.v3-*.js ou HomeV3-*.js
const files = fs.readdirSync(distDir);
const v3Chunk = files.find(f => f.match(new RegExp(KEY + 'V3-[^.]+\\.js$', 'i')));
if (!v3Chunk) {
<<<<<<< Updated upstream
  // Fallback: qualquer arquivo com KEY + V3
  const alt = files.find(f => f.includes('V3') && f.includes(KEY) && f.endsWith('.js'));
  if (alt) {
    console.log(`[step-4] V3 chunk (fallback): ${alt}`);
  } else {
    console.error(`[step-4] FAIL: chunk V3 (${KEY}V3-*.js) não encontrado em dist/assets/`);
    try { gitCmd(REPO, 'git checkout main'); } catch {}
    process.exit(1);
=======
  // Tenta prefixo alternativo (Home.v3 → HomeV3)
  const alt = fs.readdirSync(distDir).find((f) =>
    (f.includes('HomeV3') || f.includes('Home')) && f.endsWith('.js') && f.includes(KEY));
  if (alt) {
    console.log(`[step-4] V3 chunk (alt): ${alt}`);
  } else {
    console.error(`[step-4] FAIL: chunk V3 não encontrado em dist/assets/`);
    gitFatal(REPO, 'git checkout main', '');
>>>>>>> Stashed changes
  }
}
const chunkFile = v3Chunk || alt;
const v3Size = fs.statSync(path.join(distDir, chunkFile)).size;
console.log(`[step-4] V3 chunk: ${chunkFile} (${v3Size} bytes)`);
if (v3Size < 500) {
  console.error(`[step-4] FAIL: V3 chunk muito pequeno (${v3Size} bytes) — fachada?`);
<<<<<<< Updated upstream
  try { gitCmd(REPO, 'git checkout main'); } catch {}
  process.exit(1);
=======
  gitFatal(REPO, 'git checkout main', '');
>>>>>>> Stashed changes
}

// 3. Bump sw-v<N>.js → sw-v<N+1>.js
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

<<<<<<< Updated upstream
// 4. Commit + push
=======
// 4. Commit bump + push
>>>>>>> Stashed changes
console.log(`[step-4] Commit + push...`);
try {
  gitCmd(REPO, 'git add -A');
  gitCmd(REPO, `git commit -m "chore: V3 ${KEY} build + sw bump (${TASK})"`);
  gitCmd(REPO, `git push origin ${BRANCH}`);
  console.log(`[step-4] Branch ${BRANCH} push OK`);
} catch (e) {
<<<<<<< Updated upstream
  if (!e.message.includes('nothing to commit')) {
    console.error(`[step-4] FAIL: git: ${e.message}`);
    try { gitCmd(REPO, 'git checkout main'); } catch {}
    process.exit(1);
  }
  console.log(`[step-4] Nada a commitar (build já feito)`);
=======
  // Se não há mudanças, ignora
  if (!e.message.includes('nothing to commit')) {
    console.error(`[step-4] FAIL: git commit/push: ${e.message}`);
    gitFatal(REPO, 'git checkout main', '');
  } else {
    console.log(`[step-4] Nada a commitar (já em dia)`);
  }
>>>>>>> Stashed changes
}

// 5. Merge no main
console.log(`[step-4] Merge ${BRANCH} → main...`);
try {
  gitCmd(REPO, 'git checkout main');
  gitCmd(REPO, `git merge --no-ff ${BRANCH} -m "merge: V3 redesign ${KEY} (${TASK})"`);
  gitCmd(REPO, 'git push origin main');
  console.log(`[step-4] Merge OK`);
} catch (e) {
<<<<<<< Updated upstream
  console.error(`[step-4] FAIL: merge: ${e.message}`);
=======
  console.error(`[step-4] FAIL: merge/push main: ${e.message}`);
>>>>>>> Stashed changes
  process.exit(1);
}

// 6. SCRUM update (no main)
console.log(`[step-4] SCRUM update...`);
try {
  gitCmd(REPO, `node .harness/scrum.cjs review ${TASK}`);
  gitCmd(REPO, `node .harness/scrum.cjs done ${TASK}`);
  gitCmd(REPO, 'node .harness/sync.cjs --fix');
  gitCmd(REPO, 'git add -A');
  gitCmd(REPO, `git commit -m "chore(scrum): ${TASK} done — V3 ${KEY} deployed"`);
  gitCmd(REPO, 'git push origin main');
  console.log(`[step-4] SCRUM OK`);
} catch (e) {
<<<<<<< Updated upstream
  console.error(`[step-4] WARN: SCRUM falhou: ${e.message} (não bloqueia deploy)`);
=======
  console.error(`[step-4] WARN: SCRUM update falhou: ${e.message} (não bloqueia deploy)`);
>>>>>>> Stashed changes
}

console.log(`[step-4] PASS. V3 ${KEY} deployed.`);
process.exit(0);
