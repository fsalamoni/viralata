// .harness/_mark-done-2026-07-11.cjs
// Marca TASK-134 (AGENTS.md) como done
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const t = data.tasks.find(x => x.id === 'TASK-134');
if (!t) { console.error('TASK-134 not found'); process.exit(1); }

const TODAY = '2026-07-11';
t.status = 'done';
t.resolvedAt = TODAY;
t.evidence = 'AGENTS.md criado em D:\\viralata\\.worktrees\\wt-e79e15ca\\AGENTS.md (245 linhas, ~9KB) — Regra A 5 eixos + Regra B auto SCRUM update + stack + worktree + comandos + protocolo de mudança';
t.description += '\n\n**DONE 2026-07-11 21:35:** AGENTS.md gravado como mandamento permanente. Inclui §0 Identidade, §1 Regra A (5 eixos com anti-patterns), §2 Regra B (auto SCRUM update com auto-import do painel), §3 Onde tudo vive, §4 Comunicação inter-sessão, §5 Mudanças neste arquivo (BREAKING), §6 Histórico de versões. Mudanças futuras exigem decisão humana (PR com tag agents-md-change + entrada em docs/AGENTS_CHANGELOG.md).';
t.updatedAt = TODAY;

data.generatedAt = '2026-07-11T21:35:00-03:00';
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('TASK-134 → done');
console.log('evidence:', t.evidence.substring(0, 80) + '...');
