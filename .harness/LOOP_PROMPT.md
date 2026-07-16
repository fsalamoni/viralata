# LOOP_PROMPT — viralata (atualizado 2026-07-16 00:52 UTC)

**Contexto**: /workspace/viralata, branch feat/task-337-event-reminder-cron-2026-07-15, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

**Última task**: TASK-337 (eventReminderCron — done, 276 done, 83 ready)

---

## REGRAS INEGOCIÁVEIS (regras do user)

1. **Não estrague nada.** Antes de mudar, leia o componente. Se tiver teste, rode o teste ANTES e DEPOIS.
2. **Não crie funcionalidade nova** — só ajuste visual/UX/layout em coisas que já existem.
3. **Não toque em regras de negócio** (LGPD, validações, permissões, etc).
4. **Se um arquivo está muito arriscado**, pule e pegue outro.
5. **Foco em UX**: cards, espaçamentos, hierarquia, contraste, responsividade, loading, empty states.

---

## REGRAS TÉCNICAS (manter)

1. `scrum.cjs start TASK-XXX` → `scrum.cjs review TASK-XXX` → `scrum.cjs done TASK-XXX --reason "..."`
2. `node .harness/sync.cjs --fix` (re-embed métricas)
3. `git add -A && git commit -m "..." && git push --force-with-lease origin main`
4. Recalcular `metrics` no JSON (REGRA #1)
5. **Se o build quebrar** → reverter imediatamente com `git reset --hard HEAD`
6. **Se os testes quebrarem** → consertar antes de continuar (ou reverter se for muito invasivo)
7. **NUNCA mais de 1 task por turno** (estabilidade)
8. **Se a task atual parecer grande demais (> 30min)**, dividir em 2 ou pegar a próxima da fila

---

## SISTEMA DE DESIGN ARENA (já implementado)

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

### Header admin
- `.arena-admin-header` — gradient + backdrop blur
- `.arena-admin-header-avatar`, `.arena-admin-header-title-row`, `.arena-admin-header-title`, `.arena-admin-header-badge`

### Tabs admin
- `.arena-admin-tabs` (sticky) + `.arena-admin-tab-trigger`

### Stats
- `.arena-stats-grid` (2/3/4 colunas responsivo)
- `.arena-stat-card` + `.arena-stat-card-label` + `.arena-stat-card-value` + `.arena-stat-card-delta`

### Sub-áreas (sections dentro de tabs)
- `.arena-admin-section`
- `.arena-section-card` + `.arena-section-card-header` + `.arena-section-card-title` + `.arena-section-card-description` + `.arena-section-card-body`

### Empty state
- `.arena-empty-state` + `.arena-empty-state-icon` + `.arena-empty-state-title` + `.arena-empty-state-description`

---

## HIERARQUIA DE PRIORIDADES

### P0 — Crítico (UX quebrado)
- Cards sobrepostos
- Texto cortado
- CTAs sem contraste (WCAG AA < 4.5:1)
- Tabs com gap excessivo
- Layout quebrado em mobile

### P1 — Alto
- Hierarquia visual inconsistente
- Espaçamentos ad-hoc (space-y-4, gap-3 soltos)
- Sem empty states
- Sem loading states
- Sem focus states

### P2 — Médio
- Tipografia inconsistente
- Cores hard-coded em vez de tokens
- Ícones tamanhos misturados
- Sem breadcrumbs

### P3 — Baixo
- Animações suaves
- Dark mode
- Polish visual

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

## 🆕 CANDIDATAS (2026-07-16 00:52 UTC)

| ID | Pri | Descrição |
|---|---|---|
| TASK-292 | critical | [FCM-001] Integrar FCM push notifications — bloqueada por TASK-291 (✅ done) |
| TASK-368 | critical | [D-07] DPO sign-off — human-jurídico |
|  |
| TASK-007 | high | Revisão jurídica: avisosLegais.js |

> **Notas**:
> - TASK-343 ✅ done — feat/task-343-event-certificates-2026-07-16: event certificates — generateEventCertificateCore.cjs (pdf-lib, 13 testes ✅), generateEventCertificate.js (callable CF v2, GCS + Firestore), storage.rules event_certificates path, firestore.rules certificates subcollection, useMyEventCertificate + useGenerateEventCertificate hooks, EventDetail EventCertificatesPanel, EventParticipantsPanel AdminCertsSection
> - TASK-188 ✅ done — feat/task-188-gcs-worm-backup-2026-07-15: WORM backup GCS — Object Locking (90d retenção) + lifecycle Standard→Coldline(90d)→Delete(120d) + IAM hardening + Uniform bucket-level access. Infra: infra/gcs-backup-bucket.sh + functions/setupGcsBackupBucket.js (callable CF) + setupGcsBackupBucketCore.cjs (23 testes). docs/DR_PLAN.md §6 atualizado.
> - TASK-352 ✅ done — feat/task-352-pinned-posts-2026-07-15: posts fixados/desselvados — pinned+pinned_at em community_posts, togglePostPin() c/ audit log, banner carrossel em MuralTabAdmin, botão Pin/PinOff (admin), firestore.rules pinned-only-by-admin
> - TASK-291 ✅ done — feat/task-291-email-oncall-2026-07-15: sendEmail onCall callable c/ 7 templates de adoção + sendEmailOnCallCore.cjs + 222 testes ✅ + firestore.rules email_delivery_log
> - TASK-342 ✅ done — feat/task-342-event-volunteers-2026-07-15: volunteer_ids + volunteer_shifts em club_events, multi-select no EventFormDialog, shifts editor, EventDetail aba Escalas
> - TASK-340 ✅ done — feat/task-340-event-types-2026-07-15: novos tipos VACCINATION, LECTURE, FUNDRAISING, PET_DAY em CLUB_EVENT_TYPE + UI
> - TASK-087 ✅ done — feat/task-087-audit-clickwrap-2026-07-15: auditoria clickwrap 4 fluxos críticos
> - TASK-298 ✅ done — feat/task-298-contract-ip-ua-2026-07-15 (contract CF: IP+UA, Lei 14.063/2020)
> - Todas as branches feat/* = `fsalamoni/viralata`

## 📊 MÉTRICAS ATUAIS

- **done=349** (was 348 — TASK-343 done: event certificates)
- **ready=22**, in_progress=0
- **Main**: `1e2655f`
- **Branch**: `feat/task-343-event-certificates-2026-07-16`

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

- **done=287**, ready=71, in_progress=4
- **Main**: `691de55`

---

## REGRA DE OURO

**Se o user reclamou que o visual está ruim, é porque está ruim.**

Não hesite. Não peça confirmação. Não tente "preservar compatibilidade" com designs ruins. **MELHOR É MELHOR**, mesmo que mude o que existia.

---

## NÃO ESQUECER

- **Lock visual**: marcar `scrum.cjs start TASK-XXX` para sinalizar para o outro agente
- **Métricas**: SEMPRE recalcular `metrics` no JSON (REGRA #1)
- **Sync**: SEMPRE `sync.cjs --fix` no fim do turno
- **Build**: SEMPRE validar `npm run build` antes de push
- **Tests**: SEMPRE rodar testes do componente modificado
