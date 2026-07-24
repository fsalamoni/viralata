# 16-AGENT-ONBOARDING.md — Onboarding para Novos Devs/IAs

> **Atualizado em 2026-07-24**

## §1. Bem-vindo!

Este documento é para você (humano ou IA) que está começando a
trabalhar no projeto Viralata. Ele te orienta passo-a-passo para
familiarizar-se com o projeto sem partir do zero.

## §2. Antes de Tudo

### §2.1. O que é o Viralata?

Plataforma web (PWA) de **adoção responsável de pets** no Brasil.
Conecta pessoas e ONGs que têm pets para adoção com adotantes
interessados. UI em português (pt-BR), mobile-first, baixa conectividade.

### §2.2. Stack

- React 18 + Vite 6.4
- Firebase (Auth, Firestore, Storage, Hosting, Functions)
- React Router 6, React Query 5, Tailwind 3, shadcn/ui
- Vitest para testes

### §2.3. Princípios do projeto

Ver `11-CORE-DIRECTIVES.md` §1. Resumo:
1. Não prejudicar nada
2. Calma, cautela, atenção
3. UX/UI é prioridade
4. Prevenção > correção
5. Documentação sempre atualizada

## §3. Passo-a-passo

### §3.1. Dia 1: Conhecer o projeto

**Manhã**:
1. Ler `00-START-HERE.md` (15 min)
2. Ler `11-CORE-DIRECTIVES.md` (30 min)
3. Ler `01-ARCHITECTURE.md` (20 min)
4. Ler `02-DATA-MODEL.md` (30 min)

**Tarde**:
5. Ler `03-MODULES.md` (20 min)
6. Ler `04-PAGES-ROUTES.md` (20 min)
7. Explorar `src/modules/pets/` no código (30 min)
8. Ler `13-DECISIONS.md` (30 min)

### §3.2. Dia 2: Configurar ambiente

```bash
# 1. Clonar repo
git clone https://github.com/fsalamoni/viralata.git
cd viralata

# 2. Instalar deps
npm install

# 3. Configurar .env (pegar com fsalamoni)
cp .env.example .env
# Preencher VITE_FIREBASE_* vars

# 4. Iniciar emulators (opcional)
firebase emulators:start

# 5. Rodar dev server
npm run dev
# Abrir http://localhost:5173

# 6. Rodar tests
npx vitest run
```

### §3.3. Dia 3: Fazer primeira task

**Task sugerida**: bug "good first issue" no GitHub.

1. Pegar uma task do SCRUM:
   ```bash
   node -e "const t=require('./.harness/SCRUM_TASKS.json'); console.log(t.tasks.filter(x=>x.labels?.includes('good-first-issue')))"
   ```

2. Criar branch:
   ```bash
   git checkout -b feature/TASK-XXX
   ```

3. Implementar (ver padrões em `12-CODING-STANDARDS.md`)

4. Testar:
   ```bash
   npx vitest run
   npx vite build
   node scripts/validate-lucide-imports.mjs
   ```

5. PR:
   ```bash
   git add .
   git commit -m "feat: TASK-XXX - <description>"
   git push origin feature/TASK-XXX
   gh pr create --title "TASK-XXX: <description>"
   ```

6. Após merge:
   ```bash
   git checkout main
   git pull
   node .harness/sync.cjs --fix
   git add .harness/SCRUM_TASKS.json
   git commit -m "chore(scrum): sync after PR #XXX"
   git push origin main
   ```

### §3.4. Dia 4+: Mergulhar em módulo específico

Escolher 1-2 módulos para se especializar (ver `03-MODULES.md`).
Ler doc do módulo em `modules/<NN>-<NAME>.md`.

## §4. Recursos por Papel

### §4.1. Frontend (UI)

- `05-DESIGN-SYSTEM.md`
- `12-CODING-STANDARDS.md`
- `04-PAGES-ROUTES.md`
- `modules/<módulo>.md`

### §4.2. Backend (Firestore)

- `02-DATA-MODEL.md`
- `07-FIRESTORE-RULES.md`
- `09-DEPLOY.md`
- `08-TESTING.md`

### §4.3. PWA / DevOps

- `06-PWA-CACHE.md`
- `09-DEPLOY.md`
- `14-TROUBLESHOOTING.md`

### §4.4. QA / Testes

- `08-TESTING.md`
- `15-RECENT-FIXES.md`
- `11-CORE-DIRECTIVES.md` §8

### §4.5. IA Agent

- `00-START-HERE.md` (índice principal)
- `11-CORE-DIRECTIVES.md` (regras)
- `13-DECISIONS.md` (D-*)
- `15-RECENT-FIXES.md` (últimos fixes)
- `10-SCRUM.md` (workflow)

## §5. Comandos Essenciais

```bash
# Dev
npm run dev              # Inicia dev server
npx vitest run           # Roda tests
npx vitest               # Watch mode
npx vite build           # Build produção

# Validar
node scripts/validate-lucide-imports.mjs

# SCRUM
node .harness/sync.cjs --fix
node .harness/scrum.cjs start TASK-XXX
node .harness/scrum.cjs done TASK-XXX

# Git
git checkout -b feature/<name>
git add .
git commit -m "..."
git push origin <name>

# GitHub
gh pr create
gh pr list
gh run watch

# Firebase
firebase emulators:start
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## §6. Como Pedir Ajuda

### §6.1. Antes de pedir ajuda

1. Tente resolver sozinho (ler docs, buscar código, testar)
2. Use `14-TROUBLESHOOTING.md`
3. Verifique `15-RECENT-FIXES.md` (problema similar?)
4. Verifique `13-DECISIONS.md` (decisão similar?)

### §6.2. Onde pedir

- **Issues**: GitHub issues
- **Chat**: (definir canal)
- **Email**: fsalamoni (human maintainer)

### §6.3. Como pedir (template)

```md
## Contexto
- O que estou tentando fazer
- Por que estou tentando fazer

## O que tentei
- Passo 1
- Passo 2

## Erro
```
<mensagem de erro>
```

## Ambiente
- Branch: feature/XXX
- Commit: abc1234
- Node: 20.x
- OS: macOS/Linux/Windows

## Esperado vs Atual
- Esperado: <X>
- Atual: <Y>
```

## §7. Cultura do Projeto

### §7.1. Code Review

- PRs precisam de pelo menos 1 aprovação
- Comentários devem ser construtivos
- Sugestões > ordens
- Não levar para o pessoal

### §7.2. Commits

- Mensagens descritivas (conventional commits)
- 1 commit por feature (squash merge)
- Incluir `TASK-XXX` quando aplicável

### §7.3. Documentação

- Toda mudança → doc atualizado
- Preferir atualizar existente a criar novo
- Doc é parte do código (review inclui docs)

### §7.4. Comunicação

- Respeitosa e clara
- Sem emoji em comunicação técnica
- Contexto > opinião

## §8. Próximos Passos

Após se familiarizar:

1. **Aprofundar em 1-2 módulos** (ver `03-MODULES.md`)
2. **Contribuir para issues** (boas primeiras issues)
3. **Revisar PRs de outros** (após 2-3 PRs próprios)
4. **Propor melhorias** (via issue com `enhancement` label)
5. **Mentorar próximos onboarders** (após 6 meses)

## §9. Recursos Externos

- **Firebase Docs**: https://firebase.google.com/docs
- **React Query**: https://tanstack.com/query
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **Vite**: https://vitejs.dev

## §10. FAQ

### §10.1. "Onde está X?"

1. Verificar `03-MODULES.md` (mapa de módulos)
2. Verificar `04-PAGES-ROUTES.md` (rotas)
3. `grep -r "X" src/` (busca no código)
4. `git log --all --oneline | grep X` (histórico)

### §10.2. "Por que Y é assim?"

1. Verificar `13-DECISIONS.md` (D-*)
2. Verificar `15-RECENT-FIXES.md` (mudou recentemente?)
3. `git log --all --oneline -p src/path/to/Y | head -50` (histórico)

### §10.3. "Como faço Z?"

1. Verificar `12-CODING-STANDARDS.md` (padrões)
2. Verificar `modules/<módulo>.md` (exemplos)
3. Copiar de código similar existente

---

**Próxima leitura**: `17-AUDIT-2026-07-23.md` (relatório de auditoria).
