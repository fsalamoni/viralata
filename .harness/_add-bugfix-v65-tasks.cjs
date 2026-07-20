#!/usr/bin/env node
/**
 * .harness/_add-bugfix-v65-tasks.cjs
 *
 * BUG-30 (2026-07-20): ensureCanMutatePet import estava FALTANDO
 * em medicationService.js. Causeava ReferenceError em runtime
 * para cancelMedication, completeMedication, recordDose.
 */
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, 'SCRUM_TASKS.json');
const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const now = new Date().toISOString().slice(0, 19);

const tasks = [
  {
    id: 'TASK-FIX-BUG-30',
    title: '[BUG-30] ensureCanMutatePet import FALTAVA em medicationService',
    description: 'medicationService.js (cancelMedication, completeMedication, recordDose) REFERENCIAM ensureCanMutatePet mas o import não existia. ReferenceError em runtime. Fix: adicionado import + atualizado teste.',
    phase: 'FIX',
    status: 'done',
    created_at: now,
  },
  {
    id: 'TASK-FIX-MISC-V65',
    title: '[MISC] Testes atualizados para v64/v65',
    description: 'cleanupStaleCaches.test.js agora preserva sw-v64 (atual). Layout.legal-links test mock useLegalFooterHeight. vitest.setup matchMedia + ResizeObserver.',
    phase: 'FIX',
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
