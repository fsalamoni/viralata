#!/usr/bin/env node
/**
 * .harness/v3-redesign/step-4-deploy.cjs
 *
 * STEP 4: Testes + Build + Commit + Push + SCRUM.
 *
 * Estratégia (revisada 2026-07-18):
 *  - O step-2 cria um worktree em `.worktrees/v3-<KEY>` e commita lá
 *  - O worktree compartilha o .git com o main, mas é um diretório separado
 *  - O branch `v3-redesign/<key>` existe APENAS no worktree (não no main nem no remote)
 *  - step-4 precisa: detectar worktree, fazer build lá, depois voltar pro main, merge, push
 *
 * IMPORTANTE (D-WORKTREE-STEP4-01): step-4 SEMPRE opera dentro do worktree
 * até o momento do merge. Se o worktree não existir mais, exit 1 (step-2 falhou).
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
const wtDir = path.join(REPO, '.worktrees', `v3-${KEY}`);
const TOKEN = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

function gitCmd(cwd, cmd) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
}
function push(cwd, ref) {
  const remote = TOKEN
    ? `https://${TOKEN}@github.com/fsalamoni/viralata.git`
    : 'origin';
  try {
    return gitCmd(cwd, `git push ${remote} ${ref}`);
  } catch (e) {
    // Push rejeitado (non-fast-forward, fetch first, rejected, etc.)
    const errMsg = e.message || '';
    const isDiverge = errMsg.includes('non-fast-forward') || errMsg.includes('rejected') || errMsg.includes('fetch first');
    if (!isDiverge) throw e;
    console.log(`[step-4] Push rejeitado — fazendo fetch + merge theirs...`);
    gitCmd(cwd, `git fetch origin`);
    const branchName = ref.replace('refs/heads/', '');
    gitCmd(cwd, `git merge -X theirs origin/${branchName} -m ${JSON.stringify('merge: aceitar remote changes em ' + ref)}`);
    return gitCmd(cwd, `git push ${remote} ${ref}`);
  }
}

// Converte KEY em PascalCase para o nome do componente
// HOME → Home, CLUB_DETAIL → ClubDetail
function toPascalCase(k) {
  return k.split('_').map(p => p.charAt(0) + p.slice(1).toLowerCase()).join('');
}
const PC = toPascalCase(KEY);

console.log(`[step-4] Deploy ${KEY}...`);

// 0. Verificar se o worktree existe (passo 2 deve ter criado)
if (!fs.existsSync(wtDir)) {
  console.error(`[step-4] FATAL: worktree nao encontrado em ${wtDir} (step-2 falhou?)`);
  process.exit(1);
}

// 0a. Garantir node_modules no worktree (symlink do main ou install)
const wtNm = path.join(wtDir, 'node_modules');
if (!fs.existsSync(wtNm)) {
  // Tentar symlink do main primeiro
  const mainNm = path.join(REPO, 'node_modules');
  if (fs.existsSync(mainNm)) {
    try {
      fs.symlinkSync(mainNm, wtNm, 'dir');
      console.log(`[step-4] node_modules symlink: ${mainNm} -> ${wtNm}`);
    } catch (e) {
      console.log(`[step-4] symlink falhou, fazendo npm install: ${e.message}`);
      execSync('npm install', { cwd: wtDir, stdio: 'inherit', timeout: 600000 });
    }
  } else {
    console.log(`[step-4] node_modules nao existe no main, rodando npm install...`);
    execSync('npm install', { cwd: wtDir, stdio: 'inherit', timeout: 600000 });
  }
}

// 1. Verificar que o branch existe no worktree
let curBranch;
try {
  curBranch = gitCmd(wtDir, 'git branch --show-current').trim();
} catch (e) {
  console.error(`[step-4] FATAL: nao consegui ler branch do worktree: ${e.message}`);
  process.exit(1);
}
if (curBranch !== BRANCH) {
  console.error(`[step-4] FATAL: worktree esta em '${curBranch}', esperado '${BRANCH}'`);
  process.exit(1);
}
console.log(`[step-4] Worktree OK: ${wtDir} (branch ${BRANCH})`);

// 2. Bump sw.js (no worktree — vai pro commit do branch)
console.log('[step-4] Bump sw...');
const vc = path.join(wtDir, 'vite.config.js');
let v = fs.readFileSync(vc, 'utf-8');
const m = v.match(/filename:\s*'sw-v(\d+)\.js'/);
let swOldN = null, swNewN = null;
if (m) {
  swOldN = parseInt(m[1], 10);
  swNewN = swOldN + 1;
  v = v.replace(/filename:\s*'sw-v\d+\.js'/, `filename: 'sw-v${swNewN}.js'`);
  fs.writeFileSync(vc, v);
  console.log(`[step-4] sw-v${swOldN}.js → sw-v${swNewN}.js`);
}

// 3. Build (no worktree)
console.log('[step-4] Build...');
const r = spawnSync('npm', ['run', 'build'], {
  cwd: wtDir,
  stdio: 'inherit',
  timeout: 5 * 60 * 1000,
});
if (r.status !== 0) {
  console.error(`[step-4] FAIL: build (exit ${r.status})`);
  process.exit(1);
}

// 4. Anti-fachada: verificar que o chunk V3 existe e tem tamanho razoável
const distDir = path.join(wtDir, 'dist', 'assets');
if (!fs.existsSync(distDir)) {
  console.error(`[step-4] FAIL: dist/assets nao existe`);
  process.exit(1);
}
const chunk = fs.readdirSync(distDir).find(f =>
  (f.startsWith(`${PC}.v3-`) || f.startsWith(`${PC}V3-`)) && f.endsWith('.js')
);
if (!chunk) {
  console.error(`[step-4] FAIL: chunk V3 nao encontrado em dist/assets (procurei ${PC}.v3-* ou ${PC}V3-*)`);
  process.exit(1);
}
const size = fs.statSync(path.join(distDir, chunk)).size;
console.log(`[step-4] V3 chunk: ${chunk} (${size} bytes)`);
if (size < 500) {
  console.error(`[step-4] FAIL: chunk V3 < 500 bytes — fachada?`);
  process.exit(1);
}

// 5. Commit + push branch (no worktree)
try {
  gitCmd(wtDir, 'git add -A');
  const commitMsg = `chore(${KEY.toLowerCase()}): V3 build + sw-v${swNewN} (${TASK})`;
  gitCmd(wtDir, `git commit -m ${JSON.stringify(commitMsg)}`);
  push(wtDir, BRANCH);
  console.log(`[step-4] Branch push OK`);
} catch (e) {
  if (!e.message.includes('nothing to commit')) {
    console.error(`[step-4] FAIL: commit/push: ${e.message}`);
    process.exit(1);
  }
  console.log(`[step-4] Nada a commitar (já estava atualizado)`);
}

// 6. Voltar pro main e fazer merge
console.log('[step-4] Merge em main...');
try {
  // Garantir que estamos no main
  const mainCur = gitCmd(REPO, 'git branch --show-current').trim();
  if (mainCur !== 'main') {
    gitCmd(REPO, 'git checkout main');
  }
  // Backup harness scripts (têm fixes locais que o reset --hard perderia)
  const BACKUP_DIR = '/tmp/v3-harness-backup';
  const fs2 = require('fs');
  if (!fs2.existsSync(BACKUP_DIR)) fs2.mkdirSync(BACKUP_DIR, { recursive: true });
  const harnessDir = path.join(REPO, '.harness', 'v3-redesign');
  ['ORCHESTRATOR.cjs', 'step-1-analyze.cjs', 'step-2-implement.cjs', 'step-3-regency.cjs', 'step-4-deploy.cjs'].forEach(f => {
    const src = path.join(harnessDir, f);
    if (fs2.existsSync(src)) fs2.copyFileSync(src, path.join(BACKUP_DIR, f));
  });
  // Reset para origin/main
  gitCmd(REPO, 'git fetch origin');
  gitCmd(REPO, 'git reset --hard origin/main');
  // Restore harness scripts (com fixes locais)
  fs2.readdirSync(BACKUP_DIR).forEach(f => {
    fs2.copyFileSync(path.join(BACKUP_DIR, f), path.join(harnessDir, f));
  });
  // Merge
  const mergeMsg = `merge: V3 redesign ${KEY} (${TASK})`;
  gitCmd(REPO, `git merge --no-ff ${BRANCH} -m ${JSON.stringify(mergeMsg)}`);
  push(REPO, 'main');
  console.log('[step-4] Merge OK');
} catch (e) {
  console.error(`[step-4] FAIL merge: ${e.message}`);
  process.exit(1);
}

// 7. Limpar worktree
try {
  execSync(`git worktree remove --force ${wtDir}`, { cwd: REPO, stdio: 'pipe' });
  execSync(`git branch -D ${BRANCH}`, { cwd: REPO, stdio: 'pipe' });
  execSync('git worktree prune', { cwd: REPO, stdio: 'pipe' });
  console.log('[step-4] Worktree limpo');
} catch (e) {
  console.warn(`[step-4] WARN cleanup: ${e.message}`);
}

// 8. SCRUM update
console.log('[step-4] SCRUM...');
try {
  gitCmd(REPO, `node .harness/scrum.cjs review ${TASK}`);
  gitCmd(REPO, `node .harness/scrum.cjs done ${TASK}`);
  gitCmd(REPO, 'node .harness/sync.cjs --fix');
  gitCmd(REPO, 'git add -A');
  const scrumMsg = `chore(scrum): ${TASK} done — V3 ${KEY} deployed`;
  gitCmd(REPO, `git commit -m ${JSON.stringify(scrumMsg)}`);
  push(REPO, 'main');
  console.log('[step-4] SCRUM OK');
} catch (e) {
  console.error(`[step-4] FAIL SCRUM: ${e.message}`);
  process.exit(1);
}

console.log(`[step-4] PASS. V3 ${KEY} deployed.`);
process.exit(0);
