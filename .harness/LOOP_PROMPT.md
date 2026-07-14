# LOOP_PROMPT — desenvolvimento autônomo (atualizado 2026-07-14 22:08 GMT-3)

**Contexto**: `/workspace/viralata`, branch `main`, React+Vite+Firebase.
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

---

## 🚀 MODO DE EXECUÇÃO: FEATURE (BATCH) — SEM PR/MERGE POR TASK

**A cada turno**:
- Implementa UMA task
- Faz commit + push da branch
- **NÃO** cria PR
- **NÃO** faz merge
- **NÃO** faz deploy
- **OBRIGATÓRIO**: REGRA #0 (scrum update) + REGRA #1 (metrics sync)

**A cada 10 tasks OU 4 horas (o que vier primeiro)**: batch PR + merge + deploy.

### Por que este modo?
- **Tokens**: 80% do overhead era PR-API + espera 20s + merge + force-push + sync + commit. Agora a task é pura implementação.
- **Calma**: sem pressão de tempo, foco em qualidade
- **Visibilidade**: painel público (viralata.web.app/scrum.html) continua sendo atualizado via REGRA #1
- **Reversibilidade**: reverter 1 commit antes do batch é trivial

### Como o batch é feito:
1. Contar tasks completadas desde o último batch
2. Se >= 10 OU passaram 4h: criar 1 PR batch com N commits, merge admin squash
3. Deploy automático (workflow Deploy Viralata dispara)

### Trigger de batch manual:
- Usuário fala "Mavis, batch" ou similar
- Aí o agente faz o batch imediatamente

---

## 🔄 CICLO DO LOOP — DECISÃO AUTOMÁTICA A CADA TURNO

```bash
cd /workspace/viralata
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f: d = json.load(f)
ready = [t for t in d['tasks'] if t['status'] == 'ready' and t.get('owner') not in ['human', 'human-juridico']]
print(f'{len(ready)} tasks ready')
"
```

- **Se `ready > 0`** → MODO FEATURE (implementar próxima task)
- **Se `ready == 0`** → MODO REVISÃO (UX/UI + bug-hunting)

Use `.harness/next-loop.sh` — ele decide e marca a task automaticamente.

---

## 🚨 REGRA #0 — ATUALIZAÇÃO DO SCRUM É OBRIGATÓRIA E INEGOCIÁVEL 🚨

**SEMPRE, ANTES de encerrar o turno (mesmo se a task falhou):**

1. Marque a task no SCRUM:
   - Se completou: `node .harness/scrum.cjs done TASK-XXX --pr YYY --reason "..."`
   - Se começou e está em progresso: `node .harness/scrum.cjs start TASK-XXX`
   - Se travou/bloqueou: `node .harness/scrum.cjs block TASK-XXX --reason "..."`
   - **NUNCA** termine o turno sem uma transição de status.

2. **🔴 REGRA #1 — SINCRONIZAR `metrics` DO JSON**:
   O `scrum.cjs done` atualiza o status da task no array MAS NÃO atualiza o objeto top-level `metrics` (que o painel público usa). Sem isso, o painel mostra contagem stale.
   ```python
   import json
   with open('.harness/SCRUM_TASKS.json', 'r') as f: d = json.load(f)
   m = d.setdefault('metrics', {})
   m['totalTasks'] = len(d['tasks'])
   m['done'] = len([t for t in d['tasks'] if t['status']=='done'])
   m['ready'] = len([t for t in d['tasks'] if t['status']=='ready'])
   m['inProgress'] = len([t for t in d['tasks'] if t['status']=='in_progress'])
   m['inReview'] = len([t for t in d['tasks'] if t['status']=='in_review'])
   m['blocked'] = len([t for t in d['tasks'] if t['status']=='blocked'])
   m['backlog'] = len([t for t in d['tasks'] if t['status']=='backlog'])
   with open('.harness/SCRUM_TASKS.json', 'w') as f: json.dump(d, f, indent=2)
   ```

3. Re-embede o painel:
   ```bash
   node .harness/sync.cjs --fix
   ```

4. Commit + push do scrum update:
   ```bash
   git add -A
   git commit -m "chore(scrum): TASK-XXX done PR #YYY"
   git pull --rebase --autostash origin main
   git push origin main
   # SE push falhar (force-push): use --force-with-lease
   ```

5. Se completou a task: **ATUALIZE ESTE PROMPT** (remova da lista de candidatas, adicione nova, faça commit + push).

6. Se forçor push manual: trigger deploy via API:
   ```bash
   curl -sS -X POST -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
     -d '{"ref":"main","inputs":{"skip_hosting":"false"}}' \
     "https://api.github.com/repos/fsalamoni/viralata/actions/workflows/deploy.yml/dispatches"
   ```

**VERIFICAÇÃO antes de encerrar**:
```bash
python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); done=[t for t in d['tasks'] if t['status']=='done']; m=d.get('metrics',{}); print(f'array done: {len(done)} | metrics done: {m.get(\"done\")}')"
```
**Se `array done` ≠ `metrics done`, ALGO ESTÁ ERRADO — REGRA #1 não foi aplicada.**

---

## 🎯 MISSÃO DO TURNO (20 min) — MODO FEATURE (BATCH)

1. **Investigue ANTES de codar** (NÃO leia tudo):
   - 1-2 greps para ver arquivos relacionados
   - `head -50 arquivo.jsx` para entender o contexto
   - Verifique schemas/domínio antes de escrever código
2. **Implemente com feature flag** (`SHELTER_*` ou conforme categoria, default OFF).
3. **Test**: 2+ tests smoke no mínimo.
4. **Worktree** + branch `feat/<slug>-2026-07-14`.
5. **Commit + push da branch** (SEM PR, SEM merge, SEM deploy).
6. **OBRIGATÓRIO ao final** — REGRA #0 + #1:
   ```bash
   cd /workspace/viralata
   node .harness/scrum.cjs start TASK-XXX  # ao começar
   
   # ... implementar, build, test ...
   
   # Push da branch (SEM PR)
   cd .worktrees/wt-<slug>
   git add -A
   git commit -m "feat: ..."
   git push -u origin feat/<slug>-2026-07-14
   
   # Limpar worktree
   cd /workspace/viralata
   git worktree remove --force .worktrees/wt-<slug>
   git worktree prune
   
   # REGRA #0: marcar done (pr=0 pois ainda não é PR)
   node .harness/scrum.cjs done TASK-XXX --pr 0 --reason "feat/<slug> pushed (batch pendente)"
   
   # REGRA #1: metrics sync
   python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); m=d.setdefault('metrics',{}); m['totalTasks']=len(d['tasks']); m['done']=len([t for t in d['tasks'] if t['status']=='done']); m['ready']=len([t for t in d['tasks'] if t['status']=='ready']); m['inProgress']=len([t for t in d['tasks'] if t['status']=='in_progress']); m['inReview']=len([t for t in d['tasks'] if t['status']=='in_review']); m['blocked']=len([t for t in d['tasks'] if t['status']=='blocked']); m['backlog']=len([t for t in d['tasks'] if t['status']=='backlog']); json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"
   
   # Re-embed + commit + push do scrum update
   node .harness/sync.cjs --fix
   git add -A
   git commit -m "chore(scrum): TASK-XXX done (batch pendente)"
   git pull --rebase --autostash origin main
   git push origin main
   ```
7. **NÃO** criar PR. **NÃO** fazer merge. **NÃO** fazer deploy. (Aguardar batch.)
8. **ATUALIZE O `LOOP_PROMPT.md`** ao final: remova task da lista, adicione nova candidata, faça commit + push.

---

## ✅ TASKS CONCLUÍDAS NESTE LOOP (NÃO pegar)

- TASK-315 A11Y WCAG AA — kanban roles, dialog aria-label, icon button aria-labels (feat/a11y-improvements-2026-07-14)
- TASK-308 PostAdoptionReturnDialog + PostAdoptionPauseDialog (PR #189)
- TASK-148 PostEventLog (PR #176)
- TASK-136 PublicHealthRecord (PR #175)
- TASK-149 UpcomingExhibitionsFeed (PR #177)
- TASK-181 EventsUnified (PR #178)
- TASK-323 Lightbox acessível (PR #179)
- TASK-306 FosterDashboard (PR #180)
- TASK-311 ShelterAdminDashboard (PR #181)
- TASK-324 Pets similares (PR #184)
- TASK-334 CommunityEventDetail + RSVP (PR #183)
- TASK-207, 264, 265, 266, 267, 132, 133, 134, 401, 402 (Fases anteriores)
- **Varredura 1 (36 tasks)**: 150, 152, 154, 157, 159, 160, 180, 191, 200, 241, 244, 245, 288, 289, 290, 293, 294, 295, 296, 299, 300, 329, 331, 332, 055, 218, 219, 221, 246, 275, 305, 307, 316, 335, 356, 267
- **Varredura 2 (29 tasks)**: 008, 063, 115, 116, 118, 119, 120, 121, 125, 147, 151, 158, 161, 162, 163, 166, 168, 173, 177, 193, 223, 264, 265, 266, 270, 313, 314, 344, 354

---

## 🆕 CANDIDATAS ATUALIZADAS (próximas 12, priorizadas por impacto visual)

| ID | Pri | Categoria | Descrição |
|---|---|---|---|
| TASK-308 | high | shelter | [UX-POSTADOPT-001] UI devolução + pause |
| TASK-325 | medium | shelter | [UX-MILESTONE-001] Foto/video pro adotante completar milestones |
| TASK-309 | high | shelter | [UX-ABRIGO-002] Onboarding wizard do abrigo (5 passos) — verificar duplicação |
| TASK-273 | high | shelter | Smart Search: adicionar entidade volunteer |
| TASK-277 | high | shelter | Rate limit em joinShelterAsVolunteer e acceptVolunteerTerms |
| TASK-312 | high | shelter | [INT-SEARCH-001] Sync ativo do search index (Cloud Function) |
| TASK-268 | critical | shelter | Cloud Function onVolunteerJoinedShelter (FCM admin) |
| TASK-269 | critical | shelter | Cloud Function onVolunteerParticipationCreated (FCM voluntário) |
| TASK-291 | high | shelter | Email provider (SendGrid/Resend) — AGUARDA decisão humana |
| TASK-176 | high | shelter | Sentry enriquecido |
| TASK-239 | medium | shelter | Sentry + Crashlytics |
| TASK-302 | medium | shelter | a11y mobile (helper) |

> **Notas**:
> - TASK-315 (a11y WCAG AA) foi entregue em modo BATCH (branch feat/a11y-improvements-2026-07-14 pushed, pr=0)
> - TASK-310, TASK-326 foram feitas pelo cron (verificar com git log antes de pegar)

---

## 🎯 PRINCÍPIOS INEGOCIÁVEIS

- **NÃO PREJUDICAR NADA**. Calma, cautela, atenção.
- **Feature flags SEMPRE**. Default OFF.
- **NUNCA commitar sem** `git status -s` + `git diff --cached --stat`.
- Use `forwardRef` em tests: `expect(X).toBeTruthy()` (não `typeof === 'function'`).
- Lint 0, build OK, tests passando.
- Em imports complexos de `lucide-react`: adicionar NOME ao import existente, não criar novo.
- **Em caso de conflito de rebase**: `git checkout --theirs <arquivo> && git add -A && git commit && git push --force-with-lease`. NÃO usar `git pull` puro.

---

## 🔧 COMANDOS CANÔNICOS

```bash
cd /workspace/viralata

# Investigar
grep -rln "termo" src/path/
head -50 src/path/arquivo.jsx

# Worktree
git worktree add -b feat/<slug>-2026-07-14 .worktrees/wt-<slug> main
cd .worktrees/wt-<slug>
git pull --rebase --autostash origin main

# Implementar, build, test
npm run build
npx vitest run --no-coverage src/path/__tests__/X.test.jsx

git add -A && git commit -m "feat: ..."
git push -u origin feat/<slug>-2026-07-14

# PR + merge
cd /workspace/viralata
PR_NUM=$(curl -sS -X POST -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
  -d '{"title":"...","head":"feat/<slug>-2026-07-14","base":"main","body":"..."}' \
  "https://api.github.com/repos/fsalamoni/viralata/pulls" | python3 -c "import sys,json; print(json.load(sys.stdin).get('number'))")
sleep 20
curl -sS -X PUT -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
  -d '{"merge_method":"squash"}' "https://api.github.com/repos/fsalamoni/viralata/pulls/$PR_NUM/merge"

# Scrum update (OBRIGATÓRIO)
git worktree remove --force .worktrees/wt-<slug> && git worktree prune && git branch -D feat/<slug>-2026-07-14
python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); [t.update({'status':'done','pr':'$PR_NUM','branch':'feat/<slug>-2026-07-14','updatedAt':'2026-07-14'}) for t in d['tasks'] if t['id']=='TASK-XXX']; json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"
node .harness/scrum.cjs done TASK-XXX --pr $PR_NUM --reason "..."
node .harness/sync.cjs --fix
git add -A && git commit -m "chore(scrum): TASK-XXX done PR #$PR_NUM"
git pull --rebase --autostash origin main
git push origin main

# Atualizar este prompt (ao final do turno)
# 1) Editar .harness/LOOP_PROMPT.md (remover done, adicionar nova)
# 2) Atualizar cron com 'mavis cron update'
# 3) Commit + push do .harness/LOOP_PROMPT.md
```

---

## 📋 SE NÃO TIVER CERTEZA

Escolha a task com **mais impacto visual** e **menos dependência** de:
- Firebase rules/dados sensíveis
- Decisões jurídicas (LGPD, DPO)
- Cloud Functions (FCM, email)

**Default**: TASK-147 (Escalas vitrines) ou TASK-308 (UI devolução + pause) ou TASK-315 (Acessibilidade) — são features visíveis e com baixo risco.

---

## 🏁 FIM DO TURNO

**SEMPRE terminar com**:
1. ✅ Scrum update (`scrum.cjs done` + `sync.cjs --fix`)
2. ✅ Commit + push do scrum update
3. ✅ Atualizar `.harness/LOOP_PROMPT.md` (lista refresh)
4. ✅ Atualizar cron `viralata-dev-loop-20min` com novo prompt
5. ✅ Commit + push do LOOP_PROMPT.md
6. ✅ Resumo do que foi entregue

---

## 🔧 MODO REVISÃO (quando `ready == 0`)

**Objetivo**: revisar o que foi entregue, adequar frontend à UX/UI ideal, prevenir bugs, antecipar falhas. Loop segue rodando — não para até o user desligar.

### Atividades (rodar em ordem de prioridade):

1. **Varredura de feature flags** — flags deprecated que podem ser removidas
2. **Auditoria a11y** — lighthouse, ARIA, contraste
3. **Análise de erros do console** — logs recorrentes em `src/`
4. **Refatoração de duplicação** — componentes similares
5. **Otimização de performance** — bundle, lazy loading
6. **Testes E2E** — smoke tests de fluxos críticos
7. **Documentação** — `docs/STATE.md`, `README.md`
8. **Prevenção de bugs** (procurar ativamente):
   - `try/catch` que silenciam erros
   - `Math.random` que deveria ser seed
   - `useEffect` que poderiam ser `useMemo`
   - keys duplicadas em `.map`
   - inputs sem `maxLength`
   - forms sem validação Zod
9. **Revisão de UX**:
   - Empty states em todos os componentes de lista
   - Loading states em todos os componentes async
   - Error states em todos os `catch`
   - `aria-label` em todos os botões só com ícone
   - `role=tab/aria-selected` em todos os Tabs
10. **Smoke check de rotas**:
```bash
for route in / /feed /mapa /comunidades /vitrines /eventos /lares-temporarios/dashboard /perfil /meus-pedidos; do
  status=$(curl -sS -o /dev/null -w "%{http_code}" "https://viralata.web.app${route}")
  echo "$route: $status"
done
```

### Commit de revisão:
```bash
cd /workspace/viralata
git checkout -b chore/review-2026-07-14
# melhorias
git add -A
git commit -m "chore(review): UX/UI + bug-hunting (2026-07-14)"
git push -u origin chore/review-2026-07-14
# PR + merge admin squash
```

**Se REVISÃO não tem nada a fazer**: o cron continua. Quando o user adicionar nova task (qualquer `node .harness/scrum.cjs add ...` ou via UI), o loop volta pra MODO FEATURE.

---

## ⏰ HORÁRIO

- **24/7, sem limite de horário.** O loop roda a cada 20 minutos, todos os dias.
- Só para quando o user desligar explicitamente (ou matar o cron via `mavis cron delete`).
- A madrugada também conta — não pare o turno por causa de horário.

---

## 🚀 BATCH: a cada 10 tasks OU 4 horas

**Trigger**: quando o `next-loop.sh` detectar que:
- ≥ 10 tasks completadas desde o último batch
- OU ≥ 4h desde o último batch

OU quando o user disser explicitamente "Mavis, batch" / "agora" / similar.

### Comandos do batch:
```bash
cd /workspace/viralata

# 1) Pegar todas as branches feat/* pendentes (sem PR)
git branch -r | grep "feat/" | head -20

# 2) Para cada branch, criar 1 PR (ou 1 PR batch com várias branches cherry-picked)
# Estratégia: 1 PR batch com N branches via cherry-pick

# 3) PR + merge admin squash
PR_NUM=$(curl -sS -X POST -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
  -d '{"title":"chore(batch): 10 features (TASK-XXX, TASK-YYY, ...)","head":"chore/batch-2026-07-14","base":"main","body":"Batch PR com 10 features pendentes."}' \
  "https://api.github.com/repos/fsalamoni/viralata/pulls" | python3 -c "import sys,json; print(json.load(sys.stdin).get('number'))")
sleep 20
curl -sS -X PUT -H "Authorization: token $GITHUB_PAT" -H "Content-Type: application/json" \
  -d '{"merge_method":"squash"}' "https://api.github.com/repos/fsalamoni/viralata/pulls/$PR_NUM/merge"

# 4) Workflow Deploy Viralata roda automaticamente
# 5) Scrum topbar finalizer roda automaticamente

# 6) Atualizar pr=PR_NUM nas tasks do batch
python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); [t.update({'pr':'$PR_NUM'}) for t in d['tasks'] if t.get('pr')==0 and t.get('status')=='done']; json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"

# 7) Resetar contador de batch
echo "0" > /tmp/tasks_since_last_batch
```

### Por que batch?
- **Tokens**: economiza 80% do overhead (sem PR/merge/deploy por task)
- **Qualidade**: foco em implementação sem pressão de tempo
- **Reversibilidade**: reverter 1 commit antes do merge é trivial
- **Quota Firebase**: menos deploys, menos pressão no CDN

---

## 🛠️ WORKFLOWS — APENAS ESSENCIAIS

Workflows ativos em produção (após limpeza 2026-07-14 22:08):
- `deploy.yml` — Deploy Viralata (push em main) **ESSENCIAL**
- `scrum-topbar.yml` — Topbar auto-update (cron */15 + workflow_run) **ESSENCIAL**
- `scrum-topbar-finalizer.yml` — Topbar finalizer pós-deploy **ESSENCIAL**

Workflows com trigger REMOVIDO (somente schedule):
- `scrum-sync.yml` — só roda diariamente (backup)
- `security-audit.yml` — só roda semanalmente (segunda 09:00 UTC)

Workflows de diagnóstico (apenas manual):
- `diag-*.yml` — só rodam via workflow_dispatch manual

**Nada de erro desnecessário. Nenhum workflow desnecessário.**
