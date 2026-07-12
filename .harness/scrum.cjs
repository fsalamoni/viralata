#!/usr/bin/env node
/**
 * .harness/scrum.cjs
 *
 * CLI canônica para ATUALIZAÇÃO AUTOMÁTICA do SCRUM_TASKS.json (Regra B §B.1).
 *
 * Comandos:
 *   node .harness/scrum.cjs start TASK-XXX --owner mvs_xxx [--branch feat/...]
 *   node .harness/scrum.cjs done TASK-XXX
 *   node .harness/scrum.cjs review TASK-XXX
 *   node .harness/scrum.cjs block TASK-XXX --reason "Motivo"
 *   node .harness/scrum.cjs drop TASK-XXX --reason "Motivo"
 *   node .harness/scrum.cjs list [status] [--owner mvs_xxx]
 *   node .harness/scrum.cjs show TASK-XXX
 *
 * Por que existe:
 *   - Regra B §B.1: toda task iniciada/finalizada/atualizada deve atualizar SCRUM_TASKS.json
 *   - Regra B §B.4: root é owner canônico, mas workers precisam de uma forma
 *     padronizada de fazer transições sem editar JSON cru (race condition)
 *   - Auto-import (Regra B §B.2, já implementado em a2ed8b6): depois de qualquer
 *     mudança, sync.cjs --watch re-embed no painel-scrum.html
 *
 * Locking:
 *   - Single-instance via proper-lockfile (mesma estratégia do fix Mavis 44f)
 *   - Atomic write: writeFileSync(tmp) + renameSync(tmp, target)
 *
 * Uso típico pelos workers:
 *   $ node .harness/scrum.cjs start TASK-235 --owner $(mavis communication peers --self)
 *   # ... trabalha ...
 *   $ node .harness/scrum.cjs done TASK-235
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const lockfile = require('proper-lockfile');

const REPO = process.env.SCRUM_REPO || (() => {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
})();
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');

const VALID_STATUSES = ['backlog', 'ready', 'in_progress', 'in_review', 'blocked', 'done', 'dropped'];
const VALID_TRANSITIONS = {
  backlog: ['ready', 'dropped'],
  ready: ['in_progress', 'blocked', 'dropped'],
  in_progress: ['in_review', 'blocked', 'ready', 'dropped'],
  in_review: ['done', 'in_progress', 'blocked'],
  blocked: ['ready', 'in_progress', 'dropped'],
  done: [],  // terminal
  dropped: [], // terminal
};

function now() {
  return new Date().toISOString().slice(0, 19);
}

function loadJson() {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
}

function saveJson(j) {
  j.generatedAt = new Date().toISOString();
  j.metrics = j.metrics || {};
  j.metrics.totalTasks = j.tasks.length;
  const byStatus = {};
  j.tasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
  j.metrics.done = byStatus.done || 0;
  j.metrics.inProgress = byStatus.in_progress || 0;
  j.metrics.inReview = byStatus.in_review || 0;
  j.metrics.blocked = byStatus.blocked || 0;
  j.metrics.ready = byStatus.ready || 0;
  j.metrics.backlog = byStatus.backlog || 0;
  j.metrics.dropped = byStatus.dropped || 0;
  j.metrics.lastUpdate = `${now()} — via scrum.cjs (Regra B §B.1)`;

  // Atomic write: tmp + rename
  const tmp = JSON_PATH + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmp, JSON.stringify(j, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, JSON_PATH);
}

function findTask(j, id) {
  return j.tasks.find(t => t.id === id);
}

function validateTransition(from, to) {
  if (from === to) return;
  const allowed = VALID_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Transição inválida: ${from} → ${to}. Permitidas: ${allowed.join(', ') || '(terminal)'}`);
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function withLock(fn) {
  // Lock the JSON file directory (not the file itself, because atomic rename
  // replaces the file under us if locked on the file).
  const lockDir = path.dirname(JSON_PATH);
  const lockfilePath = path.join(lockDir, '.scrum.lock');
  try {
    const release = await lockfile.lock(lockDir, {
      lockfilePath,
      retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
      stale: 10000,
    });
    try {
      return await fn();
    } finally {
      await release();
    }
  } catch (err) {
    if (err.code === 'ELOCKED' || err.message.includes('busy')) {
      console.error(`[scrum] Lock busy, another process is writing. Retry in 1s.`);
      await new Promise(r => setTimeout(r, 1000));
      return withLock(fn);
    }
    throw err;
  }
}

async function start(taskId, opts) {
  await withLock(async () => {
    const j = loadJson();
    const t = findTask(j, taskId);
    if (!t) throw new Error(`Task not found: ${taskId}`);
    validateTransition(t.status, 'in_progress');
    t.status = 'in_progress';
    t.owner = opts.owner || t.owner || 'unassigned';
    if (opts.branch) t.branch = opts.branch;
    if (opts.worktree) t.worktree = opts.worktree;
    t.updatedAt = now();
    saveJson(j);
    console.log(`[scrum] ✓ ${taskId} → in_progress (owner: ${t.owner}, branch: ${t.branch || '—'})`);
  });
}

async function done(taskId, opts) {
  await withLock(async () => {
    const j = loadJson();
    const t = findTask(j, taskId);
    if (!t) throw new Error(`Task not found: ${taskId}`);
    validateTransition(t.status, 'done');
    t.status = 'done';
    t.resolvedAt = new Date().toISOString().slice(0, 10);
    t.updatedAt = now();
    if (opts.pr) t.pr = opts.pr;
    if (opts.evidence) t.evidence = (t.evidence || '') + ' ' + opts.evidence;
    saveJson(j);
    console.log(`[scrum] ✓ ${taskId} → done${opts.pr ? ` (pr: ${opts.pr})` : ''}`);
  });
}

async function review(taskId, opts) {
  await withLock(async () => {
    const j = loadJson();
    const t = findTask(j, taskId);
    if (!t) throw new Error(`Task not found: ${taskId}`);
    validateTransition(t.status, 'in_review');
    t.status = 'in_review';
    if (opts.pr) t.pr = opts.pr;
    t.updatedAt = now();
    saveJson(j);
    console.log(`[scrum] ✓ ${taskId} → in_review${opts.pr ? ` (pr: ${opts.pr})` : ''}`);
  });
}

async function block(taskId, opts) {
  await withLock(async () => {
    const j = loadJson();
    const t = findTask(j, taskId);
    if (!t) throw new Error(`Task not found: ${taskId}`);
    validateTransition(t.status, 'blocked');
    t.status = 'blocked';
    if (opts.reason) t.evidence = (t.evidence || '') + ' BLOCKED: ' + opts.reason;
    t.updatedAt = now();
    saveJson(j);
    console.log(`[scrum] ✓ ${taskId} → blocked${opts.reason ? ` (reason: ${opts.reason})` : ''}`);
  });
}

async function dropTask(taskId, opts) {
  await withLock(async () => {
    const j = loadJson();
    const t = findTask(j, taskId);
    if (!t) throw new Error(`Task not found: ${taskId}`);
    validateTransition(t.status, 'dropped');
    t.status = 'dropped';
    if (opts.reason) t.evidence = (t.evidence || '') + ' DROPPED: ' + opts.reason;
    t.updatedAt = now();
    saveJson(j);
    console.log(`[scrum] ✓ ${taskId} → dropped${opts.reason ? ` (reason: ${opts.reason})` : ''}`);
  });
}

function list(filter, opts) {
  const j = loadJson();
  let tasks = j.tasks;
  if (filter) tasks = tasks.filter(t => t.status === filter);
  if (opts.owner) tasks = tasks.filter(t => t.owner === opts.owner);
  console.log(`# SCRUM_TASKS.json — ${tasks.length} tasks${filter ? ` (status=${filter})` : ''}${opts.owner ? ` (owner=${opts.owner})` : ''}`);
  for (const t of tasks) {
    console.log(`  ${t.id} [${t.status.padEnd(11)}] ${t.owner || 'unassigned'.padEnd(20)} ${t.title.slice(0, 70)}`);
  }
}

function show(taskId) {
  const j = loadJson();
  const t = findTask(j, taskId);
  if (!t) throw new Error(`Task not found: ${taskId}`);
  console.log(JSON.stringify(t, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const taskId = args._[1];

  if (!cmd) {
    console.log(`Uso: node .harness/scrum.cjs <start|done|review|block|drop|list|show> TASK-XXX [opções]`);
    console.log(`Opções: --owner, --branch, --worktree, --pr, --reason, --evidence`);
    process.exit(0);
  }

  switch (cmd) {
    case 'start':   return await start(taskId, args);
    case 'done':    return await done(taskId, args);
    case 'review':  return await review(taskId, args);
    case 'block':   return await block(taskId, args);
    case 'drop':    return await dropTask(taskId, args);
    case 'list':    return list(args._[1], args);
    case 'show':    return show(taskId);
    default:
      console.error(`Comando desconhecido: ${cmd}`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`[scrum] ERRO: ${err.message}`);
  process.exit(1);
});
