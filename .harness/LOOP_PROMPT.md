# LOOP_PROMPT — viralata (atualizado 2026-07-16 21:09 UTC)

**Contexto**: /workspace/viralata, branch main @ ea77b8f, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, 20min, **24/7 sem limite de horário**).

**Última task**: TASK-790 (Firestore rules shelter_donations + shelter_donation_receipts + isShelterAdmin helpers) — done, 503 done, 7 ready.

**MODO ATUAL**: MERGE+DEPLOY A CADA TASK (não batch). User pediu 2026-07-16 17:00:
"para que as tarefas sejam criadas, sejam selecionadas, sejam trabalhadas e concluídas. uma a uma. Cuide para que o desenvolvimento seja criado de forma adequada e entre no main de forma correta, para não termos retrabalho."

**MISSÃO 4-6H**: Implementar TASK-791..810 antes do user voltar.

---

## 🔴 REGRA DE OURO #0 — SEM FACADA. TRABALHO REAL, NÃO APARENTE. 🔴

**O agente do loop NÃO PODE fingir que viu, NÃO PODE fingir que mudou, NÃO PODE fingir que terminou.**

User alertou 2026-07-16 17:13:
> "Lembre-se, eu quero aprimoramento, melhoria e otimização real e verdadeira! O agente do loop não pode fingir que viu, precisa olhar de fato, precisa analisar a realidade e fazer as mudanças reais!"

**PROIBIÇÕES ABSOLUTAS**:
- ❌ PROIBIDO: ler só o nome do arquivo e marcar como "audit only" sem ler o conteúdo.
- ❌ PROIBIDO: declarar "está alinhado" sem grep real.
- ❌ PROIBIDO: fazer mudança cosmética (renomear classe, mover div 2px) e marcar como done.
- ❌ PROIBIDO: commitar sem `npm run build` verde.
- ❌ PROIBIDO: marcar como done sem ter visto o diff do próprio commit (`git show HEAD`).
- ❌ PROIBIDO: pular o `review` (transição `in_progress → done` direto) — `done` SÓ aceita de `in_review`.
- ❌ PROIBIDO: inventar trabalho. Se não houve mudança perceptível, a task NÃO está done.

**OBRIGAÇÕES POR TASK** (mínimo):
- ✅ Ler **o arquivo inteiro** do componente alvo antes de mudar (não só `head -50`).
- ✅ Rodar **2+ greps** para entender o contexto (uso, callers, dependências).
- ✅ Verificar **estado visual** real: como o componente renderiza hoje, o que tem de errado.
- ✅ Fazer **mudança perceptível** que o user vai notar (não fachada).
- ✅ Rodar `npm run build` verde **antes** do commit.
- ✅ Commitar com mensagem descritiva (o que mudou e por quê).
- ✅ Conferir o diff com `git show HEAD --stat` antes de fazer merge.

**Se a task é "audit only"**: ler TODOS os arquivos do módulo, listar achados específicos, **não** dizer "está OK" genericamente.

---

## 🔴 REGRA ESPECIAL — ATIVAR/MEXER EM FEATURE FLAGS (2026-07-16 23:14) 🔴

**Lição crítica** do HOTFIX-001 (commit `f6c9ed6`):

Quando você ativar uma feature flag (TASK tipo "ativar flag X → ON") ou
mudar `DEFAULT_FEATURE_FLAGS` em massa:

1. **Mudar `DEFAULT_FEATURE_FLAGS` em `src/core/featureFlags.js` não basta.**
   O doc Firestore `platform_settings/global` tem valores salvos que
   sobrescrevem o default. A migração v2 só rodava se TODAS as flags
   estavam em false, então DEFAULT novo nunca aplicava.

2. **SEMPRE atualizar `migrateLegacyFlags`** em
   `src/core/lib/FeatureFlagsContext.migration.js` para cobrir a nova
   flag no critério de migração. A v3 (2026-07-16) tem 2 critérios:
   - TODAS flags em false → migra tudo.
   - Caso contrário → migra apenas SHELTER_* undefined/null.

3. **Bump `FLAGS_MIGRATION_VERSION`** em `platformSettingsService.js`
   para invalidar caches e forçar re-execução.

4. **Adicionar teste** em `FeatureFlagsContext.migration.test.js`
   cobrindo o cenário.

5. **Após merge, pedir ao user para limpar cache** (`Ctrl+Shift+R`) e
   confirmar que a flag aparece ON em `/admin/flags` E a funcionalidade
   está visível. Se não aparecer → investigar doc Firestore stale.

**Erro real que aconteceu** (2026-07-16 23:14):
- TASK-792..797 mudou DEFAULT de 9 flags SHELTER_* para true.
- User reportou "Não apareceu nenhuma flag nova".
- Causa: doc Firestore persistido tinha false, migração v2 não rodou.
- Correção: migração v3 + HOTFIX-001 merged em `e37f0a1`.

**REGRA**: mudar DEFAULT em massa SEMPRE vem acompanhado de migração.
Documentado em `docs/CORE_DIRECTIVES.md` §9.2 (D-FLAG-05, D-FLAG-06, D-FLAG-07).

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
3. `git add -A && git commit -m "..." && git push origin main`
4. Recalcular `metrics` no JSON (REGRA #1)
5. **Se o build quebrar** → reverter imediatamente com `git reset --hard HEAD`
6. **Se os testes quebrarem** → consertar antes de continuar (ou reverter se for muito invasivo)
7. **NUNCA mais de 1 task por turno** (estabilidade)
8. **Se a task atual parecer grande demais (> 30min)**, dividir em 2 ou pegar a próxima da fila
9. **`git pull --no-rebase` antes de push** (scrum-topbar pode ter mergeado HTMLs)

---

## 🎯 MISSÃO DO TURNO (20 min) — MODO MERGE+DEPLOY (TASK A TASK)

### PASSO 1: Investigação REAL (NÃO pule)
```bash
NEXT_TASK=$(python3 -c "...")
BRANCH=$(python3 -c "...")
git worktree add .worktrees/wt-$NEXT_TASK -b $BRANCH main
cd .worktrees/wt-$NEXT_TASK

# LER O CÓDIGO INTEIRO do componente alvo (não só head -50)
wc -l src/path/to/Component.jsx  # saber tamanho
cat src/path/to/Component.jsx    # LER INTEIRO

# Grep para entender uso
grep -rn "Component" src/ | head -20  # quem importa
grep -rn "ComponentName" src/modules/admin/ | head -10  # quem usa

# Se for admin tab, ver o estado visual atual
grep -nE "TabsList|TabsContent" src/path/Component.jsx
```

### PASSO 2: Identificar problemas REAIS
Liste **3-5 problemas específicos** que o componente tem hoje. Exemplo real:
- "Linha 142: `<div className='flex flex-wrap'>` sem overflow-x → quebra em 2 fileiras"
- "Linha 230: gap-1.5 entre stat cards mas p-0 no wrapper → sem respiro lateral"
- "Linha 318: Card sem EmptyState quando lista vazia → tela em branco"

**NÃO invente problemas que não existem. NÃO minimize os reais.**

### PASSO 3: Mudança PERCEPTÍVEL (NÃO cosmética)
- Mexer em **estrutura**, não só em classe
- Adicionar features visuais úteis (loading, empty state, hover state, transition)
- Se for Polish, alterar **layout/hierarquia**, não só cor
- Se a task diz "aplicar DS_V2", usar `arena-*` classes do Design System

### PASSO 4: Build verde OBRIGATÓRIO
```bash
npm run build  # EXIT 0 OBRIGATÓRIO
# Se quebrar: git reset --hard HEAD, refazer
```

### PASSO 5: Conferir o diff
```bash
git add -A
git commit -m "feat(...): descrição REAL do que mudou (não genérica)"
git show HEAD --stat  # ver o que mudou
# Mudou < 5 linhas? Provavelmente fachada. Refazer com mudança maior.
```

### PASSO 6: Merge em main + cleanup
```bash
cd /workspace/viralata
git checkout main
git pull --no-rebase origin main
git merge --no-ff $BRANCH -m "merge: $BRANCH"
git worktree remove --force .worktrees/wt-$NEXT_TASK
git worktree prune
git branch -D $BRANCH
```

### PASSO 7: REGRA #0 (SCRUM) + REGRA #1 (METRICS)
```bash
node .harness/scrum.cjs review $NEXT_TASK
node .harness/scrum.cjs done $NEXT_TASK --reason "merge em main OK"

python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); m=d.setdefault('metrics',{}); m['totalTasks']=len(d['tasks']); m['done']=len([t for t in d['tasks'] if t['status']=='done']); m['ready']=len([t for t in d['tasks'] if t['status']=='ready']); m['inProgress']=len([t for t in d['tasks'] if t['status']=='in_progress']); m['inReview']=len([t for t in d['tasks'] if t['status']=='in_review']); m['blocked']=len([t for t in d['tasks'] if t['status']=='blocked']); m['backlog']=len([t for t in d['tasks'] if t['status']=='backlog']); json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"
```

### PASSO 8: Re-embed + push (DEPLOY automático)
```bash
node .harness/sync.cjs --fix
git add -A
git commit -m "chore(scrum): $NEXT_TASK done"
git pull --no-rebase origin main
git push origin main
```

---

## ⚠️ LIÇÕES DA 1ª ITERAÇÃO (TASK-786)

1. **Transição SCRUM**: `done` SÓ aceita de `in_review`. Sempre fazer `start → review → done` (NÃO `in_progress → done` direto).
2. **Worktree lock**: SEMPRE fazer `git worktree remove --force` e `git branch -D` após merge.
3. **Pull --no-rebase** antes de push (scrum-topbar pode ter mergeado HTMLs).
4. **REGRA #1** (metrics sync) é tão importante quanto REGRA #0.
5. **Anti-facada**: TASK-786 foi real (109 insertions, 4 stat cards, 6 shortcuts, loading state, EmptyState). Manter esse padrão. NÃO REGREDIR.

---

## 🆕 CANDIDATAS (2026-07-16 17:14 UTC)

**MISSÃO 4-6H**: TASK-787..810

### P0 — Funcionalidades reais (gaps)
| ID | Branch | Descrição |
|---|---|---|
| TASK-790 | feat/donations-crud-2026-07-16 | Admin abrigo: CRUD completo de Chamados de Doação |
| TASK-791 | feat/finance-accountability-2026-07-16 | Admin abrigo: sistema de Prestação de Contas |

### P1 — DS_V2 polish (abas admin)
| ID | Branch | Descrição |
|---|---|---|
| TASK-787 | feat/admin-general-polish-2026-07-16 | Admin: DS_V2 polish ClubGeneralAdminTab |
| TASK-788 | feat/admin-pets-polish-2026-07-16 | Admin: DS_V2 polish ClubPetsDataGrid |
| TASK-789 | feat/admin-feed-polish-2026-07-16 | Admin: DS_V2 polish ClubFeedTab |
| TASK-801 | feat/indicators-polish-2026-07-16 | IndicatorsTab: DS_V2 (cards de KPI) |
| TASK-802 | feat/reports-polish-2026-07-16 | ReportsTab: DS_V2 (cards de export) |
| TASK-803 | feat/volunteers-polish-2026-07-16 | VolunteersAdminTab: DS_V2 |
| TASK-804 | feat/fosters-polish-2026-07-16 | FostersList: DS_V2 |
| TASK-805 | feat/exhibitions-polish-2026-07-16 | ExhibitionsList: DS_V2 |
| TASK-806 | feat/kanban-polish-2026-07-16 | KanbanPage: DS_V2 |
| TASK-807 | feat/community-admin-polish-2026-07-16 | CommunityAdminPanel: DS_V2 |

### P2 — Padrão 2-layer em outras páginas
| ID | Branch | Descrição |
|---|---|---|
| TASK-798 | feat/community-detail-2layer-2026-07-16 | CommunityDetail: 2-layer nas abas |
| TASK-799 | feat/pet-detail-2layer-2026-07-16 | PetDetail: 2-layer nas abas |
| TASK-800 | feat/event-detail-2layer-2026-07-16 | EventDetail: 2-layer nas abas |
| TASK-808 | feat/admin-content-editor-polish-2026-07-16 | AdminContentEditor: DS_V2 |
| TASK-809 | feat/platform-health-polish-2026-07-16 | PlatformHealth: DS_V2 |

### P3 — Flag activation
| ID | Branch | Descrição |
|---|---|---|
| TASK-792 | feat/flag-shelter-dashboard-2026-07-16 | Flag SHELTER_DASHBOARD → ON |
| TASK-793 | feat/flag-shelter-kanban-2026-07-16 | Flag SHELTER_KANBAN → ON |
| TASK-794 | feat/flag-shelter-volunteers-2026-07-16 | Flags SHELTER_VOLUNTEERS + SHELTER_VOLUNTEER_PROFILE_V1 → ON |
| TASK-795 | feat/flag-shelter-health-2026-07-16 | Flags SHELTER_HEALTH_RECORDS + SHELTER_MEDICATION + SHELTER_PET_TIMELINE → ON |
| TASK-796 | feat/flag-shelter-foster-2026-07-16 | Flag SHELTER_FOSTER → ON |
| TASK-797 | feat/flag-shelter-misc-2026-07-16 | Flags SHELTER_EXHIBITIONS + SHELTER_REPORTS + SHELTER_INDICATORS → ON |

### P4 — Auditoria final
| ID | Branch | Descrição |
|---|---|---|
| TASK-810 | feat/final-2layer-audit-2026-07-16 | Auditoria final: consistência 2-layer no app |

## 📊 MÉTRICAS ATUAIS

- **done=486**, **ready=24**, **in_progress=0**
- **Main**: `105264d`

## 🏁 FIM DO TURNO

1. REGRA #0 (scrum update)
2. REGRA #1 (metrics sync)
3. sync.cjs --fix
4. Commit + push
5. Atualizar LOOP_PROMPT.md (mover task feita para "Notas", próxima candidata já está na lista)
6. **MERGE+DEPLOY já foi feito** durante o turno

## ⏰ HORÁRIO
- **24/7**, loop a cada 20min.

## ⛔ NÃO FAZER (NESTE MODO)

- ❌ **FINGIR** que viu, leu ou mudou algo sem ter feito
- ❌ **AUDIT ONLY** sem ter lido TODOS os arquivos do módulo + grep real
- ❌ **POLISH** que muda só cor ou 2px
- ❌ Acumular múltiplas branches em paralelo
- ❌ Usar `-X theirs` cego
- ❌ `git push --force`
- ❌ Pular sync.cjs --fix
- ❌ Criar PR (merge direto em main via `git merge --no-ff`)
- ❌ Esquecer REGRA #0 (scrum update) e REGRA #1 (metrics sync)
- ❌ Pular `review` antes de `done` (transição inválida!)

---

## REGRA DE OURO (clássica)

**Se o user reclamou que o visual está ruim, é porque está ruim.**

Não hesite. Não peça confirmação. Não tente "preservar compatibilidade" com designs ruins. **MELHOR É MELHOR**, mesmo que mude o que existia.

---

## NÃO ESQUECER

- **Lock visual**: marcar `scrum.cjs start TASK-XXX` para sinalizar para o outro agente
- **Métricas**: SEMPRE recalcular `metrics` no JSON (REGRA #1)
- **Sync**: SEMPRE `sync.cjs --fix` no fim do turno
- **Build**: SEMPRE validar `npm run build` antes de push
- **Tests**: SEMPRE rodar testes do componente modificado
- **LER O CÓDIGO INTEIRO** antes de mudar
- **VER O DIFF** antes de fazer merge (`git show HEAD --stat`)
