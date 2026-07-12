// .harness/_mark-mapping-done-2026-07-11.cjs
// Marca TASK-257 (orquestração) e TASK-258/259/260 (3 mapeamentos) como done
// TASK-262 (avaliação) como in_progress
// Não mexe no main (apenas worktree)
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const TODAY = '2026-07-11';
const SESSION = 'mvs_311d078987d0414a90f57ef28b789b18';

// TASK-257: Orquestrar 3 Task agents em paralelo → done (3 agents spawned + voltaram)
const t257 = data.tasks.find(x => x.id === 'TASK-257');
if (t257 && t257.status !== 'done') {
  t257.status = 'done';
  t257.resolvedAt = TODAY;
  t257.evidence = '3 Task agents spawned em paralelo (general subagent, READ-ONLY): ses_0ac40841 (Agente A — Voluntários), ses_0ac40840 (Agente B — Abrigos/Foster/Adoção), ses_0ac408406 (Agente C — Comunidade/Adotante/Eventos). Todos retornaram com relatórios estruturados em .harness/_report-volunteers.md (25 gaps + 25 tasks TASK-232-256), _report-shelter-foster-adoption.md (47 gaps + 41 tasks TASK-141-181), _report-community-events.md (42 gaps + 32 tasks TASK-141-172). 98 tasks novas identificadas.';
  t257.description += '\n\n**DONE 2026-07-11 21:46:** 3 agents spawned em paralelo, todos READ-ONLY, todos retornaram com relatórios estruturados. Total: 98 tasks novas identificadas. Próximo: TASK-262 (avaliação 4 olhos + consolidação).';
  t257.updatedAt = TODAY;
}

// TASK-258: Mapeamento VOLUNTÁRIOS → done
const t258 = data.tasks.find(x => x.id === 'TASK-258');
if (t258 && t258.status !== 'done') {
  t258.status = 'done';
  t258.resolvedAt = TODAY;
  t258.evidence = '.harness/_report-volunteers.md — 25 gaps identificados (10 critical/blockers, 8 high, 5 medium, 2 low), 25 tasks propostas (TASK-232 a TASK-256). Cobertura ~55% (Fase 13 implementada: model + services + rules + admin tab + termo v2; falta UX público, perfil, atribuições, integrações, pós-deploy). 10 interfaces com Agentes B/C. READ-ONLY confirmado.';
  t258.description += '\n\n**DONE 2026-07-11 21:46:** Relatório completo em .harness/_report-volunteers.md (333 linhas). 25 gaps. Agente: ses_0ac40841.';
  t258.updatedAt = TODAY;
}

// TASK-259: Mapeamento ABRIGOS + FOSTER + ADOÇÃO → done
const t259 = data.tasks.find(x => x.id === 'TASK-259');
if (t259 && t259.status !== 'done') {
  t259.status = 'done';
  t259.resolvedAt = TODAY;
  t259.evidence = '.harness/_report-shelter-foster-adoption.md — 47 gaps (6 critical/blockers, 13 high, 11 medium, 1 low + 16 de pós-deploy). 41 tasks propostas (TASK-141 a TASK-181). Cobertura ~70%. 9 etapas + abrigo + foster. 4 interfaces com Agente A, 3 com Agente C. READ-ONLY confirmado.';
  t259.description += '\n\n**DONE 2026-07-11 21:46:** Relatório completo em .harness/_report-shelter-foster-adoption.md (~671 linhas). 47 gaps. Agente: ses_0ac40840.';
  t259.updatedAt = TODAY;
}

// TASK-260: Mapeamento COMUNIDADE + ADOTANTE + EVENTOS → done
const t260 = data.tasks.find(x => x.id === 'TASK-260');
if (t260 && t260.status !== 'done') {
  t260.status = 'done';
  t260.resolvedAt = TODAY;
  t260.evidence = '.harness/_report-community-events.md — 42 gaps (4 blockers críticos: 1 security + 1 LGPD + 1 multi-tenant + 1 feature flag). 32 tasks propostas (TASK-141 a TASK-172). Cobertura ~49% (Comunidade 53%, Adotante 51%, Eventos 42%). 11 interfaces com A/B. READ-ONLY confirmado.';
  t260.description += '\n\n**DONE 2026-07-11 21:46:** Relatório completo em .harness/_report-community-events.md (689 linhas). 42 gaps. Agente: ses_0ac408406.';
  t260.updatedAt = TODAY;
}

// TASK-262: Avaliação independente + consolidação → in_progress
const t262 = data.tasks.find(x => x.id === 'TASK-262');
if (t262) {
  // Remove from blockedBy deps that are now done
  t262.blockedBy = []; // 258/259/260 done, blockedBy cleared
  t262.status = 'in_progress';
  t262.owner = SESSION;
  t262.startedAt = TODAY;
  t262.updatedAt = TODAY;
  t262.description += '\n\n**IN_PROGRESS 2026-07-11 21:46:** 3 relatórios lidos na íntegra. Em consolidação.';
}

data.generatedAt = '2026-07-11T21:46:00-03:00';
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log('OK:');
console.log('  TASK-257 → done');
console.log('  TASK-258 → done');
console.log('  TASK-259 → done');
console.log('  TASK-260 → done');
console.log('  TASK-262 → in_progress');
console.log('Total tasks:', data.tasks.length);
