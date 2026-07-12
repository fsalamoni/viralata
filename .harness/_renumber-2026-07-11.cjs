// .harness/_renumber-2026-07-11.cjs
// Renumera TASK-134..140 → TASK-256..262 no WORKTREE (isolado, não toca no main)
// Resolve conflito de IDs com o peer wt-volunteer-critical que já usou TASK-134..140
// com semântica diferente (LT/Saúde/Medicação vs minhas AGENTS.md/agents)
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

// Mapping: old → new
const MAP = {
  'TASK-134': 'TASK-256', // Criar AGENTS.md (Regra A 5 eixos + Regra B auto SCRUM update)
  'TASK-135': 'TASK-257', // Orquestrar 3 Task agents em paralelo
  'TASK-136': 'TASK-258', // Mapeamento Regra A: VOLUNTÁRIOS
  'TASK-137': 'TASK-259', // Mapeamento Regra A: ABRIGOS + FOSTER + ADOÇÃO
  'TASK-138': 'TASK-260', // Mapeamento Regra A: COMUNIDADE + ADOTANTE + EVENTOS
  'TASK-139': 'TASK-261', // Coordenar merge do auto-import do painel-scrum.html
  'TASK-140': 'TASK-262', // Avaliação independente + consolidação
};

let renamed = 0, refsUpdated = 0;

for (const t of data.tasks) {
  // 1) Renomeia o id da própria task
  if (MAP[t.id]) {
    const oldId = t.id;
    t.id = MAP[oldId];
    t.description = (t.description || '').replace(
      new RegExp(`\\b${oldId}\\b`, 'g'),
      t.id
    );
    renamed++;
  }

  // 2) Atualiza blockedBy
  if (Array.isArray(t.blockedBy)) {
    const before = JSON.stringify(t.blockedBy);
    t.blockedBy = t.blockedBy.map(x => MAP[x] || x);
    if (JSON.stringify(t.blockedBy) !== before) refsUpdated++;
  }

  // 3) Atualiza relatedTasks (se existir)
  if (Array.isArray(t.relatedTasks)) {
    const before = JSON.stringify(t.relatedTasks);
    t.relatedTasks = t.relatedTasks.map(x => MAP[x] || x);
    if (JSON.stringify(t.relatedTasks) !== before) refsUpdated++;
  }

  // 4) Atualiza mentions em description, evidence, history
  for (const field of ['description', 'evidence', 'branch', 'worktree', 'flag']) {
    if (typeof t[field] === 'string') {
      let v = t[field];
      for (const [oldId, newId] of Object.entries(MAP)) {
        v = v.replace(new RegExp(`\\b${oldId}\\b`, 'g'), newId);
      }
      t[field] = v;
    }
  }

  // 5) Atualiza history.body
  if (Array.isArray(t.history)) {
    for (const evt of t.history) {
      if (typeof evt.body === 'string') {
        let v = evt.body;
        for (const [oldId, newId] of Object.entries(MAP)) {
          v = v.replace(new RegExp(`\\b${oldId}\\b`, 'g'), newId);
        }
        evt.body = v;
      }
    }
  }
}

// Adiciona nota de housekeeping
data.generatedAt = '2026-07-11T21:45:00-03:00';
data._renumberNote = {
  ts: '2026-07-11T21:45:00-03:00',
  reason: 'Conflito de IDs com peer wt-volunteer-critical que usou TASK-134..140 com semântica diferente (LT/Saúde/Medicação). Renumeradas no worktree para TASK-256..262 (depois do último do main, TASK-254). Não afeta o main.',
  mapping: MAP,
  session: 'mvs_311d078987d0414a90f57ef28b789b18',
  scope: 'worktree-only',
};

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`OK: renamed=${renamed} refsUpdated=${refsUpdated} total=${data.tasks.length}`);
console.log(`New IDs: ${Object.values(MAP).join(', ')}`);
