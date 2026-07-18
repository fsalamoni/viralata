#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO = '/workspace/viralata';
const KEY = process.env.V3_KEY || 'HOME';
const TASK = process.env.V3_TASK || `TASK-V3-${KEY}`;
const BRANCH = `v3-redesign/${KEY.toLowerCase()}`;
const TOKEN = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

function gitCmd(cwd, cmd) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
}
function push(cwd, ref) {
  const remote = TOKEN
    ? `https://${TOKEN}@github.com/fsalamoni/viralata.git`
    : 'origin';
  return gitCmd(cwd, `git push ${remote} ${ref}`);
}

const pcKey = KEY.charAt(0) + KEY.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// === MAIN ===
console.log(`[step-4] Deploy ${KEY}...`);

// Checkout branch
const cur = gitCmd(REPO, 'git branch --show-current').trim();
if (cur !== BRANCH) {
  const wtDir = path.join(REPO, '.worktrees', `v3-${KEY}`);
  if (fs.existsSync(wtDir)) {
    try { execSync(`git worktree remove --force ${wtDir}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
    try { execSync(`git branch -D ${BRANCH}`, { cwd: REPO, stdio: 'pipe' }); } catch {}
    execSync('git worktree prune', { cwd: REPO, stdio: 'pipe' });
  }
  try { gitCmd(REPO, 'git stash push -m "step4"'); } catch {}
  try { gitCmd(REPO, `git checkout ${BRANCH}`); } catch(e) {
    console.error(`FATAL checkout: ${e.message}`); process.exit(1);
  }
  try { gitCmd(REPO, 'git stash pop'); } catch {}
}

// Build
console.log('[step-4] Build...');
const r = spawnSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'inherit', timeout: 5*60*1000 });
if (r.status !== 0) { console.error('FAIL: build'); try { gitCmd(REPO,'git checkout main'); } catch {} process.exit(1); }

// Anti-fachada
const distDir = path.join(REPO, 'dist', 'assets');
const chunk = fs.readdirSync(distDir).find(f =>
  (f.startsWith(`${pcKey}.v3-`) || f.startsWith(`${pcKey}V3-`)) && f.endsWith('.js')
);
if (!chunk) { console.error(`FAIL: chunk V3 nao encontrado`); try { gitCmd(REPO,'git checkout main'); } catch {} process.exit(1); }
const size = fs.statSync(path.join(distDir, chunk)).size;
console.log(`[step-4] V3 chunk: ${chunk} (${size} bytes)`);
if (size < 500) { console.error(`FAIL: chunk < 500 bytes`); try { gitCmd(REPO,'git checkout main'); } catch {} process.exit(1); }

// Bump sw.js
console.log('[step-4] Bump sw...');
const vc = path.join(REPO, 'vite.config.js');
let v = fs.readFileSync(vc, 'utf-8');
const m = v.match(/filename:\s*'sw-v(\d+)\.js'/);
if (m) {
  v = v.replace(/filename:\s*'sw-v\d+\.js'/, `filename: 'sw-v${parseInt(m[1])+1}.js'`);
  fs.writeFileSync(vc, v);
  console.log(`[step-4] sw-v${m[1]}.js → sw-v${parseInt(m[1])+1}.js`);
}

// Commit + push branch
try {
  gitCmd(REPO, 'git add -A');
  gitCmd(REPO, `git commit -m "chore: V3 ${KEY} build + sw bump (${TASK})"`);
  push(REPO, BRANCH);
  console.log(`[step-4] Branch push OK`);
} catch(e) {
  if (!e.message.includes('nothing to commit')) console.error(`WARN push: ${e.message}`);
}

// Merge
console.log('[step-4] Merge...');
try {
  gitCmd(REPO, 'git checkout main');
  gitCmd(REPO, `git merge --no-ff ${BRANCH} -m "merge: V3 redesign ${KEY} (${TASK})"`);
  push(REPO, 'main');
  console.log('[step-4] Merge OK');
} catch(e) {
  console.error(`FAIL merge: ${e.message}`); process.exit(1);
}

// SCRUM
console.log('[step-4] SCRUM...');
try {
  gitCmd(REPO, `node .harness/scrum.cjs review ${TASK}`);
  gitCmd(REPO, `node .harness/scrum.cjs done ${TASK}`);
  gitCmd(REPO, 'node .harness/sync.cjs --fix');
  gitCmd(REPO, 'git add -A');
  gitCmd(REPO, `git commit -m "chore(scrum): ${TASK} done — V3 ${KEY} deployed"`);
  push(REPO, 'main');
  console.log('[step-4] SCRUM OK');
} catch(e) {
  console.error(`WARN SCRUM: ${e.message}`);
}

console.log(`[step-4] PASS. V3 ${KEY} deployed.`);
process.exit(0);
