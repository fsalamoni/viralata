# SCRUM Protocol — Como o Loop Autônomo Funciona

> Documento do protocolo de execução do loop autônomo da Viralata.
> Referência: `.harness/LOOP_PROMPT.md` (prompt completo do agente).

---

## Visão Geral

O loop autônomo roda **24/7 a cada 30 minutos**, através de um cron job que cria sessões do Mavis Agent. Cada sessão:

1. Faz pull do `main` mais recente.
2. Pega a próxima task do backlog SCRUM.
3. Faz investigação REAL (lê arquivos inteiros, greps de contexto).
4. Implementa mudança perceptível.
5. Roda `npm run build` (verde obrigatório).
6. Commita com mensagem descritiva.
7. Faz merge para `main`.
8. Roda o **anti-fachada script** (`anti-fachada.cjs`).
9. Atualiza SCRUM (done/blocked).
10. Sincroniza métricas.
11. Push.

---

## Arquivos-Chave

| Arquivo | Função |
|---------|--------|
| `.harness/SCRUM_TASKS.json` | Source of truth do estado das tasks |
| `.harness/scrum.cjs` | CLI para manipulação de status (start/done/block/review) |
| `.harness/sync.cjs --fix` | Gera `public/scrum.html` + embed de métricas |
| `.harness/anti-fachada.cjs` | Script de validação anti-fachada |
| `.harness/LOOP_PROMPT.md` | Prompt completo do agente do loop |
| `public/scrum.html` | Painel visual do SCRUM (deployado) |

---

## Status de uma Task

```
backlog → ready → in_progress → in_review → done
                                          ↘ blocked (se erro)
```

**Regras**:
- `done` só de `in_review` — nunca pular.
- `blocked` recebe motivo claro.
- Task não pode ir direto de `in_progress` → `done`.

---

## Anti-Fachada Script

**GATE OBRIGATÓRIO** antes de marcar qualquer task como `done`.

```bash
node .harness/anti-fachada.cjs TASK-XXX
```

**Critérios**:
1. Commit com `feat:`/`fix:`/`refactor:`/`perf:`/`audit:` no subject (não só `chore(scrum)`)
2. Diff mínimo: 10 insertions OU 2 files changed
3. `npm run build` verde
4. Status transition válida (estava em `in_review`)
5. Evidence no JSON (SHA, files, insertions)

**Códigos de saída**:
- `0`: passou ✅
- `2`: sem commit ❌
- `3`: diff muito pequeno ❌
- `4`: build quebrado ❌
- `5`: status inválido ❌
- `6`: só chore(scrum) ❌

**Overrides** (usar com cautela):
- `--allow-no-commit`: audit-only justificado
- `--allow-small-diff`: mudança cirúrgica
- `--allow-chore-only`: refatoração mecânica

---

## Fluxo Completo por Task

```
1. git pull --no-rebase origin main
2. git status (clean?)
3. node .harness/scrum.cjs start TASK-XXX   → in_progress
4. git worktree add .worktrees/wt-TASK-XXX -b feat/audit-TASK-xxx main
5. cd .worktrees/wt-TASK-XXX

   // INVESTIGAÇÃO
   wc -l Component.jsx                          // arquivo inteiro
   grep -rn "ComponentName" src/ | head -20    // 2+ greps de contexto
   grep -rn "usage" src/ | head -10

   // IMPLEMENTAR
   npm run build                                // verde!
   git add -A && git commit -m "feat: TASK-XXX — ..."

   // VERIFICAR
   git show HEAD --stat                         // diff >= 10 linhas?

   // MERGE
   cd /workspace/viralata
   git checkout main
   git pull --no-rebase origin main
   git merge --no-ff feat/audit-TASK-xxx -m "merge: ..."

   // LIMPEZA
   git worktree remove --force .worktrees/wt-TASK-XXX
   git worktree prune
   git branch -D feat/audit-TASK-xxx

   // ANTI-FACHADA
   node .harness/scrum.cjs review TASK-XXX
   node .harness/anti-fachada.cjs TASK-XXX
   ANTI_FACHADA_EXIT=$?

   if [ $ANTI_FACHADA_EXIT -ne 0 ]; then
     node .harness/scrum.cjs block TASK-XXX --reason "anti-fachada rejected"
     exit 1
   fi

   node .harness/scrum.cjs done TASK-XXX

   // SCRUM SYNC
   python3 .harness/metrics.cjs                 // atualizar métricas
   node .harness/sync.cjs --fix                 // gerar public/scrum.html
   git add -A && git commit -m "chore(scrum): TASK-XXX metrics + html"
   git pull --no-rebase origin main
   git push origin main
```

---

## Conflitos de Merge

**Sintoma**: paralelo sessions push SCRUM updates constantemente.
`public/scrum.html` e `.harness/painel-scrum.html` em conflito.

**Resolução**: SCRUM remoto é autoritativo.
```bash
git checkout --theirs .harness/painel-scrum.html public/scrum.html
git add .harness/painel-scrum.html public/scrum.html
git commit -m "fix(scrum): resolve merge conflicts"
git pull --no-rebase origin main
git push origin main
```

⚠️ **Nunca fazer `git rebase`** — pode causar loops infinitos de merge.

---

## Métricas

O SCRUM tem 3 categorias de tasks:

| Categoria | Tag | Origem |
|-----------|-----|--------|
| Geral | nenhuma | Desenvolvimento geral |
| full-audit | `full-audit` | FULL_AUDIT_2026-07-17 (107 tasks) |
| hotfix | `hotfix` | Correções urgentes |

**Campo `metrics.*` no JSON** (sincronizado por `sync.cjs --fix`):
- `done`, `ready`, `in_progress`, `in_review`, `blocked`, `backlog`, `totalTasks`
- Usado pelo `public/scrum.html` para exibir o painel público

⚠️ **Após cada task**: rodar `sync.cjs --fix` e commitar.

---

## Como Criar Tasks

```bash
# Via CLI
node .harness/scrum.cjs create "TASK-XXX" "Título da task" --tags="full-audit,hotfix"

# Via JSON manualmente (EVITAR reescrever arquivo inteiro — corrompe estrutura)
node -e "
const j=require('./.harness/SCRUM_TASKS.json');
j.tasks.push({ id: 'TASK-XXX', title: '...', status: 'backlog', tags: [...] });
require('fs').writeFileSync('.harness/SCRUM_TASKS.json', JSON.stringify(j,null,2));
"
```

⚠️ **Nunca reescrever o SCRUM_TASKS.json inteiro** — perde fases, IDs, estrutura.

---

## Cron

```bash
# Cron ativo para o loop (30 min)
node .harness/cron.cjs create \
  --agent="viralata-dev-loop-30min-fullaudit" \
  --schedule="*/30 * * * *" \
  --prompt="$(cat .harness/LOOP_PROMPT.md)" \
  --active-hours='{"start":"00:00","end":"23:59"}' \
  --session='{"mode":"new"}'
```

Cron atual: `420105918492955` (viralata-dev-loop-30min-fullaudit).

---

## Anti-Patterns (O Que Não Fazer)

| ❌ Proibido | ✅ Correto |
|------------|-----------|
| Marcar done sem commit | Commit feat/fix/audit + anti-fachada OK |
| Diff < 10 linhas sem justificativa | Mudança perceptível ≥ 10 insertions |
| "no changes needed" como done | `dropped` com motivo |
| Pular in_review | Sempre in_review → done |
| Reescrever SCRUM inteiro | Editar só campo `status` |
| `git rebase` | `git pull --no-rebase` + `git merge --no-ff` |
| Ignorar conflito de harness | `git checkout --theirs` (remoto autoritativo) |
| Mudar feature flag sem migração | DEFAULT + migrateLegacyFlags + bump versão + teste |
| Mudar UI sem bump sw.js | Bump `filename: 'sw-vN.js'` |
