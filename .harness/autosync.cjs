#!/usr/bin/env node
/**
 * .harness/autosync.cjs
 *
 * Daemon de sincronização que observa `mavis communication` em background
 * e atualiza SCRUM_TASKS.json automaticamente quando:
 *   - Sibling envia mensagem referenciando TASK-XXX / MR#N / RISK-XXX
 *     → adiciona evento no history da task
 *   - Sibling reporta "FAIL" / "veredito" / "no go"
 *     → loga no metrics.failAuditor (se ainda não tiver)
 *   - Sibling reporta "DONE" / "merged" / "delivered"
 *     → loga no metrics.deliveryLog
 *   - Sessão termina (status=finished em peers)
 *     → marca lastActiveAt
 *
 * Uso:
 *   node .harness/autosync.cjs              # roda contínuo (a cada 60s)
 *   node .harness/autosync.cjs --once       # varre uma vez e sai
 *   node .harness/autosync.cjs --interval 30 # custom interval (segundos)
 *   node .harness/autosync.cjs --force      # skip lock (debug only)
 *
 * Estado: persiste cursor em .harness/.autosync-cursor.json (offset de
 * mensagens já processadas). Idempotente — não duplica eventos.
 *
 * TASK-300 — race condition fix:
 *   - Single-instance lock via .harness/_lock.cjs (cross-platform, sem deps)
 *   - Auto-detect session ID via mavis communication peers (NÃO fallback hardcoded)
 *   - Atomic write: tmp file + fs.renameSync
 *
 * Requisito: `mavis communication messages` precisa estar disponível no PATH.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { acquireLock, releaseLock, atomicWrite } = require('./_lock.cjs');

const REPO = process.env.SCRUM_REPO || (() => {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
})();
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const CURSOR_PATH = path.join(REPO, '.harness', '.autosync-cursor.json');
const LOCK_PATH = path.join(REPO, '.harness', '.autosync.lock');
const ARGS = process.argv.slice(2);
const ONCE = ARGS.includes('--once');
const intervalArg = ARGS.indexOf('--interval');
const INTERVAL = (intervalArg >= 0 ? parseInt(ARGS[intervalArg + 1], 10) : 60) * 1000;
const VERBOSE = ARGS.includes('--verbose') || process.env.AUTOSYNC_VERBOSE === '1';
const FORCE = ARGS.includes('--force');

function log(...args) {
  if (VERBOSE) console.log(`[${new Date().toISOString()}]`, ...args);
}

function warn(...args) {
  console.warn(`[autosync ${new Date().toISOString().slice(11, 19)}]`, ...args);
}

function loadCursor() {
  if (!fs.existsSync(CURSOR_PATH)) return { lastMessageId: 0, lastTs: null };
  try {
    return JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf8'));
  } catch {
    return { lastMessageId: 0, lastTs: null };
  }
}

function saveCursor(c) {
  atomicWrite(CURSOR_PATH, JSON.stringify(c, null, 2));
}

function loadJson() {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
}

function saveJson(j) {
  j.generatedAt = new Date().toISOString();
  atomicWrite(JSON_PATH, JSON.stringify(j, null, 2) + '\n');
}

function extractRefs(text) {
  if (!text) return { tasks: [], risks: [], mrs: [] };
  return {
    tasks: [...new Set((text.match(/\bTASK-\d+\b/g) || []))],
    risks: [...new Set((text.match(/\bRISK-\d+\b/g) || []))],
    mrs: [...new Set((text.match(/\bMR#\d+\b/g) || []))],
  };
}

function fetchMessages(mySessionId) {
  try {
    const out = execSync(
      `mavis communication messages --to ${mySessionId} --limit 50 -H`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const lines = out.split('\n');
    const messages = [];
    let current = null;
    for (const line of lines) {
      const m = line.match(/^  #(\d+)\s+(\S+)(?:\s+(\S+))?\s*$/);
      if (m) {
        if (current) messages.push(current);
        current = { id: parseInt(m[1], 10), status: m[2] + (m[3] ? ' ' + m[3] : ''), body: '' };
      } else if (current && /^\s{4}/.test(line)) {
        current.body += line.slice(4) + '\n';
      }
    }
    if (current) messages.push(current);
    return messages;
  } catch (e) {
    return [];
  }
}

function ingestMessages(j, messages, cursor) {
  const taskById = new Map(j.tasks.map(t => [t.id, t]));
  const riskById = new Map((j.riskRegister || []).map(r => [r.id, r]));
  let newMaxId = cursor.lastMessageId;
  let changes = 0;

  for (const m of messages) {
    if (m.id <= cursor.lastMessageId) continue;
    if (m.id > newMaxId) newMaxId = m.id;
    const refs = extractRefs(m.body);
    const ts = new Date().toISOString();

    refs.tasks.forEach(taskId => {
      const t = taskById.get(taskId);
      if (!t) return;
      if (!Array.isArray(t.history)) t.history = [];
      const evtKey = `comm-${m.id}`;
      if (t.history.some(h => h.eventKey === evtKey)) return;
      t.history.push({
        ts,
        type: 'communication',
        eventKey: evtKey,
        messageId: m.id,
        from: 'sibling',
        body: m.body.slice(0, 200).trim(),
        status: m.status,
      });
      changes++;
    });

    refs.risks.forEach(riskId => {
      const r = riskById.get(riskId);
      if (!r) return;
      if (!Array.isArray(r.history)) r.history = [];
      const evtKey = `comm-${m.id}-${riskId}`;
      if (r.history.some(h => h.eventKey === evtKey)) return;
      r.history.push({
        ts,
        type: 'communication',
        eventKey: evtKey,
        messageId: m.id,
        body: m.body.slice(0, 200).trim(),
      });
      changes++;
    });

    const sem = m.body.toLowerCase();
    if (!j.metrics.semanticEvents) j.metrics.semanticEvents = [];
    const evtKey = `semantic-${m.id}`;
    if (!j.metrics.semanticEvents.some(e => e.eventKey === evtKey)) {
      let kind = null;
      if (/\bveredito\s*:?\s*fail\b|^\s*#\s*veredito\s*:?\s*fail/i.test(m.body)) kind = 'verifier-fail';
      else if (/\bveredito\s*:?\s*pass\b/i.test(m.body)) kind = 'verifier-pass';
      else if (/\b(relat[oó]rio|report)\b.*\b(fechad[oa]|pront[oa]|entregue)\b/i.test(m.body)) kind = 'report-delivered';
      else if (/\bno[\s-]go\b|\bimposs[ií]vel\b.*\bfix/i.test(m.body)) kind = 'producer-no-go';
      else if (/\bfixes?\s+[abc]\b|\bdelivered\b|\bmerged?\b/i.test(m.body) && /TASK-\d+/i.test(m.body)) kind = 'fixes-delivered';
      if (kind) {
        j.metrics.semanticEvents.push({
          ts,
          eventKey: evtKey,
          kind,
          messageId: m.id,
          refs,
          body: m.body.slice(0, 300).trim(),
        });
        changes++;
      }
    }
  }

  return { changes, newMaxId };
}

async function tick(mySessionId) {
  // Single-instance lock — se outro daemon tem, skip silenciosamente
  const lockResult = acquireLock(LOCK_PATH, FORCE);
  if (!lockResult.acquired) {
    log(`lock busy (holder PID ${lockResult.holder}) — skipping tick`);
    return { changes: 0, skipped: true };
  }
  if (lockResult.reason && FORCE) {
    log(`lock: ${lockResult.reason}`);
  }

  try {
    const cursor = loadCursor();
    const messages = fetchMessages(mySessionId);
    if (messages.length === 0) {
      log('no messages');
      return { changes: 0 };
    }
    const j = loadJson();
    const r = ingestMessages(j, messages, cursor);
    if (r.changes > 0) {
      saveJson(j);
      log(`saved ${r.changes} changes (max msg id: ${cursor.lastMessageId} → ${r.newMaxId})`);
    } else {
      log(`no new changes (max msg id: ${cursor.lastMessageId})`);
    }
    saveCursor({ lastMessageId: r.newMaxId, lastTs: new Date().toISOString() });
    return r;
  } finally {
    releaseLock(LOCK_PATH);
  }
}

/**
 * Auto-detect session ID via `mavis communication peers`.
 * Fallback: MAVIS_SESSION_ID env. Erro fatal se nenhum disponível
 * (NÃO usar fallback hardcoded — foi o bug original de 2026-07-11).
 */
function detectSessionId() {
  if (process.env.MAVIS_SESSION_ID) {
    return process.env.MAVIS_SESSION_ID;
  }

  try {
    const out = execSync('mavis communication peers --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const peers = JSON.parse(out);
    if (Array.isArray(peers) && peers.length > 0) {
      const self = peers.find(p => p.agentName === 'mavis') || peers[0];
      if (self.sessionId) {
        log(`auto-detected sessionId: ${self.sessionId} (agentName=${self.agentName})`);
        return self.sessionId;
      }
    }
  } catch (e) {
    log(`mavis communication peers failed: ${e.message}`);
  }

  throw new Error(
    'Cannot auto-detect session ID. Set MAVIS_SESSION_ID env or run from within Mavis runtime. ' +
    'Refusing to use hardcoded fallback (was the source of the 2026-07-11 race condition).'
  );
}

function main() {
  let mySessionId;
  try {
    mySessionId = detectSessionId();
  } catch (e) {
    console.error(`autosync: ${e.message}`);
    process.exit(1);
  }

  // Cleanup lock se processo for morto (best-effort)
  const cleanupOnExit = () => releaseLock(LOCK_PATH);
  process.on('exit', cleanupOnExit);
  process.on('SIGINT', () => { cleanupOnExit(); process.exit(0); });
  process.on('SIGTERM', () => { cleanupOnExit(); process.exit(0); });

  if (ONCE) {
    tick(mySessionId).then(r => {
      console.log(`autosync --once: ${r.changes} changes${r.skipped ? ' (skipped, lock busy)' : ''}`);
      process.exit(0);
    }).catch(e => {
      console.error(`autosync --once: ${e.message}`);
      process.exit(1);
    });
    return;
  }

  console.log(`autosync daemon started · interval=${INTERVAL}ms · session=${mySessionId}`);
  console.log(`  Cursor: ${CURSOR_PATH}`);
  console.log(`  Lock: ${LOCK_PATH} (single-instance)`);
  console.log(`  Ctrl-C to stop.\n`);

  tick(mySessionId);

  setInterval(() => {
    tick(mySessionId).catch(e => log('tick error:', e.message));
  }, INTERVAL);
}

main();
