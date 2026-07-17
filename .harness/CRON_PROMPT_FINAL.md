# LOOP_PROMPT — viralata (atualizado 2026-07-17 00:15 UTC)

**Contexto**: /workspace/viralata, branch main @ e872443, React+Vite+Firebase.
**Repo**: https://github.com/fsalamoni/viralata.git
**Sessão**: Mavis root (loop autônomo, **30min**, 24/7 sem limite de horário).
**Janela ativa**: 10h contínuas (2026-07-17 00:15 → 2026-07-17 10:15 UTC).

**Missão 10h**: **VARREDURA COMPLETA FULL_AUDIT_2026-07-17** (107 tasks, TASK-813..TASK-919).
Ver `docs/FULL_AUDIT_2026-07-17.md` para o documento canônico.

**MODO ATUAL**: MERGE+DEPLOY A CADA TASK.

**Métricas iniciais**: 512 done, 0 ready, 0 in_progress, 4 backlog, 1 dropped.
**Após seed**: 512 done, **107 backlog** (TASK-813..TASK-919), 0 ready.

---

## 🔴 REGRA DE OURO #0 — SEM FACADA. TRABALHO REAL, NÃO APARENTE. 🔴

**O agente do loop NÃO PODE fingir que viu, NÃO PODE fingir que mudou, NÃO PODE fingir que terminou.**

User alertou 2026-07-16 17:13:
> "Lembre-se, eu quero aprimoramento, melhoria e otimização real e verdadeira! O agente do loop não pode fingir que viu, precisa olhar de fato, precisa analisar a realidade e fazer as mudanças reais!"

E 2026-07-17 00:00:
> "Não quero que finja ou que tenha preguiça, preciso que entre em todos o código, leia e análise linha por linha. Quero tudo, literalmente tudo corrigido... A partir de agora, nenhum erro é aceitável!"

**PROIBIÇÕES ABSOLUTAS**:
- ❌ PROIBIDO: ler só o nome do arquivo e marcar como "audit only" sem ler o conteúdo.
- ❌ PROIBIDO: declarar "está alinhado" sem grep real.
- ❌ PROIBIDO: fazer mudança cosmética (renomear classe, mover div 2px) e marcar como done.
- ❌ PROIBIDO: commitar sem `npm run build` verde.
- ❌ PROIBIDO: marcar como done sem ter visto o diff do próprio commit (`git show HEAD`).
- ❌ PROIBIDO: pular o `review` (transição `in_progress → done` direto) — `done` SÓ aceita de `in_review`.
- ❌ PROIBIDO: inventar trabalho. Se não houve mudança perceptível, a task NÃO está done.
- ❌ PROIBIDO: diff < 5 linhas = provavelmente fachada. Refazer com mudança maior.
- ❌ PROIBIDO: pular `sync.cjs --fix` antes de commit.
- ❌ PROIBIDO: esquecer do `pull --no-rebase` antes de push.

**OBRIGAÇÕES POR TASK** (mínimo):
- ✅ Ler **o arquivo inteiro** do componente alvo antes de mudar (não só `head -50`).
- ✅ Rodar **2+ greps** para entender o contexto (uso, callers, dependências).
- ✅ Verificar **estado visual** real: como o componente renderiza hoje, o que tem de errado.
- ✅ Fazer **mudança perceptível** que o user vai notar (não fachada).
- ✅ Rodar `npm run build` verde **antes** do commit.
- ✅ Commitar com mensagem descritiva (o que mudou e por quê).
- ✅ Conferir o diff com `git show HEAD --stat` antes de fazer merge.

---

## 🔴 REGRA ESPECIAL — ATIVAR/MEXER EM FEATURE FLAGS (2026-07-16 23:14) 🔴

Quando ativar uma feature flag ou mudar `DEFAULT_FEATURE_FLAGS` em massa:

1. **Mudar `DEFAULT_FEATURE_FLAGS` em `src/core/featureFlags.js` não basta.**
2. **SEMPRE atualizar `migrateLegacyFlags`** em `src/core/lib/FeatureFlagsContext.migration.js`.
3. **Bump `FLAGS_MIGRATION_VERSION`** em `platformSettingsService.js`.
4. **Adicionar teste** em `FeatureFlagsContext.migration.test.js`.
5. **Após merge, pedir ao user para limpar cache** e confirmar visualmente.

Documentado em `docs/CORE_DIRECTIVES.md` §9.2 (D-FLAG-05, D-FLAG-06, D-FLAG-07).

---

## 🔴 REGRA ESPECIAL — PWA CACHE (2026-07-16 23:33) 🔴

PWA `vite-plugin-pwa` gera `sw.js` (mesmo nome) com `cache-control: public, max-age=31536000, immutable`. PWA instalado no celular do user mantém SW persistente que serve assets antigos.

**REGRA #C-1**: Ao alterar layout, navegação, ou feature flags, SEMPRE bump `filename: 'sw-vN.js'` em `vite.config.js`.

**REGRA #C-3**: Toda página com TabList com 5+ items DEVE usar `arena-admin-tabs` (flex-nowrap + overflow-x-auto). Nunca `arena-tab-bar` (flex-wrap).

**REGRA #C-4** (NOVA): Mudanças UI críticas SEMPRE bump sw.js.

---

## 🎯 CICLO DO LOOP (30 min, MERGE+DEPLOY a cada task)

```bash
cd /workspace/viralata
git status  # garantir clean
git pull --no-rebase origin main
git log --oneline -1

# Pegar próxima task READY (ou promover do backlog)
NEXT_TASK=$(node -e "const j=require('./.harness/SCRUM_TASKS.json'); const r=j.tasks.find(t=>t.status==='ready'&&t.tags?.includes('full-audit')); if(!r){const b=j.tasks.find(t=>t.status==='backlog'&&t.tags?.includes('full-audit')); if(b){b.status='ready'; require('fs').writeFileSync('./.harness/SCRUM_TASKS.json', JSON.stringify(j,null,2));}} console.log((r||b)?.id || 'NONE');")

if [ "$NEXT_TASK" = "NONE" ]; then
  echo "✅ Nada para fazer. Aguardar."
  exit 0
fi

BRANCH="feat/audit-${NEXT_TASK,,}-2026-07-17"
node .harness/scrum.cjs start $NEXT_TASK
git worktree add .worktrees/wt-$NEXT_TASK -b $BRANCH main
cd .worktrees/wt-$NEXT_TASK

# INVESTIGAÇÃO REAL (ler INTEIRO, não head -50)
wc -l src/path/to/Component.jsx
cat src/path/to/Component.jsx
grep -rn "ComponentName" src/ | head -20

# Identificar 3-5 problemas REAIS (não inventar)
# IMPLEMENTAR (mudança perceptível)
npm run build  # verde obrigatório
git add -A
git commit -m "feat: $NEXT_TASK — descrição REAL do que mudou"

# CONFERIR DIFF (anti-fachada)
git show HEAD --stat
# Se < 5 linhas mudou: refazer com mudança maior

# MERGE EM MAIN
cd /workspace/viralata
git checkout main
git pull --no-rebase origin main
git merge --no-ff $BRANCH -m "merge: $BRANCH"

# Limpar
git worktree remove --force .worktrees/wt-$NEXT_TASK
git worktree prune
git branch -D $BRANCH

# REGRA #0: SCRUM update
node .harness/scrum.cjs review $NEXT_TASK
node .harness/scrum.cjs done $NEXT_TASK --reason "merge em main OK"

# REGRA #1: metrics sync
python3 -c "import json; d=json.load(open('.harness/SCRUM_TASKS.json')); m=d.setdefault('metrics',{}); m['totalTasks']=len(d['tasks']); m['done']=len([t for t in d['tasks'] if t['status']=='done']); m['ready']=len([t for t in d['tasks'] if t['status']=='ready']); m['inProgress']=len([t for t in d['tasks'] if t['status']=='in_progress']); m['inReview']=len([t for t in d['tasks'] if t['status']=='in_review']); m['blocked']=len([t for t in d['tasks'] if t['status']=='blocked']); m['backlog']=len([t for t in d['tasks'] if t['status']=='backlog']); json.dump(d, open('.harness/SCRUM_TASKS.json','w'), indent=2)"

# Re-embed + push (DEPLOY automático via GitHub Actions)
node .harness/sync.cjs --fix
git add -A
git commit -m "chore(scrum): $NEXT_TASK done"
git pull --no-rebase origin main
git push origin main
```

---

## 🆕 CANDIDATAS — FULL_AUDIT_2026-07-17 (107 tasks)

### Fase 0 — Diagnóstico (5 tasks, CRÍTICA, fazer PRIMEIRO)
- TASK-813..817: investigar e corrigir os 3 problemas reportados pelo user

### Fase 1 — Auditoria de erros runtime (8 tasks)
- TASK-818..825: ErrorBoundary, TabErrorBoundary, rotas, hooks, lazy/Suspense, react-query

### Fase 2 — Auditoria de feature flags (8 tasks)
- TASK-826..833: DEFAULT vs META, migrateLegacyFlags v3, FLAGS_MIGRATION_VERSION, AdminFlags UI

### Fase 3 — Auditoria de PWA e cache (7 tasks)
- TASK-834..840: sw filename versioning, firebase.json headers, navigateFallback, cleanupOutdatedCaches

### Fase 4 — Auditoria visual de páginas públicas (15 tasks)
- TASK-841..855: /, /feed, /abrigos, /organizacoes/{id}, /comunidade/{id}, /pet/{id}, /evento/{id}, /vitrines, /voluntarios, /busca, /comunidades, /adocoes, /eventos, /chat, /login

### Fase 5 — Auditoria de páginas admin (13 tasks)
- TASK-856..868: /admin/flags, /admin/dashboard, /admin/metrics, /admin/audit, /admin/security, /admin/notifications, /admin/reports, /admin/users, /admin/content, /admin/organizations, /admin/communities, /admin/pets, /admin/platform-health

### Fase 6 — Auditoria de painel admin abrigo (20 tasks)
- TASK-869..888: OrganizationAdminPanel, OverviewTab, ClubGeneralAdminTab, ClubPetsDataGrid, ClubFeedTab, ClubDonationsTab, ClubFinanceTab, ClubChatAdminTab, ClubTeamTab, ClubAdminTab, DashboardPage, KanbanPage, ExhibitionsList, VolunteersAdminTab, MedicalRecordsList, MedicationsList, TimelineList, FostersList, ReportsTab, IndicatorsTab

### Fase 7 — Auditoria de painel admin comunidade (7 tasks)
- TASK-889..895: CommunityAdminPanel, MuralTabAdmin, CommunityEventParticipantsPanel, CommunityTeamTab, CreateForumThreadDialog, AboutTab, EventsTab

### Fase 8 — Auditoria de banco de dados (8 tasks)
- TASK-896..903: firestore.rules, indexes, storage.rules, Cloud Functions init, CORS, db exports, timestamps, realtime listeners

### Fase 9 — Refatoração de código (8 tasks)
- TASK-904..911: extrair hooks/subcomponentes em 6 páginas + criar src/components/arena/ + mover CSS

### Fase 10 — Documentação completa (8 tasks)
- TASK-912..919: docs de módulos, hooks, services, fluxos (flags, PWA, SCRUM, git, UI)

---

## 📊 MÉTRICAS INICIAIS (2026-07-17 00:15 UTC)

- **done=512**, **ready=0**, **in_progress=0**, **in_review=0**, **blocked=0**, **backlog=111** (4 antigos + 107 do FULL_AUDIT)
- **Main**: `e872443`

## ⏰ HORÁRIO
- **24/7**, loop a cada **30min** (10h direto, 20 iterações).

## ⛔ NÃO FAZER (NESTE MODO)

- ❌ **FINGIR** que viu, leu ou mudou algo sem ter feito
- ❌ **AUDIT ONLY** sem ter lido TODOS os arquivos do módulo + grep real
- ❌ **POLISH** que muda só cor ou 2px
- ❌ Acumular múltiplas branches em paralelo
- ❌ Usar `-X theirs` cego
- ❌ `git push --force`
- ❌ Pular `sync.cjs --fix` antes de commit
- ❌ Esquecer `pull --no-rebase` antes de push
- ❌ Mudar `DEFAULT_FEATURE_FLAGS` sem migrateLegacyFlags
- ❌ Mudar UI crítica sem bump sw.js

---

## REGRA DE OURO

**Se o user reclamou que o visual está ruim, é porque está ruim.**
**MELHOR É MELHOR, mesmo que mude o que existia. SEM FACADA.**
**NENHUM ERRO É ACEITÁVEL.**
