#!/usr/bin/env node
/**
 * .harness/sync.cjs
 *
 * Auto-sync SCRUM_TASKS.json com estado real do git + auto-reembed no
 * painel-scrum.html. Implementa a Regra B (Auto Scrum Update) do AGENTS.md
 * com **auto-import** total: o painel HTML é reescrito em tempo real
 * toda vez que o JSON muda.
 *
 * Modos:
 *   node .harness/sync.cjs                 # one-shot sync (relatório)
 *   node .harness/sync.cjs --fix           # corrige worktrees/sessões no JSON
 *   node .harness/sync.cjs --check         # exit 1 se problemas
 *   node .harness/sync.cjs --json          # output em JSON
 *   node .harness/sync.cjs --watch         # WATCH MODE: monitora SCRUM_TASKS.json
 *                                          # e re-embute no painel-scrum.html a cada
 *                                          # mudança. Pressiona Ctrl+C pra sair.
 *   node .harness/sync.cjs --watch --serve # WATCH + serve o painel via HTTP em :8731
 *                                          # (permite auto-reload no browser sem CORS)
 *
 * TASK-061 (sync base) + TASK-202 (auto-import)
 * Bloco A · Mavis mvs_f1e04f28717d42cdba05e221b7b4b6f3
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { acquireLock, releaseLock, atomicWrite } = require('./_lock.cjs');

const REPO = process.env.SCRUM_REPO || (() => {
  // Auto-detecta a raiz do repo a partir de __dirname (localização do sync.cjs)
  // Funciona em main, worktrees e cópias standalone.
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return 'D:\\viralata'; // fallback hardcoded
})();
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const HTML_PATH = path.join(REPO, '.harness', 'painel-scrum.html');
const LOCK_PATH = path.join(REPO, '.harness', '.sync.lock');
const ARGS = process.argv.slice(2);
const FIX = ARGS.includes('--fix');
const CHECK = ARGS.includes('--check');
const JSON_OUT = ARGS.includes('--json');
const QUIET = ARGS.includes('--quiet') || process.env.SYNC_QUIET === '1';
const FORCE = ARGS.includes('--force');
const WATCH = ARGS.includes('--watch');
const SERVE = ARGS.includes('--serve');
// TASK-378: --pull faz git pull --ff-only periódico no watcher, para o
// painel local acompanhar o remoto automaticamente (sem pull manual).
const PULL = ARGS.includes('--pull');
const PULL_INTERVAL_MS = Number(process.env.SYNC_PULL_INTERVAL_MS || 60_000);

/* ─── helpers ─────────────────────────────────────────────────────── */

function sh(cmd, cwd = REPO) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(...args) {
  console.log(`[${now()}]`, ...args);
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

function loadJson() {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
}

function saveJson(j) {
  j.generatedAt = new Date().toISOString();
  // TASK-300 — atomic write (tmp + rename) previne corrupção se interrompido
  atomicWrite(JSON_PATH, JSON.stringify(j, null, 2) + '\n');
}

function findIssues(j) {
  const issues = { dupIds: [], brokenRefs: [], missingOwners: [], orphanFlags: [] };
  const ids = new Map();
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

function syncJson(j) {
  const { worktrees, mainCommit } = detectWorktrees();
  const updates = [];
  const existing = new Map(j.activeWorktrees.map(w => [w.id, w]));
  const next = [];
  for (const wt of worktrees) {
    if (wt.branch === 'main') continue;
    const id = path.basename(wt.path);
    const ahead = commitsAhead(wt.path, mainCommit);
    const status = ahead === 0 ? 'in-sync' : 'ahead-of-main';
    const prev = existing.get(id);
    const headTitle = sh('git log -1 --format=%s', wt.path) || '';
    next.push({
      id, branch: wt.branch, head: wt.head, headTitle,
      path: wt.path, status, commitsAhead: ahead,
      primarySession: prev?.primarySession || null,
      sessionTitle: prev?.sessionTitle || null,
      focus: prev?.focus || [],
    });
    if (prev && (prev.commitsAhead !== ahead || prev.head !== wt.head || prev.status !== status)) {
      updates.push({ id, from: prev.commitsAhead, to: ahead, status });
    }
  }
  j.activeWorktrees = next;
  j.metrics.mainCommit = mainCommit;
  j.metrics.activeWorktreesAheadOfMain = next.filter(w => w.status === 'ahead-of-main').length;
  return { updates, mainCommit, worktreeCount: next.length };
}

/* ─── painel-scrum.html re-embed (Regra B: auto-import) ──────────── */

function reembedHtml(j) {
  const startMarker = '<script type="application/json" id="initial-data">';
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const startIdx = html.indexOf(startMarker);
  if (startIdx < 0) throw new Error('Marcador initial-data não encontrado no HTML');
  const endIdx = html.indexOf('</script>', startIdx);
  if (endIdx < 0) throw new Error('</script> final não encontrado no HTML');
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  const jsonBlock = '\n' + JSON.stringify(j, null, 2) + '\n  ';
  const newHtml = before + jsonBlock + after;
  fs.writeFileSync(HTML_PATH, newHtml, 'utf8');
  // Copia para public/scrum.html (Firebase Hosting serve direto)
  const PUBLIC_PATH = path.join(REPO, 'public', 'scrum.html');
  fs.writeFileSync(PUBLIC_PATH, newHtml, 'utf8');
  log('  → public/scrum.html atualizado');
  return newHtml.length;
}

/**
 * Patch the auto-sync badge inside the painel HTML without rewriting the
 * whole file. Inserts/updates a small block in <head> showing last sync time.
 */
function patchSyncBadge(timestampIso) {
  let html = fs.readFileSync(HTML_PATH, 'utf8');
  const marker = '<!-- auto-sync-badge -->';
  const badge = `<!-- auto-sync-badge --><meta name="auto-sync-last" content="${timestampIso}">`;
  if (html.includes(marker)) {
    html = html.replace(/<!-- auto-sync-badge -->[\s\S]*?>/, badge);
  } else {
    html = html.replace('</head>', `  ${badge}\n  </head>`);
  }
  // também atualiza o pill no topbar se existir
  const pillMarker = '<span class="pill mono" id="auto-sync-pill"';
  const pillNew = `<span class="pill mono" id="auto-sync-pill" title="Última sincronização automática">sync ${timestampIso.slice(11, 19)}</span>`;
  if (html.includes(pillMarker)) {
    html = html.replace(/<span class="pill mono" id="auto-sync-pill"[\s\S]*?<\/span>/, pillNew);
  }
  fs.writeFileSync(HTML_PATH, html, 'utf8');
}

/* ─── watch mode ──────────────────────────────────────────────────── */

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function startWatch() {
  log('═══════════════════════════════════════════════════════════');
  log('  WATCH MODE · Regra B · Auto-import do painel-scrum.html');
  log('═══════════════════════════════════════════════════════════');
  log('Monitorando:', JSON_PATH);
  log('Re-embed em :', HTML_PATH);
  log('Pressione Ctrl+C para sair.');
  log('');

  // Snapshot inicial
  try {
    const j0 = loadJson();
    log(`snapshot inicial: ${j0.tasks.length} tasks · main @ ${j0.metrics.mainCommit || '?'}`);
  } catch (e) {
    log('ERRO ao ler JSON inicial:', e.message);
    process.exit(1);
  }

  const onChange = debounce(() => {
    try {
      const j = loadJson();
      const size = reembedHtml(j);
      patchSyncBadge(new Date().toISOString());
      const counts = {};
      j.tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
      log(`✓ re-embed ok · ${j.tasks.length} tasks · done=${counts.done||0} ready=${counts.ready||0} in_progress=${counts.in_progress||0} in_review=${counts.in_review||0} blocked=${counts.blocked||0} · HTML ${(size/1024).toFixed(1)}KB`);
    } catch (e) {
      log('✗ ERRO no re-embed:', e.message);
    }
  }, 300);

  // fs.watch é instável no Windows com editores que usam save-as (escreve+rename).
  // Poll é mais confiável nesse caso. Vamos usar chokidar-style polling.
  // TASK-378: auto-pull do remoto. A cada intervalo (default 60s),
  // se o repo estiver limpo e num branch com upstream, faz
  // `git pull --ff-only`. Fast-forward puro: nunca cria merge nem
  // sobrescreve trabalho local — com mudanças locais ou histórico
  // divergente, apenas loga e segue (resolver manualmente).
  if (PULL) {
    log(`auto-pull ativo (a cada ${Math.round(PULL_INTERVAL_MS / 1000)}s, --ff-only)`);
    const doPull = () => {
      const dirty = sh('git status --porcelain');
      if (dirty === null) { log('⚠ auto-pull: git indisponível'); return; }
      if (dirty !== '') { log('⚠ auto-pull: mudanças locais não commitadas — pull adiado'); return; }
      const before = sh('git rev-parse --short HEAD');
      const out = sh('git pull --ff-only 2>&1');
      const after = sh('git rev-parse --short HEAD');
      if (out === null) {
        log('⚠ auto-pull: pull falhou (histórico divergente? rode git status no repo)');
      } else if (before !== after) {
        log(`✓ auto-pull: ${before} → ${after} (painel será re-embedado se o JSON mudou)`);
      }
    };
    doPull();
    setInterval(doPull, PULL_INTERVAL_MS).unref?.();
  }

  let lastMtime = fs.statSync(JSON_PATH).mtimeMs;
  const interval = setInterval(() => {
    let mtime;
    try { mtime = fs.statSync(JSON_PATH).mtimeMs; }
    catch (e) { return; }
    if (mtime !== lastMtime) {
      lastMtime = mtime;
      log(`↻ mudança detectada em SCRUM_TASKS.json (mtime ${new Date(mtime).toISOString()})`);
      onChange();
    }
  }, 750);

  // Também observa painel-scrum.html (se o usuário editar manualmente)
  let lastHtmlMtime = fs.statSync(HTML_PATH).mtimeMs;
  const htmlInterval = setInterval(() => {
    let mtime;
    try { mtime = fs.statSync(HTML_PATH).mtimeMs; }
    catch (e) { return; }
    if (mtime !== lastHtmlMtime) {
      lastHtmlMtime = mtime;
      // O HTML mudou (provavelmente pelo próprio re-embed). Não re-embed
      // pra evitar loop — só loga.
      log('↻ painel-scrum.html modificado externamente (regenerado por re-embed)');
    }
  }, 2000);

  // Cleanup
  const cleanup = () => {
    log('encerrando watch mode...');
    clearInterval(interval);
    clearInterval(htmlInterval);
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  if (SERVE) startServe();
}

function startServe() {
  const PORT = 8731;
  const server = http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/painel-scrum.html';
    const filePath = path.join(REPO, '.harness', url.replace(/^\//, ''));
    if (!filePath.startsWith(path.join(REPO, '.harness'))) {
      res.writeHead(403); return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found: ' + url); }
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  server.listen(PORT, () => log(`HTTP server em http://localhost:${PORT}/painel-scrum.html (CORS habilitado)`));
}

/* ─── one-shot ────────────────────────────────────────────────────── */

function main() {
  // TASK-300 — single-instance lock. Se outro sync.cjs (one-shot OU watch)
  // está rodando, skip silenciosamente. Sem lock, dois daemons podem
  // sobrescrever SCRUM_TASKS.json simultaneamente e perder tasks.
  const lockResult = acquireLock(LOCK_PATH, FORCE);
  if (!lockResult.acquired) {
    if (!QUIET) console.log(`sync: lock busy (holder PID ${lockResult.holder}) — skipping`);
    process.exit(0);
  }

  // Cleanup lock se processo for morto (best-effort, em adição ao exit/cleanup do watch)
  const cleanupLock = () => releaseLock(LOCK_PATH);
  process.on('exit', cleanupLock);

  if (WATCH) {
    // Watch mode: precisa liberar lock em SIGINT/SIGTERM (startWatch já
    // tem cleanup, mas adicionamos release explicit)
    const oldCleanup = () => {
      cleanupLock();
      process.exit(0);
    };
    process.on('SIGINT', oldCleanup);
    process.on('SIGTERM', oldCleanup);
    return startWatch();
  }

  try {
    const j = loadJson();
    const issues = findIssues(j);
    const syncResult = syncJson(j);

    const result = { issues, sync: syncResult, tasksTotal: j.tasks.length };

    if (JSON_OUT) {
      console.log(JSON.stringify(result, null, 2));
    } else if (!QUIET) {
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
      if (!JSON_OUT && !QUIET) console.log(`\n✓ JSON salvo em ${JSON_PATH}`);
      // Re-embed do painel (Regra B) — atualiza public/scrum.html
      try {
        const size = reembedHtml(j);
        patchSyncBadge(new Date().toISOString());
        if (!JSON_OUT && !QUIET) {
          const counts = {};
          j.tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
          console.log(`✓ re-embed ok · ${j.tasks.length} tasks · done=${counts.done||0} ready=${counts.ready||0} in_progress=${counts.in_progress||0} · HTML ${(size/1024).toFixed(1)}KB`);
        }
      } catch (e) {
        if (!JSON_OUT && !QUIET) console.error('✗ re-embed falhou:', e.message);
      }
    }

    if (CHECK) {
      const hasProblems = issues.dupIds.length > 0 || issues.brokenRefs.length > 0;
      process.exit(hasProblems ? 1 : 0);
    }
  } finally {
    releaseLock(LOCK_PATH);
  }
}

main();
