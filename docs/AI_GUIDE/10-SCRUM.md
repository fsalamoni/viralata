# 10-SCRUM.md — Regras SCRUM, Sync, Comandos

> **Atualizado em 2026-07-24**

## §1. Visão Geral

- **Total tasks**: 742 (711 done, 31 pending/backlog)
- **Storage**: `.harness/SCRUM_TASKS.json`
- **Sync tool**: `node .harness/sync.cjs`
- **UI**: `/scrum` (admin-only, com auth)

## §2. As 2 Regras Invioláveis

### §2.1. REGRA A: Auto-Sync Após Merge

> **REGRA A**: Após MERGE de PR (qualquer task concluída), rodar
> `node .harness/sync.cjs --fix` para auto-sync do `SCRUM_TASKS.json`.

**Por quê**: garante que tasks mergeadas estão marcadas como `done` no
SCRUM. Sem isso, o topbar do admin fica desatualizado.

**Quando**: imediatamente após merge de PR.

```bash
git checkout main
git pull
node .harness/sync.cjs --fix
git add .harness/SCRUM_TASKS.json
git commit -m "chore(scrum): sync after PR #XXX"
git push origin main
```

### §2.2. REGRA B: Varredura Periódica

> **REGRA B**: A cada ~10 tasks, rodar `node .harness/sync.cjs` (sem `--fix`)
> para verificar tasks `ready` que já foram mergeadas.

**Por quê**: detectar inconsistências entre código e SCRUM. Tasks
"ready" que já estão mergeadas precisam ser marcadas como `done`.

**Quando**: a cada 10 tasks concluídas, ou uma vez por semana.

```bash
node .harness/sync.cjs --check
# output:
# Found 3 inconsistencies:
# - TASK-XXX is marked 'ready' but was merged in commit abc1234
# - TASK-YYY is marked 'in_progress' but no commit found
# - TASK-ZZZ is marked 'done' but file modified after
```

## §3. Estados de Task

| Estado | Significado | Quem move |
|--------|-------------|-----------|
| `backlog` | Não planejada | ninguém |
| `pending` | Planejada, mas não começou | scrum master |
| `ready` | Pronta para começar (deps OK) | scrum master |
| `in_progress` | Sendo trabalhada | dev/IA |
| `done` | Concluída e mergeada | dev/IA + auto-sync |
| `cancelled` | Cancelada (não fazer) | scrum master |

## §4. Comandos

### §4.1. Sync

```bash
# Verificar inconsistências (read-only)
node .harness/sync.cjs --check

# Auto-sync (escreve em SCRUM_TASKS.json)
node .harness/sync.cjs --fix

# Com verbose
node .harness/sync.cjs --check --verbose
```

### §4.2. Marcar Task

```bash
# Marcar como in_progress
node .harness/scrum.cjs start TASK-XXX

# Marcar como done
node .harness/scrum.cjs done TASK-XXX

# Marcar como ready
node .harness/scrum.cjs ready TASK-XXX

# Cancelar
node .harness/scrum.cjs cancel TASK-XXX
```

### §4.3. Listar

```bash
# Listar todas
node -e "const t=require('./.harness/SCRUM_TASKS.json'); console.log(t.tasks.length)"

# Listar por status
node -e "
  const t = require('./.harness/SCRUM_TASKS.json');
  const groups = {};
  t.tasks.forEach(task => {
    groups[task.status] = (groups[task.status] || 0) + 1;
  });
  console.log(groups);
"
```

## §5. Estrutura de uma Task

```json
{
  "id": "TASK-XXX",
  "title": "feat: descrição curta",
  "description": "Descrição longa (markdown)",
  "status": "in_progress",
  "priority": "high",
  "labels": ["feature", "pets", "v3"],
  "estimate": 4,  // horas
  "actual": null,  // preenchido ao done
  "dependencies": ["TASK-YYY"],  // task IDs
  "blocked_by": null,
  "assigned_to": "Mavis",
  "created_at": "2026-07-22",
  "started_at": "2026-07-22",
  "completed_at": null,
  "branch": "feature/TASK-XXX",
  "pr": null,
  "commits": ["abc1234"],
  "files_changed": ["src/modules/pets/pages/PetDetailV3.jsx"],
  "docs_updated": ["docs/AI_GUIDE/15-RECENT-FIXES.md"]
}
```

## §6. Fluxo de Trabalho

### §6.1. Criar Task

```bash
# 1. Adicionar ao SCRUM_TASKS.json (manualmente ou via script)
node .harness/scrum.cjs add TASK-XXX \
  --title "feat: <description>" \
  --priority high \
  --labels feature,pets,v3

# 2. Status: backlog → pending
node .harness/scrum.cjs pending TASK-XXX

# 3. Quando deps OK: pending → ready
node .harness/scrum.cjs ready TASK-XXX
```

### §6.2. Começar Task

```bash
# 1. Status: ready → in_progress
node .harness/scrum.cjs start TASK-XXX

# 2. Criar branch
git checkout main
git pull
git checkout -b feature/TASK-XXX

# 3. Código
# ...

# 4. Commit
git add .
git commit -m "feat: TASK-XXX - <description>"

# 5. PR
gh pr create --title "TASK-XXX: <description>" --body "..."
```

### §6.3. Concluir Task

```bash
# 1. PR merged
# 2. Pull main
git checkout main
git pull

# 3. Sync SCRUM
node .harness/sync.cjs --fix

# 4. Verificar inconsistências
node .harness/sync.cjs --check

# 5. Commit sync
git add .harness/SCRUM_TASKS.json
git commit -m "chore(scrum): sync after PR #XXX"
git push origin main
```

## §7. Topbar Admin

A topbar do `/admin` mostra:
- **Total tasks**: 742
- **Done**: 711
- **In progress**: X
- **Ready**: Y

Atualiza automaticamente após cada `sync.cjs --fix`.

## §8. Como o Sync Detecta Mudanças

### §8.1. Heurística

O `sync.cjs` usa:

1. **Git log**: encontra commits que mencionam `TASK-XXX`
2. **PR labels**: encontra PRs com `TASK-XXX` no título/body
3. **File patterns**: encontra mudanças em arquivos específicos

### §8.2. Marcador manual

Em último caso, pode-se marcar manualmente:

```json
{
  "id": "TASK-XXX",
  "status": "done",
  "completed_at": "2026-07-22"
}
```

## §9. Auditorias Periódicas

### §9.1. Auditoria Mensal

- Rodar `node .harness/sync.cjs --check`
- Resolver inconsistências
- Validar SCRUM_TASKS.json (sem tasks duplicadas, sem IDs órfãos)
- Revisar backlog (mover para pending se for prioridade)

### §9.2. Auditoria Trimestral

- Limpar tasks `cancelled` (mover para arquivo)
- Renumerar tasks (se necessário)
- Atualizar labels (adicionar novos labels conforme necessário)

## §10. Integração com AI

Quando a IA recebe uma task:

1. **Marcar como in_progress** (`scrum.cjs start TASK-XXX`)
2. **Trabalhar** (código + testes + docs)
3. **Commit** (mensagem inclui `TASK-XXX`)
4. **PR**
5. **Após merge, sync** (`sync.cjs --fix`)
6. **Marcar como done** (automático via sync)

## §11. Estatísticas (2026-07-23)

| Métrica | Valor |
|---------|-------|
| Total tasks | 742 |
| Done | 711 (95.8%) |
| In progress | 0 |
| Ready | 0 |
| Pending | 5 |
| Backlog | 26 |
| Cancelled | 0 |
| Média tempo (ready → done) | ~2h |
| Maior sprint | 11 sprints (PickleRush paralelo) |

---

**Próxima leitura**: `11-CORE-DIRECTIVES.md` (regras invioláveis).
