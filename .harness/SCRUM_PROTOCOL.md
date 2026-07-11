# Protocolo de Coordenação entre Sessões · Viralata

> v1.3 · 2026-07-11 · mantido em `.harness/SCRUM_PROTOCOL.md` (espelho da aba "Protocolo" do `painel-scrum.html`)

## 1. Identidade

Você é uma sessão Mavis trabalhando no Viralata. Antes de começar qualquer trabalho:

1. Leia `.harness/SCRUM_TASKS.json` (source of truth) ou importe via botão **Import** do painel HTML.
2. Identifique tasks com `status: "ready"` e `owner: "unassigned"` ou com sua `sessionId`.
3. Se for tomar uma task: adicione-se como `owner`, mude status para `"in_progress"`, abra worktree `feat/shelter-<fase>-<slug>`.

## 2. Modelo de task

```json
{
  "id": "TASK-XXX",                       // sequencial, não reusar
  "title": "Curto e imperativo",          // <= 80 chars
  "type": "feature|bug|refactor|docs|security|infra|debt|decision|chore",
  "category": "core|shelter|pets|orgs|community|admin|security|infra|design|kanban|lgpd|legal|docs|ci|test|perf|search",
  "status": "backlog|ready|in_progress|in_review|blocked|done|dropped",
  "priority": "critical|high|medium|low",
  "owner": "mvs_xxxxx | human | unassigned | human-jurídico",
  "branch": "feat/... | wt/... | null",
  "flag": "SHELTER_* | null",
  "worktree": ".worktrees/... | null",
  "pr": "#66 | null",
  "tags": ["..."],
  "blockedBy": ["TASK-002"],
  "evidence": "caminho/URL",
  "description": "Markdown livre",
  "createdAt": "YYYY-MM-DD",
  "updatedAt": "YYYY-MM-DD"
}
```

## 3. Como abrir uma task nova

Antes de criar, busque no painel/JSON se já existe. Se não, adicione com ID sequencial, `status: "ready"`, `owner: "mvs_sua_session_id"`. Salve o JSON, exporte do painel (botão **Export**) ou edite direto no arquivo. Se duas sessões editarem ao mesmo tempo, o painel resolve por timestamp (last write wins) — minimize isso coordenando por mensagens.

## 4. Transições de status

| De → Para | Quando | Ação extra |
|---|---|---|
| `backlog → ready` | Priorizada pelo usuário ou owner; tem critérios de aceitação claros | Mover data de priorização |
| `ready → in_progress` | Worktree aberto (`git worktree add`) | `owner` = sua sessão |
| `in_progress → in_review` | `npm test` verde, lint clean, build OK, DELIVERABLE.md escrito, smoke test com flag OFF | Mande `mavis communication send` à root pedindo review |
| `in_review → done` | Mergeado em main, smoke test em produção OK | Marcar `resolvedAt` |
| `qualquer → blocked` | Bloqueio externo (decisão, dep, etc.) | Preencher `blockedBy` com TASK-IDs e `evidence` |
| `qualquer → dropped` | Decisão humana ou descoberta de que não é mais necessária | **Não apague** — mantenha histórico |

## 5. Regras duras do projeto (carregadas no agent memory)

- **Worktree sempre**: branch `feat/shelter-<fase>-<slug>`. Nada em main sem worktree.
- **Feature flag SHELTER_*** em qualquer feature nova, default OFF.
- **Testes antes do commit** (`npm test` verde).
- **Firestore rules**: toda função com `return` explícito, zero fall-through.
- **Zod `.partial()`** não aceita null → pra nullificar, `FieldValue.deleteField()`.
- **Single-field `collectionGroup`**: auto-criado pelo Firestore, NUNCA declarar em `firestore.indexes.json`.
- **Post-adoption cron**: materializa só milestones com `scheduled_for <= now+90d`.
- **Snapshot pattern**: `applicant_snapshot` imutável nas applications.
- **Commits conventional**, PR com flag + worktree + bundle hash.
- **Stack congelada**: React + Vite + TanStack Query + Zod · Firestore + Cloud Functions · Vitest · região `southamerica-east1` · LGPD sempre em mente.

## 6. Comunicação inter-sessão

Use `mavis communication send` para coordenar. Formato sugerido:

```bash
mavis communication send --to <sessId> \
  --subject "Scrum: TASK-XXX em in_progress" \
  --body "TASK-XXX owner=eu, branch=feat/shelter-X-slug, deadline=YYYY-MM-DD. Não tocar em: TASK-YYY (em paralelo). Sinalizou bloqueio em TASK-ZZZ."
```

## 7. LGPD & jurídico

Tasks que tocam PII, termos legais, telemedicina, prontuário ou qualquer coisa que vire evidência jurídica:

- `owner = "human-jurídico"` para revisão final
- Mudanças em texto legal precisam de advogado humano antes de virar `"done"`
- Os 3 textos pendentes (TODO JURÍDICO) estão como `TASK-006`, `TASK-007`, `TASK-008`

## 8. Onde tudo vive

| Arquivo | O quê |
|---|---|
| `.harness/painel-scrum.html` | Página visual. Abra no navegador. |
| `.harness/SCRUM_TASKS.json` | Dataset machine-readable. Use pra automação e pra resetar o painel. |
| `.harness/SCRUM_PROTOCOL.md` | Este protocolo (espelha o painel). |
| `docs/SHELTER_MGMT_ROADMAP.md` | Roadmap de fases (Fase 0–22). |
| `docs/ROADMAP.md` | Roadmap paralelo (Fase 0–3: design system). |
| `docs/AUDIT_2026-07-11.md` e `docs/AUDIT_DEEP_2026-07-11.md` | Auditorias. |

## 9. Exemplo: ciclo completo de uma task

```bash
# 1. Puxar task
# (abrir painel, encontrar TASK-NNN com status=ready, owner=unassigned)

# 2. Abrir worktree
git worktree add ../viralata-wt-foo -b feat/shelter-23-foo main
cd ../viralata-wt-foo

# 3. Adicionar flag em src/modules/shelter/domain/constants.js
# 4. Implementar com tests, Zod, writeBatch onde aplicável
# 5. npm test && npm run typecheck && npm run lint && npm run build
# 6. Commit
git add -A
git commit -m "feat(shelter): TASK-NNN — descrição curta"
# 7. Atualizar JSON
#    - status: "in_review"
#    - branch: "feat/shelter-23-foo"
#    - worktree: ".worktrees/wt-foo" (ou o nome real)
#    - owner: "mvs_sua_session_id"
# 8. Mande `mavis communication send` à root pedindo review
# 9. Quando mergeado: status "done", mover métricas
```

## 10. Resolução de conflitos no JSON

Se duas sessões escreverem no JSON simultaneamente:

- **Cenário A** (mesma task): uma mensagem `mavis communication send` resolvendo quem fica com a task. A outra sessão volta o status para `ready`.
- **Cenário B** (tasks diferentes): `git pull` antes de editar. Se a task que você queria já não está `ready`, escolha outra.
- **Cenário C** (datasets inteiros): o painel resolve por `localStorage` (sua máquina). Pra coordenar com outras máquinas, commit o JSON no git e use a versão commitada como source of truth.

## 11. Quando você não é a sessão certa

Nem toda task é sua. Se a task pede:

- **Advogado humano** (textos legais, compliance): `owner = "human-jurídico"`. Sinalize via `mavis communication send` à root.
- **Decisão de produto** (escolher backend, priorização de roadmap): `owner = "human"`. Sinalize.
- **Trabalho físico do usuário** (criar conta, deploy manual): `owner = "human"`.

Se você (agente técnico) só consegue **preparar** a task, faça isso e marque como `in_progress` com nota: "preparado por mim, aguardando ação de <owner correto>".

## 12. Métricas que importam

O painel mostra contadores por status. Mas o que conta de verdade:

- **Cycle time**: tempo entre `ready → done`. Meta: < 2 sprints (14 dias úteis).
- **WIP limit**: não mais que 3 tasks simultâneas em `in_progress` por sessão. Se passar, sinalize.
- **Block rate**: % de tasks que entram em `blocked` vs total. Meta: < 20%.
- **Carry-over**: tasks que ficaram de uma sprint pra outra. Meta: < 10%.

Se algum indicador vira outlier, abra uma task `chore` de investigação.

## 13. Auto-sync do painel (mavis-orchestrated)

Para evitar drift entre o JSON e o estado real do repo, existe um script que detecta worktrees, calcula commitsAhead vs main, e atualiza `activeWorktrees`. Ele também valida a integridade do JSON.

### 13.1 Localização e tipo

- **Caminho**: `.harness/sync.cjs` (na raiz do repo)
- **Tipo**: Node.js script (CommonJS) — sem dependências externas
- **Não é commitado** por padrão (fica em `.harness/` que é local). Cada máquina/clone tem o seu.

### 13.2 Comandos

```bash
node .harness/sync.cjs            # só reporta
node .harness/sync.cjs --fix      # corrige o que puder (salva o JSON)
node .harness/sync.cjs --check    # exit 0 se OK, exit 1 se há problemas
node .harness/sync.cjs --json     # output em JSON
```

### 13.3 O que ele detecta

- **Worktrees ativos**: lê `git worktree list --porcelain` e popula `activeWorktrees`
- **commitsAhead**: para cada worktree, conta `git rev-list --count main..HEAD`
- **commitsBehind** (TASK-126): conta `git rev-list --count HEAD..main` — quanto main tem à frente do worktree
- **Status** (3 categorias):
  - `ahead-of-main` se commitsAhead > 0 (worktree tem commits que main não tem)
  - `behind-main` se commitsAhead === 0 && commitsBehind > 0 (worktree parado num commit antigo; main evoluiu à frente — **NÃO é in-sync**)
  - `in-sync` se commitsAhead === 0 && commitsBehind === 0 (worktree e main no mesmo commit)
- **Refs quebradas**: percorre `blockedBy` e `relatedTasks` de cada task. Se apontar para ID inexistente, reporta (mas não corrige automaticamente).
- **IDs duplicados**: detecta dois tasks com o mesmo `id`.
- **Owners faltando**: tasks sem campo `owner`.

### 13.4 Source of truth

Em ordem de prioridade (último ganha):

1. **JSON commitado** (`.harness/SCRUM_TASKS.json` no git) — visão compartilhada entre máquinas
2. **Git worktree state** — detectado por `sync.cjs`
3. **JSON local** (`.harness/SCRUM_TASKS.json` na máquina) — visão pessoal

Em caso de conflito: o JSON commitado é o contrato. Mudanças locais não commitadas são da sessão; após commit, viram contrato.

### 13.5 Quando rodar

| Quando | Comando |
|---|---|
| Antes de commitar | `node .harness/sync.cjs --check` (deve dar exit 0) — **automático via pre-commit hook** |
| Depois de pull | `node .harness/sync.cjs --fix` — **automático via post-merge hook** |
| Depois de mexer manualmente no JSON | `node .harness/sync.cjs --check` |
| Setup de hook pre-commit | `node .harness/install-hooks.cjs` (one-shot) |
| Ver o que cada commit fez | olhar `task.history[]` no JSON |
| Capturar atividade de siblings | `node .harness/autosync.cjs` (daemon) ou `--once` (one-shot) |

### 13.6 Hook pre-commit (opcional)

Para rodar `--check` automaticamente antes de cada commit:

```bash
# Em .git/hooks/pre-commit (ou via core.hooksPath):
#!/bin/sh
node .harness/sync.cjs --check || {
  echo "❌ SCRUM_TASKS.json tem problemas. Rode: node .harness/sync.cjs --fix"
  exit 1
}
```

Alternativa moderna: husky / pre-commit framework. Mas o script simples acima funciona sem dependências.

### 13.7 Smart detection (TASK-126..130)

`sync.cjs` agora é inteligente. Em todo `--fix` (manual ou via hook) ele:

1. **Ingere commits de cada worktree** (`git log main..HEAD`) e extrai padrões:
   - `TASK-XXX` → adiciona evento `{ts, type:'commit', worktree, branch, commit, subject}` em `task.history[]`
   - `RISK-XXX` → adiciona evento em `riskRegister[].history[]`
   - `MR#N` → loga em `metrics.mrLog[]`
2. **Auto-linka**: se a task referenciada está `ready` e o commit é num worktree ativo, atualiza `task.branch` e `task.worktree` (apenas quando ainda não estavam setados).
3. **Atualiza evidence**: se a task tem evidence fraca ou incompleta, adiciona `commit <short> em <branch>: <subject>`.
4. **Sempre atualiza** `task.updatedAt` e `metrics.lastIngest`.

Resultado: cada commit com `TASK-056: ...` no message vira rastreável no JSON sem ninguém precisar atualizar manualmente.

### 13.8 Autosync daemon (siblings em background)

`autosync.cjs` é um daemon que pollá `mavis communication messages` a cada N segundos e:

1. Lê mensagens recebidas pela minha sessão desde o último cursor (persiste em `.harness/.autosync-cursor.json`).
2. Extrai `TASK-XXX` / `RISK-XXX` / `MR#N` do body de cada mensagem → adiciona em `task.history[]` / `riskRegister[].history[]` com `eventKey=comm-<messageId>` (idempotente).
3. **Detecção semântica** — categoriza a mensagem em `metrics.semanticEvents[]`:
   - `verifier-fail` → `Veredito: FAIL`, `# VEREDITO: FAIL`
   - `verifier-pass` → `Veredito: PASS`, `# VEREDITO: PASS`
   - `report-delivered` → `Relatório fechado`, `Path: ...`
   - `producer-no-go` → `no-go`, `impossível fix`
   - `fixes-delivered` → `fix A/B/C`, `delivered`, `merged` (com TASK-XXX)

Uso:
- `node .harness/autosync.cjs` — daemon (Ctrl-C pra parar)
- `node .harness/autosync.cjs --once` — one-shot
- `node .harness/autosync.cjs --interval 30` — poll a cada 30s
- `node .harness/autosync.cjs --verbose` — log de cada tick

Para iniciar em background: `start-job $script = { node .harness/autosync.cjs }` ou rodar num terminal dedicado.

### 13.9 Última atualização

- v1.0 — 2026-07-11 — TASK-061 (Mavis mvs_311d0)
- v1.1 — 2026-07-11 — TASK-126..130: smart commit detection, autosync daemon, git hooks automáticos
- v1.2 — 2026-07-11 — TASK-126 fix: categoria `behind-main` no sync.cjs (worktree parado em commit velho ≠ in-sync). Também adiciona `commitsBehind` por worktree e métrica `activeWorktreesBehindMain`. Detecta drift do wt-17ff480a que estava marcado `in-sync` mas tem 83 commits atrás.
- v1.3 — 2026-07-11 — sync.cjs: `findIssues` agora aceita RISK-XXX em `blockedBy` (além de TASK-XXX). Antes, TASK-003 → RISK-002 era reportado como broken ref. Validação de integridade respeita o destino real do id.

