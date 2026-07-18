#!/usr/bin/env node
/**
 * .harness/v3-redesign/ORCHESTRATOR.cjs
 *
 * Maestro do V3 Redesign Loop. Coordena os 4 steps e gerencia estado persistente.
 *
 * COMPORTAMENTO:
 *  1. Garante /workspace/viralata existe (clona se vazio)
 *  2. Lê STATE.json
 *  3. Se fila vazia → desabilita cron e sai com exit 42 (ALL_DONE)
 *  4. Executa o step atual do STATE
 *  5. Atualiza STATE (próximo step ou próxima página)
 *  6. Se exit ≠ 0 → registra erro, NÃO avança
 *
 * SAÍDA: exit 0 (ok), 1 (erro), 42 (all done)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO = '/workspace/viralata';
const DIR = path.join(REPO, '.harness', 'v3-redesign');
const STATE_PATH = path.join(DIR, 'STATE.json');
const LOG_DIR = path.join(DIR, 'LOG');

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    log('STATE.json não existe. Criando estado inicial (HOME = próxima página)...');
    const initialState = {
      currentKey: 'HOME',
      currentFlag: 'V3_PAGE_HOME',
      currentTask: 'TASK-V3-HOME',
      currentPhase: 'step-1',
      lastRun: 0,
      lastError: null,
      queue: ['LOGIN', 'PROFILE', 'CHAT', 'ADOPTION', 'COMMUNITY_DETAIL', 'CLUB_DETAIL', 'SEARCH', 'EVENTS', 'FOSTER', 'VOLUNTEER', 'MURAL', 'ADMIN', 'ORG_ADMIN', 'COMMUNITY_ADMIN', 'SHELTER_ADMIN'],
      history: [
        { key: 'FEED', task: 'TASK-920', doneAt: '2026-07-17T00:00:00.000Z', commitSha: '0cab8ea9', regency: 'docs/REGENCY_FEED_V3.md' },
        { key: 'PET_DETAIL', task: 'TASK-927', doneAt: '2026-07-17T00:00:00.000Z', commitSha: 'a924ab6b', regency: 'docs/REGENCY_PET_DETAIL_V3.md' },
        { key: 'LEGAL', task: 'TASK-930', doneAt: '2026-07-17T00:00:00.000Z', commitSha: 'caeed857', regency: 'docs/REGENCY_LEGAL_V3.md' },
      ],
    };
    saveState(initialState);
    return initialState;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function ensureRepo() {
  if (!fs.existsSync(path.join(REPO, '.git'))) {
    log(`Workspace vazio. Clonando fsalamoni/viralata em ${REPO}...`);
    try {
      const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
      const url = token
        ? `https://${token}@github.com/fsalamoni/viralata.git`
        : 'https://github.com/fsalamoni/viralata.git';
      execSync(`git clone ${url} ${REPO}`, { stdio: 'inherit', timeout: 120000 });
      log('Clone OK.');
    } catch (e) {
      log(`FATAL: clone falhou: ${e.message}`);
      process.exit(1);
    }
  } else {
    log('Workspace existe. git pull...');
    try {
      execSync('git pull --no-rebase origin main', { cwd: REPO, stdio: 'inherit' });
    } catch (e) {
      log(`WARN: pull falhou (não fatal): ${e.message}`);
    }
    // Fix: origin/main pode ter conflict markers — remover do working tree
    try {
      const harnessDir = path.join(REPO, '.harness', 'v3-redesign');
      ['step-2-implement.cjs', 'step-4-deploy.cjs'].forEach(f => {
        const fp = path.join(harnessDir, f);
        if (!require('fs').existsSync(fp)) return;
        const c = require('fs').readFileSync(fp, 'utf8');
        if (c.includes('<<<<')) {
          const lines = c.split('\n'), out = [], skip = false;
          for (const l of lines) {
            const t = l.trim();
            if (t.startsWith('<<<<')) { skip = true; continue; }
            if (t === '=====') { skip = false; continue; }
            if (t.startsWith('>>>>')) { skip = false; continue; }
            if (!skip) out.push(l);
          }
          require('fs').writeFileSync(fp, out.join('\n') + '\n');
          log(`FIX: conflict markers removidos de ${f}`);
        }
      });
    } catch {}
  }
}

function logPath(key) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  return path.join(LOG_DIR, `${key}.log`);
}

function runStep(state) {
  const stepName = state.currentPhase;
  const script = path.join(DIR, `${stepName}-*.cjs`);
  const stepScripts = fs.readdirSync(DIR).filter((f) => f.startsWith(`${stepName}-`) && f.endsWith('.cjs'));
  if (stepScripts.length === 0) {
    log(`FATAL: step script não encontrado para ${stepName}`);
    return 1;
  }
  const stepFile = path.join(DIR, stepScripts[0]);

  const key = state.currentKey;
  const logFile = logPath(key);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  logStream.write(`\n\n=== ${new Date().toISOString()} ${stepName} ===\n`);

  log(`Executando ${stepScripts[0]} para ${key}...`);
  const result = spawnSync('node', [stepFile], {
    cwd: REPO,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 90 * 60 * 1000, // 90min
    env: { ...process.env, V3_KEY: key, V3_FLAG: state.currentFlag, V3_TASK: state.currentTask },
  });

  logStream.write(`STDOUT:\n${result.stdout || ''}\n`);
  logStream.write(`STDERR:\n${result.stderr || ''}\n`);
  logStream.write(`EXIT: ${result.status}\n`);
  logStream.end();

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result.status ?? 1;
}

function advancePhase(state) {
  const phaseOrder = ['step-1', 'step-2', 'step-3', 'step-4'];
  const idx = phaseOrder.indexOf(state.currentPhase);
  if (idx < phaseOrder.length - 1) {
    state.currentPhase = phaseOrder[idx + 1];
  } else {
    // step-4 done → next page
    const completed = state.currentKey;
    state.history.push({
      key: completed,
      task: state.currentTask,
      doneAt: new Date().toISOString(),
    });
    // Save history entry
    saveState(state);

    // Próxima página
    const next = state.queue.shift();
    if (!next) {
      // Fila vazia
      state.currentKey = 'ALL_DONE';
      state.currentPhase = 'done';
      saveState(state);
      return 'ALL_DONE';
    }
    state.currentKey = next;
    state.currentFlag = `V3_PAGE_${next}`;
    state.currentTask = `TASK-V3-${next}`;
    state.currentPhase = 'step-1';
  }
  saveState(state);
  return 'NEXT';
}

function disableCron() {
  log('Desabilitando cron v3-redesign-loop...');
  try {
    const result = spawnSync('mavis', ['cron', 'update', '--task_id', '420121683280091', '--enabled', 'false'], {
      encoding: 'utf-8',
      timeout: 30000,
    });
    log(`mavis: ${result.stdout} ${result.stderr}`);
  } catch (e) {
    log(`WARN: mavis falhou (${e.message}). User precisa desabilitar manualmente.`);
  }
}

function acquireLock() {
  const lockPath = '/tmp/v3-redesign-loop.lock';
  const lockAge = 1000 * 60 * 60 * 2; // 2h
  if (fs.existsSync(lockPath)) {
    const stat = fs.statSync(lockPath);
    const age = Date.now() - stat.mtimeMs;
    if (age < lockAge) {
      log(`LOCK ativo (${Math.round(age/1000)}s atrás). Outra execução em andamento. Saindo com exit 0 (cron vai tentar de novo).`);
      process.exit(0);
    }
    log(`Lock stale (${Math.round(age/1000)}s atrás). Removendo.`);
  }
  fs.writeFileSync(lockPath, `${process.pid}@${Date.now()}`);
}

function releaseLock() {
  const lockPath = '/tmp/v3-redesign-loop.lock';
  try {
    const content = fs.readFileSync(lockPath, 'utf8');
    if (content.startsWith(`${process.pid}@`)) {
      fs.unlinkSync(lockPath);
    }
  } catch {}
}

function main() {
  log('=== V3 Redesign Orchestrator ===');
  acquireLock();
  ensureRepo();
  const state = loadState();
  log(`Estado: ${state.currentKey} | ${state.currentPhase} | fila restante: ${state.queue.length}`);

  if (state.currentPhase === 'done' || state.queue.length === 0) {
    log('ALL_DONE — fila vazia.');
    disableCron();
    releaseLock();
    process.exit(42);
  }

  const exitCode = runStep(state);
  state.lastRun = Date.now();

  if (exitCode === 0) {
    const result = advancePhase(state);
    state.lastError = null;
    saveState(state);
    if (result === 'ALL_DONE') {
      log('Fila completa. Desabilitando cron.');
      disableCron();
      releaseLock();
      process.exit(42);
    }
    log(`OK. Próximo: ${state.currentKey} | ${state.currentPhase}`);
    releaseLock();
    process.exit(0);
  } else {
    state.lastError = `Step ${state.currentPhase} falhou com exit ${exitCode}`;
    saveState(state);
    log(`ERRO: ${state.lastError}. Aguardando 120s (para GitHub Actions pushar)...`);
    releaseLock();
    setTimeout(() => process.exit(1), 120000);
  }
}

main();
