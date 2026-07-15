# LOOP_PROMPT — viralata (atualizado 2026-07-15 17:50 UTC)

**Contexto**: /workspace/viralata, branch main, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

---

## 🚀 MODO DE EXECUÇÃO: FEATURE (BATCH) — SEM PR/MERGE POR TASK

**A cada turno**:
- Implementa UMA task
- Faz commit + push da branch
- **NÃO** cria PR
- **NÃO** faz merge
- **NÃO** faz deploy

---

## ⛔ ERRO COMETIDO POR OUTROS AGENTES (NÃO REPETIR) ⛔

**CENÁRIO QUE CAUSOU REGRESSÃO EM 2026-07-15**:
- Agente implementou feat(task-XXX) na branch feat/task-XXX-2026-07-15
- Fez `chore: TASK-XXX done` no commit dessa branch
- **MAS NÃO ATUALIZOU .harness/SCRUM_TASKS.json** (status continuou "ready")
- Resultado: 7+ tasks com feat em branch + métricas erradas no painel público

**REGRA DE OURO**: A branch feat/* só importa DEPOIS que o commit for mergeado em main.
A task só está done no scrum se o JSON estiver com status="done" + metrics.done recalculado.

**CHECKLIST OBRIGATÓRIO ANTES DE ENCERRAR O TURNO**:
```bash
# 1. Scrum update (3 comandos)
node .harness/scrum.cjs start TASK-XXX
node .harness/scrum.cjs review TASK-XXX --pr "(batch)" --reason "..."
node .harness/scrum.cjs done TASK-XXX --pr "(batch)" --reason "..."

# 2. REGRA #1: RECALCULAR metrics
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f: d = json.load(f)
m = d.setdefault('metrics', {})
m['totalTasks'] = len(d['tasks'])
m['done'] = len([t for t in d['tasks'] if t['status']=='done'])
m['ready'] = len([t for t in d['tasks'] if t['status']=='ready'])
m['inProgress'] = len([t for t in d['tasks'] if t['status']=='in_progress'])
m['inReview'] = len([t for t in d['tasks'] if t['status']=='in_review'])
m['blocked'] = len([t for t in d['tasks'] if t['status']=='blocked'])
m['backlog'] = len([t for t in d['tasks'] if t['status']=='backlog'])
with open('.harness/SCRUM_TASKS.json','w') as f: json.dump(d, f, indent=2)
print('METRICS:', m['done'], '/', m['totalTasks'], 'done')
"

# 3. Verificação cruzada
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f: d = json.load(f)
done = [t for t in d['tasks'] if t['status']=='done']
m = d.get('metrics',{})
assert len(done) == m.get('done'), f'ALINHAMENTO QUEBRADO: array={len(done)} metrics={m.get("done")}'
print('ALINHADO OK')
"

# 4. Commit + push
git add -A && git commit -m "chore(scrum): TASK-XXX done" && git push origin main
```

**Se QUALQUER passo falhar, NÃO ENCERRAR O TURNO**. A não-atualização do scrum foi
a regressão mais grave do projeto em 2 meses.

**A cada 10 tasks OU 4 horas (o que vier primeiro)**: batch PR + merge + deploy.

---

## 🔄 CICLO DO LOOP — DECISÃO AUTOMÁTICA A CADA TURNO

```bash
cd /workspace/viralata
if [ ! -d /workspace/viralata ]; then
  git clone https://TOKEN_PLACEHOLDER@github.com/fsalamoni/viralata.git /workspace/viralata
fi
cd /workspace/viralata
git pull origin main
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f: d = json.load(f)
ready = [t for t in d['tasks'] if t['status'] == 'ready' and t.get('owner') not in ['human', 'human-juridico']]
print(f'72 tasks ready')
"
```

- **Se `ready > 0`** → MODO FEATURE (implementar próxima task)
- **Se `ready == 0`** → MODO REVISÃO (UX/UI + bug-hunting)

---

## 🚨 REGRA #0 — ATUALIZAÇÃO DO SCRUM É OBRIGATÓRIA E INEGOCIÁVEL 🚨

**SEMPRE, ANTES de encerrar o turno (mesmo se a task falhou):**

1. Marcar task no SCRUM:
   - `node .harness/scrum.cjs start TASK-XXX`
   - `node .harness/scrum.cjs review TASK-XXX --pr 0 --reason "feat/xxx pushed (batch)"`
   - `node .harness/scrum.cjs done TASK-XXX --pr 0 --reason "feat/xxx pushed (batch)"`

2. **REGRA #1 — SINCRONIZAR `metrics` DO JSON**:
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

3. `node .harness/sync.cjs --fix`
4. Commit + push (feature branch) → depois merge na main
5. Atualizar LOOP_PROMPT.md

---

## 🆕 CANDIDATAS (2026-07-15)

| ID | Pri | Descrição |
|---|---|---|
| TASK-291 | critical | [EMAIL-001] Integrar SendGrid ou Resend — AGUARDA decisão humana |
| TASK-292 | critical | [FCM-001] Integrar FCM push notifications — bloqueada por TASK-291 |
| TASK-368 | critical | [D-07] DPO sign-off — human-jurídico |
| TASK-006 | high | Revisão jurídica: adoptionTerms.v1.js |
| TASK-007 | high | Revisão jurídica: avisosLegais.js |

**Top 5 non-human ready:**
| TASK-291 | critical | [EMAIL-001] Integrar SendGrid ou Resend pra email transacion...
| TASK-292 | critical | [FCM-001] Integrar Firebase Cloud Messaging pra push notific...
| TASK-368 | critical | [D-07] Decisão: DPO sign-off antes de qualquer canário em pr...
| TASK-006 | high | Revisão jurídica: adoptionTerms.v1.js...
| TASK-007 | high | Revisão jurídica: avisosLegais.js...

> **Notas**:
> - TASK-330 ✅ done — feat/task-330-audit-log-cf (SEC-HIGH): audit log via Cloud Function, client writes blocked in firestore.rules
> - TASK-220 ✅ done — feat/task-220-clean (PR #192) merged 2026-07-15
> - TASK-269 ✅ done — feat/task-268-volunteer-fcm-notify (PR #190)
> - TASK-312 ✅ done — [INT-SEARCH-001] Sync ativo do search index
> - TASK-273 ✅ done — Smart Search: adicionar entidade volunteer
> - TASK-176 ✅ done — Sentry enriched
> - TASK-239 ✅ done — Sentry SDK + Crashlytics
> - Todas as branches feat/* = `fsalamoni/viralata`

---

## 📊 MÉTRICAS ATUAIS

- **done=315**, ready=59, in_progress=1
- **Main**: `102de261904f`

## 🏁 FIM DO TURNO

1. REGRA #0 (scrum update)
2. REGRA #1 (metrics sync)
3. sync.cjs --fix
4. Commit + push
5. Atualizar LOOP_PROMPT.md

## ⏰ HORÁRIO
- **24/7**, loop a cada 20min.

## 🚀 BATCH (a cada 10 tasks)
- User disser "Mavis, batch" → batch PR + merge + deploy.


---

## 🆔 REGRA #2 PERMANENTE — IDs únicos (2026-07-15)

**Problema visto**: Ao criar tasks novas, o agente pode escolher um ID que JÁ EXISTE.
Resultado: IDs duplicados, painel mostra 1 task, JSON tem 2.

**REGRA**: Antes de criar uma task nova, SEMPRE verificar:
```bash
python3 -c "
import json
with open('.harness/SCRUM_TASKS.json') as f: d = json.load(f)
existing = [t['id'] for t in d['tasks']]
new_id = 'TASK-XXX'  # ID que você quer usar
if new_id in existing:
    print(f'ERRO: {new_id} JÁ EXISTE! Use TASK-{max([int(i.split("-")[1]) for i in existing if i.startswith("TASK-")])+1}')
else:
    print(f'OK: {new_id} está livre')
"
```

**Convenção**: Se a task é continuidade de uma decisão recente, use ID >= 600 (reservados para decisões).
Se a task é continuação de uma sprint normal, use o próximo ID disponível.

**Por quê**: IDs duplicados quebram sync.cjs (que mostra "Updates: 0 / Issues: IDs duplicados: 2")
e confundem o painel público.