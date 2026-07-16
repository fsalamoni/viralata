# LOOP_PROMPT — viralata (atualizado 2026-07-16 17:05 UTC)

**Contexto**: /workspace/viralata, branch main @ 8ada14c, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

**Última task**: TASK-785 (admin tabs reorganizadas — 19 abas → 6 grupos semânticos) — done, 485 done, 25 ready.

**MODO ATUAL**: MERGE+DEPLOY A CADA TASK (não batch). User pediu 2026-07-16 17:00:
"para que as tarefas sejam criadas, sejam selecionadas, sejam trabalhadas e concluídas. uma a uma. Cuide para que o desenvolvimento seja criado de forma adequada e entre no main de forma correta, para não termos retrabalho."

**MISSÃO**: Implementar 25 tasks DS_V2/admin (TASK-786..810) antes do user voltar (4-6h).

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

## 🎯 MISSÃO DO TURNO (20 min) — MODO MERGE+DEPLOY (TASK A TASK)

1. **Investigue ANTES de codar** (NÃO leia tudo):
   - 1-2 greps para ver arquivos relacionados
   - `head -50 arquivo.jsx` para entender o contexto
   - Verifique schemas/domínio antes de escrever código
2. **Implemente com feature flag** (`SHELTER_*` ou conforme categoria, default OFF — exceto para tarefas de flag-activation, onde vira ON).
3. **Test**: 2+ tests smoke no mínimo. SEMPRE rodar `npm run build` antes do commit.
4. **Worktree isolado** por task: `git worktree add .worktrees/wt-<slug> -b feat/<slug>-2026-07-16 main`
5. **Commit da task** no worktree.
6. **MERGE+DEPLOY a cada task** (NÃO batch). Sequência:
   ```bash
   cd /workspace/viralata
   git fetch origin main && git pull --no-rebase origin main
   git worktree add .worktrees/wt-<slug> -b feat/<slug>-2026-07-16 main
   
   # Implementar no worktree
   cd .worktrees/wt-<slug>
   # ... código ...
   npm run build  # verde
   git add -A
   git commit -m "feat(<scope>): ..."
   
   # Merge em main
   cd /workspace/viralata
   git checkout main
   git pull --no-rebase origin main
   git merge --no-ff feat/<slug>-2026-07-16 -m "merge: feat/<slug>-2026-07-16"
   
   # Limpar
   git worktree remove --force .worktrees/wt-<slug>
   git worktree prune
   git branch -D feat/<slug>-2026-07-16
   
   # REGRA #0: marcar done
   node .harness/scrum.cjs done TASK-XXX --pr <merge_commit_sha> --reason "..."
   
   # REGRA #1: metrics sync
   python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); m=d.setdefault('metrics',{}); m['totalTasks']=len(d['tasks']); m['done']=len([t for t in d['tasks'] if t['status']=='done']); m['ready']=len([t for t in d['tasks'] if t['status']=='ready']); m['inProgress']=len([t for t in d['tasks'] if t['status']=='in_progress']); m['inReview']=len([t for t in d['tasks'] if t['status']=='in_review']); m['blocked']=len([t for t in d['tasks'] if t['status']=='blocked']); m['backlog']=len([t for t in d['tasks'] if t['status']=='backlog']); json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"
   
   # Re-embed + commit + push
   node .harness/sync.cjs --fix
   git add -A
   git commit -m "chore(scrum): TASK-XXX done"
   git pull --no-rebase origin main
   git push origin main
   # GitHub Actions vai disparar deploy automático
   ```
7. **ATUALIZE O `LOOP_PROMPT.md`** ao final: remova task da lista, adicione próxima candidata, faça commit + push.

---

## 🆕 CANDIDATAS (2026-07-16 17:05 UTC)

**MISSÃO 4-6H**: implementar TASK-786..810 antes do user voltar.

### PRIORIDADE P0 — Funcionalidades reais (gaps)
| ID | Pri | Descrição | Branch |
|---|---|---|---|
| TASK-790 | P0 | Admin abrigo: CRUD completo de Chamados de Doação | feat/donations-crud-2026-07-16 |
| TASK-791 | P0 | Admin abrigo: sistema de Prestação de Contas | feat/finance-accountability-2026-07-16 |

### PRIORIDADE P1 — DS_V2 polish (abas admin)
| ID | Pri | Descrição | Branch |
|---|---|---|---|
| TASK-786 | P1 | Admin: DS_V2 polish OverviewTab | feat/admin-overview-polish-2026-07-16 |
| TASK-787 | P1 | Admin: DS_V2 polish ClubGeneralAdminTab | feat/admin-general-polish-2026-07-16 |
| TASK-788 | P1 | Admin: DS_V2 polish ClubPetsDataGrid | feat/admin-pets-polish-2026-07-16 |
| TASK-789 | P1 | Admin: DS_V2 polish ClubFeedTab | feat/admin-feed-polish-2026-07-16 |
| TASK-801 | P1 | IndicatorsTab: DS_V2 (cards de KPI) | feat/indicators-polish-2026-07-16 |
| TASK-802 | P1 | ReportsTab: DS_V2 (cards de export) | feat/reports-polish-2026-07-16 |
| TASK-803 | P1 | VolunteersAdminTab: DS_V2 | feat/volunteers-polish-2026-07-16 |
| TASK-804 | P1 | FostersList: DS_V2 | feat/fosters-polish-2026-07-16 |
| TASK-805 | P1 | ExhibitionsList: DS_V2 | feat/exhibitions-polish-2026-07-16 |
| TASK-806 | P1 | KanbanPage: DS_V2 | feat/kanban-polish-2026-07-16 |
| TASK-807 | P1 | CommunityAdminPanel: DS_V2 | feat/community-admin-polish-2026-07-16 |

### PRIORIDADE P2 — Padrão 2-layer em outras páginas
| ID | Pri | Descrição | Branch |
|---|---|---|---|
| TASK-798 | P2 | CommunityDetail: 2-layer nas abas | feat/community-detail-2layer-2026-07-16 |
| TASK-799 | P2 | PetDetail: 2-layer nas abas | feat/pet-detail-2layer-2026-07-16 |
| TASK-800 | P2 | EventDetail: 2-layer nas abas | feat/event-detail-2layer-2026-07-16 |
| TASK-808 | P2 | AdminContentEditor: DS_V2 | feat/admin-content-editor-polish-2026-07-16 |
| TASK-809 | P2 | PlatformHealth: DS_V2 | feat/platform-health-polish-2026-07-16 |

### PRIORIDADE P3 — Flag activation (1 linha de código cada)
| ID | Pri | Descrição | Branch |
|---|---|---|---|
| TASK-792 | P3 | Flag SHELTER_DASHBOARD → ON | feat/flag-shelter-dashboard-2026-07-16 |
| TASK-793 | P3 | Flag SHELTER_KANBAN → ON | feat/flag-shelter-kanban-2026-07-16 |
| TASK-794 | P3 | Flags SHELTER_VOLUNTEERS + SHELTER_VOLUNTEER_PROFILE_V1 → ON | feat/flag-shelter-volunteers-2026-07-16 |
| TASK-795 | P3 | Flags SHELTER_HEALTH_RECORDS + SHELTER_MEDICATION + SHELTER_PET_TIMELINE → ON | feat/flag-shelter-health-2026-07-16 |
| TASK-796 | P3 | Flag SHELTER_FOSTER → ON | feat/flag-shelter-foster-2026-07-16 |
| TASK-797 | P3 | Flags SHELTER_EXHIBITIONS + SHELTER_REPORTS + SHELTER_INDICATORS → ON | feat/flag-shelter-misc-2026-07-16 |

### P4 — Auditoria final
| ID | Pri | Descrição | Branch |
|---|---|---|---|
| TASK-810 | P4 | Auditoria final: consistência 2-layer no app | feat/final-2layer-audit-2026-07-16 |

## 📊 MÉTRICAS ATUAIS

- **done=485**, **ready=25**, **in_progress=0**
- **Main**: `8ada14c` (após merge de feat/admin-harmonize-2layer-2026-07-16)

## 🏁 FIM DO TURNO

1. REGRA #0 (scrum update)
2. REGRA #1 (metrics sync)
3. sync.cjs --fix
4. Commit + push
5. Atualizar LOOP_PROMPT.md (mover task feita para "Notas", adicionar próxima candidata)
6. **MERGE+DEPLOY já foi feito** durante o turno (modo MERGE+DEPLOY, não batch)

## ⏰ HORÁRIO
- **24/7**, loop a cada 20min.

## ⛔ NÃO FAZER (NESTE MODO)

- NÃO acumular múltiplas branches em paralelo
- NÃO usar `-X theirs` cego
- NÃO fazer `git push --force`
- NÃO pular sync.cjs --fix
- NÃO criar PR (merge direto em main via `git merge --no-ff`)
- NÃO esquecer REGRA #0 (scrum update) e REGRA #1 (metrics sync)

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
