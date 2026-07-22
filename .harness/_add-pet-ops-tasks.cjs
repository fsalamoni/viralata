/**
 * SCRUM: TASK-V3-PET-OPS-LOG — 7 tasks (1 por subcoleção + tabela).
 * Adiciona ao SCRUM_TASKS.json.
 */
const fs = require('fs');
const path = require('path');

const SCRUM_PATH = path.join(__dirname, 'SCRUM_TASKS.json');
const tasks = JSON.parse(fs.readFileSync(SCRUM_PATH, 'utf-8'));

const newTasks = [
  { id: 'TASK-V3-PET-OPS-LOG-01', title: 'Backend: getNextPetSeq + pet_seq imutável em createPet', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '15min' },
  { id: 'TASK-V3-PET-OPS-LOG-02', title: 'Backend: petLogService + appendPetLog em todos os CRUDs', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '30min' },
  { id: 'TASK-V3-PET-OPS-LOG-03', title: 'Backend: petNotesService + firestore rules (imutável)', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '20min' },
  { id: 'TASK-V3-PET-OPS-LOG-04', title: 'Backend: petTimelineService (combina 9 fontes)', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '20min' },
  { id: 'TASK-V3-PET-OPS-LOG-05', title: 'Frontend: PetsOpsTable (ID + colunas funcionais)', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '30min' },
  { id: 'TASK-V3-PET-OPS-LOG-06', title: 'Frontend: PetDetailV3 — 3 novas tabs + hash router', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '25min' },
  { id: 'TASK-V3-PET-OPS-LOG-07', title: 'Testes: 19 novos (petLogService + PetsOpsTable) + 339/339 total', status: 'done', epic: 'TASK-V3-PET-OPS-LOG', sw: 'sw-v72.4', time: '20min' },
];

tasks.tasks.push(...newTasks);
tasks.generatedAt = new Date().toISOString();
fs.writeFileSync(SCRUM_PATH, JSON.stringify(tasks, null, 2));
console.log(`Added ${newTasks.length} tasks. Total: ${tasks.tasks.length}`);
