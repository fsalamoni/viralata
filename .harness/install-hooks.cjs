#!/usr/bin/env node
/**
 * .harness/install-hooks.cjs
 *
 * Instala/desinstala git hooks que mantêm SCRUM_TASKS.json em sincronia
 * com o estado real do repo. Cobre:
 *   - post-commit:    após cada commit, ingere TASK-XXX do message
 *   - post-merge:     após merge (em qualquer worktree), re-sincroniza
 *   - post-checkout:  ao trocar de branch, re-sincroniza
 *   - pre-commit:     valida integridade referencial antes do commit
 *
 * Os hooks ficam em .git/hooks/ — que é COMPARTILHADO entre todos os
 * worktrees (worktrees compartilham o mesmo .git/hooks via core.hooksPath).
 *
 * Uso:
 *   node .harness/install-hooks.cjs            # instala
 *   node .harness/install-hooks.cjs --uninstall # remove
 *   node .harness/install-hooks.cjs --status    # mostra o que está instalado
 *
 * Por padrão é idempotente: hooks já gerados por este script são sobrescritos;
 * hooks de outras origens são preservados e marcados como conflito.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function sh(cmd, cwd = REPO) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

const REPO = process.env.SCRUM_REPO || (() => {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
})();

// Detecta HOOKS_DIR corretamente: worktrees compartilham .git/hooks/ via
// `git rev-parse --git-common-dir`. O `.git` do worktree é arquivo (gitlink).
function detectHooksDir() {
  // Tenta via git (mais robusto)
  try {
    const commonDir = execSync('git rev-parse --git-common-dir', { cwd: REPO, encoding: 'utf8' }).trim();
    if (commonDir) {
      const abs = path.isAbsolute(commonDir) ? commonDir : path.resolve(REPO, commonDir);
      const hooksDir = path.join(abs, 'hooks');
      if (fs.existsSync(abs)) return hooksDir;
    }
  } catch {}
  // Fallback: tenta REPO/.git/hooks (caso não seja worktree)
  const direct = path.join(REPO, '.git', 'hooks');
  if (fs.existsSync(direct)) return direct;
  // Workaround: se .git é arquivo, lê o gitdir
  const gitFile = path.join(REPO, '.git');
  if (fs.existsSync(gitFile) && fs.statSync(gitFile).isFile()) {
    const content = fs.readFileSync(gitFile, 'utf8').trim();
    const m = content.match(/^gitdir:\s*(.+)$/);
    if (m) {
      // m[1] = "D:/viralata/.git/worktrees/wt-e79e15ca" → sobe 2 níveis → "D:/viralata/.git"
      const worktreeGitDir = m[1].replace(/\//g, path.sep);
      const commonGitDir = path.resolve(worktreeGitDir, '..', '..');
      return path.join(commonGitDir, 'hooks');
    }
  }
  return null;
}

const HOOKS_DIR = detectHooksDir();
const MARKER = '# Managed by .harness/install-hooks.cjs';
const ARGS = process.argv.slice(2);
const UNINSTALL = ARGS.includes('--uninstall');
const STATUS = ARGS.includes('--status');

const HOOKS = {
  'pre-commit': `#!/bin/sh
${MARKER}
# Bloqueia commit se SCRUM_TASKS.json tem problemas (IDs duplicados, refs quebradas).
SCRUM_REPO="$(git rev-parse --show-toplevel)"
if [ -f "$SCRUM_REPO/.harness/sync.cjs" ]; then
  node "$SCRUM_REPO/.harness/sync.cjs" --check --quiet || {
    echo "❌ SCRUM_TASKS.json tem problemas (IDs duplicados ou refs quebradas)."
    echo "   Rode: node .harness/sync.cjs --fix"
    exit 1
  }
fi
exit 0
`,

  'post-commit': `#!/bin/sh
${MARKER}
# Após cada commit, ingere TASK-XXX do message e atualiza o scrum.
SCRUM_REPO="$(git rev-parse --show-toplevel)"
if [ -f "$SCRUM_REPO/.harness/sync.cjs" ]; then
  SCRUM_QUIET=1 node "$SCRUM_REPO/.harness/sync.cjs" --fix --quiet || true
fi
`,

  'post-merge': `#!/bin/sh
${MARKER}
# Após merge (em qualquer worktree), re-sincroniza worktrees e ingere commits.
SCRUM_REPO="$(git rev-parse --show-toplevel)"
if [ -f "$SCRUM_REPO/.harness/sync.cjs" ]; then
  SCRUM_QUIET=1 node "$SCRUM_REPO/.harness/sync.cjs" --fix --quiet || true
fi
`,

  'post-checkout': `#!/bin/sh
${MARKER}
# Ao trocar de branch (não em restore de arquivo), re-sincroniza.
# $3 = 1 quando é branch checkout, 0 quando é file checkout
if [ "$3" = "1" ]; then
  SCRUM_REPO="$(git rev-parse --show-toplevel)"
  if [ -f "$SCRUM_REPO/.harness/sync.cjs" ]; then
    SCRUM_QUIET=1 node "$SCRUM_REPO/.harness/sync.cjs" --fix --quiet || true
  fi
fi
`,

  'post-rewrite': `#!/bin/sh
${MARKER}
# Após rebase/amend, re-sincroniza (histórico mudou).
SCRUM_REPO="$(git rev-parse --show-toplevel)"
if [ -f "$SCRUM_REPO/.harness/sync.cjs" ]; then
  SCRUM_QUIET=1 node "$SCRUM_REPO/.harness/sync.cjs" --fix --quiet || true
fi
`,
};

function isManaged(filepath) {
  if (!fs.existsSync(filepath)) return false;
  const content = fs.readFileSync(filepath, 'utf8');
  return content.includes(MARKER);
}

function backupExisting(filepath) {
  if (!fs.existsSync(filepath)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${filepath}.pre-sync-${ts}.bak`;
  fs.copyFileSync(filepath, backup);
  return backup;
}

function installOne(name) {
  const target = path.join(HOOKS_DIR, name);
  if (fs.existsSync(target) && !isManaged(target)) {
    const backup = backupExisting(target);
    console.log(`  ⚠️  ${name} já existia (não-gerenciado). Backup: ${path.basename(backup)}`);
  }
  fs.writeFileSync(target, HOOKS[name], { mode: 0o755 });
  console.log(`  ✓ ${name} instalado`);
}

function uninstallOne(name) {
  const target = path.join(HOOKS_DIR, name);
  if (!fs.existsSync(target)) {
    console.log(`  - ${name} (não existe)`);
    return;
  }
  if (!isManaged(target)) {
    console.log(`  ⚠️  ${name} existe mas não é gerenciado por este script. Pulando.`);
    return;
  }
  fs.unlinkSync(target);
  console.log(`  ✓ ${name} removido`);
}

function showStatus() {
  console.log(`\n=== Git Hooks Status (${HOOKS_DIR}) ===`);
  for (const name of Object.keys(HOOKS)) {
    const target = path.join(HOOKS_DIR, name);
    if (!fs.existsSync(target)) {
      console.log(`  - ${name}: (não instalado)`);
    } else if (isManaged(target)) {
      console.log(`  ✓ ${name}: gerenciado por install-hooks.cjs`);
    } else {
      console.log(`  ⚠️  ${name}: existe mas não é gerenciado por nós`);
    }
  }
}

function main() {
  if (!HOOKS_DIR) {
    console.error(`❌ Não consegui detectar o diretório de hooks. Rode dentro de um repo git.`);
    process.exit(1);
  }
  // Valida que estamos num repo git (REPO/.git é diretório OU arquivo gitlink)
  const gitPath = path.join(REPO, '.git');
  const isGitRepo = fs.existsSync(gitPath) || !!sh('git rev-parse --git-dir');
  if (!isGitRepo) {
    console.error(`❌ Não é um repo git: ${REPO}`);
    process.exit(1);
  }
  if (!fs.existsSync(HOOKS_DIR)) {
    fs.mkdirSync(HOOKS_DIR, { recursive: true });
  }

  if (STATUS) {
    showStatus();
    return;
  }

  if (UNINSTALL) {
    console.log(`\n=== Desinstalando hooks de ${HOOKS_DIR} ===`);
    for (const name of Object.keys(HOOKS)) uninstallOne(name);
    console.log('\n✓ Concluído.\n');
    return;
  }

  console.log(`\n=== Instalando hooks em ${HOOKS_DIR} ===`);
  console.log(`    Repo: ${REPO}`);
  for (const name of Object.keys(HOOKS)) installOne(name);
  console.log('\n✓ Concluído. Hooks ativos:');
  console.log('  - pre-commit: valida SCRUM_TASKS.json antes de cada commit');
  console.log('  - post-commit: ingere TASK-XXX do commit message');
  console.log('  - post-merge: re-sincroniza após merges');
  console.log('  - post-checkout: re-sincroniza ao trocar de branch');
  console.log('  - post-rewrite: re-sincroniza após rebase/amend');
  console.log('\n  Para remover: node .harness/install-hooks.cjs --uninstall\n');
}

main();
