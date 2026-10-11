# 29-PROJETO-CONTINUIDADE-2026-Q4.md — Projeto de Continuidade do Viralata

> **Documento canônico do projeto que dá continuidade ao desenvolvimento da
> plataforma a partir de 2026-10-11.** Consolida tudo o que foi pedido,
> decidido e entregue nos 253 PRs, nos documentos de planejamento e no board
> (`.harness/SCRUM_TASKS.json`), e define meta, objetivos, escopo, épicos,
> backlog, sequenciamento, governança e riscos para o próximo ciclo.
>
> **Versão**: 1.0.0 · **Criado em**: 2026-10-11 · **Período**: 2026-10-12 → 2026-12-20 (5 sprints de 2 semanas)
> **Board**: tasks com a tag `projeto-2026-q4` (épicos `E1`..`E8`) · seed: `.harness/_add-projeto-2026-q4-tasks.cjs`
> **Leia antes**: `00-START-HERE.md`, `11-CORE-DIRECTIVES.md`, `AGENTS.md` (Regras A e B)

---

## §0. Ficha do projeto

| Campo | Valor |
|---|---|
| Nome | Projeto de Continuidade Viralata 2026-Q4 |
| Meta | Levar a plataforma de "tudo implementado e ligado" para **"operando com abrigos reais, observável, comunicando de verdade e sem fachadas"** |
| Owner | fsalamoni (platform admin, DPO interino — decisão P11) |
| Executores | Sessões de agente (Mavis / Claude Code / Copilot) + humano/jurídico nas tasks marcadas `human` / `human-jurídico` |
| Fonte de verdade das tasks | `.harness/SCRUM_TASKS.json` (CLI `npm run scrum:*`) e `painel-scrum.html` (`public/scrum.html`) |
| Período | 2026-10-12 → 2026-12-20 |
| Estado inicial | 782 tasks (711 done, 53 ready, 1 blocked, 17 dropped), produção em https://viralata.web.app |

---

## §1. Por que este projeto existe

1. **Tudo o que foi planejado está implementado.** 22 fases do Sistema de Gestão do Abrigo (PRs #37–#73), DS_V2 (11 blocos), Redesign V3 (21 páginas), Personas V4 (6 acessos, PRs #214–#239), Loja + Marketplace (#247–#250), Painel do Abrigo V2 (Fases 0–7, concluído 2026-08-29), Espaço de Parceiros, Kanban de tarefas, Pet Ops.
2. **O cutover aconteceu em 2026-08-30 (PR #253)**: 19 páginas V3 + 44 flags de abrigo passaram a `true` por default. Desde então, **42 dias só com commits automáticos de sync do board** — nenhum commit de código.
3. **O board ficou sem direção**: 39 tasks em `backlog` (24 delas placeholders "a definir", 8 com ID duplicado), 6 tasks com status fora do vocabulário do board (`pending`), e `docs/STATE.md`, `docs/ROADMAP.md`, `docs/FEATURE_FLAGS.md` parados em julho.
4. **Há fachadas a pagar**: tasks marcadas `done` sem código correspondente (ver §2.4). O próprio `LOOP_PROMPT.md` registra a exigência do owner: "trabalho real, não aparente".
5. **Decisões de julho divergem do código** (email, push), e nenhum email transacional sai em produção hoje (provedor stub).

Este projeto responde ao pedido do owner em 2026-10-11: *"crie um projeto completo para dar continuidade ao desenvolvimento dessa plataforma… observe dentro dos PRs e conversas anteriores tudo que é pertinente"*.

---

## §2. Estado real em 2026-10-11 (evidência, não memória)

### §2.1 Produção

| Item | Estado | Evidência |
|---|---|---|
| Hosting | viralata.web.app (viralata.app descartado — decisão P17) | `.firebaserc`, decisão P17 |
| Último PR de código | #253 "Cutover: ativar a versão mais nova… com todas as flags ligadas" (merged 2026-08-30) | GitHub |
| Commits desde então | só `chore(scrum): auto-sync` diários (workflow `scrum-sync.yml`) | `git log` |
| Páginas V3 | 19 `v3_page_*` ON por default | `src/core/featureFlags.js` |
| Abrigo | `shelter_foundation` + 44 `SHELTER_*` ON; `shelter_cutover` OFF (chave de migração) | idem |
| Personas V4 | implementado, **11 flags `V4_PERSONA_*` OFF** (D-PERSONA-FLAG-GRADUAL, 5 etapas, nenhuma executada) | idem + `19-V4-PERSONAS-INDEX.md` |
| Marketplace | `/mercado` implementado, `PLATFORM_MARKETPLACE_V1` **OFF** | idem |
| Parceiros | `ADMIN_PARTNER_SPACES_V1` + `PUBLIC_PARTNER_BANNERS_V1` ON | idem |
| Flags de layout OFF com código vivo | `PAGE_HERO_ENABLED`, `STANDARDIZED_PAGE_LAYOUT`, `COMMUNITY_NGO_PARITY`, `AD_SLOTS`, `COMMUNITY_EVENT_DETAIL_V1`, `HOME_STATS_V1`, `A11Y_IMPROVEMENTS_V1` | grep de readers |
| Issues / PRs abertos | 0 / 0 | GitHub |

### §2.2 Baseline de qualidade (rodado nesta sessão, `main` @ a7251d4)

| Verificação | Resultado |
|---|---|
| `npx vitest run` | 234 arquivos, **2868 testes verdes** (106 s) |
| `npm run lint` | 0 erros |
| `npm run typecheck` | 0 erros |
| `npm run build` | OK em 30 s · `sw-v92.js` · precache **231 entradas / 7.230 KiB** |
| `node .harness/sync.cjs --check` | antes: 8 IDs duplicados · depois do seed: **0 duplicados, 0 refs quebradas, exit 0** |
| Rotas em `src/App.jsx` | 90 · smoke cobre 35 (`scripts/smoke-routes.mjs`) |
| E2E Playwright | 11 specs em `tests/e2e/` — **não rodam no CI** (`deploy.yml` só roda vitest + build) |
| Cloud Functions | 30+ exports (crons, triggers, callables); `/healthz` **não exposto** |
| `npm test` em `functions/` | **12 testes falhando em 4 arquivos** (createContractCore, generateEventIcsCore, sendPushNotification, volunteerTriggers); invisível porque o step de CI tem `continue-on-error` → TASK-979 |

### §2.3 Decisões do owner (2026-07-15) e situação no código

| Decisão | Escolha | Código hoje | Ação |
|---|---|---|---|
| P1 / D-04 Email | **Resend** | `functions/emailProviderAdapter.js`: Stub (default) + SendGrid; nenhum envio real em prod | **TASK-960** (decisão + config) |
| P2 Push | **Web Push API, não FCM** | `fcmService.js` + `SHELTER_FCM_V1` ON (FCM) | **TASK-961** (confirmar ou migrar) |
| P3 Calendar | só Google Calendar | `.ics` gerado (`generateEventIcs`) | ok para v1 |
| P4 CPF | algoritmo local | `src/core/lib/cpfUtils.js` (`isValidCpf`) | ok |
| P5 PIX | manual, sem gateway | registry de provedores em `storeCart.js`, instruções off-platform | **TASK-943** reenquadrada (PIX manual + comprovante) |
| P6 / D-01 Foster = voluntário | sim | TASK-600 done | ok |
| P8 Avaliação 360 | sem score público | TASK-601 done | ok |
| P10 Smart search | Firestore puro | Fase 18 done | ok |
| P11 / P12 DPO e `/admin/cargos` | user = DPO, página de cargos | **não existe rota nem página** (TASK-380 `done` indevidamente) | **TASK-963** |
| P13 Cookie banner | minimalista | TASK-381 done | ok |
| P14 Pentest | interno | TASK-034 done (doc) | ok, revisitar em E7 |
| P17 Domínio | só viralata.web.app | ok | — |

### §2.4 Inconsistências e fachadas encontradas (viram tasks)

| # | Achado | Evidência | Task |
|---|---|---|---|
| 1 | Sentry "entregue" sem SDK | `@sentry/react` ausente do `package.json`; `auditService.js:315` TODO; `errorTracker.js` só faz dynamic import | TASK-951 |
| 2 | `/admin/cargos` "entregue" sem código | nenhuma rota em `App.jsx`, nenhuma página em `modules/admin/pages` | TASK-963 |
| 3 | Espelhos públicos sem writer | `exhibitions_public` e `foster_placements_public` têm leitor e nenhuma Function/regra (PR #253 "Adiado") | TASK-939/940/949 |
| 4 | Email transacional não sai | provedor stub por default | TASK-960/953 |
| 5 | Push contradiz decisão | FCM em uso vs P2 | TASK-961 |
| 6 | Estatística falsa na landing | `useHomeStats.js:37` `adoptedCount: 500` hardcoded | TASK-971/973 |
| 7 | 8 `TODO(JURÍDICO)` em textos legais publicados | `src/modules/shelter/domain/legal/texts/*` | TASK-964 (blocked, humano) |
| 8 | Formulário de adoção in-app não grava | ainda via Google Forms webhook | TASK-941 |
| 9 | E2E fora do CI | `deploy.yml` | TASK-970 |
| 10 | Docs canônicos stale (STATE/ROADMAP/FEATURE_FLAGS de julho) | datas nos arquivos | TASK-947 + este doc |
| 11 | Board com 24 placeholders e 8 IDs duplicados | `sync.cjs --check` | TASK-946 (feito no seed) |
| 12 | Tasks de decisão `done` só com link de roadmap (TASK-020..024, 034, 019) | campo `evidence` | TASK-948 (auditoria) |

### §2.5 Pedido do design "minimalista e intuitivo"

A pasta `claude design/` (2026-07-03) contém o handoff do redesign (tokens terracota/creme/oliva, Sora + Manrope, cards 18–28 px, bottom tab bar mobile). **Ele já foi absorvido** por `docs/DESIGN_SYSTEM.md` (DS_V2, 2026-07-16) e pelas 21 páginas V3 (2026-07-18–22). Não há trabalho novo de design pendente além do que E7/E8 listam; a pasta fica como referência histórica.

---

## §3. Meta, objetivos e indicadores

**Meta (até 2026-12-20)**: 3 abrigos reais operando na plataforma, com observabilidade ativa, comunicação (email + push) funcionando, personas V4 liberadas para 100% dos usuários e zero task "done" sem código.

| # | Objetivo | Indicador | Baseline | Alvo |
|---|---|---|---|---|
| O1 | Verdade do board e docs | tasks `done` sem evidência de código (auditoria TASK-948) | desconhecido (≥ 5 achadas) | 0 |
| O2 | Painel do abrigo V2 validado em produção | TASK-931..938 com evidência de smoke + 24h | 0/8 | 8/8 |
| O3 | Observabilidade | erro JS de produção visível em Sentry com release; `/healthz` 200 | não | sim |
| O4 | Comunicação real | email + push de convite chegando em dispositivo real | 0 canais | 2 canais |
| O5 | Personas V4 | % de usuários com `V4_PERSONA_ENABLED` | 0 % | 100 % |
| O6 | LGPD | `TODO(JURÍDICO)` no código; DPO editável no admin | 8; não | 0; sim |
| O7 | Qualidade | E2E no CI; Lighthouse mobile nas 5 rotas públicas | não; não medido | sim; ≥ 90 |
| O8 | Adoção real | abrigos reais ativos; adoções concluídas via plataforma | 0 (sem piloto) | 3; 3 |

---

## §4. Escopo

### Dentro do escopo
- Os 8 épicos de §5 (54 tasks: 33 novas TASK-946..978, 15 reenquadradas TASK-931..945, 6 normalizadas `TASK-V3-*`).
- Ativação de flags já implementadas (marketplace, a11y, home stats, personas) com o runbook de rollout de `ROADMAP_SHELTER_ADMIN_V2.md §15`.
- Remoção de código legado (`*.v1.jsx`) só após 30 dias de cutover estável (TASK-978).

### Fora do escopo (explicitamente)
- Telemedicina veterinária (P15, RISK-005).
- Gateway de pagamento real / Pagar.me (P5 escolheu PIX manual).
- App nativo; FCM só se o owner confirmar em TASK-961.
- Novas integrações de busca (P10) ou de calendário além do Google (P3).
- Pentest por terceiro (P14).
- Mudança de stack (congelada: React 18 + Vite + TanStack Query + Zod + shadcn/ui + Firebase, `southamerica-east1`).

### Premissas e restrições
- **Regra A** (5 eixos por funcionalidade) e **Regra B** (board atualizado no início e fim de cada task) de `AGENTS.md` valem para toda task.
- Toda feature nova nasce atrás de flag default OFF; ativação só com smoke + 24h + migração de flags (CORE-DIRECTIVES §3).
- Nenhuma task vai a `done` sem commit de código real ou evidência objetiva (anti-fachada, `LOOP_PROMPT.md`).
- Worktree/branch por task (`feat/<epico>-<slug>`), PR com flag + bundle hash, `npm test` / `lint` / `typecheck` / `build` verdes antes do push.

---

## §5. Épicos e backlog

Legenda de prioridade: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low. Owner `human` = só o owner pode fechar.

### E1 — Verdade do board e da documentação (sprint W42)
**Objetivo**: o board e os docs canônicos refletem a realidade do código.

| Task | Prio | Owner | O quê | Pronto quando |
|---|---|---|---|---|
| TASK-946 | 🟠 | agente | Higiene do board (feito pelo seed) | `sync.cjs --check` exit 0, 0 status fora de `columns` |
| TASK-947 | 🟠 | agente | Regenerar `docs/FEATURE_FLAGS.md` a partir do código | tabela sem "TBD", defaults iguais ao código, audit script verde |
| TASK-948 | 🟠 | agente | Auditoria anti-fachada de P1..P20 | lista (task, evidência real, veredito) em docs; reaberturas criadas |

### E2 — Fechar gaps do rollout V2 do painel do abrigo (W42–W45)
**Objetivo**: tudo o que o cutover ligou está validado em produção e os gaps conhecidos do `ROADMAP_SHELTER_ADMIN_V2.md §16` estão fechados.

| Task | Prio | Flag | O quê | Depende |
|---|---|---|---|---|
| TASK-950 | 🟠 | — | Smoke 35 rotas em produção + evidência | — |
| TASK-931..938 | 🟠/🟡 | 8 flags V2 | Validação pós-cutover (smoke + critério + 24h) por fase | TASK-950 ajuda |
| TASK-939 | 🟠 | EXHIBITION_OPS | Writer do espelho `exhibitions_public` (Function onWrite) | — |
| TASK-940 | 🟠 | EXHIBITION_OPS | Regra de leitura anônima de vitrines publicadas | TASK-939 |
| TASK-949 | 🟠 | FOSTER_V2 | Writer + regra de `foster_placements_public` | — |
| TASK-941 | 🟡 | DOCUMENTS_V1 | Formulário de adoção in-app → `adoption_workflow` | — |
| TASK-943 | 🟡 | STORE_V2 | PIX manual (chave + QR + comprovante) no checkout | — |
| TASK-944 | ⚪ | STORE_V2 | Carrinho por usuário (Firestore) | avaliar custo |
| TASK-945 | 🟡 | — | E2E das superfícies V2 com flags ON/OFF | TASK-970 |
| TASK-942 | ⚪ | ACTIONABLE_NOTIF | Não gravar `action_*` com flag OFF | opcional |

**Regra A (E2)**: UX = páginas públicas `/vitrines/:id`, `/lares-temporarios` passam a mostrar dados reais; Papéis = anônimo lê espelhos, só Function escreve; Regras = `allow read: if true; write: if false` nos espelhos, sem PII; Integrações = Cloud Functions onWrite + backfill; Pós-deploy = índice composto se necessário, smoke, 24h.

### E3 — Observabilidade e operação (W42–W43)
**Objetivo**: um erro em produção é visto em minutos, não relatado pelo usuário dias depois.

| Task | Prio | O quê | Pronto quando |
|---|---|---|---|
| TASK-951 | 🔴 | `@sentry/react` + DSN + release = bundle hash + `auditService` | erro de teste no Sentry com release, sem PII |
| TASK-952 | 🟠 | `/healthz` HTTP + uptime check + alerta | `curl /healthz` 200; alerta em falha simulada |
| TASK-953 | 🟠 | Alertas de erro/billing por email real | email de teste recebido (depende TASK-960) |
| TASK-954 | 🟡 | Runbook de incidente e rollback por flag (`30-RUNBOOK-INCIDENTES.md`) | revisado pelo owner, linkado no START-HERE |

### E4 — Rollout V4 Personas (W44–W49)
**Objetivo**: executar as 5 etapas de D-PERSONA-FLAG-GRADUAL até 100 %.

| Etapa | Task | Prio | O quê |
|---|---|---|---|
| 1 | TASK-955 | 🟠 | E2E das 6 personas no canal de preview |
| 2 | TASK-956 | 🟠 | Script de migração (dry-run + apply, idempotente) |
| 3 | TASK-957 | 🟠 | Ativar para o owner + validação manual (REVISAO_PAGINAS) |
| — | TASK-958 | 🟡 | Fechar páginas 🔄 do `REVISAO_PAGINAS.md` |
| 4–5 | TASK-959 | 🟠 | 10 % → 50 % → 100 % + `migrateLegacyFlags` + bump versão |

**Regra A (E4)**: UX = `/acesso`, switcher, bottom tab bar por persona; Papéis = 6 personas, admin override; Regras = `active_persona`/`personas_enabled` validados em rules (D-V4-*); Integrações = migração de dados; Pós-deploy = coortes com 48h e Sentry.

### E5 — Comunicação: email + push alinhados às decisões (W42–W45)
**Objetivo**: convites, status de adoção e lembretes chegam de verdade.

| Task | Prio | Owner | O quê |
|---|---|---|---|
| TASK-960 | 🔴 | human + agente | Provedor de email (Resend vs SendGrid) + `EMAIL_PROVIDER` + remetente verificado + teste real |
| TASK-961 | 🟠 | human + agente | Push: confirmar FCM (revogar P2) ou migrar para Web Push; entrega em 2 dispositivos |
| TASK-962 | 🟠 | agente | Matriz fluxo × canal validada em produção |

### E6 — LGPD e legal: fechamento (W43–W47)

| Task | Prio | Owner | O quê |
|---|---|---|---|
| TASK-963 | 🟠 | agente | `/admin/cargos` real (papéis, responsabilidades, DPO editável, audit_log, rules) |
| TASK-964 | 🟠 | human-jurídico | Resolver 8 `TODO(JURÍDICO)`; bump de versão + re-aceite |
| TASK-965 | 🟡 | agente | Contato do DPO lido de `platform_settings` em todas as superfícies |
| TASK-966 | 🟡 | agente | Validar exportação e exclusão de conta ponta a ponta (cron de purge) |

### E7 — Qualidade, performance e acessibilidade (W44–W50)

| Task | Prio | O quê |
|---|---|---|
| TASK-970 | 🟠 | Playwright no CI contra o preview de cada PR (job obrigatório) |
| TASK-V3-PROFILE-5/6/7 · TASK-V3-ADOPTION-7/8 | 🟡 | Testes unitários/E2E/Lighthouse das páginas V3 que ficaram `pending` |
| TASK-967 | 🟡 | Ativar `A11Y_IMPROVEMENTS_V1` + axe nas rotas públicas (0 critical/serious) |
| TASK-968 | 🟡 | Lighthouse ≥ 90 nas 5 rotas públicas + orçamento de bundle (7,2 MB precache hoje) |
| TASK-969 | 🟡 | RISK-004: paginação por cursor no feed (limit 500 client-side) |
| TASK-971 | 🟡 | Fechar 4 TODOs de produto (adoptedCount fixo, VolunteerPool, contracts collectionGroup, 1º pet do wizard) |
| TASK-979 | 🟠 | Corrigir os 12 testes das Cloud Functions que falham em main e tornar o step de CI bloqueante |

### E8 — Produto e crescimento (W45–W51)

| Task | Prio | Owner | O quê |
|---|---|---|---|
| TASK-974 | 🟠 | human | Piloto com 3 abrigos reais + roteiro de feedback (`31-PILOTO-ABRIGOS.md`) |
| TASK-V3-HOME-8 | ⚪ | human | Validação com usuários (3 adoções reais) |
| TASK-972 | 🟡 | agente | Rollout de `/mercado` (`PLATFORM_MARKETPLACE_V1`) |
| TASK-973 | ⚪ | agente | `HOME_STATS_V1` com números reais (após TASK-971) |
| TASK-975 | 🟡 | agente | SEO: sitemap dinâmico, OG por pet/abrigo, Search Console |
| TASK-976 | 🟡 | agente | FAQ institucional + guia do abrigo via CMS existente |
| TASK-977 | 🟡 | human | Destino das 5 flags de layout OFF (ativar ou remover) |
| TASK-978 | ⚪ | agente | Remover `*.v1.jsx` e flags `v3_page_*` após 30 dias estáveis |

---

## §6. Sequenciamento e marcos

```
W42 (12/10–25/10)  E1 ████  E2 (950, 939/940/949) ███  E3 (951, 952) ███  E5 decisões (960, 961) ░░
W44 (26/10–08/11)  E2 (931..938 validação, 941, 943) ███  E3 (953, 954)  E5 (962)  E4 (955, 956)  E6 (963)  E7 (970)
W46 (09/11–22/11)  E4 (957, 958)  E6 (965, 966)  E7 (V3-*, 967, 971)  E8 (974 início, 976)
W48 (23/11–06/12)  E4 (959: 10% → 50%)  E7 (968, 969)  E8 (972, 973, 975)
W50 (07/12–20/12)  E4 (959: 100%)  E8 (977, 978 se estável)  Encerramento + retrospectiva
```

| Marco | Data | Critério |
|---|---|---|
| M1 — Board e docs verdadeiros | 2026-10-25 | E1 done; STATE/ROADMAP/FEATURE_FLAGS atualizados; TASK-948 publicada |
| M2 — Produção observável e comunicando | 2026-11-08 | Sentry + `/healthz` + email real + push validado (E3, E5) |
| M3 — Painel V2 validado e espelhos públicos | 2026-11-08 | TASK-931..940, 949, 950 done |
| M4 — Personas V4 para o owner + LGPD fechado | 2026-11-22 | TASK-957 done; `/admin/cargos`; 0 `TODO(JURÍDICO)` (se jurídico entregar) |
| M5 — 100 % V4 + piloto ativo | 2026-12-20 | TASK-959 done; 3 abrigos ativos; E2E no CI |

**Dependências duras**: 953 ← 960 · 962 ← 960, 961 · 956 ← 955 · 957 ← 956 · 959 ← 957 · 965 ← 963 · 973 ← 971 · 978 ← 950 · 940 ← 939.

---

## §7. Decisões que só o owner pode tomar (defaults assumidos)

| Task | Pergunta | Default assumido se não houver resposta |
|---|---|---|
| TASK-960 | Resend (decisão P1) ou SendGrid (código pronto)? | **SendGrid** (zero código novo; registrar D-EMAIL-SENDGRID revogando P1). |
| TASK-961 | Manter FCM ou migrar para Web Push? | **Manter FCM** (já entregue e ON; registrar D-PUSH-FCM revogando P2). |
| TASK-977 | 5 flags de layout OFF: ativar ou remover? | **Remover** código morto após E7 (menos bundle). |
| TASK-964 | Quem faz a revisão jurídica? | Fica `blocked` até o owner designar. |
| TASK-974 | Quais 3 abrigos pilotos? | Owner indica; agente prepara o roteiro. |
| TASK-978 | Remover V1 em 30 dias? | Sim, se TASK-950 verde e sem rollback. |

---

## §8. Governança e operação

### §8.1 Ciclo de uma task (Regra B)
```bash
npm run scrum:show  -- TASK-9xx                       # ler critério
npm run scrum:start -- TASK-9xx --owner <sessão> --branch feat/e3-sentry
# implementar em worktree/branch; flag default OFF se for feature nova
npm test && npm run lint && npm run typecheck && npm run build
npm run bundle:hash                                   # hash no PR
npm run scrum:review -- TASK-9xx --pr "#N"
# após merge:
npm run scrum:done -- TASK-9xx --pr "#N" --evidence "<link do run/print>"
node .harness/sync.cjs --fix                          # re-embed do painel
```

### §8.2 Definição de pronto (reafirmada)
Commit real com `feat:`/`fix:`/`refactor:`; diff ≥ 10 linhas ou mudança estrutural; testes dos arquivos tocados; `npm test`, `lint`, `typecheck`, `build` verdes; rules validadas se tocadas; flag + migração + bump de `FLAGS_MIGRATION_VERSION` se defaults mudarem; evidência no campo `evidence`; docs atualizados (`15-RECENT-FIXES.md`, `13-DECISIONS.md` quando houver D-*).

### §8.3 Cadência
- **Diário**: `scrum-sync.yml` re-embeda o painel (já existe).
- **Por PR**: CodeQL + vitest + build (existe) + Playwright no preview (TASK-970).
- **Quinzenal (fim de sprint)**: atualizar §6 deste doc e `docs/STATE.md` §0; recalcular O1..O8 em §3; fechar o sprint em `sprintHistory`.
- **Rollout de flag**: sempre pelo runbook `ROADMAP_SHELTER_ADMIN_V2.md §15.2` (smoke OFF → ligar → smoke ON → 24h → default true + migração).

### §8.4 Encerramento do projeto
O projeto encerra quando os marcos M1–M5 estão cumpridos ou quando o owner reprioriza. Na retrospectiva: medir §3, listar o que ficou para 2027-Q1, e arquivar este doc com status "concluído" (não apagar).

---

## §9. Riscos

| ID | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R-01 | Decisões humanas (email, push, jurídico) atrasam E3/E5/E6 | alta | alto | defaults de §7; tasks `blocked` visíveis no painel |
| R-02 | Rollout V4 quebra fluxo legado para usuários existentes | média | alto | migração dry-run, coortes 10/50/100 %, rollback por flag |
| R-03 | Espelhos públicos expõem PII | baixa | crítico | writer só com campos allowlist; teste de rules em `tests/security` |
| R-04 | Bundle de 7,2 MB prejudica mobile/4G | média | médio | TASK-968/978 |
| R-05 | Nova fachada: task fechada sem código | média | alto | TASK-948 + §8.2 + revisão de PR exigindo evidência |
| R-06 | Piloto sem abrigos disponíveis | média | alto | owner indica abrigos em W44; alternativa: ONG parceira já cadastrada |
| RISK-004 | Feed com 500+ pets | média | médio | TASK-969 |
| RISK-007 | TODO jurídico | alta | médio | TASK-964 |

---

## §10. Rastreabilidade (fontes consultadas)

- PRs #214–#253 (personas V4, pet ops, kanban, loja/marketplace, cutover) e corpo do PR #253.
- `docs/STATE.md` (1.2.0, 2026-07-13), `docs/ROADMAP.md`, `docs/ROADMAP_SHELTER_ADMIN_V2.md §14–§16`, `docs/SHELTER_MGMT_ROADMAP.md`, `docs/PLAN_PERSONAS_V4.md`, `docs/EXEC_PLAN_V4_PERSONAS.md`, `docs/PARTNER_SPACES_PLAN.md`, `docs/REVISAO_PAGINAS.md`, `docs/FEATURE_FLAGS.md`, `docs/AI_GUIDE/13-DECISIONS.md §16–§17`, `docs/AI_GUIDE/19-V4-PERSONAS-INDEX.md`, `docs/AI_GUIDE/11-CORE-DIRECTIVES.md`.
- `.harness/SCRUM_TASKS.json` (757 → 782 tasks), `decisions[]` P1..P20, `roadmap[]`, `.harness/LOOP_PROMPT.md`, `.harness/CRON_PROMPT_FINAL.md`.
- Código: `src/core/featureFlags.js`, `src/App.jsx`, `functions/index.js`, `functions/emailProviderAdapter.js`, `src/core/services/errorTracker.js`, `src/core/hooks/useHomeStats.js`, `scripts/smoke-routes.mjs`, `.github/workflows/*.yml`.
- `claude design/` (handoff do redesign, 2026-07-03).

---

## §11. Histórico deste documento

| Data | Versão | Mudança |
|---|---|---|
| 2026-10-11 | 1.0.0 | Criação. Seed de 33 tasks novas + 15 reenquadradas + 6 normalizadas; roadmap `PROJ-2026Q4-E1..E8`; sprint W42. |
