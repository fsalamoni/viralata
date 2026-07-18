#!/usr/bin/env node
/**
 * .harness/v3-redesign-next.cjs
 *
 * Helper para o V3 Redesign Loop. Lê o SCRUM_TASKS.json e a fila
 * do arquivo .harness/v3-redesign-loop.md, e retorna a próxima
 * página que precisa ser refeita no padrão V3.
 *
 * Critério:
 *  - Páginas em "done" no SCRUM são puladas
 *  - A fila é estática (1-19); pega a primeira não-feita
 *  - Se todas feitas, retorna null
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = process.env.SCRUM_REPO || __dirname.replace(/\.harness$/, '');
const SCRUM_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');

// Fila de páginas (ordem de prioridade)
const QUEUE = [
  { key: 'FEED', flag: 'V3_PAGE_FEED', task: 'TASK-920', done: true },
  { key: 'PET_DETAIL', flag: 'V3_PAGE_PET_DETAIL', task: 'TASK-927', done: true },
  { key: 'LEGAL', flag: 'V3_PAGE_LEGAL', task: 'TASK-930', done: true },
  { key: 'HOME', flag: 'V3_PAGE_HOME', task: 'TASK-V3-HOME', done: false },
  { key: 'LOGIN', flag: 'V3_PAGE_LOGIN', task: 'TASK-V3-LOGIN', done: false },
  { key: 'PROFILE', flag: 'V3_PAGE_PROFILE', task: 'TASK-V3-PROFILE', done: false },
  { key: 'CHAT', flag: 'V3_PAGE_CHAT', task: 'TASK-V3-CHAT', done: false },
  { key: 'ADOPTION', flag: 'V3_PAGE_ADOPTION', task: 'TASK-V3-ADOPTION', done: false },
  { key: 'COMMUNITY_DETAIL', flag: 'V3_PAGE_COMMUNITY_DETAIL', task: 'TASK-V3-COMMUNITY_DETAIL', done: false },
  { key: 'CLUB_DETAIL', flag: 'V3_PAGE_CLUB_DETAIL', task: 'TASK-V3-CLUB_DETAIL', done: false },
  { key: 'SEARCH', flag: 'V3_PAGE_SEARCH', task: 'TASK-V3-SEARCH', done: false },
  { key: 'EVENTS', flag: 'V3_PAGE_EVENTS', task: 'TASK-V3-EVENTS', done: false },
  { key: 'FOSTER', flag: 'V3_PAGE_FOSTER', task: 'TASK-V3-FOSTER', done: false },
  { key: 'VOLUNTEER', flag: 'V3_PAGE_VOLUNTEER', task: 'TASK-V3-VOLUNTEER', done: false },
  { key: 'MURAL', flag: 'V3_PAGE_MURAL', task: 'TASK-V3-MURAL', done: false },
  { key: 'ADMIN', flag: 'V3_PAGE_ADMIN', task: 'TASK-V3-ADMIN', done: false },
  { key: 'ORG_ADMIN', flag: 'V3_PAGE_ORG_ADMIN', task: 'TASK-V3-ORG_ADMIN', done: false },
  { key: 'COMMUNITY_ADMIN', flag: 'V3_PAGE_COMMUNITY_ADMIN', task: 'TASK-V3-COMMUNITY_ADMIN', done: false },
  { key: 'SHELTER_ADMIN', flag: 'V3_PAGE_SHELTER_ADMIN', task: 'TASK-V3-SHELTER_ADMIN', done: false },
];

// Verifica no SCRUM_TASKS.json quais estão realmente done
function checkScrumStatus(taskId) {
  try {
    const d = JSON.parse(fs.readFileSync(SCRUM_PATH, 'utf8'));
    const t = d.tasks.find((x) => x.id === taskId);
    return t && t.status === 'done';
  } catch {
    return false;
  }
}

function next() {
  // Verifica também no SCRUM real
  for (const item of QUEUE) {
    const inScrum = checkScrumStatus(item.task);
    if (item.done || inScrum) continue;
    return item;
  }
  return null;
}

if (require.main === module) {
  const item = next();
  if (item) {
    console.log(`KEY=${item.key}`);
    console.log(`FLAG=${item.flag}`);
    console.log(`TASK=${item.task}`);
  } else {
    console.log('ALL_DONE');
  }
}

module.exports = { next, QUEUE };
