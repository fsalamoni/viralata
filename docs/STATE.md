# STATE — Estado Atual do Viralata

> **Documento canônico de estado do projeto.**
> Este é o PRIMEIRO documento a ser lido por qualquer um que chegue ao
> projeto (humano, agente ou sessão paralela). Ele é atualizado em cada
> movimento, merge ou task. Para detalhes, siga o índice da Seção 10.
>
> **Última atualização**: 2026-07-12 21:30 BRT
> **Versão**: 1.1.0
> **Mantido por**: Mavis (viralata-coder, sessão `mvs_f1e04f28717d42cdba05e221b7b4b6f3`)

---

## 0. TL;DR (60 segundos)

**Viralata** é uma plataforma SaaS brasileira (React + Firebase) de adoção responsável de pets + comunidade (ONGs, mural, fórum, eventos). Em **2026-07-11/12** entregamos as **22 fases** do **Sistema de Gestão do Abrigo** (shelter management) em produção. Deploy ativo em `viralata.app` / `viralata.web.app`.

- **Status produção**: 22/22 fases shelter ✅ + core platform (ONGs, comunidades, pets) ✅
- **Testes**: 1.355+ verde, lint 0, build OK (15.98s), Firestore rules 1.291/1.291 parens
- **Scrum board**: 367 tasks (128 done / 229 ready / 3 in_progress / 6 backlog / 1 dropped)
- **PRs abertos no GitHub**: 0
- **Issues abertas no GitHub**: 0
- **Em paralelo**: 3 worktrees ahead-of-main no PC local (voluntários + legal v2 + housekeeping) com trabalho substantivo pronto para virar PR
- **Crítico aguardando decisão humana**: 3 (LGPD termo v2, SendGrid/Resend, DPO sign-off)

---

## 1. Estado Imediato (snapshot numérico)

| Métrica | Valor | Fonte |
|---|---|---|
| `origin/main` HEAD | `e2fb076` (Merge PR #73) | GitHub API |
| Main local (PC) | `af5c0d7` | briefing local — 84 commits atrás |
| PRs abertos | 0 | `https://api.github.com/repos/fsalamoni/viralata/pulls?state=open` |
| Issues abertas | 0 | `https://api.github.com/repos/fsalamoni/viralata/issues?state=open` |
| Branches remotas | 10 | `git branch -r` (3 não-merged) |
| Worktrees no PC local | 8 | briefing — 3 ahead, 3 órfãos merged, 2 in-sync |
| Testes | 1.355 verde (62 arquivos) | `npm test` |
| Build | OK (15.98s, 1.092 packages) | `npm run build` |
| Lint | clean | `npm run lint` |
| Firestore rules | 1.291/1.291 parens balanceados | `python3` check |
| Storage rules | 66 linhas | `storage.rules` |
| Firestore indexes | 35 | `firestore.indexes.json` |
| Bundle size | 4.125 KiB dist (PWA) | `dist/` |
| Smoke routes | 25/25 (10 públicas + 15 admin) | `scripts/smoke-routes.mjs` |
| Deploy | rodando — run #221 (viralata.web.app) | GitHub Actions |
| Cobertura Regra A (5 eixos por feature) | 95% | orquestrador 2026-07-11 |

---

## 2. Arquitetura (visão rápida)

### Stack congelada
- **Frontend**: React 18 + Vite + TanStack Query + Zod + shadcn/ui (Radix) + Tailwind
- **Backend**: Firebase (Auth + Firestore + Storage + Cloud Functions + App Check + Hosting)
- **Região**: `southamerica-east1`
- **LGPD**: sempre em mente (Lei 13.709/2018 + Marco Civil + Lei 14.063/2020 + CFMV 1.465/2022)
- **Testes**: Vitest (unit) + Playwright (E2E + a11y axe-core)

### Estrutura de pastas
```
src/
├── App.jsx              # Roteamento + providers
├── main.jsx             # Bootstrap + PWA
├── components/          # Layout + ui/ (shadcn)
├── core/                # auth, config, services, observability
└── modules/
    ├── pets/            # adoção (feed, detalhe, wizard, radar, avaliações)
    ├── organizations/   # ONGs: diretório público + painel admin
    ├── communities/     # comunidade: perfil público, eventos, mural, fórum
    ├── onboarding/      # questionário de adotante
    ├── chat/            # 1:1 e grupo
    ├── notifications/   # sino + painel dropdown
    ├── reports/         # denúncia de maus-tratos
    ├── admin/           # painel da plataforma
    └── shelter/         # Sistema de Gestão do Abrigo (22 fases)
        ├── domain/      # core, clinical, operational, legal, search
        ├── services/    # Firestore I/O fino
        ├── hooks/       # React Query
        ├── components/  # UI compartilhada
        └── pages/       # rotas
```

### Multi-tenant
- Subcoleções com `shelter_club_id` (NÃO renomeamos `clubs` → `shelters` no Firestore por compatibilidade)
- Tenant check em `firestore.rules` (helpers `_petShelterClubId`, `_verifyShelterTenant`)
- Service layer com `_verify*Tenant` + `getDoc` re-read (mockar 2x em testes)

---

## 3. Roadmap — onde estávamos, onde estamos, para onde vamos

### 3.1 Roadmap macro (3 fases)
1. **Fase 0-1-2 do design system** (cores, tokens, dark mode) — parcial, ver `docs/DESIGN_SYSTEM.md`
2. **22 fases do Sistema de Gestão do Abrigo** — **CONCLUÍDO** ✅
3. **Pós-cutover**: débitos técnicos, LGPD compliance, novas features

### 3.2 Sistema de Gestão do Abrigo — 22 fases (5 macro-blocos)

| Bloco | Fases | Status |
|---|---|---|
| **A — Fundação** | Fase 0 (preparação) | ✅ |
| **B — Núcleo do Animal** | Fases 1-9 (cadastro, timeline, adoção, adotante, pós-adoção, LT, saúde, medicação) | ✅ |
| **C — Operação do Abrigo** | Fases 10-17 (galeria, vitrines, RSVP, voluntários, dashboard, kanban, relatórios, indicadores) | ✅ |
| **D — Busca** | Fase 18 (Smart Search — Firestore nativo) | ✅ |
| **E — Legal + Segurança + Admin** | Fases 19-22 (termos, segurança, painel saúde, cutover) | ✅ |

**22/22 fases em produção** — ver `docs/SHELTER_MGMT_ROADMAP.md` v1.0.0 para detalhes de cada fase.

### 3.3 Pós-cutover (próximas sprints)

Sprint **2026-W28** (11/07 → 18/07): **estabilização pós-22 fases + LGPD + cutover**

Tracks paralelos:

| Track | Tarefas | Owner |
|---|---|---|
| **LGPD compliance** | termo v2 voluntários (TASK-209), 3 revisões jurídicas (TASK-006/007/008), ativar SHELTER_LEGAL_TERMS_V1 (TASK-113), DPO (TASK-184), breach ANPD (TASK-037/187) | human-jurídico + human |
| **Decisões de produto** | SendGrid vs Resend (TASK-365), FCM push real (TASK-367), Foster = Voluntário? (TASK-362), Validação CPF (TASK-370), Calendar integration (TASK-371) | human |
| **Débitos técnicos** | 10+ components sem test (TASK-013), 3 services sem Zod (TASK-014), auditoria a11y (TASK-014/199), atualizar AGENTS.md (TASK-374) | viralata-coder |
| **Features pequenas** | Sentry + Crashlytics (TASK-239), volunteer entity no Smart Search (TASK-241), PDF certificado (TASK-248), Bridge Foster↔Voluntário (TASK-247), smoke test routes (TASK-246) | viralata-coder |
| **Hygiene main local** | sincronizar 84 commits, remover 3 worktrees órfãos, limpar stash (TASK-045), unificar JSON local com origin | human (delicado) |
| **Cutover (Fase 22)** | flag gating em todas tabs, cutoverService, validação de readiness | feito (PR #66) |

---

## 4. Sistema de Scrum (`.harness/`)

### 4.1 Arquitetura
```
.harness/
├── SCRUM_TASKS.json        # source of truth (420KB, 367 tasks)
├── painel-scrum.html       # UI self-contained (487KB, JSON embutido)
├── SCRUM_PROTOCOL.md       # protocolo coordenação (17KB)
├── sync.cjs                # valida worktrees + auto-reembed
├── scrum.cjs               # CLI canônica (npm run scrum:*)
├── autosync.cjs            # daemon: mavis messages → JSON
└── (scripts de consolidação de 2026-07-11)
```

### 4.2 CLI canônica (Regra B §B.1.5)
```bash
npm run scrum:start -- TASK-XXX --owner $(self) --branch feat/...
npm run scrum:done  -- TASK-XXX --pr "#N" --evidence "..."
npm run scrum:review -- TASK-XXX --pr "#N"
npm run scrum:list
npm run scrum:show  -- TASK-XXX
npm run sync:watch    # root roda em background
npm run sync:serve    # watcher + HTTP em http://localhost:8731/painel-scrum.html
```

### 4.3 Regra B (resumo)
- Toda atividade de dev **atualiza `.harness/SCRUM_TASKS.json`** no início (status→`in_progress`, owner=sessionId) e no fim (status→`done`/`review`)
- Lock com `proper-lockfile` (devDep) antes de edições em batch
- Auto-reembed do painel via `sync.cjs --watch` (root roda em background)
- Notificar root via `mavis communication send` antes de editar batch

### 4.4 Status atual
- **128 done** (35%) — inclui as 22 fases + LGPD crítico (TASK-215-242) + 11 textos legais v2
- **229 ready** (62%) — backlog priorizado
- **3 in_progress** (TASK-010 stale, TASK-113 jurídico, TASK-261 stale)
- **6 backlog** (TASK-020-024 + TASK-034) — sem prioridade
- **1 dropped** (TASK-047 superseded)
- **0 blocked**

---

## 5. Tasks em vôo (3 in_progress + 2 in_review stale)

| ID | Título | Owner | Branch | Observação |
|---|---|---|---|---|
| TASK-010 | Revisar paridade visual comunidade/ONG | `mvs_44f276` (sessão finished) | `wt/17ff480a` | ⚠️ **stale** — branch merged, sessão morreu |
| TASK-113 | Ativar flag SHELTER_LEGAL_TERMS_V1 (após 006/007/008) | `human-juridico` | `feat/legal-docs-v2` | 🟡 **legítimo** — depende de humano |
| TASK-234 | Audit fail visibility — Sentry.captureException | `mvs_f1e04` (eu) | `feat/volunteer-critical-fixes` | 🟢 **coberto** nos 5 commits do wt-volunteer-critical |
| TASK-237 | Wire ParticipationForm + ParticipationsList no painel admin | `mvs_f1e04` (eu) | `feat/volunteer-critical-fixes` | 🟢 **coberto** nos 5 commits do wt-volunteer-critical |
| TASK-238 | Wire SHELTER_VOLUNTEER_PROFILE_V1 nos 4 components | `mvs_f1e04` (eu) | `feat/volunteer-critical-fixes` | 🟢 **coberto** nos 5 commits do wt-volunteer-critical |
| TASK-201 | LegalPageViewer Navigate→PageNotFound + PetFeed v1 rename | — | `feat/legal-docs-v2` | ⚠️ **stale** in_review, código em wt-legal-v2 |
| TASK-202 | Auto-sync do painel-scrum.html (Regra B) | — | `feat/harness-auto-import` | ⚠️ **stale** in_review, já merged origin/main |

**Ação recomendada**: marcar TASK-010, TASK-201, TASK-202, TASK-234, TASK-237, TASK-238 como `done` (estão cobertas ou sessões morreram). TASK-113 fica como está (humano).

---

## 6. Decisões pendentes (separadas por dono)

### 6.1 🔴 CRÍTICAS — aguardam VOCÊ (user) AGORA

| Task | Decisão |
|---|---|
| **TASK-209** | Termo de voluntários v2 com LGPD + Lei 14.063/2020 — revisão jurídica humana |
| **TASK-365** | **[D-04]** Email transacional: SendGrid vs Resend (LGPD + data center BR) |
| **TASK-368** | **[D-07]** DPO sign-off antes de qualquer canário em produção (jurídico) |

### 6.2 🟡 HIGH — aguardam VOCÊ + jurídico

| Task | Decisão |
|---|---|
| TASK-006 | Revisão jurídica: adoptionTerms.v1.js |
| TASK-007 | Revisão jurídica: avisosLegais.js |
| TASK-008 | Revisão jurídica: codigoDeConduta.js |
| TASK-113 | Ativar SHELTER_LEGAL_TERMS_V1 (depende de 006/007/008) |
| TASK-184 | LGPD: designar DPO + publicar contato |
| ~~TASK-361~~ | ~~Destino de .tmp-legal-docs/~~ → **JÁ RESOLVIDA** (TASK-376 em wt-e79e15ca) |
| TASK-362 | [D-01] Foster = Voluntário com capability especial? |
| TASK-367 | [D-06] FCM push real (depende de app nativo?) |

### 6.3 🟢 MEDIUM — podem esperar

| Task | Decisão |
|---|---|
| TASK-033 | Definir DPO (Encarregado LGPD) |
| TASK-037, 187 | Protocolo breach notification ANPD 48h |
| TASK-044, 114 | Ativar SHELTER_LEGAL_TERMS_V1 em produção |
| TASK-363 | [D-02] Aba Voluntários vs Equipe (mesclar ou separar)? |
| TASK-370 | [D-09] Validação CPF (algoritmo local vs API) |
| TASK-371 | [D-10] Calendar integration (Google Calendar vs Cal.com vs nada) |
| TASK-374 | Atualizar AGENTS.md Regra B 2.2/2.3 — usar `.harness/scrum.cjs` (BREAKING) |

### 6.4 ⚪ LOW + 📦 BACKLOG
TASK-019 (DNS), 364, 023 (telemedicina), 034 (pen test) / TASK-020-024 (dark mode, CMS md, LLM parser, AdSlot, etc.)

---

## 7. Trabalho PRONTO em worktree, falta PR

| Worktree | Branch | Commits ahead | Tasks cobertas | Bloqueios |
|---|---|---|---|---|
| `wt-volunteer-critical` | `feat/volunteer-critical-fixes` | **5** | TASK-215/216/224/225/226/227/228/229/230/231/234/235/236/237/238/240/242 (18 tasks — App Check, SendGrid, FCM, withdraw consent, backup WORM, etc.) | nenhum técnico — falta PR |
| `wt-legal-v2` | `feat/legal-docs-v2` | **4** | TASK-201 (in_review), 10 docs legais v2 + aceite eletrônico Lei 14.063/2020 + 3 checkboxes onboarding | TASK-113 (jurídico) — mas o PR pode entrar |
| `wt-e79e15ca` | `wt/e79e15ca` | **6** | TASK-376 (done: migrar .tmp-legal-docs/ → docs/legal/), TASK-372 (done: proper-lockfile), TASK-256..360 (105 tasks Regra A) | nenhum — clean PR candidate |

**Total**: 15 commits ahead-of-main, ~140 tasks cobertas, prontas para 3 PRs.

**Atenção**: existe **conteúdo duplicado** entre `wt-volunteer-critical` (local) e `origin/main` (PR #69 cherry-pick). Antes de fazer PR do worktree local, verificar se o conteúdo já não está no main via outro caminho.

---

## 8. Alertas e pendências de hygiene

### 8.1 CRÍTICO
- **TASK-045** — `git stash` no main local com centenas de arquivos (deletions de outro trabalho). **NÃO fazer `git stash pop` sem o user decidir**. Se rodar, vai sujar o main.

### 8.2 IMPORTANTE
- **Sincronizar main local com origin/main** — gap de 84 commits. Cuidado: 3 worktrees ahead-of-main podem precisar de rebase.
- **3 worktrees órfãos no disco** (já merged no origin/main): `wt-17ff480a`, `wt-auto-import`, `fix-autosync-race`. Podem ser removidos com confirmação.
- **JSON local stale** (245 tasks) vs origin/main (367). Rodar `node .harness/sync.cjs --fix` para re-embedar.
- **TASK-374 (BREAKING)** — atualizar AGENTS.md §B.2.2/2.3 para usar `scrum.cjs` em vez de `node -e` inline. Afeta TODAS as sessões. Requer aviso coordenado.

### 8.3 MENOR
- 3 tasks in_progress (TASK-234, 237, 238) são MINHAS mas cobertas em worktree — mover para `done`.
- TASK-010, 201, 202 stale (sessões mortas) — mover para `dropped` ou `done` com nota.
- RISK-007 (TODO jurídico 3 docs) — bloqueia TASK-113.
- RISK-008 (10+ components sem test + 3 services sem Zod) — TASK-013/014.

---

## 9. Plano de ataque (próximas tasks, ordem de prioridade)

### 9.1 Minha fila técnica (não depende de você)

| # | Task | Esforço | Impacto |
|---|---|---|---|
| 1 | **TASK-374** — Atualizar AGENTS.md Regra B 2.2/2.3 (scrum.cjs canonical) | 30min | alto — padroniza todas as sessões |
| 2 | **TASK-241** — Smart Search: adicionar volunteer como entidade | 2-3h | alto — completa a busca |
| 3 | **TASK-013** — Adicionar tests em 10+ components sem .test.jsx | 1-2 dias | alto — paga RISK-008 |
| 4 | **TASK-239** — Sentry + Crashlytics + /healthz + bundle hash | 3-4h | alto — observabilidade |
| 5 | **TASK-018** — Smart Search: busca fuzzy client-side (typo-tolerance) | 2-3h | médio — UX |
| 6 | **TASK-220** — Cloud Functions: triggers onWrite | 3-4h | alto — automação |
| 7 | **TASK-232** — MRO (LGPD Art. 37) + RIPD (LGPD Art. 38) | 4-6h | alto — LGPD |
| 8 | **TASK-244** — Cessão direito de imagem + Image rights schema | 3-4h | médio — LGPD |
| 9 | **TASK-247** — Bridge Foster↔Voluntário + multi-roster agregado | 3-4h | médio — feature |
| 10 | **TASK-248** — PDF certificado de horas (Lei 9.608/1998) | 2-3h | médio — feature |

### 9.2 Frente PR (cobertura do trabalho já feito)
- **PR-1: wt-e79e15ca** (6 commits, clean) — housekeeping + TASK-376 (migra .tmp-legal-docs) + TASK-372 (proper-lockfile) + 105 tasks Regra A
- **PR-2: wt-legal-v2** (4 commits) — 10 docs legais v2 + aceite eletrônico + 3 checkboxes onboarding
- **PR-3: wt-volunteer-critical** (5 commits) — 18 tasks críticas LGPD (mas verificar duplicação com origin/main)

### 9.3 Frente documentação/hygiene
- PR de hygiene com este STATE.md + atualizações de ROADMAP.md + SCRUM_TASKS.json

---

## 10. Índice de documentos (leia nesta ordem)

| # | Doc | Conteúdo | Quando ler |
|---|---|---|---|
| **0** | **`docs/STATE.md` (este)** | Estado atual, fila, alertas | SEMPRE PRIMEIRO |
| 1 | `docs/AI_CONTEXT.md` | Plataforma, arquitetura, stack, papéis, rotas | Após STATE |
| 2 | `docs/ARCHITECTURE.md` | Detalhes arquiteturais | Quando mexer em arquitetura |
| 3 | `docs/SHELTER_MGMT_ROADMAP.md` | 22 fases do shelter (detalhado) | Quando mexer em shelter |
| 4 | `docs/ROADMAP.md` | Roadmap macro (3 fases) | Quando planejar sprint |
| 5 | `docs/MODULES.md` | Mapa de módulos | Quando achar onde mexer |
| 6 | `docs/DATA_MODEL.md` | Modelo de dados, coleções | Quando mexer em Firestore |
| 7 | `docs/DESIGN_SYSTEM.md` | Cores, tokens, componentes | Quando mexer em UI |
| 8 | `docs/SECURITY_AUDIT.md` | Análise de segurança | Quando mexer em auth/permissions |
| 9 | `docs/AUDIT_2026-07-11.md` | Auditoria multi-dimensional pós-22 fases | Referência histórica |
| 10 | `docs/AUDIT_DEEP_2026-07-11.md` | Auditoria profunda (7 bugs reais) | Referência histórica |
| 11 | `docs/DR_PLAN.md` | Disaster recovery (WORM backups) | Quando mexer em backup |
| 12 | `docs/DNS_VIRALATA_APP.md` | DNS para viralata.app | Quando mexer em DNS |
| 13 | `docs/legal/` | 11 textos legais v2 (após merge) | Quando mexer em legal |
| 14 | `AGENTS.md` | Mandato persistente, Regras A+B | SEMPRE — regras de trabalho |
| 15 | `.harness/SCRUM_PROTOCOL.md` | Protocolo de coordenação entre sessões | Quando coordenar com outras sessões |
| 16 | `DELIVERABLE.md` | Último deliverable entregue | Após cada merge |

---

## 11. Workflow (como pegar uma task e entregar)

### 11.1 Para viralata-coder (eu)
```bash
# 1. Puxar task
node .harness/scrum.cjs show -- TASK-XXX
# Verifica: priority high/critical, status=ready, owner!=human

# 2. Atualizar status (lock + atomic write)
node .harness/scrum.cjs start -- TASK-XXX --owner $(mavis communication peers --self) --branch feat/...

# 3. Abrir worktree
git worktree add .worktrees/feat-shelter-N-slug -b feat/shelter-N-slug main
cd .worktrees/feat-shelter-N-slug
ln -sf ../../node_modules node_modules  # symlink

# 4. Implementar
# domain → service → hook → component → tests → firestore.rules → indexes → flag

# 5. Validar
npm test
npm run typecheck
npm run lint
npm run build

# 6. Commit (conventional)
git add -A
git checkout origin/main -- package-lock.json  # evita subir lock
git commit -m "feat(shelter): TASK-XXX — descrição curta"

# 7. Push + PR
git push -u origin feat/shelter-N-slug
gh pr create --base main --title "feat(shelter): TASK-XXX — ..." --body "..."

# 8. Atualizar status
node .harness/scrum.cjs review -- TASK-XXX --pr "#N"

# 9. Re-embed do painel (sync.cjs --watch roda no root)
node .harness/sync.cjs --fix

# 10. Notificar root
mavis communication send --to <root> --content "TASK-XXX in_review, PR #N"
```

### 11.2 Para outras sessões
- **Respeitar worktree isolado** — nada em main sem worktree
- **Feature flag** — toda feature nova atrás de `SHELTER_*` default OFF
- **Lock** — avisar root antes de editar `.harness/SCRUM_TASKS.json` em batch
- **Coordenação** — `mavis communication send` para task claim/release

---

## 12. Riscos e mitigações

| ID | Risco | Severidade | Status | Mitigação |
|---|---|---|---|---|
| RISK-001 | Admins esquecerem flag OFF em produção | médio | mitigated | `cutoverService.validateShelterReadiness()` |
| RISK-002 | Merge conflito em OrgAdminPanel | médio | ✅ **fechado** 11/07 | já resolvido via #69 |
| RISK-003 | xlsx (SheetJS 0.18.5) com CVE | alto | accepted | patch via npm overrides (em estudo) |
| RISK-004 | Performance 500+ pets no feed | médio | monitoring | benchmarks agendados |
| RISK-005 | Telemedicina CFMV 1.465/2022 | alto | accepted | depriorizado pós-Fase 22 |
| RISK-006 | Firestore rules sem return | crítico | mitigated | lint check + pre-commit hook |
| RISK-007 | TODO jurídico 3 docs | alto | 🟡 **open** | depende de TASK-006/007/008 |
| RISK-008 | 10+ components sem test + 3 services sem Zod | médio | 🟡 **open** | TASK-013/014 na fila |

---

## 13. Notas para sessões paralelas

- **NÃO** mergear worktrees ahead-of-main sem decisão do user
- **NÃO** rodar `git pull` no main local sem avisar (84 commits + 3 worktrees ahead = rebase hell)
- **NÃO** deletar worktrees órfãos sem confirmação
- **NÃO** editar `.harness/SCRUM_TASKS.json` em batch sem avisar root
- **NÃO** criar commits automáticos — convenção do projeto: commits são user-driven
- **SIM** usar `.harness/scrum.cjs` CLI canônica (NÃO `node -e` inline)
- **SIM** rodar `node .harness/sync.cjs --check` antes de commitar (deve dar exit 0)
- **SIM** seguir Regra A (5 eixos por feature) + Regra B (auto scrum update)

---

## 14. Histórico de mudanças deste documento

| Data | Versão | Mudança |
|---|---|---|
| 2026-07-12 21:30 | 1.1.0 | Criação inicial pós-PR #73. Documento canônico de estado. |
| 2026-07-11 14:21 | 1.0.0 | Versão antiga (Fase 22 finalizada) |
| Antes | 0.x | Versões de fase por fase |

---

## 15. Onde achar ajuda

- **Issue ou dúvida arquitetural**: abrir issue em `fsalamoni/viralata`
- **Mavis session**: `mavis communication send --to <sessId>` (lock + atomic write)
- **Painel scrum**: `npm run sync:serve` → http://localhost:8731/painel-scrum.html
- **Sync check**: `node .harness/sync.cjs --check` (exit 0 = tudo OK)
- **Worktree list**: `git worktree list`
- **Status local vs origin**: `git log main..origin/main --oneline | wc -l`

---

> **Princípio guia**: calma, cautela, atenção. Não prejudicar nada. Feature flags sempre. UX/UI é prioridade. Regra A + B sempre.
