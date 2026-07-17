# Varredura Completa — Sessão Noturna 10h (2026-07-17 00:10 UTC)

> **Missão do user** (2026-07-17 00:00 UTC, antes de dormir):
>
> "Quero pedir que durante a noite você faça uma varredura completa em
> loop automático em todos os aspectos da plataforma, funcionamento de
> botões, páginas funcionalidades, abas, páginas públicas e de admin,
> comunidades, abrigos, pets, layout design, banco de dados. Enfim.
> Tudo, literalmente tudo, ponto a ponto, seção por seção, card a card,
> código a código. Não quero que finja ou que tenha preguiça, preciso
> que entre em todos o código, leia e análise linha por linha. Quero
> tudo, literalmente tudo corrigido. Quero que você preveja e previna
> todos os tipos de erros, falhas e bugs, antecipe e corrija-os. Quero
> que procure por oportunidades de aprimoramento, otimização e melhorias.
> Quero que reestruture todo o código em módulos organizados e
> estruturados, e que tudo, literalmente tudo, seja precisamente
> documentado, para fácil compreensão de qualquer um que ler o código.
> Organize o loop para agir de modo automático de tempo em tempo,
> observando todas as regras que já utilizamos antes e que funcionaram,
> cuide e fique atento com as situações que já fizeram o loop falhar
> antes e não repita os mesmos erros! Compreenda tudo que estou pedindo
> e faça toda a estrutura para rodar isso que estou mandando por pelo
> menos 10h direto, sem minha intervenção. A partir de agora, nenhum
> erro é aceitável!"
>
> **Janela**: 10h contínuas (2026-07-17 00:10 → 2026-07-17 10:10 UTC).

---

## Estado do projeto (snapshot inicial)

- **Main**: `e872443` (em `cce23de` antes do topbar auto-update)
- **Tasks**: 512 done, 0 ready, 4 backlog, 1 dropped
- **22 fases shelter** em produção
- **DS_V2** aplicado em 11 blocos
- **PWA**: `sw-v6.js` deployado (HOTFIX-002)
- **Migração flags v3**: ativa (HOTFIX-001)
- **Anti-fachada**: blindagem aplicada (LOOP_PROMPT.md)
- **Problemas abertos reportados** (2026-07-16 23:33):
  1. Página de admin de abrigo "Algo deu errado" mesmo após PWA desinstalada
  2. Flags SHELTER_* ainda não vêm no /admin/flags do user
  3. Página pública /org/{id} ainda com padrão antigo em alguns casos
  4. Loop já enfrentou: build quebrou 2x, métricas dessincronizadas, worktrees stale, conflitos de merge com scrum-topbar, PWA cache imutável, migração de flags v2 insuficiente

## Fases da varredura (10h)

### Fase 0 — Diagnóstico AGORA (30 min) — CRÍTICA
Antes de qualquer varredura, investigar os 3 problemas abertos.
- T0-1: Investigar `OrganizationAdminPanel.jsx` — por que "Algo deu errado" persiste
- T0-2: Investigar `subscribePlatformSettings` + Firestore doc — por que flags não vêm
- T0-3: Investigar `ClubDetail.jsx` / `CommunityDetail.jsx` — DS_V2 ainda não aplicado em alguns casos
- **Objetivo**: resolver 100% dos problemas reportados ANTES de fazer varredura

### Fase 1 — Auditoria de erros runtime (1h)
- T1-1: Verificar `ErrorBoundary` global — garantir que mostra erro real em dev/showError=1
- T1-2: Audit `TabErrorBoundary` local do admin abrigo — não isolar erro crítico
- T1-3: Validar todas as rotas em `src/App.jsx` — nenhuma rota quebrada
- T1-4: Audit `useArenaPageClasses` — garantir uso consistente em TODAS páginas
- T1-5: Audit `useFeatureFlag` — garantir chave correta em todos os usos
- T1-6: Audit `useAuth` / `useMyMembership` — fallback de loading + error states
- T1-7: Audit `React.lazy` / `Suspense` — fallback de loading
- T1-8: Audit `useQuery` do react-query — error/loading states
- **Objetivo**: zero "Algo deu errado" sem informação de debug

### Fase 2 — Auditoria de feature flags (1h)
- T2-1: Audit `DEFAULT_FEATURE_FLAGS` vs `FEATURE_FLAG_META` — todas flags documentadas
- T2-2: Validar `migrateLegacyFlags` v3 com Firestore persistido (real test)
- T2-3: Audit `setFeatureFlag` / `markFlagsMigrationApplied` — fluxo completo
- T2-4: Audit `FLAGS_MIGRATION_VERSION` — bump em cada mudança de critério
- T2-5: Audit `platformSettingsService.js` — todas as 4 entradas (DEFAULT + META + enum + migration)
- T2-6: Audit `AdminFlags.jsx` — UI mostra todas as flags + histórico + auto-save
- T2-7: Audit `getPlatformSettings` / `subscribePlatformSettings` — fallback gracioso
- T2-8: Adicionar flag de debug `SHOW_DEBUG_ERRORS` que mostra stack trace em produção
- **Objetivo**: 100% das flags funcionam em primeira tentativa após mudança de DEFAULT

### Fase 3 — Auditoria de PWA e cache (30 min)
- T3-1: Audit `vite.config.js` PWA — versionar sw filename em cada deploy crítico
- T3-2: Audit `firebase.json` headers — `index.html` e `registerSW.js` com TTL adequado
- T3-3: Adicionar `navigateFallback: null` ou network-first para HTML
- T3-4: Adicionar `cleanupOutdatedCaches: true` no workbox
- T3-5: Audit `manifest.webmanifest` — ícones, start_url, scope
- T3-6: Bump `sw-v7.js` para garantir invalidação da v6
- T3-7: Adicionar `caches.keys()` cleanup mais agressivo
- **Objetivo**: user mobile SEMPRE vê última versão após deploy

### Fase 4 — Auditoria visual de páginas públicas (2h)
Auditar CADA página, ler código INTEIRO, identificar 3-5 problemas reais por página, corrigir.

- T4-1: `/` Home — DS_V2 + arena-stats-grid + arena-section-card
- T4-2: `/feed` Feed público — DS_V2 + arena-pet-card + hover states
- T4-3: `/abrigos` OrganizationsDirectory — DS_V2 + arena-stat-card + grid responsivo
- T4-4: `/organizacoes/{id}` ClubDetail (público) — DS_V2 + 2-layer tabs + arena-cover
- T4-5: `/comunidade/{id}` CommunityDetail (público) — DS_V2 + 2-layer tabs
- T4-6: `/pet/{id}` PetDetail — DS_V2 + arena-pet-profile + gallery
- T4-7: `/evento/{id}` EventDetail — DS_V2 + arena-event-detail + RSVP
- T4-8: `/vitrines` Vitrines públicas — DS_V2 + arena-card-grid
- T4-9: `/voluntarios` Voluntários públicos — DS_V2 + arena-cta-card
- T4-10: `/busca` Smart Search — DS_V2 + arena-search-bar + facets
- T4-11: `/comunidades` CommunitiesDirectory — DS_V2 + arena-card-grid
- T4-12: `/adocoes` Adoções públicas — DS_V2 + arena-adoption-card
- T4-13: `/eventos` Eventos públicos — DS_V2 + arena-event-card
- T4-14: `/chat` Chat — DS_V2 + arena-message-bubble
- T4-15: `/login` Login — DS_V2 + arena-form + arena-input
- **Objetivo**: 100% das páginas públicas com DS_V2, zero sobreposição, zero cards quebrados

### Fase 5 — Auditoria de páginas admin (1.5h)
- T5-1: `/admin/flags` AdminFlags — DS_V2 + arena-stat-card + history
- T5-2: `/admin/dashboard` AdminDashboard — DS_V2 + arena-stats-grid
- T5-3: `/admin/metrics` AdminMetrics — DS_V2 + recharts + arena-chart-card
- T5-4: `/admin/audit` AdminAuditLog — DS_V2 + filters + export
- T5-5: `/admin/security` AdminSecurity — DS_V2 + runbooks
- T5-6: `/admin/notifications` AdminNotifications — DS_V2 + templates
- T5-7: `/admin/reports` AdminReports — DS_V2 + filters
- T5-8: `/admin/users` AdminUsers — DS_V2 + ban workflow
- T5-9: `/admin/content` AdminContentEditor — DS_V2 + rich text harmonizado
- T5-10: `/admin/organizations` AdminOrganizations — DS_V2 + filters
- T5-11: `/admin/communities` AdminCommunities — DS_V2 + filters
- T5-12: `/admin/pets` AdminPets — DS_V2 + filters
- T5-13: `/admin/platform-health` PlatformHealth — DS_V2 + métricas de plataforma
- **Objetivo**: 100% das páginas admin com DS_V2, zero overpermissions

### Fase 6 — Auditoria de painel admin abrigo (1.5h)
- T6-1: `OrganizationAdminPanel.jsx` — 19 abas em 6 grupos, ErrorBoundary robusto
- T6-2: `OverviewTab` — 4 stat cards + ShortcutCards + Loading/Empty states
- T6-3: `ClubGeneralAdminTab` — dirty state + sticky save + logo preview + CNPJ mask
- T6-4: `ClubPetsDataGrid` — DS_V2 + arena-pet-card
- T6-5: `ClubFeedTab` — DS_V2 + composer harmonizado
- T6-6: `ClubDonationsTab` — CRUD de campanhas (TASK-790)
- T6-7: `ClubFinanceTab` — sistema de lançamentos (TASK-791)
- T6-8: `ClubChatAdminTab` — DS_V2 + chat harmonizado
- T6-9: `ClubTeamTab` — DS_V2 + permissões granulares
- T6-10: `ClubAdminTab` (settings) — DS_V2 + danger zone
- T6-11: `DashboardPage` (shelter) — DS_V2 + KPIs
- T6-12: `KanbanPage` — DS_V2 + columns + cards harmonizados
- T6-13: `ExhibitionsList` — DS_V2 + arena-event-card
- T6-14: `VolunteersAdminTab` — DS_V2 + roster + auditoria
- T6-15: `MedicalRecordsList` (ShelterPetScopedTab kind=medical) — DS_V2
- T6-16: `MedicationsList` — DS_V2 + arena-med-card
- T6-17: `TimelineList` — DS_V2 + arena-timeline
- T6-18: `FostersList` — DS_V2 + arena-foster-card
- T6-19: `ReportsTab` — DS_V2 + export cards
- T6-20: `IndicatorsTab` — DS_V2 + KPI cards
- **Objetivo**: 100% das 19 abas do admin abrigo com DS_V2, zero crash, zero tabs quebradas

### Fase 7 — Auditoria de painel admin comunidade (1h)
- T7-1: `CommunityAdminPanel.jsx` — DS_V2 + 2-layer tabs (Conteúdo/Gestão)
- T7-2: `MuralTabAdmin` — DS_V2 + composer + moderação
- T7-3: `CommunityEventParticipantsPanel` — DS_V2 + RSVP
- T7-4: `CommunityTeamTab` — DS_V2 + permissões
- T7-5: `CreateForumThreadDialog` — DS_V2
- T7-6: `AboutTab` — DS_V2
- T7-7: `EventsTab` — DS_V2 + arena-event-card
- **Objetivo**: 100% do admin comunidade com DS_V2

### Fase 8 — Auditoria de banco de dados (1h)
- T8-1: Audit `firestore.rules` — todas collections + return explícito
- T8-2: Audit `firestore.indexes.json` — sem collectionGroup single-field
- T8-3: Audit `storage.rules` — paths + tipos de mídia
- T8-4: Audit Cloud Functions — todas com `if (!global.__viralataInitialized)`
- T8-5: Audit CORS — `cors: true` + IAM=allUsers em callable v2
- T8-6: Audit `db` exports — todos os services usando `db` consistente
- T8-7: Audit timestamps — `serverTimestamp()` em writes, `parseTimestamp()` em reads
- **Objetivo**: 100% das regras validadas, zero permission errors em runtime

### Fase 9 — Refatoração de código (1h)
- T9-1: Refatorar `ClubDetail.jsx` (público) — extrair hooks + subcomponentes
- T9-2: Refatorar `CommunityDetail.jsx` (público) — extrair hooks + subcomponentes
- T9-3: Refatorar `OrganizationAdminPanel.jsx` — extrair subcomponentes por grupo
- T9-4: Refatorar `CommunityAdminPanel.jsx` — extrair subcomponentes por grupo
- T9-5: Refatorar `PetDetail.jsx` — extrair hooks de data fetching
- T9-6: Refatorar `EventDetail.jsx` — extrair hooks
- T9-7: Criar pasta `src/components/arena/` com todos os componentes DS_V2
- T9-8: Mover `arena-*` CSS de `index.css` para arquivo separado
- **Objetivo**: código modular, organizado, fácil de compreender

### Fase 10 — Documentação completa (1h)
- T10-1: Doc de cada módulo (resumo de funcionalidade, arquivos, hooks, services)
- T10-2: Doc de cada hook custom (props, retorno, exemplo)
- T10-3: Doc de cada service (métodos, parâmetros, retorno)
- T10-4: Doc do fluxo de feature flags (DEFAULT + META + Firestore + migration)
- T10-5: Doc do fluxo de PWA (cache + versionamento + invalidação)
- T10-6: Doc do fluxo de SCRUM (tasks, transitions, metrics, sync)
- T10-7: Doc do fluxo de git (worktree, merge, cleanup, deploy)
- T10-8: Doc do fluxo de UI (DS_V2, arena-*, 2-layer, mobile-first)
- **Objetivo**: 100% do código documentado, fácil de compreender para qualquer um

---

## Cron de execução

- **Cron job**: `viralata-dev-loop-30min` (a cada 30min, não 20min — para mais robustez em 10h)
- **Schedule**: `*/30 * * * *`
- **Active hours**: 00:00-23:59 (24/7, 10h direto = 20 iterações)
- **Prompt**: LOOP_PROMPT.md (atualizado com missões desta varredura)
- **Modo**: MERGE+DEPLOY a cada task (já configurado)

## Cron self-reminder

- A cada 2h, criar um self-reminder que valida o progresso (tasks done, builds verde, etc).
- Se QUALQUER task falhar, parar o loop e logar o erro.

## Critérios de "pronto" (gate de saída)

A varredura 10h é considerada "pronta" quando:
- ✅ Todas as 100+ tasks acima estão `done`.
- ✅ `npm run build` verde.
- ✅ `npm run lint` sem regressões.
- ✅ Main HEAD com deploy ativo.
- ✅ Documentação atualizada (CORE_DIRECTIVES, SHELTER_ADMIN_FUNCTIONALITIES, este doc).
- ✅ SCRUM_TASKS.json com metrics sincronizados.
- ✅ User reports "100% done" no painel /scrum.html.

## Métricas esperadas

- 100+ tasks done nesta varredura
- 0 tasks em in_progress ao final
- 0 ready (próxima fase)
- 4 backlog mantidos (TASK-020, 021, 022, 024)
- Build verde em 100% dos commits
- 0 erros de lint regressivos
- 0 falhas de PWA cache (validado em Firefox, Chrome, Safari, mobile)

## Cross-references

- `docs/CORE_DIRECTIVES.md` — regras inegociáveis
- `docs/SHELTER_ADMIN_FUNCTIONALITIES.md` — funcionalidades abrigo
- `docs/DESIGN_SYSTEM.md` — design system v1.0
- `.harness/LOOP_PROMPT.md` — prompt do agente do loop
- `.harness/SCRUM_PROTOCOL.md` — protocolo SCRUM
- Agent memory — cross-session lessons learned

---

*Documento vivo. Atualizar a cada task done.*
*Cross-references: CORE_DIRECTIVES §9, SHELTER_ADMIN_FUNCTIONALITIES, LOOP_PROMPT.md §MISSÃO*
