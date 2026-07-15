# LOOP_PROMPT — viralata (atualizado 2026-07-15 17:10 UTC)

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
- **OBRIGATÓRIO**: REGRA #0 (scrum update) + REGRA #1 (metrics sync)

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

## 🆕 CANDIDATAS (2026-07-15 17:10 UTC)

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
> - TASK-220 ✅ done — feat/task-220-clean (PR #192) merged 2026-07-15
> - TASK-269 ✅ done — feat/task-268-volunteer-fcm-notify (PR #190)
> - TASK-312 ✅ done — [INT-SEARCH-001] Sync ativo do search index
> - TASK-273 ✅ done — Smart Search: adicionar entidade volunteer
> - TASK-176 ✅ done — Sentry enriched
> - TASK-239 ✅ done — Sentry SDK + Crashlytics
> - TASK-059 ✅ done — feat/legal-docs-v2: smoke test /legal/termos-de-uso (termosDeUso.v2)
> - TASK-052 ✅ done — feat/legal-docs-v2: clickwrap audit_log integration (adoption/foster/donation/volunteer)
> - TASK-060 ✅ done — feat/legal-docs-v2: 02_Politica_de_Privacidade.md wired as /legal/politica-de-privacidade-v2 (LGPD, 10/07/2026)
> - Todas as branches feat/* = `fsalamoni/viralata`

---

## 📊 MÉTRICAS ATUAIS

- **done=288** (was 287 — TASK-060 done: privacy policy v2 page)
- **ready=70**, in_progress=4
- **Main**: `691de55`
- **Branch**: `feat/legal-docs-v2` (50ed5b6, pushed)

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
