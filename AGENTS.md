# AGENTS.md — Viralata · Mandato Persistente

> **Mandato para TODOS os agentes** (humanos, Mavis sessions, IDE assistants, worktrees paralelos) que trabalham no projeto `fsalamoni/viralata`.
>
> Este arquivo é a **fonte de verdade** das regras de trabalho. Subordinado às regras carregadas no `agent memory` (cross-session) e ao `SCRUM_PROTOCOL.md` (coordenação entre sessões).
>
> **Validade**: até que TODAS as funcionalidades estejam plenamente planejadas, implementadas, revisadas e em produção. Enquanto houver funcionalidade em aberto, estas regras valem.

---

## Regra A — Avaliação Plena por Funcionalidade

**Toda funcionalidade, ao ser criada, modificada OU auditada, DEVE ser avaliada em TODAS as frentes que tocam a plataforma.** Não basta entregar uma feature isolada — cada peça depende de outras, e o usuário final precisa de uma experiência plena, harmônica e consistente.

### A.1 Checklist obrigatória por funcionalidade

Para **cada** funcionalidade (ex.: "voluntários em abrigos", "adoção", "vitrine de eventos", "busca", "LGPD", "kanban"), responda:

#### 1. Onde aparece na UX? (Superfícies)
- **Páginas públicas** (acessíveis sem auth): landing do abrigo, listagem de pets, página individual de pet, página de vitrine, página de evento, página "seja voluntário", perfil público do abrigo, busca, FAQ institucional.
- **Painel administrativo do abrigo**: abas (Visão Geral, Animais, Adoções, Lares Temporários, Voluntários, Saúde, Medicação, Galeria, Vitrines, Kanban, Relatórios, Configurações, Equipe, Doações, Mural).
- **Painel administrativo master** (`/admin/*`): feature flags, audit, security, plataforma.
- **Perfil do usuário final**: blocos de informação, ações, histórico, settings, notificações.
- **Modais / drawers / sheets**: criação, edição, confirmação, sucesso, erro.
- **Empty states / first-time experience**: o que aparece pra quem nunca usou?
- **Error states / loading states / success states**: como cada estado se apresenta?
- **Mobile / responsivo**: a funcionalidade funciona em telas pequenas?
- **Acessibilidade (a11y)**: keyboard nav, screen reader, contraste, ARIA roles.

#### 2. Quem cria? Quem consome? (Papéis)
- **Anônimo** (visitante sem auth): pode ver / pode agir?
- **Adotante** (user com perfil completo): pode iniciar / finalizar / cancelar?
- **Voluntário**: pode se inscrever? ver escalas? confirmar presença? recusar?
- **Lar temporário (foster)**: pode receber animal? reportar updates? devolver?
- **Admin de abrigo** (clube/ong): pode CRUD? vincular? convidar?
- **Membro de abrigo** (com permissões granulares `animals`, `finance`, `donations`, `feed`, `team`): o que cada permissão cobre?
- **Platform admin / master**: o que consegue fazer que outros não?
- **System** (Cloud Functions, crons): o que dispara automaticamente?

#### 3. Quais regras de negócio precisam estar explícitas?
- **Permissões por papel** (granulares, com fallback de deny-by-default).
- **Validações** (Zod schemas em todos os inputs mutáveis; `.partial()` aceita string, não null — usar `FieldValue.deleteField()` pra nullificar).
- **Auditoria** (audit_log imutável, com `user_id`, `action`, `document_version`, `ip_address`, `timestamp`, `user_agent`).
- **LGPD**: consent explícito por base legal (Art. 7º II, V, IX), retenção (Marco Civil Art. 15 = 6 meses logs), direito ao esquecimento (Art. 18 VI, soft delete 30d), DPO, breach notification (Art. 48, 48h ANPD).
- **Firestore rules** com `return` explícito em toda função, zero fall-through.
- **Single-field `collectionGroup`** NUNCA em `firestore.indexes.json` (auto-criado).
- **Snapshot pattern**: `applicant_snapshot` imutável nas applications.
- **Post-adoption cron** materializa só `scheduled_for <= now+90d`.
- **Multi-tenant isolation**: dados tenant-specific (prontuário, medicação, evaluations) NÃO vazam entre abrigos.

#### 4. Quais integrações externas?
- **Google Forms webhook** (opt-in por abrigo, populates `users/{uid}.adopter.questionnaire_external_id`).
- **Firebase Storage** (uploads de fotos, documentos).
- **Firebase Cloud Functions** (crons, webhooks, triggers, onWrite).
- **External search** (Fase 18 = Firestore nativo do projeto).
- **Email** (SendGrid pra alertas do admin master, billing spike, error rate).
- **PWA / push notifications** (Firebase Cloud Messaging).

#### 5. Qual o estado após deploy?
- **Feature flag `SHELTER_*`** declarada e default OFF.
- **Smoke test em produção** com flag OFF (não muda comportamento existente).
- **Criar PR** com flag + worktree + bundle hash no description.
- **Ativar flag** só após validação em produção.
- **Monitoramento 24h** (Sentry, Crashlytics, Cloud Functions logs, billing API).
- **Smoke test automatizado** em `scripts/smoke-routes.mjs` (25+ rotas).

### A.2 Processo mandatório

Para **cada funcionalidade nova ou modificação significativa**:

1. **Planejar** antes de executar — decompor em tasks granulares no `SCRUM_TASKS.json` (cada uma independente, com critério de aceitação, blockedBy, relatedTasks, evidence).
2. **Pesquisar** o código existente: quais arquivos tocam essa funcionalidade? quais services? quais collections?
3. **Re-avaliar independentemente** com agente separado (4 olhos) antes de marcar como `done` — comparar previsões e unificar gaps.
4. **UX/UI excelência** — não aceitar "funciona" como suficiente. Validar:
   - Consistência visual com `docs/DESIGN_SYSTEM.md` (terracotta/cream/olive).
   - Responsividade (mobile-first, breakpoints sm/md/lg).
   - Acessibilidade (axe-core, ARIA, keyboard nav).
   - Consistência de copy em PT-BR.
   - Estados de erro informativos, não genéricos.
5. **Persistir** o mapeamento até que TODAS as funcionalidades estejam plenamente cobertas.

### A.3 Exemplo: Voluntários em Abrigos (referência)

Para validar a Regra A, a funcionalidade "voluntários" precisa ter:

- [x] **Aba "Voluntários" no painel do abrigo** (já existe `VolunteersRoster`).
- [ ] **Página pública do abrigo** com bloco "Seja voluntário" (form público de inscrição).
- [ ] **Botão "Inscrever-se como voluntário"** no perfil público do abrigo (visitante anônimo).
- [ ] **Página "Voluntários" institucional** (`/voluntarios` ou `/sobre/voluntarios`) explicando o programa, termos, FAQ.
- [ ] **Perfil do usuário** com bloco "Minhas voluntariadas": histórico, participações, escalas, badges, horas totais.
- [ ] **Vinculação a vitrines e eventos** (cada volunteer pode ser assigned a uma shift da exhibition).
- [ ] **Concessão de atribuições** (roles: cuidador, transporte_ida, transporte_volta, carregamento — definidos em `volunteer_participation.role`).
- [ ] **Sistema de escalas** (turnos, check-in, check-out, hours_logged).
- [ ] **Termo de voluntariado v2** com aceite no signup (Lei 14.063/2020).
- [ ] **Clickwrap de aceite** em ações críticas (cada evento que vai participar).
- [ ] **Auditoria completa** (audit_log com cada ação: signup, assignment, shift_start, shift_end, role_change).
- [ ] **LGPD**: consent explícito, base legal "execução de contrato de voluntário", retenção.
- [ ] **Firestore rules** com isolamento tenant (voluntário só vê suas próprias participações + as do abrigo onde é roster).
- [ ] **Feature flag** `SHELTER_VOLUNTEER_PROFILE_V1` (já existe).
- [ ] **Testes**: unit, integration, smoke test em prod.
- [ ] **Métricas**: #participações, #transporte_ida, #transporte_volta, frequência (%), horas totais (já existe `volunteer_profile.hours_logged_total`).
- [ ] **Mobile / responsivo**: escalas e check-in funcionam no celular.
- [ ] **Documentação**: DELIVERABLE.md + docs/VOLUNTEER_MODULE.md.

**Se QUALQUER item acima não estiver entregue, a funcionalidade está INCOMPLETA.** Não é "feature parcial" — é dívida técnica a pagar.

---

## Regra B — Auto Scrum Update

**Toda atividade de desenvolvimento, no INÍCIO e no FIM, deve atualizar o `SCRUM_TASKS.json` automaticamente** (e propagar pro `painel-scrum.html`).

### B.1 Transições obrigatórias

| Evento | Transição no Scrum | Quem atualiza |
|---|---|---|
| Sessão assume uma task | `ready → in_progress`, `owner = sessionId`, `blockedBy` revisado, `branch` setado | A própria sessão, imediatamente |
| Worktree aberto | Adicionar `branch`, `worktree` à task | A própria sessão |
| Sub-tasks criadas | Inserir como itens top-level no `tasks[]` (não usar `subtasks` field — board trata como 1D) | A própria sessão |
| PR aberto | `in_progress → in_review`, `pr = "#N"`, `bundleHash` setado | A própria sessão |
| PR mergeado em main | `in_review → done`, `resolvedAt = hoje` | A própria sessão ou root |
| Bloqueio externo | `→ blocked`, `blockedBy = [TASK-X, TASK-Y]`, `evidence = motivo` | A própria sessão |
| Bloqueio resolvido | `blocked → in_progress` | Próxima sessão a pegar |
| Drop / descarte | `→ dropped` com nota explicativa | A própria sessão |
| Dúvida / decisão do humano | `status` mantido, `owner = "human"`, nota em `description` ou `notes` | A própria sessão |

### B.1.5 Local e formato

- **Fonte de verdade**: `.harness/SCRUM_TASKS.json`
- **Visualização**: `.harness/painel-scrum.html` (atualizar o `<script type="application/json" id="initial-data">` embedded)
- **Coordenação**: `mavis communication send --to <root>` pra sinalizar mudança
- **Sincronização**: ao final de cada task, **re-rodar o embed** (re-extrair o JSON e re-injetar no HTML)
- **Métricas**: recalcular `metrics.done/inProgress/...` automaticamente
- **Como atualizar** (recomendado): use `.harness/scrum.cjs` (CLI canônica com `proper-lockfile` + atomic write, previne race condition). Atalhos npm: `npm run scrum:start`, `npm run scrum:done`, `npm run scrum:review`, `npm run scrum:block`, `npm run scrum:list`, `npm run scrum:show`. Exemplo:
  ```bash
  npm run scrum:start -- TASK-XXX --owner $(mavis communication peers --self)
  # ... trabalha ...
  npm run scrum:done -- TASK-XXX --pr "#N" --evidence "link do PR"
  ```
  A CLI valida transições, atualiza métricas, e lock-a o JSON (single-instance). **Use a CLI em vez de editar o JSON manualmente.**

### B.2 Auto-import do painel-scrum.html (OBRIGATÓRIO)

> **O painel visual (`painel-scrum.html`) DEVE estar sempre em dia com o JSON. Não basta editar o JSON — o HTML precisa refletir a mudança SEM intervenção manual.**

A infra de auto-import vive em `.harness/sync.cjs` e tem 3 modos:

| Comando | Comportamento |
|---|---|
| `node .harness/sync.cjs` | One-shot: detecta worktrees, valida integridade. |
| `node .harness/sync.cjs --watch` | **Long-running watcher**: monitora `SCRUM_TASKS.json` (polling mtime 750ms) e re-embed no `painel-scrum.html` a cada mudança. SEMPRE que editar o JSON, o painel atualiza sozinho. |
| `node .harness/sync.cjs --watch --serve` | Watcher + HTTP server em `http://localhost:8731/painel-scrum.html` (CORS habilitado). Browser auto-recarrega em até 5s via polling. |

Atalhos npm (no `package.json`): `npm run sync`, `npm run sync:watch`, `npm run sync:serve`.

**Quem é responsável por manter o watcher rodando:**

- O **root session** (Viralata Coder) roda `npm run sync:watch` em background no momento que assume a sessão. Não é trabalho de worker — é infraestrutura.
- Workers que editam o JSON podem rodar o watcher temporariamente (15 min) e parar.
- Em produção, o painel é buildado em build-time — não há watcher rodando. Quem precisar do painel atualizado em prod rebuilda.

**Comportamento do painel sob auto-sync (UI):**

- Pill `#auto-sync-pill` no topbar mostra `sync HH:MM:SS` (último re-embed feito pelo watcher) ou `sync manual` (em `file://` sem watcher rodando) ou `live HH:MM:SS` (em `http://` com polling ativo).
- Botão `#btn-reload` no topbar: sempre funciona, força `location.reload()` para reler o JSON embutido.
- Em `http://localhost:8731/` (watcher + serve), polling de 5s detecta mudança → auto-reload em até 5s sem clique.

**Por que isso é obrigatório (Regra B §B.1):** "Ao final de cada task, re-rodar o embed". Sem auto-import, o re-embed é manual e esquecido. Com auto-import, o painel SEMPRE reflete o JSON. A single source of truth (JSON) é honrada.

**Quando NÃO esperar auto-import:** durante merge de PR, em CI/CD, em produção. Nesses casos, o re-embed é feito em build-time.

**Detalhe técnico:** o `sync.cjs` agora auto-detecta a raiz do repo via `__dirname` (não tem mais path hardcoded `D:\\viralata`). Funciona em main, worktrees, e cópias standalone. `SCRUM_REPO=/path node .harness/sync.cjs --watch` força uma raiz específica.

**Worktree:** `feat/harness-auto-import` (Viralata Coder, `mvs_f1e04f28717d42cdba05e221b7b4b6f3`). Flag: `HARNESS_AUTO_SYNC_V1` (default OFF até validação em prod).

### B.3 Script de sincronização (referência)

**Workflow recomendado (via CLI):**
```bash
# 1. Transição de status (lock + atomic write nativos)
npm run scrum:start -- TASK-XXX --owner $(mavis communication peers --self) --branch feat/...
# ... trabalha ...
npm run scrum:done -- TASK-XXX --pr "#N" --evidence "link do PR"

# 2. Re-embed automático do painel (sync.cjs --watch roda no root, nao precisa do worker)
#    Se nao tiver watcher rodando, dispara one-shot:
node .harness/sync.cjs --fix

# 3. Notificar root
mavis communication send --to <rootSessionId> --command prompt --content "[Scrum] TASK-XXX → done. Resumo: ..."
```

**Workflow manual (legado, NAO recomendado):** Só pra debug ou ajustes pontuais. **Sempre** sinalize lock antes (ver B.4) e use a CLI quando possível.
```bash
# 1. Sinalizar lock ao root: mavis communication send --to <root> --content "vou editar o JSON, trava 30s"
# 2. Editar .harness/SCRUM_TASKS.json (preservar ordem, IDs únicos, formato)
# 3. node .harness/sync.cjs --fix   # re-embed
# 4. Liberar lock: mavis communication send --to <root> --content "liberei"
# 5. Notificar root
```

### B.4 Lock pra evitar race condition

- Sessões diferentes NÃO devem editar `SCRUM_TASKS.json` em paralelo.
- Antes de iniciar uma edição batch, sinalize: `mavis communication send --to <root> --content "vou editar o JSON, trava 30s"`.
- Após edição, libere: `mavis communication send --to <root> --content "liberei"`.
- O root (Viralata Coder, `mvs_f1e04f28717d42cdba05e221b7b4b6f3`) é o owner canônico do JSON.
- O `sync.cjs --watch` **NÃO substitui** o lock — ele só observa mudanças. Se duas sessões editam ao mesmo tempo, o watcher re-embed a última versão (last write wins). O lock continua valendo pra evitar trabalho perdido.

---

## Worktree & PR (regras já existentes, reafirmadas)

- **Worktree sempre** para feature nova: `feat/shelter-<fase>-<slug>`.
- **Feature flag `SHELTER_*`** declarada e default OFF.
- **PR com flag + worktree + bundle hash** no description.
- **Commits conventional** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **Tests before commit**: `npm test` verde.
- **Typecheck**: `npm run typecheck` 0 erros.
- **Lint**: `npm run lint` 0 erros nos arquivos novos/modificados.
- **Build**: `npm run build` success.
- **Firestore rules** validadas no emulador local se modificadas.

---

## Stack congelada (reafirmada)

- **Frontend**: React 18 + Vite + TanStack Query + Zod + shadcn/ui + TailwindCSS
- **Backend**: Firebase (Auth + Firestore + Storage + Cloud Functions + App Check + Hosting)
- **Região**: `southamerica-east1`
- **Testes**: Vitest + Playwright (e2e)
- **LGPD**: sempre em mente

---

## LGPD & Segurança (reafirmadas, completas)

- **Banner de consentimento** com base legal explícita (Art. 7º II, V, IX).
- **DPO (Encarregado)** designado e contato visível.
- **Direito de exportação** (Art. 18 V) — botão "Baixar meus dados".
- **Direito de exclusão** (Art. 18 VI) — soft delete 30d + purge.
- **Retenção de logs** 6 meses (Marco Civil Art. 15).
- **Breach notification** à ANPD em 48h (Art. 48) — playbook interno.
- **Backup imutável (WORM)** no GCS, lifecycle 90d.
- **Criptografia at-rest** (default GCS/Firestore) + em trânsito (HTTPS forçado).
- **RBAC granular** por abrigo, papel, feature.
- **MFA opcional** pra admins (TOTP).
- **Políticas de senha** mínimo 12 chars, sem repetição das últimas 5.
- **Logs de auditoria** retidos 6 meses.
- **Penetration test** anual por terceiro independente.

---

## Persistência e auditoria deste mandato

Este arquivo é versionado com o projeto (`.git/AGENTS.md`). Qualquer mudança aqui é uma decisão arquitetural que passa por PR review.

**Checklist do PR que modificar AGENTS.md:**

- [ ] Justificativa da mudança (por que Regra A ou B precisa evoluir)
- [ ] Revisão de impacto (todas as tasks em aberto referenciam este arquivo)
- [ ] Comunicação às sessões ativas (`mavis communication send`) sobre a mudança
- [ ] Atualização do `SCRUM_PROTOCOL.md` se impacta coordenação
- [ ] Atualização do `agent memory` se impacta comportamento cross-session

---

*Última atualização: 2026-07-11 · Vigência: até TODAS as funcionalidades estarem plenamente planejadas.*
