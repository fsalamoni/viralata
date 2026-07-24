# 22-GIT-WORKFLOW.md — Workflow Git Detalhado

> **Atualizado em 2026-07-24**
>
> Padrões Git para trabalhar no projeto: branches, commits, PRs, merges.

## §1. Configuração Inicial

### §1.1. Configurar user (uma vez)

```bash
git config --global user.name "Seu Nome"
git config --global user.email "[email protected]"
git config --global init.defaultBranch main
```

### §1.2. SSH Key (recomendado)

```bash
# Gerar
ssh-keygen -t ed25519 -C "[email protected]"

# Adicionar ao GitHub
# Settings → SSH and GPG keys → New SSH key
# Colar conteúdo de ~/.ssh/id_ed25519.pub

# Testar
ssh -T [email protected]
```

### §1.3. Aliases úteis

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage "reset HEAD --"
git config --global alias.last "log -1 HEAD"
git config --global alias.visual "log --graph --oneline --decorate --all"
```

## §2. Branches

### §2.1. Tipos de branch

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Feature | `feature/TASK-XXX-desc` | `feature/TASK-123-pet-share` |
| Fix | `fix/TASK-XXX-desc` | `fix/TASK-456-can-edit-bug` |
| Hotfix | `hotfix/sw-vN-desc` | `hotfix/sw-v74-message-square` |
| Docs | `docs/desc` | `docs/update-ai-guide` |
| Refactor | `refactor/desc` | `refactor/cleanup-pets` |
| Chore | `chore/desc` | `chore/bump-deps` |

### §2.2. Criar branch

```bash
# Atualizar main
git checkout main
git pull

# Criar
git checkout -b feature/TASK-123-pet-share
```

### §2.3. Listar branches

```bash
git branch                    # local
git branch -a                 # local + remote
git branch -r                 # remote apenas
```

### §2.4. Deletar branch

```bash
# Local
git branch -d feature/TASK-123  # se merged
git branch -D feature/TASK-123  # force

# Remote
git push origin --delete feature/TASK-123
```

## §3. Commits

### §3.1. Conventional Commits

Formato: `<type>(<scope>): <description>`

| Type | Quando usar |
|------|-------------|
| `feat` | Nova feature |
| `fix` | Bug fix |
| `docs` | Apenas docs |
| `style` | Formatação, sem mudança lógica |
| `refactor` | Refactor sem mudança de comportamento |
| `perf` | Performance |
| `test` | Apenas tests |
| `chore` | Manutenção (deps, configs) |
| `build` | Build system |
| `ci` | CI/CD |
| `revert` | Reverter commit |

### §3.2. Scope

| Scope | O que |
|-------|-------|
| `pets` | Módulo pets |
| `orgs` | Módulo organizations |
| `pwa` | Service Worker |
| `firestore` | Rules |
| `docs` | Documentação |
| `tests` | Tests |
| `ui` | Componentes UI |

### §3.3. Exemplos bons

```bash
git commit -m "feat(pets): add share dialog with QR code"
git commit -m "fix(pwa): defer reload if user is interacting"
git commit -m "docs(ai-guide): create AI_GUIDE/ with 18 docs"
git commit -m "test(pets): add runtime test for PetCard"
git commit -m "chore(pwa): bump SW v73 → v74"
```

### §3.4. Commits breaking

Adicionar `!` após type/scope:

```bash
git commit -m "feat(api)!: change response format"
git commit -m "fix(db)!: drop unused collection"
```

### §3.5. Multi-line

```bash
git commit -m "feat(pets): add share dialog

- Generate QR code from pet_seq
- Copy link to clipboard
- Track shares (best-effort)

Closes #123"
```

### §3.6. Amend (último commit)

```bash
# Adicionar mudanças ao último commit
git add forgotten-file.js
git commit --amend --no-edit

# Mudar mensagem
git commit --amend -m "new message"
```

⚠️ **CUIDADO**: não amend commits que já foram pushed (em branch compartilhada).

## §4. Pull Requests

### §4.1. Criar PR

```bash
# Push branch
git push origin feature/TASK-123

# Abrir PR (gh CLI)
gh pr create \
  --title "feat(pets): add share dialog (TASK-123)" \
  --body "## O que
- Share button in PetDetail
- QR code generation
- Copy link to clipboard

## Por que
User pediu para compartilhar pets com amigos

## Como testar
- Abrir /pet/:id
- Clicar em 'Compartilhar'
- Ver QR code
- Copiar link
- Testar em mobile

## Screenshots
[anexar]

## Checklist
- [x] Tests passam
- [x] Build passa
- [x] Docs atualizados
- [x] SW bumped (se UI)"
```

### §4.2. Review

- **Aprovar** se OK
- **Comentar** se dúvida/sugestão
- **Request changes** se blocking
- **Conversar** antes de merge

### §4.3. Merge (SQUASH)

**SEMPRE** squash merge para manter histórico limpo.

```bash
# GitHub UI
# Botão "Squash and merge"

# CLI
gh pr merge --squash --delete-branch
```

### §4.4. Reverter merge

```bash
# Criar novo commit que reverte
git revert -m 1 <merge-commit-sha>

# OU resetar (apenas local, force push)
git reset --hard HEAD~1
git push --force
```

⚠️ **CUIDADO**: force push em main é **proibido**.

## §5. Conflitos

### §5.1. Quando ocorrem

- 2 pessoas mudaram a mesma linha
- 1 pessoa fez rebase após merge
- Branch muito desatualizada

### §5.2. Resolver

```bash
# 1. Atualizar main local
git checkout main
git pull

# 2. Rebase sua branch
git checkout feature/TASK-123
git rebase main

# 3. Conflitos aparecem nos arquivos
# Abrir arquivos, resolver manualmente

# 4. Marcar como resolvido
git add resolved-file.js

# 5. Continuar rebase
git rebase --continue

# 6. Force push (apenas sua branch)
git push --force-with-lease origin feature/TASK-123
```

### §5.3. Abortar rebase

```bash
git rebase --abort
```

### §5.4. Conflito com SCRUM sync

Comum! Veja `10-SCRUM.md` §4.

```bash
# O bot scrum atualizou painel-scrum.html
# Você também mudou
# Conflito!

# Solução: aceitar theirs (versão do bot)
git checkout --theirs .harness/painel-scrum.html
git add .harness/painel-scrum.html
git rebase --continue
# OU
git merge --continue
```

## §6. Tags

### §6.1. Criar tag

```bash
# Lightweight
git tag v74

# Annotated
git tag -a v74 -m "sw-v74 - AI_GUIDE + 29 tests"
```

### §6.2. Push tag

```bash
git push origin v74
```

### §6.3. Listar tags

```bash
git tag -l
git tag -l "v7*"
```

### §6.4. Checkout tag

```bash
git checkout v74
```

## §7. Stash

### §7.1. Salvar trabalho temporário

```bash
git stash
git stash save "WIP: feature X"
```

### §7.2. Listar stashes

```bash
git stash list
```

### §7.3. Aplicar stash

```bash
git stash pop          # último
git stash apply stash@{1}
```

### §7.4. Deletar stash

```bash
git stash drop stash@{0}
git stash clear        # todas
```

## §8. Logs e Histórico

### §8.1. Log bonito

```bash
git log --oneline
git log --oneline -20
git log --graph --oneline --decorate --all
git log --since="2 weeks ago" --oneline
git log --author="Mavis" --oneline
```

### §8.2. Diff

```bash
git diff                      # unstaged
git diff --staged             # staged
git diff HEAD~1                # último commit
git diff main..feature/TASK-123  # branch vs main
```

### §8.3. Blame

```bash
git blame path/to/file.jsx    # quem mudou cada linha
```

## §9. Submódulos (não usado, mas saber)

```bash
# Adicionar
git submodule add https://github.com/user/repo.git path/

# Atualizar
git submodule update --init --recursive

# Sincronizar
git submodule sync
```

## §10. Workflows específicos do projeto

### §10.1. Hotfix de PWA

```bash
# 1. Criar branch
git checkout -b hotfix/sw-v75-pwa-bug

# 2. Fix + tests
# 3. Bump SW v74 → v75 em vite.config.js, registerPwa.js, cleanupStaleCaches.js
# 4. Validar
npx vitest run
npx vite build
node scripts/audit-docs.mjs

# 5. Commit
git add .
git commit -m "fix(pwa): [description] (sw-v75)"

# 6. PR + merge (squash)
gh pr create
gh pr merge --squash

# 7. Validar bundle deployed
curl https://viralata.web.app/sw-v75.js
```

### §10.2. Nova feature

```bash
# 1. Branch
git checkout -b feature/TASK-123-nova-feature

# 2. Implementar
# 3. Tests + docs
# 4. Bump SW se UI
# 5. Commit
git commit -m "feat(module): description (TASK-123)"

# 6. PR + squash merge
# 7. Validar deploy
# 8. SCRUM sync
node .harness/sync.cjs --fix
```

### §10.3. Docs only

```bash
# 1. Branch
git checkout -b docs/update-ai-guide

# 2. Editar docs
# 3. Validar
node scripts/audit-docs.mjs

# 4. Commit
git commit -m "docs(ai-guide): update X"

# 5. PR + squash merge
```

## §11. Boas Práticas

### §11.1. Commits pequenos e focados

```bash
# ❌ Errado: 1 commit gigante
git commit -m "feat: tudo da feature X"

# ✅ Certo: 5 commits focados
git commit -m "feat(pets): add share schema"
git commit -m "feat(pets): add share service"
git commit -m "feat(pets): add share hook"
git commit -m "feat(pets): add share dialog"
git commit -m "test(pets): add share dialog tests"
```

### §11.2. Mensagens descritivas

```bash
# ❌ Errado
git commit -m "fix"
git commit -m "wip"
git commit -m "asdf"

# ✅ Certo
git commit -m "fix(pet-detail): canEdit → canEditHistory in PetNotes (ReferenceError)"
```

### §11.3. Não commitar coisas não relacionadas

```bash
# ❌ Errado: 1 commit com tudo
git add .
git commit -m "feat + fix + docs + chore"

# ✅ Certo: 4 commits separados
git add src/...
git commit -m "feat(...)"
git add src/...
git commit -m "fix(...)"
```

### §11.4. Não commitar secrets

```bash
# .env NÃO vai no git
echo ".env" >> .gitignore
echo "**/.env" >> .gitignore
echo "**/secrets.json" >> .gitignore
```

### §11.5. Não force push em main

```bash
# ❌ PROIBIDO
git push --force origin main

# ✅ Permitido (apenas sua branch)
git push --force-with-lease origin feature/TASK-123
```

## §12. Quando ficar preso

- **Conflito não resolve**: `git rebase --abort` e pedir ajuda
- **Commit errado**: `git reset --soft HEAD~1` (mantém mudanças)
- **Mudou de ideia**: `git checkout -- file.js` (descarta mudanças locais)
- **Perdeu trabalho**: `git reflog` (histórico de tudo)

## §13. Recursos

- [Pro Git Book](https://git-scm.com/book/pt-br/v2)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [GitHub Docs](https://docs.github.com/en)

---

**Próxima leitura**: `09-DEPLOY.md` (CI/CD)
