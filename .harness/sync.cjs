#!/usr/bin/env node
/**
 * .harness/sync.cjs
 *
 * Auto-sync SCRUM_TASKS.json com estado real do git:
 *   - Lê `git worktree list` para detectar worktrees
 *   - Para cada worktree, calcula commitsAhead vs main
 *   - Atualiza activeWorktrees no JSON
 *   - Valida integridade referencial (blockedBy, relatedTasks)
 *   - Detecta IDs duplicados
 *   - Reporta e (opcionalmente) corrige
 *
 * Uso:
 *   node .harness/sync.cjs            # só reporta
 *   node .harness/sync.cjs --fix      # corrige o que puder
 *   node .harness/sync.cjs --check    # exit 1 se houver problemas
 *   node .harness/sync.cjs --json     # output em JSON
 *
 * Repositório: auto-detecta via __dirname subindo até .git. Override
 * com env SCRUM_REPO=/path/to/repo.
 *
 * TASK-061 · Bloco A · Mavis mvs_311d078987d0414a90f57ef28b789b18
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = process.env.SCRUM_REPO || (() => {
  // Auto-detecta: sobe diretórios até achar .git ou package.json
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
})();
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const ARGS = process.argv.slice(2);
const FIX = ARGS.includes('--fix');
const CHECK = ARGS.includes('--check');
const JSON_OUT = ARGS.includes('--json');

function sh(cmd, cwd = REPO) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function detectWorktrees() {
  const raw = sh('git worktree list --porcelain');
  if (!raw) return [];
  const blocks = raw.split('\n\n').filter(Boolean);
  const result = [];
  let mainCommit = null;
  for (const block of blocks) {
    const lines = block.split('\n');
    const obj = {};
    for (const line of lines) {
      const [k, v] = line.split(' ', 2);
      obj[k] = v;
    }
    if (obj.worktree && obj.HEAD && obj.branch) {
      result.push({
        path: obj.worktree,
        head: obj.HEAD,
        branch: obj.branch.replace('refs/heads/', ''),
      });
    }
  }
  // Detecta main: branch com nome "main" ou primeiro item
  const main = result.find(w => w.branch === 'main');
  if (main) mainCommit = main.head;
  return { worktrees: result, mainCommit };
}

function commitsAhead(branchPath, mainCommit) {
  if (!mainCommit) return 0;
  const out = sh(`git rev-list --count ${mainCommit}..HEAD`, branchPath);
  return out ? parseInt(out, 10) : 0;
}

function loadJson() {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveJson(j) {
  j.generatedAt = new Date().toISOString();
  fs.writeFileSync(JSON_PATH, JSON.stringify(j, null, 2) + '\n', 'utf8');
}

function findIssues(j) {
  const issues = { dupIds: [], brokenRefs: [], missingOwners: [], orphanFlags: [] };
  // Popula Map com TODAS as tasks primeiro (detecta duplicatas)
  const ids = new Map();
  j.tasks.forEach(t => {
    if (ids.has(t.id)) issues.dupIds.push({ id: t.id, first: ids.get(t.id), second: t.title });
    else ids.set(t.id, t.title);
    if (!t.owner) issues.missingOwners.push(t.id);
  });
  // Depois checa refs (Map já está completo)
  j.tasks.forEach(t => {
    (t.blockedBy || []).forEach(b => {
      if (!ids.has(b)) issues.brokenRefs.push({ task: t.id, type: 'blockedBy', points_to: b });
    });
    (t.relatedTasks || []).forEach(r => {
      if (!ids.has(r)) {
        issues.brokenRefs.push({ task: t.id, type: 'relatedTasks', related_to: r });
        if (process.env.SYNC_DEBUG) console.log('DEBUG broken:', t.id, '->', r, '| ids.has=', ids.has(r));
      }
    });
  });
  return issues;
}

function sync(j) {
  const { worktrees, mainCommit } = detectWorktrees();
  const updates = [];

  // Mapear worktrees existentes no JSON
  const existing = new Map(j.activeWorktrees.map(w => [w.id, w]));

  // Para cada worktree detectada, criar/atualizar entry
  const next = [];
  for (const wt of worktrees) {
    if (wt.branch === 'main') continue; // main não conta como activeWorktree
    const id = path.basename(wt.path); // wt-e79e15ca
    const ahead = commitsAhead(wt.path, mainCommit);
    const status = ahead === 0 ? 'in-sync' : 'ahead-of-main';
    const prev = existing.get(id);
    const headTitle = sh('git log -1 --format=%s', wt.path) || '';
    const updated = {
      id,
      branch: wt.branch,
      head: wt.head,
      headTitle,
      path: wt.path,
      status,
      commitsAhead: ahead,
      primarySession: prev?.primarySession || null,
      sessionTitle: prev?.sessionTitle || null,
      focus: prev?.focus || [],
    };
    next.push(updated);
    if (prev && (prev.commitsAhead !== ahead || prev.head !== wt.head || prev.status !== status)) {
      updates.push({ id, from: prev.commitsAhead, to: ahead, status });
    }
  }

  j.activeWorktrees = next;
  j.metrics.mainCommit = mainCommit;
  j.metrics.activeWorktreesAheadOfMain = next.filter(w => w.status === 'ahead-of-main').length;

  // Atualizar lastActiveAt da minha sessão
  const me = j.activeSessions.find(s => s.id === 'mvs_311d078987d0414a90f57ef28b789b18');
  if (me) me.lastActiveAt = new Date().toISOString();

  return { updates, mainCommit, worktreeCount: next.length };
}

function main() {
  const j = loadJson();
  const issues = findIssues(j);
  const syncResult = sync(j);

  const result = {
    issues,
    sync: syncResult,
    tasksTotal: j.tasks.length,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('=== Scrum Sync Report ===');
    console.log(`Tarefas: ${result.tasksTotal}`);
    console.log(`Main commit: ${syncResult.mainCommit}`);
    console.log(`Worktrees ativos: ${syncResult.worktreeCount}`);
    console.log(`Updates: ${syncResult.updates.length}`);
    syncResult.updates.forEach(u => console.log(`  - ${u.id}: ${u.from} → ${u.to} commits (${u.status})`));
    console.log(`\nIssues:`);
    console.log(`  IDs duplicados: ${issues.dupIds.length}`);
    console.log(`  Refs quebradas: ${issues.brokenRefs.length}`);
    console.log(`  Sem owner: ${issues.missingOwners.length}`);
    if (issues.brokenRefs.length > 0) {
      console.log('  Detalhes:');
      issues.brokenRefs.forEach(b => console.log(`    - ${b.task} → ${b.points_to || b.related_to} (${b.type})`));
    }
  }

  if (FIX) {
    saveJson(j);
    if (!JSON_OUT) console.log(`\n✓ JSON salvo em ${JSON_PATH}`);
  }

  if (CHECK) {
    const hasProblems = issues.dupIds.length > 0 || issues.brokenRefs.length > 0;
    process.exit(hasProblems ? 1 : 0);
  }
}

main();
