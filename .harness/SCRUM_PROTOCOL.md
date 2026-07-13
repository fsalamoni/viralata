# Protocolo de Coordenação entre Sessões · Viralata

> v1.0 · 2026-07-11 · mantido em `.harness/SCRUM_PROTOCOL.md` (espelho da aba "Protocolo" do `painel-scrum.html`)

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

Antes de criar, busque no painel/JSON se já existe. Se não, adicione com ID sequencial, `status: "ready"`, `owner: "mvs_sua_session_id"`. Salve o JSON, exporte do painel (botão **Export**) ou edite direto no arquivo. Se duas sessões editarem ao mesmo tempo, **USE `scrum.cjs` (canonical CLI)** — lock single-instance + atomic write previnem race condition (ver §8).

**Para abrir via CLI** (recomendado para campos simples):
```bash
# Para transições (start/done/review/block/drop) — SEMPRE via CLI
npm run scrum:start -- TASK-XXX --owner mvs_xxx --branch feat/...

# Para criar task NOVA (não há comando CLI específico ainda) — edite JSON com lock manual:
# 1. mavis communication send --to root --content "vou editar JSON, trava 30s"
# 2. Editar .harness/SCRUM_TASKS.json
# 3. node .harness/sync.cjs --fix
# 4. mavis communication send --to root --content "liberei"
```

## 4. Transições de status

**CANONICAL: use `scrum.cjs` (ver §B.1.6 do AGENTS.md).** Edicão manual do JSON é LEGADO e desencorajada.

| De → Para | Quando | Comando CLI |
|---|---|---|
| `backlog → ready` | Priorizada pelo usuário ou owner; tem critérios de aceitação claros | (edição manual OK com lock) |
| `ready → in_progress` | Worktree aberto (`git worktree add`) | `npm run scrum:start -- TASK-XXX --owner mvs_xxx --branch feat/...` |
| `in_progress → in_review` | `npm test` verde, lint clean, build OK, DELIVERABLE.md escrito, smoke test com flag OFF | `npm run scrum:review -- TASK-XXX --pr "#N"` |
| `in_review → done` | Mergeado em main, smoke test em produção OK | `npm run scrum:done -- TASK-XXX --pr "#N" --evidence "..."` |
| `qualquer → blocked` | Bloqueio externo (decisão, dep, etc.) | `npm run scrum:block -- TASK-XXX --reason "..."` |
| `qualquer → dropped` | Decisão humana ou descoberta de que não é mais necessária | `npm run scrum:drop -- TASK-XXX --reason "..."` |

**Por que `scrum.cjs`**: lock single-instance, atomic write, validação de transições, recálculo automático de métricas. Previne race condition entre sessões paralelas.

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
| `.harness/painel-scrum.html` | Página visual. Abra no navegador. **Auto-sync** com `.harness/SCRUM_TASKS.json` via `node .harness/sync.cjs --watch` (vê §13). |
| `.harness/SCRUM_TASKS.json` | Dataset machine-readable. Source of truth. Edite **via `scrum.cjs`** (ver §4). |
| `.harness/scrum.cjs` | **CLI canônica** para transições (start/done/review/block/drop/list/show). Lock single-instance + atomic write. **USE ESTA** em vez de editar JSON manualmente. |
| `.harness/sync.cjs` | Sync com git worktrees + **auto-reembed do painel** (modo `--watch`, vê §13). |
| `.harness/autosync.cjs` | **DEPRECATED** desde 2026-07-12 (TASK-373). Use `scrum.cjs` direto. |
| `.harness/SCRUM_PROTOCOL.md` | Este protocolo (espelha o painel). |

## 13. Auto-sync do painel (`sync.cjs --watch`)

A **Regra B** (Auto Scrum Update) exige que o painel HTML esteja sempre em dia
com o `SCRUM_TASKS.json`. O `sync.cjs` tem 3 modos:

| Comando | O que faz |
|---|---|
| `node .harness/sync.cjs` | One-shot: detecta worktrees, valida integridade, **não** re-embed. |
| `node .harness/sync.cjs --fix` | One-shot + corrige worktrees/sessões no JSON. |
| `node .harness/sync.cjs --watch` | **Long-running watcher**: monitora `SCRUM_TASKS.json` (mtime polling 750ms) e re-embed no `painel-scrum.html` a cada mudança. |
| `node .harness/sync.cjs --watch --serve` | Watcher + HTTP server em `http://localhost:8731/painel-scrum.html` (CORS habilitado → auto-reload no browser). |
| `node .harness/sync.cjs --check` | Exit 1 se IDs duplicados ou refs quebradas. Use em CI. |

**Atalhos npm** (no `package.json`):

```bash
npm run sync           # one-shot
npm run sync:fix       # one-shot + corrige
npm run sync:watch     # long-running watcher
npm run sync:serve     # watcher + HTTP server (auto-reload no browser)
```

**Comportamento do painel sob auto-sync:**

- **Aberto via `file://`** (clique duplo no HTML): fetch é bloqueado por CORS → pill mostra `sync manual`. Use o botão **Reload** (topbar) ou rode `npm run sync:serve` e abra pela URL HTTP.
- **Aberto via `http://localhost:8731/`** (`sync:serve`): polling de 5s detecta mudança → auto-reload em até 5s. Pill mostra `↻ HH:MM:SS` na hora do reload, depois `live HH:MM:SS`.
- **Em qualquer modo**: o `sync.cjs --watch` atualiza o `<meta name="auto-sync-last">` no HTML a cada re-embed, então o pill mostra o último timestamp embutido mesmo em `file://`.

**Quando rodar `sync:watch`:**

- Em desenvolvimento local enquanto edita o JSON na mão.
- Durante a sprint, depois de cada `mavis communication` que muda tasks.
- Em qualquer sessão Mavis que esteja criando/movendo tasks (recomendado: rodar em background, `node .harness/sync.cjs --watch &` ou via terminal dedicado).

**Quando NÃO rodar:**

- Durante merge de PR (pode dar conflito de mtime).
- Em produção (o painel é buildado em build-time, não运行时 re-embutido).

**Quem mantém:** Viralata Coder (mvs_f1e04f28717d42cdba05e221b7b4b6f3). PR com flag `HARNESS_AUTO_SYNC_V1` (default OFF) no worktree `wt/auto-import` (branch `feat/harness-auto-import`).

**Composição com `autosync.cjs` (Mavis 311d, `wt/e79e15ca`):**

Os dois daemons são **complementares** e compõe o pipeline Regra B completo:

```
mavis communication
       ↓
[autosync.cjs]  ← daemon que detecta TASK-XXX / MR#N / FAIL nas mensagens
       ↓ (atualiza)
SCRUM_TASKS.json
       ↓
[sync.cjs --watch]  ← daemon que detecta mtime do JSON
       ↓ (re-embed)
painel-scrum.html
       ↓
[autoSync()]  ← script do HTML que faz polling 5s (em HTTP) e auto-reload
       ↓
Browser do usuário
```

- `autosync.cjs` (input side): mensagens mavis → JSON
- `sync.cjs --watch` (output side): JSON → HTML
- `autoSync()` no HTML (browser side): HTML → reload no browser

Os três juntos fecham o loop. Cada um é independente (se um cai, o pipeline degrada gracefully).
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
- **Status**:
  - `in-sync` se commitsAhead === 0
  - `ahead-of-main` caso contrário
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
| Antes de commitar | `node .harness/sync.cjs --check` (deve dar exit 0) |
| Depois de pull | `node .harness/sync.cjs --fix` |
| Depois de mexer manualmente no JSON | `node .harness/sync.cjs --check` |
| Setup de hook pre-commit | ver §13.6 |

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

### 13.7 Última atualização

- v1.0 — 2026-07-11 — TASK-061 (Mavis mvs_311d0)

---

## 14. Regra A — Avaliação Plena por Funcionalidade (do AGENTS.md)

**Toda funcionalidade, ao ser criada, modificada OU auditada, DEVE ser avaliada em TODAS as frentes que tocam a plataforma.** Mandato cross-cutting, persistente até que todas as funcionalidades estejam plenamente planejadas.

Para detalhes completos da checklist (5 eixos: UX, papéis, regras de negócio, integrações, estado pós-deploy), ver `/AGENTS.md` §A.1.

**Exemplo de gap identificado**: funcionalidade "voluntários em abrigos" tem aba no painel administrativo, mas falta:
- Página pública do abrigo com bloco "Seja voluntário"
- Perfil do usuário com bloco "Minhas voluntariadas"
- Vinculação a vitrines e eventos (atribuições)
- Termo de voluntariado v2 com aceite
- Clickwrap em ações críticas
- Auditoria completa + LGPD

Qualquer funcionalidade com gaps assim é **INCOMPLETA**, não "feature parcial". Registrar no `SCRUM_TASKS.json` como `backlog` ou `ready` antes de marcar `done`.

## 15. Regra B — Auto Scrum Update (do AGENTS.md)

**Toda atividade de desenvolvimento, no INÍCIO e no FIM, deve atualizar `SCRUM_TASKS.json` automaticamente.** Não é opcional, não é "boa prática" — é regra.

Para detalhes das transições obrigatórias (ready→in_progress, in_progress→in_review, in_review→done, blocked, dropped), ver `/AGENTS.md` §B.1.

**Local da verdade**: `.harness/SCRUM_TASKS.json` (root é o owner canônico: `mvs_f1e04f28717d42cdba05e221b7b4b6f3`). Lock pra evitar race condition: avisar `mavis communication send` antes de editar batch.

**Checklist de fim de task**:
1. Atualizar status da task no JSON
2. Recalcular `metrics.*`
3. Re-rodar embed (re-injetar JSON no `<script id="initial-data">` do HTML)
4. Notificar root via `mavis communication send`
5. Se bloqueada: adicionar `blockedBy` + `evidence`
6. Se drop: manter histórico (nunca apagar)

## 16. Política de comunicação sem truncation

**Causa raiz**: mensagens de `mavis communication send` com `:` (dois-pontos) terminais em qualquer linha, OU conteúdo total > ~500 chars, podem ser cortadas no transporte. Sintoma: o recipient recebe só o preâmbulo e um `:` final, sem o conteúdo real.

**Política (obrigatória pra todas as sessões, não convenção)**:

### Padrão de mensagem
- **Zero `:` no fim de linha**. Use `—` (em-dash) como separador quando precisar de quebra visual.
- **Inline curto** (< 300 chars): direto, sem separação.
- **Inline médio** (300-500 chars): use `—` como bullet, max 1 linha por item.
- **Longo** (> 500 chars): **SEMPRE** dropar conteúdo em scratchpad ou workspace path, mandar só path + palavra curta.

### Workflow padrão (longo)
1. Escrever conteúdo completo em arquivo (scratchpad `C:\Users\Usuario\.mavis\scratchpads\<sessionId>\scratchpad.md` OU workspace `C:\Users\Usuario\.mavis\agents\<agentName>\workspace\<filename>.md`).
2. Mandar mensagem curta: `<comando> path do arquivo — processa quando puder.` (sem `:` terminal).
3. Recipient lê o arquivo, processa, responde.

### Workflow padrão (ack/quick reply)
- Mensagem curta tipo `preenchido`, `show`, `combinado`, `👍` — qualquer um serve como ack sem triggerar truncation.
- Resposta a pergunta simples: `<resposta curta> — <contexto mínimo>`. Sem `:` no fim.

### Anti-padrões (cortam)
- `Confirmação X com Y:` (termina com `:`)
- `Status: tudo OK` (dois-pontos como rótulo, mesmo no meio — pode cortar)
- Mensagens > 500 chars sem path

### Onde isso já foi acordado
- Pactuado entre mvs_f1e04 (root/Viralata Coder) e mvs_60b9c (General) em 2026-07-11 20:16, após o General propor padronizar.
- Aplicar retroativamente em qualquer mensagem que falhar o teste: "essa mensagem tem algum `:` no fim de linha ou > 500 chars sem path?"



