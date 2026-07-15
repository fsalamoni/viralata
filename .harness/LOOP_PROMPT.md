# LOOP_PROMPT — viralata (atualizado 2026-07-15 20:53 UTC)

**Contexto**: /workspace/viralata, branch main, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

---

## 🚀 MODO DE EXECUÇÃO: FEATURE (BATCH) — SEM PR/MERGE POR TASK

**A cada turno**:
- Implementa UMA task
- Faz commit + push da branch feat/*
- **NÃO** cria PR
- **NÃO** faz merge
- **NÃO** faz deploy
- **OBRIGATÓRIO**: REGRA #0 (scrum update) + REGRA #1 (metrics sync)

**A cada 10 tasks OU 4 horas (o que veio primeiro)**: batch PR + merge + deploy.

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
print(f'{len(ready)} tasks ready')
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

   Se o scrum.cjs falhar (module not found), atualizar o SCRUM_TASKS.json diretamente via Python.

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
4. Commit + push (main para updates de scrum)
5. Atualizar LOOP_PROMPT.md no branch feature

---

## 🆕 CANDIDATAS (2026-07-15 20:53 UTC)

| ID | Pri | Descrição |
|---|---|---|
| TASK-292 | critical | [FCM-001] Integrar FCM push notifications — bloqueada por TASK-291 (✅ done) |
| TASK-368 | critical | [D-07] DPO sign-off — human-jurídico |
| TASK-006 | high | Revisão jurídica: adoptionTerms.v1.js |
| TASK-007 | high | Revisão jurídica: avisosLegais.js |

> **Notas**:
> - TASK-352 ✅ done — feat/task-352-pinned-posts-2026-07-15: posts fixados/desselvados — pinned+pinned_at em community_posts, togglePostPin() c/ audit log, banner carrossel em MuralTabAdmin, botão Pin/PinOff (admin), firestore.rules pinned-only-by-admin
> - TASK-291 ✅ done — feat/task-291-email-oncall-2026-07-15: sendEmail onCall callable c/ 7 templates de adoção + sendEmailOnCallCore.cjs + 222 testes ✅ + firestore.rules email_delivery_log
> - TASK-342 ✅ done — feat/task-342-event-volunteers-2026-07-15: volunteer_ids + volunteer_shifts em club_events, multi-select no EventFormDialog, shifts editor, EventDetail aba Escalas
> - TASK-340 ✅ done — feat/task-340-event-types-2026-07-15: novos tipos VACCINATION, LECTURE, FUNDRAISING, PET_DAY em CLUB_EVENT_TYPE + UI
> - TASK-087 ✅ done — feat/task-087-audit-clickwrap-2026-07-15: auditoria clickwrap 4 fluxos críticos
> - TASK-298 ✅ done — feat/task-298-contract-ip-ua-2026-07-15 (contract CF: IP+UA, Lei 14.063/2020)
> - Todas as branches feat/* = `fsalamoni/viralata`

## 📊 MÉTRICAS ATUAIS

- **done=326** (was 325 — TASK-352 done: posts fixados em comunidade)
- **ready=43**, in_progress=1
- **Main**: `d59a433`
- **Branch**: `feat/task-352-pinned-posts-2026-07-15`

## 🏁 FIM DO TURNO

1. REGRA #0 (scrum update)
2. REGRA #1 (metrics sync)
3. sync.cjs --fix
4. Commit + push (main para scrum)
5. Atualizar LOOP_PROMPT.md

## ⏰ HORÁRIO
- **24/7**, loop a cada 20min.

## 🚀 BATCH (a cada 10 tasks)
- User disser "Mavis, batch" → batch PR + merge + deploy.
