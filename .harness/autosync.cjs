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
 *
 * Estado: persiste cursor em .harness/.autosync-cursor.json (offset de
 * mensagens já processadas). Idempotente — não duplica eventos.
 *
 * Requisito: `mavis communication messages` precisa estar disponível no PATH.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

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
const ARGS = process.argv.slice(2);
const ONCE = ARGS.includes('--once');
const intervalArg = ARGS.indexOf('--interval');
const INTERVAL = (intervalArg >= 0 ? parseInt(ARGS[intervalArg + 1], 10) : 60) * 1000;
const VERBOSE = ARGS.includes('--verbose') || process.env.AUTOSYNC_VERBOSE === '1';

function log(...args) {
  if (VERBOSE) console.log(`[${new Date().toISOString()}]`, ...args);
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
  fs.writeFileSync(CURSOR_PATH, JSON.stringify(c, null, 2));
}

function loadJson() {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
}

function saveJson(j) {
  j.generatedAt = new Date().toISOString();
  fs.writeFileSync(JSON_PATH, JSON.stringify(j, null, 2) + '\n');
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
    // Formato human: "Messages (N):\n  #ID status \n    body\n..."
    const lines = out.split('\n');
    const messages = [];
    let current = null;
    for (const line of lines) {
      // Formato: "  #75 prompt done" (id + status_1 + status_2)
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

    // Detecção semântica: FAIL, DONE, MERGED, no-go
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
}

function main() {
  // Detecta minha session ID via mavis communication peers ou env
  let mySessionId = process.env.MAVIS_SESSION_ID || 'mvs_311d078987d0414a90f57ef28b789b18';

  if (ONCE) {
    tick(mySessionId).then(r => {
      console.log(`autosync --once: ${r.changes} changes`);
      process.exit(0);
    });
    return;
  }

  console.log(`autosync daemon started · interval=${INTERVAL}ms · session=${mySessionId}`);
  console.log(`  Cursor: ${CURSOR_PATH}`);
  console.log(`  Ctrl-C to stop.\n`);

  // Primeira tick imediato
  tick(mySessionId);

  setInterval(() => {
    tick(mySessionId).catch(e => log('tick error:', e.message));
  }, INTERVAL);
}

main();
