# LOOP_PROMPT — viralata (atualizado 2026-07-15 11:23 UTC)

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
- **Loop turn 2026-07-14 23:51 UTC**: TASK-277 Rate limit volunteer join + accept terms (feat/task-277-rate-limit-2026-07-14)
- **Loop turn 2026-07-15 00:12 UTC**: TASK-309 Onboarding wizard pet creation (feat/task-309-wizard-pet-create-2026-07-15)
- **Loop turn 2026-07-15 07:54 UTC**: TASK-338 7 SHELTER_* feature flags (feat/task-338-feature-flags)

---

## 🆕 CANDIDATAS ATUALIZADAS (próximas 12, priorizadas por impacto visual)

| ID | Pri | Categoria | Descrição |
|---|---|---|---|
| TASK-312 | high | shelter | [INT-SEARCH-001] Sync ativo do search index (Cloud Function) |
| TASK-268 | critical | shelter | Cloud Function onVolunteerJoinedShelter (FCM admin) |
| TASK-269 | critical | shelter | Cloud Function onVolunteerParticipationCreated (FCM voluntário) |
| TASK-291 | high | shelter | Email provider (SendGrid/Resend) — AGUARDA decisão humana |
| TASK-176 | high | shelter | Sentry enriquecido |
| TASK-239 | ~~medium~~ **done** | shelter | Sentry + /healthz + bundle-hash |

> **Notas**:
> - TASK-338 (7 SHELTER_* flags) entregue — feat/task-338-feature-flags, push OK
> - TASK-239 entregue — feat/task-239-sentry-healthz, push OK, batch pendente (healthCheckCore+test + healthCheck.js + bundle-hash.mjs)
> - TASK-239 (Sentry /healthz + bundle-hash) entregue — feat/task-239-sentry-healthz, push OK, batch pendente
> - TASK-269 (onVolunteerParticipationCreated FCM+calendar+email+audit) entregue — feat/task-269-volunteer-fcm-participation, push OK, batch pendente
> - TASK-309 (Onboarding wizard pet creation) entregue — feat/task-309-wizard-pet-create-2026-07-15, push OK, batch pendente
> - TASK-277 (rate limit volunteer) entregue — feat/task-277-rate-limit-2026-07-14, push OK, batch pendente
> - TASK-325 (milestone photo/video upload) entregue — feat/milestone-complete-2026-07-14, merge pendente
> - TASK-273 (Smart Search volunteer entity) entregue — feat/volunteer-search-2026-07-14, merge pendente
> - TASK-315, TASK-308, TASK-302, TASK-176 entregues em batch (verificar com git log antes de pegar)
> - TASK-310, TASK-326 feitas pelo cron (verificar com git log antes de pegar)
> - TASK-053 CookieBanner audit: component OK — gated por SHELTER_LEGAL_TERMS_V1, botoes corretos, localStorage + audit log, 16 tests

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
