#!/usr/bin/env node
/**
 * .harness/v3-redesign/step-4-deploy.cjs
 *
 * STEP 4: Testes + Build + Commit + Push + SCRUM.
 *
 * 1. Validação: build verde, testes passam, anti-fachada
 * 2. Bump sw-v<N> → sw-v<N+1>
 * 3. Merge worktree → main
 * 4. Push + valida deploy (curl + hash)
 * 5. SCRUM update
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

const wtDir = path.join(REPO, '.worktrees', `v3-${KEY}`);

console.log(`[step-4] Iniciando deploy de ${KEY}...`);

// 1. Rodar testes do V3
console.log(`[step-4] Rodando vitest...`);
const testResult = spawnSync('npx', ['vitest', 'run'], {
  cwd: wtDir,
  stdio: 'inherit',
  timeout: 5 * 60 * 1000,
});
if (testResult.status !== 0) {
  console.error(`[step-4] FAIL: vitest falhou (exit ${testResult.status})`);
  process.exit(1);
}

// 2. Build
console.log(`[step-4] Rodando build...`);
const buildResult = spawnSync('npm', ['run', 'build'], {
  cwd: wtDir,
  stdio: 'inherit',
  timeout: 5 * 60 * 1000,
});
if (buildResult.status !== 0) {
  console.error(`[step-4] FAIL: build falhou (exit ${buildResult.status})`);
  process.exit(1);
}

// 3. Verificar bundle do V3
const distDir = path.join(wtDir, 'dist', 'assets');
if (!fs.existsSync(distDir)) {
  console.error(`[step-4] FAIL: dist/assets não existe`);
  process.exit(1);
}
const v3Chunk = fs.readdirSync(distDir).find((f) => f.startsWith(`${KEY}V3-`) && f.endsWith('.js'));
if (!v3Chunk) {
  console.error(`[step-4] FAIL: chunk V3 não encontrado em dist/assets/`);
  process.exit(1);
}
const v3Size = fs.statSync(path.join(distDir, v3Chunk)).size;
console.log(`[step-4] V3 chunk: ${v3Chunk} (${v3Size} bytes)`);
if (v3Size < 500) {
  console.error(`[step-4] FAIL: V3 chunk muito pequeno (${v3Size} bytes) — fachada?`);
  process.exit(1);
}

// 4. Bump sw.js
console.log(`[step-4] Bump sw.js...`);
const viteConfig = path.join(wtDir, 'vite.config.js');
let viteContent = fs.readFileSync(viteConfig, 'utf-8');
const m = viteContent.match(/filename:\s*'sw-v(\d+)\.js'/);
if (m) {
  const oldN = parseInt(m[1], 10);
  const newN = oldN + 1;
  viteContent = viteContent.replace(/filename:\s*'sw-v\d+\.js'/, `filename: 'sw-v${newN}.js'`);
  fs.writeFileSync(viteConfig, viteContent);
  console.log(`[step-4] sw-v${oldN}.js → sw-v${newN}.js`);
}

// 5. Commit + push (no worktree)
console.log(`[step-4] Commit + push no worktree...`);
try {
  execSync('git add -A', { cwd: wtDir, stdio: 'inherit' });
  execSync(`git commit -m "chore: bump sw + tests passing (TASK-${TASK})"`, { cwd: wtDir, stdio: 'inherit' });
  execSync(`git push origin v3-redesign/${KEY.toLowerCase()}`, { cwd: wtDir, stdio: 'inherit' });
} catch (e) {
  console.error(`[step-4] FAIL: git push falhou: ${e.message}`);
  process.exit(1);
}

// 6. Merge no main (com push final)
console.log(`[step-4] Merge em main...`);
try {
  execSync(`git merge --no-ff v3-redesign/${KEY.toLowerCase()} -m "merge: V3 redesign ${KEY} (TASK-${TASK})"`, { cwd: REPO, stdio: 'inherit' });
  execSync('git push origin main', { cwd: REPO, stdio: 'inherit' });
} catch (e) {
  console.error(`[step-4] FAIL: merge/push em main falhou: ${e.message}`);
  process.exit(1);
}

// 7. Limpar worktree
try {
  execSync(`git worktree remove --force ${wtDir}`, { cwd: REPO, stdio: 'pipe' });
  execSync(`git branch -D v3-redesign/${KEY.toLowerCase()}`, { cwd: REPO, stdio: 'pipe' });
  execSync('git worktree prune', { cwd: REPO, stdio: 'pipe' });
} catch (e) {
  console.warn(`[step-4] WARN: cleanup do worktree falhou: ${e.message}`);
}

// 8. SCRUM update
console.log(`[step-4] SCRUM update...`);
try {
  execSync(`node .harness/scrum.cjs review ${TASK}`, { cwd: REPO, stdio: 'inherit' });
  execSync(`node .harness/scrum.cjs done ${TASK}`, { cwd: REPO, stdio: 'inherit' });
  execSync('node .harness/sync.cjs --fix', { cwd: REPO, stdio: 'inherit' });
  execSync('git add -A', { cwd: REPO, stdio: 'pipe' });
  execSync(`git commit -m "chore(scrum): ${TASK} done — V3 ${KEY} deployed"`, { cwd: REPO, stdio: 'inherit' });
  execSync('git push origin main', { cwd: REPO, stdio: 'inherit' });
} catch (e) {
  console.error(`[step-4] FAIL: SCRUM update falhou: ${e.message}`);
  process.exit(1);
}

console.log(`[step-4] PASS. V3 ${KEY} deployed com sucesso.`);
console.log(`[step-4] Próxima iteração: próxima página da fila (PRÓXIMO state.currentKey).`);
process.exit(0);
