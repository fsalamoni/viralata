// .harness/_mark-evaluation-done-2026-07-11.cjs
// Marca TASK-262 (avaliação independente) como done
// Adiciona evidência + lista de blockers
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const t = data.tasks.find(x => x.id === 'TASK-262');
if (!t) { console.error('TASK-262 not found'); process.exit(1); }

const TODAY = '2026-07-11';
t.status = 'done';
t.resolvedAt = TODAY;
t.evidence = '.harness/_consolidation-2026-07-11.md — avaliação 4 olhos (Regra A §1.6 passo 3). 3 relatórios READ-ONLY cruzados. 98 tasks consolidadas adicionadas (TASK-263 a TASK-360). 12 blockers identificados (3 CRITICAL security + 3 CRITICAL LGPD + 6 CRITICAL feature). 25 interfaces mapeadas entre agentes. 10 decisões humanas pendentes (D-01 a D-10). Anti-patterns Regra A verificados em 12 eixos. Estimativa: 6 sprints (12-15 semanas).';
t.description += '\n\n**DONE 2026-07-11 21:47:** Consolidação completa em .harness/_consolidation-2026-07-11.md. 98 tasks (TASK-263 a TASK-360) adicionadas ao SCRUM_TASKS.json do worktree, sem conflito com main ou wt-volunteer-critical. Pronto pra smoke + commit + push.';

t.updatedAt = TODAY;
data.generatedAt = '2026-07-11T21:47:30-03:00';
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('TASK-262 → done');
console.log('Total tasks:', data.tasks.length);
