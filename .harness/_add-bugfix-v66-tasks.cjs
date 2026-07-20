#!/usr/bin/env node
/**
 * .harness/_add-bugfix-v66-tasks.cjs
 *
 * BUG-31 (2026-07-20): adoptionService._cascadeApproval e
 * shelterAnimalService.updateShelterAnimalProfile mutavam pets
 * diretamente sem ensureCanMutatePet.
 *
 * FIX adminUsersService.test.js: targetUserId (novo padrão) em vez
 * de userId (legacy).
 *
 * + 1755 linhas de testes E2E Playwright (smoke/auth/pet-flow/legal).
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'SCRUM_TASKS.json');
const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const now = new Date().toISOString().slice(0, 19);

const tasks = [
  {
    id: 'TASK-FIX-BUG-31',
    title: '[BUG-31] adoptionService + shelterAnimalService não checavam ensureCanMutatePet',
    description: '_cascadeApproval em decideApplication muta diretamente o pet doc (batch.update). shelterAnimalService.updateShelterAnimalProfile também. Defense-in-depth incompleto.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-ADMIN-USERID',
    title: '[FIX] adminUsersService test userId → targetUserId',
    description: 'createAuditLog usa targetUserId (novo padrão TASK-351). Test esperava userId (legacy). Teste atualizado.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-E2E-CRITICAL-FLOWS',
    title: '[E2E] 1755 linhas de testes Playwright (smoke/auth/pet-flow/legal)',
    description: 'Criados 4 specs E2E cobrindo fluxos públicos: smoke (10 testes), auth (login redirect + onboarding), pet-flow (feed + detail), legal (9 páginas). Total 1755 linhas.',
    phase: 'TEST',
    status: 'done',
    created_at: now,
  },
];

tasks.forEach((p) => {
  if (!j.tasks.find((t) => t.id === p.id)) {
    j.tasks.push(p);
  }
});

fs.writeFileSync(JSON_PATH, JSON.stringify(j, null, 2));
console.log(`Added ${tasks.length} parents to SCRUM_TASKS.json`);
console.log(`Total tasks: ${j.tasks.length}`);
