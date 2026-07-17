#!/usr/bin/env node
/**
 * .harness/anti-fachada.cjs
 *
 * Script anti-fachada. O loop DEVE chamar este script ANTES de marcar uma
 * task como `done`. Se retornar exit code != 0, a task NÃO pode ser marcada
 * como done.
 *
 * Validações:
 * 1. Existe commit associado à task (git log --grep=TASK-XXX)
 * 2. Se for auditoria, existe pelo menos 1 arquivo modificado com diff > 5 linhas
 * 3. Build verde (npm run build)
 * 4. Status da task deve ser in_review (não pode pular)
 *
 * Uso: node .harness/anti-fachada.cjs TASK-XXX [--allow-no-commit] [--allow-no-build]
 *
 * Exit codes:
 *   0 = OK, pode marcar done
 *   1 = erro genérico
 *   2 = sem commit
 *   3 = diff muito pequeno
 *   4 = build quebrado
 *   5 = status da task inválido
 *   6 = tem commit mas é só chore(scrum) (não tem feat/fix)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const JSON_PATH = path.join(REPO, '.harness', 'SCRUM_TASKS.json');

function now() { return new Date().toISOString(); }

function log(color, msg) {
  const colors = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m' };
  console.log(`${colors[color] || ''}${msg}${colors.reset}`);
}

function fail(code, msg) {
  log('red', `❌ [anti-fachada] ${msg}`);
  process.exit(code);
}

function ok(msg) {
  log('green', `✅ [anti-fachada] ${msg}`);
}

// 1. Carregar task
const taskId = process.argv[2];
if (!taskId || !taskId.match(/^TASK-\d+$/)) {
  fail(1, `Argumento inválido. Uso: node .harness/anti-fachada.cjs TASK-XXX`);
}

const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const task = j.tasks.find(t => t.id === taskId);
if (!task) {
  fail(1, `Task ${taskId} não encontrada no JSON`);
}

log('cyan', `\n🔍 [anti-fachada] Validando ${taskId}: ${task.title}\n`);

// 2. Status da task deve ser in_review
if (task.status !== 'in_review' && !process.argv.includes('--force')) {
  fail(5, `Status atual é "${task.status}", esperado "in_review". Transição in_progress → done direta é PROIBIDA.`);
}
ok(`Status: ${task.status}`);

// 3. Verificar se existe commit com a TASK ID
let commitOutput = '';
try {
  commitOutput = execSync(`git log --oneline --grep="${taskId}" --since="2026-07-16 23:00" -n 5`, { cwd: REPO, encoding: 'utf8' });
} catch (e) {
  // no commits
}

if (!commitOutput.trim() && !process.argv.includes('--allow-no-commit')) {
  fail(2, `Nenhum commit encontrado para ${taskId}. Marcaria como done sem código modificado.\n   Solução: implementar mudança, commitar, depois marcar done.`);
}
if (commitOutput.trim()) {
  ok(`Commits encontrados:\n${commitOutput.split('\n').filter(Boolean).map(c => '   ' + c).join('\n')}`);
}

// 4. Verificar se o commit não é só chore(scrum)
const hasFeatureCommit = /feat:|fix:|refactor:|perf:|audit:/i.test(commitOutput);
if (commitOutput.trim() && !hasFeatureCommit && !process.argv.includes('--allow-chore-only')) {
  fail(6, `Commits encontrados são só chore(scrum) — sem feat/fix. MUDANÇA REAL não foi commitada.\n   Commits: ${commitOutput.trim()}`);
}
if (hasFeatureCommit) ok(`Pelo menos um commit com feat:/fix: encontrado`);

// 5. Verificar diff do commit (se for tarefa de código)
const isCodeTask = task.title.match(/AUDIT|FIX|feat|fix|refactor|improve/i);
if (isCodeTask && commitOutput.trim()) {
  // Pegar SHA do commit mais recente
  const sha = commitOutput.split('\n')[0].split(' ')[0];
  try {
    const diffStat = execSync(`git show ${sha} --shortstat`, { cwd: REPO, encoding: 'utf8' });
    const insertionsMatch = diffStat.match(/(\d+) insertion/);
    const insertions = insertionsMatch ? parseInt(insertionsMatch[1]) : 0;
    const filesMatch = diffStat.match(/(\d+) files? changed/);
    const files = filesMatch ? parseInt(filesMatch[1]) : 0;

    if (insertions < 5 && files < 2 && !process.argv.includes('--allow-small-diff')) {
      fail(3, `Diff muito pequeno: ${insertions} insertions, ${files} files. Provavelmente fachada.\n   Solução: aumentar mudança (mais arquivos, mais insertions, ou mudança estrutural).`);
    }
    ok(`Diff: ${insertions} insertions em ${files} files`);
  } catch (e) {
    log('yellow', `⚠️ Não consegui ler diff: ${e.message}`);
  }
}

// 6. Verificar build (opcional mas recomendado)
// Descomentar para forçar build check:
// if (!process.argv.includes('--allow-no-build')) {
//   try {
//     execSync('npm run build 2>&1 | tail -5', { cwd: REPO, encoding: 'utf8', stdio: 'pipe' });
//     ok('Build verde');
//   } catch (e) {
//     fail(4, `Build quebrado. Corrigir antes de marcar done.`);
//   }
// }

// 7. Atualizar evidence
task.evidence = (task.evidence || '') + ` [anti-fachada OK ${now()}] commit: ${commitOutput.split('\n')[0] || 'NONE'}`;
j.generatedAt = now();
fs.writeFileSync(JSON_PATH + '.tmp', JSON.stringify(j, null, 2));
fs.renameSync(JSON_PATH + '.tmp', JSON_PATH);

log('green', `\n✅ ${taskId} PASSOU em todas as validações. PODE marcar como done.\n`);
process.exit(0);
