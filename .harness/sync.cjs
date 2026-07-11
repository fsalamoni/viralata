#!/usr/bin/env node
/**
 * .harness/sync.cjs
 *
 * Auto-sync SCRUM_TASKS.json com estado real do git + detecção inteligente:
 *   - Lê `git worktree list` para detectar worktrees
 *   - Para cada worktree, calcula commitsAhead vs main
 *   - Atualiza activeWorktrees no JSON
 *   - Detecta TASK-XXX em commit messages e:
 *     * Adiciona evento no history da task
 *     * Atualiza branch da task para a branch do commit
 *     * Adiciona commit hash na evidence se ainda não tiver
 *   - Detecta RISK-XXX em commits e atualiza riskRegister
 *   - Atualiza lastActiveAt da sessão root
 *   - Valida integridade referencial (blockedBy, relatedTasks)
 *   - Detecta IDs duplicados
 *
 * Uso:
 *   node .harness/sync.cjs            # só reporta
 *   node .harness/sync.cjs --fix      # corrige e salva
 *   node .harness/sync.cjs --check    # exit 1 se houver problemas
 *   node .harness/sync.cjs --json     # output em JSON
 *   node .harness/sync.cjs --quiet    # suprime output (para hooks)
 *
 * Repositório: auto-detecta via __dirname subindo até .git. Override
 * com env SCRUM_REPO=/path/to/repo.
 *
 * TASK-061 + TASK-126..130 automation · Mavis mvs_311d078987d0414a90f57ef28b789b18
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = process.env.SCRUM_REPO || (() => {
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
const QUIET = ARGS.includes('--quiet') || process.env.SYNC_QUIET === '1';

function sh(cmd, cwd = REPO) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function detectWorktrees() {
  const raw = sh('git worktree list --porcelain');
  if (!raw) return { worktrees: [], mainCommit: null };
  const blocks = raw.split('\n\n').filter(Boolean);
  const result = [];
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
  const main = result.find(w => w.branch === 'main');
  return { worktrees: result, mainCommit: main ? main.head : null };
}

function commitsAhead(branchPath, mainCommit) {
  if (!mainCommit) return 0;
  const out = sh(`git rev-list --count ${mainCommit}..HEAD`, branchPath);
  return out ? parseInt(out, 10) : 0;
}

// TASK-126 — detecta quando o worktree está ATRÁS de main.
// Sem isso, sync.cjs marcava wt/17ff480a como "in-sync" porque
// commitsAhead=0 (worktree parado num commit antigo que main já
// passou). A métrica correta: contar commits em main que não
// estão no worktree.
function commitsBehind(branchPath, mainCommit) {
  if (!mainCommit) return 0;
  const out = sh(`git rev-list --count HEAD..${mainCommit}`, branchPath);
  return out ? parseInt(out, 10) : 0;
}

function getCommits(branchPath, mainCommit) {
  if (!mainCommit) return [];
  const raw = sh(
    `git log ${mainCommit}..HEAD --pretty=format:"%H%x09%s%x09%ai%x09%an"`,
    branchPath
  );
  if (!raw) return [];
  return raw.split('\n').map(line => {
    const [hash, subject, date, author] = line.split('\t');
    return { hash, subject, date, author };
  });
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
  const issues = { dupIds: [], brokenRefs: [], missingOwners: [] };
  // Mapa único de IDs válidos: TASK-XXX mora em j.tasks, RISK-XXX mora em
  // j.riskRegister. Aceitamos ambos como destino de blockedBy.
  const ids = new Map();
  (j.riskRegister || []).forEach(r => ids.set(r.id, r.title || r.id));
  j.tasks.forEach(t => {
    if (ids.has(t.id)) issues.dupIds.push({ id: t.id, first: ids.get(t.id), second: t.title });
    else ids.set(t.id, t.title);
    if (!t.owner) issues.missingOwners.push(t.id);
  });
  j.tasks.forEach(t => {
    (t.blockedBy || []).forEach(b => {
      if (!ids.has(b)) issues.brokenRefs.push({ task: t.id, type: 'blockedBy', points_to: b });
    });
    (t.relatedTasks || []).forEach(r => {
      if (!ids.has(r)) issues.brokenRefs.push({ task: t.id, type: 'relatedTasks', related_to: r });
    });
  });
  return issues;
}

// Extrai TASK-XXX, RISK-XXX, MR#N de um texto
function extractRefs(text) {
  if (!text) return { tasks: [], risks: [], mrs: [] };
  const tasks = [...new Set((text.match(/\bTASK-\d+\b/g) || []))];
  const risks = [...new Set((text.match(/\bRISK-\d+\b/g) || []))];
  const mrs = [...new Set((text.match(/\bMR#\d+\b/g) || []))];
  return { tasks, risks, mrs };
}

function inferStatusFromCommit(subject) {
  // Convenção: feat/fix = implementação; chore/docs/refactor = polish;
  // test = test. NÃO promove status sozinho (muito arriscado),
  // só infere categoria.
  if (/^feat[\(:]|^fix[\(:]|^perf[\(:]/i.test(subject)) return 'implementation';
  if (/^chore[\(:]|^docs[\(:]|^style[\(:]|^refactor[\(:]/i.test(subject)) return 'polish';
  if (/^test[\(:]/i.test(subject)) return 'test';
  return 'unknown';
}

function ingestCommits(j, worktree, commits) {
  if (!commits.length) return { taskHits: 0, riskHits: 0, mrHits: 0 };
  let taskHits = 0, riskHits = 0, mrHits = 0;
  const taskById = new Map(j.tasks.map(t => [t.id, t]));
  const riskById = new Map((j.riskRegister || []).map(r => [r.id, r]));
  const wtId = path.basename(worktree.path);

  for (const c of commits.reverse()) { // mais antigo → mais novo, para histórico ficar cronológico
    const refs = extractRefs(c.subject);
    if (refs.tasks.length === 0 && refs.risks.length === 0 && refs.mrs.length === 0) continue;

    // Atualiza tasks referenciadas
    refs.tasks.forEach(taskId => {
      const t = taskById.get(taskId);
      if (!t) return;
      taskHits++;
      // Inicializa history se não existir
      if (!Array.isArray(t.history)) t.history = [];
      // Dedup por commit hash
      if (t.history.some(h => h.commit === c.hash)) return;
      t.history.push({
        ts: c.date,
        type: 'commit',
        worktree: wtId,
        branch: worktree.branch,
        commit: c.hash,
        short: c.hash.slice(0, 7),
        subject: c.subject,
        author: c.author,
        category: inferStatusFromCommit(c.subject),
      });
      // Atualiza branch se a task não tem branch definida, ou se difere
      if (!t.branch || t.branch !== worktree.branch) {
        // Só atualiza se a task estava "ready" (não estava em worktree específica ainda)
        if (t.status === 'ready' || !t.branch) {
          t.branch = worktree.branch;
          if (!t.worktree) t.worktree = `.worktrees/${wtId}`;
        }
      }
      // Adiciona evidence se ainda não tem ou se é fraca
      if (!t.evidence || t.evidence.length < 16) {
        t.evidence = `commit ${c.hash.slice(0, 7)} em ${worktree.branch}: ${c.subject}`;
      } else if (!t.evidence.includes(c.hash.slice(0, 7))) {
        t.evidence += ` | +${c.hash.slice(0, 7)}`;
      }
      t.updatedAt = new Date().toISOString().slice(0, 10);
    });

    // Atualiza risks referenciadas
    refs.risks.forEach(riskId => {
      const r = riskById.get(riskId);
      if (!r) return;
      riskHits++;
      if (!Array.isArray(r.history)) r.history = [];
      if (r.history.some(h => h.commit === c.hash)) return;
      r.history.push({
        ts: c.date,
        type: 'commit',
        commit: c.hash,
        subject: c.subject,
      });
    });

    // MRs: loga num índice auxiliar no metrics
    refs.mrs.forEach(mrId => {
      mrHits++;
      if (!j.metrics.mrLog) j.metrics.mrLog = [];
      if (!j.metrics.mrLog.some(m => m.commit === c.hash)) {
        j.metrics.mrLog.push({
          ts: c.date,
          mr: mrId,
          commit: c.hash,
          subject: c.subject,
          branch: worktree.branch,
          worktree: wtId,
        });
      }
    });
  }
  return { taskHits, riskHits, mrHits };
}

function sync(j) {
  const { worktrees, mainCommit } = detectWorktrees();
  const updates = [];
  const ingestSummary = { taskHits: 0, riskHits: 0, mrHits: 0, commitsScanned: 0 };

  // Mapear worktrees existentes no JSON
  const existing = new Map(j.activeWorktrees.map(w => [w.id, w]));

  // Para cada worktree detectada, criar/atualizar entry
  const next = [];
  for (const wt of worktrees) {
    if (wt.branch === 'main') continue;
    const id = path.basename(wt.path);
    const ahead = commitsAhead(wt.path, mainCommit);
    const behind = commitsBehind(wt.path, mainCommit);
    // TASK-126: três categorias — worktree parado num commit velho
    // que main já passou (behind-main) é diferente de worktree
    // realmente em sincronia (in-sync). Sem isso, o painel mostra
    // "in-sync" mentiroso.
    const status = ahead > 0
      ? 'ahead-of-main'
      : behind > 0
        ? 'behind-main'
        : 'in-sync';
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
      commitsBehind: behind,
      primarySession: prev?.primarySession || null,
      sessionTitle: prev?.sessionTitle || null,
      focus: prev?.focus || [],
    };
    next.push(updated);
    if (prev && (prev.commitsAhead !== ahead || prev.commitsBehind !== behind || prev.head !== wt.head || prev.status !== status)) {
      updates.push({ id, from: prev.commitsAhead, to: ahead, behind, status });
    }
    // Ingerir commits e detectar TASK-XXX/RISK-XXX
    if (ahead > 0) {
      const commits = getCommits(wt.path, mainCommit);
      ingestSummary.commitsScanned += commits.length;
      const r = ingestCommits(j, wt, commits);
      ingestSummary.taskHits += r.taskHits;
      ingestSummary.riskHits += r.riskHits;
      ingestSummary.mrHits += r.mrHits;
    }
  }

  j.activeWorktrees = next;
  j.metrics.mainCommit = mainCommit;
  j.metrics.activeWorktreesAheadOfMain = next.filter(w => w.status === 'ahead-of-main').length;
  j.metrics.activeWorktreesBehindMain = next.filter(w => w.status === 'behind-main').length;
  j.metrics.lastIngest = {
    ts: new Date().toISOString(),
    ...ingestSummary,
  };

  // Atualizar lastActiveAt da minha sessão
  const me = j.activeSessions.find(s => s.id === 'mvs_311d078987d0414a90f57ef28b789b18');
  if (me) me.lastActiveAt = new Date().toISOString();

  return { updates, mainCommit, worktreeCount: next.length, ingest: ingestSummary };
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
  } else if (!QUIET) {
    console.log('=== Scrum Sync Report ===');
    console.log(`Tarefas: ${result.tasksTotal}`);
    console.log(`Main commit: ${syncResult.mainCommit}`);
    console.log(`Worktrees ativos: ${syncResult.worktreeCount}`);
    console.log(`Updates: ${syncResult.updates.length}`);
    syncResult.updates.forEach(u => console.log(`  - ${u.id}: ahead=${u.from} → ${u.to}, behind=${u.behind ?? '?'} (${u.status})`));
    if (syncResult.ingest.commitsScanned > 0) {
      console.log(`\nIngest:`);
      console.log(`  Commits scaneados: ${syncResult.ingest.commitsScanned}`);
      console.log(`  TASK-XXX detectados: ${syncResult.ingest.taskHits}`);
      console.log(`  RISK-XXX detectados: ${syncResult.ingest.riskHits}`);
      console.log(`  MR#X detectados: ${syncResult.ingest.mrHits}`);
    }
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
    if (!JSON_OUT && !QUIET) console.log(`\n✓ JSON salvo em ${JSON_PATH}`);
  }

  if (CHECK) {
    const hasProblems = issues.dupIds.length > 0 || issues.brokenRefs.length > 0;
    process.exit(hasProblems ? 1 : 0);
  }
}

main();
