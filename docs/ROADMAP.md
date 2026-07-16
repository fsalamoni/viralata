# Roadmap — Viralata

> Plano de organização do desenvolvimento por fases. **Leia primeiro
> `docs/STATE.md`** — o documento canônico de estado atual, atualizado em
> cada movimento, com índice dos demais docs e o plano de ataque.
> Ver `docs/DESIGN_SYSTEM.md` para a **especificação oficial v1.0 do
> design system**. **Fases 0, 1, 2 e 3 estão concluídas (com a paleta
> terracota antiga)**. A **Fase 4 — DS_V2 Reaplicação** é o trabalho
> atual: aplicar a spec v1.0 oficial nas áreas que ainda divergem,
> bloco a bloco, com feature flag individual.

## Roadmap paralelo: Sistema de Gestão do Abrigo

Em paralelo ao roadmap acima, está em andamento o **Sistema de Gestão do
Abrigo** — a grande evolução da plataforma pra transformá-la num hub
completo de gestão da causa animal. Ver
**[`docs/SHELTER_MGMT_ROADMAP.md`](./SHELTER_MGMT_ROADMAP.md)** para o
plano detalhado (22 fases, 5 macro-blocos, ~25-40 dias de trabalho).

Status atual (2026-07-12, pós-PR #69-73):

| Fase | Nome | Status | PR |
|---|---|---|---|
| 0 | Preparação (renomeação + skeleton) | ✅ Concluída | #37 |
| 1 | Cadastro Único do Animal | ✅ Concluída | #38, #39 |
| 2 | Timeline do Animal | ✅ Concluída | #40 |
| 3 | Workflow de Adoção | ✅ Concluída | #41 |
| 4 | Perfil Completo do Adotante | ✅ Concluída | #42 |
| 5 | Google Forms webhook (canal opt-in) | ✅ Concluída | #43, #44, #46, #47 |
| 6 | Pós-Adoção com CRON de materialização | ✅ Concluída | #48 |
| 7 | Lares Temporários (Fosters) | ✅ Concluída | #49 |
| 8 | Prontuário Médico (Health Records) | ✅ Concluída | #50 |
| 9 | Gestão de Medicamentos | ✅ Concluída | #51 |
| 10 | Galeria de Fotos (soft delete + purge 30d) | ✅ Concluída | #52 |
| 11 | Vitrines / Eventos | ✅ Concluída | #56 (workflow V1) |
| 12 | Escalas + RSVP de Vitrines | ✅ Concluída | (parte do #56) |
| 13 | Gestão de Voluntários | ✅ Concluída | #54 |
| 14 | Dashboard do Abrigo (tempo real) | ✅ Concluída | #61 |
| 15 | Central de Pendências (Kanban) ⚠️ GRANDE | ✅ Concluída | #63 |
| 16 | Relatórios de Abrigos | ✅ Concluída | merged main |
| 17 | Indicadores de Vitrines + Voluntários | ✅ Concluída | merged main |
| 18 | Smart Search (Firestore nativo) ⚠️ GRANDE | ✅ Concluída (decisão Firestore nativo 2026-07-11) | #68 |
| 19 | Termos e Políticas completos (Legal) ⚠️ GRANDE | ✅ Concluída | #58 + docs legais v2 (11 textos) mergeados em #73 |
| 20 | Segurança Avançada | ✅ Concluída | #62 + #69 (App Check + hCaptcha + audit) |
| 21 | Painel de Saúde da Plataforma (Admin Master) | ✅ Concluída | #60 + #71 (admin: ban, broadcast, metrics, retenção) |
| 22 | Migração Final + Cutover | ✅ Concluída | #66 |

**22/22 fases concluídas** ✅ — deploy em produção em viralata.app / viralata.web.app.

Convenções atualizadas: ✅ concluído · 🟡 em andamento · ⏸️ aguardando · ❌ bloqueado.
Cada fase = 1 feature flag (`SHELTER_*`) default OFF. Módulo isolado em
`src/modules/shelter/`. Princípios: schema evolutivo, dual-read/write
durante migração, defense in depth, audit log de tudo.

> ⚠️ **Atenção (2026-07-12)**: as 22 fases estão em `origin/main`, mas o
> **main local do PC** está 84 commits atrás. 3 worktrees ahead-of-main
> têm trabalho substantivo (voluntários + legal v2 + housekeeping) pronto
> para virar PR. Ver `docs/STATE.md` Seção 7.

## Pós-cutover (sprint 2026-W28, 11/07 → 18/07)

Após as 22 fases, o sprint atual foca em estabilização, LGPD compliance
e débitos técnicos. Tracks paralelos:

| Track | Tarefas principais | Owner |
|---|---|---|
| **LGPD compliance** | termo v2 voluntários (TASK-209), 3 revisões jurídicas (TASK-006/007/008), ativar SHELTER_LEGAL_TERMS_V1 (TASK-113), DPO (TASK-184), breach ANPD (TASK-037/187) | human-jurídico + human |
| **Decisões de produto** | SendGrid vs Resend (TASK-365), FCM push real (TASK-367), Foster = Voluntário? (TASK-362), Validação CPF (TASK-370), Calendar integration (TASK-371) | human |
| **Débitos técnicos** | 10+ components sem test (TASK-013), auditoria a11y (TASK-014/199), atualizar AGENTS.md Regra B (TASK-374) | viralata-coder |
| **Features pequenas** | Sentry + Crashlytics (TASK-239), volunteer entity no Smart Search (TASK-241), PDF certificado (TASK-248), Bridge Foster↔Voluntário (TASK-247) | viralata-coder |
| **Hygiene main local** | sincronizar 84 commits, remover 3 worktrees órfãos, limpar stash (TASK-045), unificar JSON local com origin | human (delicado) |

Detalhes completos, fila de execução e bloqueios em `docs/STATE.md` Seção 6 e 9.

Convenções: ✅ concluído · 🟡 em andamento · ⏸️ aguardando · ❌ bloqueado. Cada fase = 1 feature flag (`SHELTER_*`) default OFF. Módulo isolado em `src/modules/shelter/`. Princípios: schema evolutivo, dual-read/write durante migração, defense in depth, audit log de tudo.

## Contexto

A plataforma já tem paridade funcional com os dois documentos de
planejamento originais (arquitetura 100% Firebase, com Cloud Functions
pontuais onde há gatilho de servidor). O que falta agora não é
funcionalidade — é **consistência visual**: o app funciona bem, mas parece
"genérico" porque a maior parte das páginas ignora o sistema de design
tokens que já existe no projeto (ver diagnóstico completo em
`docs/DESIGN_SYSTEM.md`). Este roadmap organiza o trabalho de design e os
follow-ups funcionais conhecidos em fases sequenciais, para que qualquer
colaborador possa pegar um lote e executá-lo sem precisar rediscutir
decisões de design a cada página.

## O que já está entregue

Núcleo do negócio: Radar de Pets (Cloud Function), avaliações pós-adoção,
filtro de localização e raio (5/10/25/50/100 km) no Feed com distância
real via haversine para as ~70 cidades da tabela de
`pets/domain/geoDistance.js` (fora dela, cai para filtro de texto exato —
ver Fase 3).

Confiança e transparência: QR Code de doação + CNPJ na página da
organização, compartilhamento social do pet (imagem "story" com QR),
LGPD (consentimento no onboarding, exportar dados, excluir conta),
páginas institucionais (Termos, Legislação, Política de Privacidade
corrigida).

Administração e monetização: status "em processo" na adoção + notificação
aos demais interessados, multi-espécie (coelhos e pássaros), Super Admin
(banir usuário, excluir organização, dashboard de métricas com gráficos),
espaço de anúncios (`AdSlot`, placeholder controlado por feature flag).

**Módulo de Organizações (redesign completo)**: `/comunidade` é o
diretório/perfil público (o que antes vivia em `/organizacoes`, sem mudar
de comportamento); `/organizacoes` é o hub de gestão ("Minhas
organizações" / "Descobrir outras"), com painel de administração dedicado
em `/organizacoes/:id/admin` (abas Visão Geral, Animais, Mural, Doações,
Prestação de Contas, Equipe, Configurações, cada uma condicionada à
permissão do usuário — ver `domain/permissions.js`). Rotas e links de
notificações antigos continuam funcionando via redirect.
- **Permissões granulares**: proprietário (`clubs.created_by`) sempre com
  as 5 permissões (`animals`, `finance`, `donations`, `feed`, `team`),
  travado na UI; administradores herdam tudo por padrão e podem ser
  restringidos por permissão individual — substitui o antigo `edit_pets`
  único, com compatibilidade retroativa.
- **Planilha de animais em massa**: edição inline (já existia) + "baixar
  planilha modelo" (.xlsx) + "importar planilha" (.xlsx/.csv/.json) com
  deduplicação pelo ID do animal, contadores de novos/duplicados/erros,
  decisão por item (manter/substituir) e confirmação seletiva.
- **Chamados de doação**: campanhas com meta/arrecadado/prazo, registro
  manual de valores recebidos, marcação como concluída ao atingir 100%.
- **Prestação de contas**: lançamentos de receita/despesa por categoria,
  filtro de período (mensal/semestral/anual), totais e proporção por
  categoria em BRL.

## Fase 0 — Fundação de design (pré-requisito de tudo) ✅ concluída

Objetivo: provar a nova identidade visual em um recorte pequeno antes de
propagar para o resto do app.

1. Aplicar a paleta terracota/creme/oliva de `docs/DESIGN_SYSTEM.md` em
   `src/index.css` (mesmos nomes de variável, só novos valores).
2. Instalar `framer-motion`.
3. Redesenhar o shell (`src/components/Layout.jsx`): header glass sticky,
   nav com pill ativo, logo em gradiente.
4. Reescrever `src/pages/Home.jsx` como vitrine da nova identidade (hero
   assimétrico com foto real + blob orgânico, sem emoji gigante).
5. Estabelecer o padrão definitivo de `PetCard.jsx` (hover-lift, chip de
   vidro, sombra colorida) — vira a referência para os demais cards do app.

**Critério de pronto**: Home e o feed de pets (`PetFeed`) 100% no novo
padrão, revisados visualmente pelo usuário antes de propagar para as
demais ~28 páginas — evita retrabalho em massa se algo precisar mudar.

## Fase 1 — Propagação do design ✅ concluída (todos os lotes)

Aplicar o mesmo receituário (tokens + cards + motion sutil) no restante do
app, em lotes independentes entre si:

- **Lote A — Pets**: `PetDetail`, `CreatePet`, `MyPets`, `RadarSettings`. ✅
- **Lote B — Organizações**: `ClubsDirectory`, `ClubDetail`, `CreateClub`
  (já usam o sistema de tokens, só precisam de repaletagem — menor esforço
  que os demais lotes). ✅
- **Lote C — Perfil, Onboarding, Chat**: `Profile`, `OnboardingQuestionnaire`,
  `ChatPage`. ✅
- **Lote D — Institucional e Admin**: `Terms`, `Legislation`,
  `PrivacyPolicy`, todas as páginas `/admin/*`. ✅

Cada lote: `npm run build` + navegação manual das rotas do lote antes de
seguir para o próximo.

Novas páginas introduzidas depois desta fase (`OrganizationsHub`,
`OrganizationAdminPanel` e as abas `ClubTeamTab`/`ClubDonationsTab`/
`ClubFinanceTab`) já nasceram no padrão de tokens — não precisam de lote
próprio.

## Fase 2 — Limpeza e consistência ✅ concluída

1. ~~Remover o código órfão do produto anterior~~ — os arquivos listados
   originalmente aqui (`Landing.jsx`, `AdminTournaments.jsx`,
   `AthleteProfile.jsx`, `AthletesDirectory.jsx`) já não existiam mais no
   código (removidos em sessão anterior a esta). O que sobrava de fato
   órfão era `organizationService.js` + as coleções `organizations`/
   `organization_members`/`organization_reports` em `firestore.rules` (um
   segundo modelo de organização, nunca conectado a nenhuma rota/UI,
   substituído por `clubs`/`club_members`) — confirmado via grep e
   removido. Também corrigidas as últimas referências reais ao produto
   anterior fora de docs: cache do service worker (`public/sw.js`), baseURL
   padrão do Playwright e o teste e2e `tests/e2e/public-routes.spec.js`
   (testava título "Pickleball" e rotas que não existem mais).
2. `docs/MODULES.md`, `docs/ARCHITECTURE.md`, `docs/AI_CONTEXT.md` e
   `docs/README.md` reescritos para descrever a Viralata real (stack,
   módulos, rotas, modelo de dados atuais) em vez do produto de torneios.
3. Auditoria de sanidade (`grep` por cor hardcoded fora dos tokens):
   encontrou e corrigiu 4 páginas que nunca tinham passado por nenhum lote
   da Fase 1 — `Login.jsx`, `BannedNotice.jsx`, `PageNotFound.jsx` e a
   moldura de `CreateReport.jsx` (o documento imprimível/PDF em si
   permanece neutro de propósito — é para impressão, não é UI do app).
   Cores `emerald-*` em componentes de UI compartilhados (`badge.jsx`
   variant `success`, `AuditLogTable`, uploads/anexos, switch) foram
   deixadas como estão: é uma paleta "sucesso" semântica separada da marca,
   não um resíduo do produto anterior — mudar isso é uma decisão de design
   à parte, não uma limpeza.
4. **Bônus não previsto nesta fase**: a auditoria também encontrou o sino de
   notificações completamente quebrado (contador de não lidas sempre zero
   por um hook mal-desestruturado, tipos de notificação de organização
   gravando `undefined` por chaves inexistentes no enum, e nenhuma UI para
   de fato ler as notificações — só um link morto para `/perfil#notificacoes`).
   Corrigido: `NotificationsMenu.jsx` é o painel dropdown real do sino.

## Fase 3 — Follow-ups funcionais conhecidos

Itens já identificados como reduções de escopo ou limitações explícitas em
entregas anteriores. Os quatro que dependiam só de trabalho de produto já
foram resolvidos; o que resta depende de decisão externa (conta de ads,
política de rede do time) ou é uma limitação estrutural documentada:

- ~~Geocoding real para o filtro de raio do Feed~~ ✅ — `PetFeed` agora
  filtra por distância de verdade (fórmula de haversine) quando a cidade
  digitada está na tabela estática de coordenadas de
  `domain/geoDistance.js` (70 cidades: capitais + principais regiões
  metropolitanas). **Limitação que permanece**: cidade fora da tabela cai
  de volta para o filtro de texto exato (aviso explícito na tela, não
  finge precisão que não existe); cobertura completa de todos os
  municípios do Brasil exigiria uma API de geocoding paga ou uma base
  completa + geohash no Firestore.
- ~~Chamados de doação sem visibilidade pública~~ ✅ — campanhas ativas
  agora aparecem no perfil público da organização (`/comunidade/:id`),
  não só no painel de administração.
- ~~Bottom tab bar fixa no mobile~~ ✅ — adicionada em `Layout.jsx`,
  aditiva ao menu hambúrguer existente (que continua cobrindo os itens
  que não cabem nos 5 slots da barra).
- Integração real de rede de anúncios no `AdSlot` (hoje só o placeholder
  estrutural — depende de uma conta de ads real, fora do escopo executável
  sem essa informação).
- Dark mode completo com switch (os tokens `.dark` já existem em
  `index.css`, mas não são usados hoje — despriorizado nesta rodada).
- CMS de conteúdo institucional via Markdown, caso decidam trocar os
  componentes JSX estruturados atuais das páginas legais.
- **Parser assistido por LLM na importação de planilha de animais**: hoje
  a importação (`domain/petImport.js`) mapeia colunas por nome (com alias
  PT/EN) — cobre `.xlsx`/`.csv`/`.json` estruturados no formato do modelo,
  mas não tenta inferir colunas livres/fora do padrão.
- **`xlsx` (SheetJS) via npm está fixo em 0.18.5**, com CVEs conhecidos
  (prototype pollution `GHSA-4r6h-8v6p-xvw6`, ReDoS `GHSA-5pgg-2g8v-p4x9`)
  não corrigidos nessa versão publicada no registry — os patches só saem
  no CDN próprio do SheetJS. Mitigado hoje limitando o uso da lib a
  `.xlsx` (o único formato que exige parsing binário; `.csv`/`.json` usam
  parsers próprios sem dependência) e mantendo o parsing 100% client-side,
  sem tocar em dado de outro usuário. Revisar quando o SheetJS publicar
  uma versão corrigida no npm, ou migrar para instalação via tarball do
  CDN deles se a política de rede do time permitir.

## Como usar este roadmap

- Cada fase é sequencial; dentro da Fase 1, os lotes são independentes e
  podem ser distribuídos entre colaboradores diferentes.
- Verificação padrão por lote/fase: `npm test -- --run`, `npm run build`,
  checagem visual manual das rotas tocadas; se alguma mudança tocar
  `firestore.rules` (não previsto nas Fases 0–2, que são puramente
  visuais), validar no emulador local antes de commitar — mesmo método já
  usado nas entregas anteriores.
- Commits pequenos e coerentes por lote, com mensagem descritiva, seguindo
  o padrão já usado no histórico do repositório.

---

## Fase 4 — DS_V2: Reaplicação do Design System oficial v1.0

**Status:** 🟡 em andamento (Bloco A em execução, 2026-07-16).

### Contexto

O **design system oficial v1.0** foi finalizado e está documentado em
`docs/DESIGN_SYSTEM.md` (especificação canônica) e em
`docs/design-system-v2/` (snapshot portátil em vários formatos). Ele
redefine a paleta terracota/creme/oliva/mostarda, a biblioteca de
componentes, padrões de cards, formulários, modais, tabelas, navegação,
ícones, motion e tom de voz.

A Fase 1 deste roadmap (Fases 0/1/2 da timeline original) aplicou a
paleta terracota, mas:
- (a) partes da UI ainda ignoram os tokens (`bg-orange-500` cru, header
  branco chapado, emoji como imagem);
- (b) a biblioteca de componentes não foi revisitada de forma sistemática
  (cada página pode estar usando uma variação diferente de Card, Button,
  Modal, etc.);
- (c) ícones são `lucide-react` em 204 arquivos — a spec v1.0 referencia
  Material Symbols Outlined, mas a migração não é custo-efetiva. **Decisão:
  coexistência pragmática** — lucide continua, Material Symbols entra
  para novos componentes / áreas reescritas / ícones de marca;
- (d) `framer-motion` não está instalado — a Fase 4 inclui a instalação
  e aplicação parcimoniosa (só em hero, grids, modais, dropdowns);
- (e) auditoria final de contraste WCAG AA, foco visível, hierarquia
  semântica ainda não foi rodada de forma sistemática.

### Estrutura de blocos

A Fase 4 é dividida em **6 macroblocos**, cada um isolado por uma
**feature flag própria default OFF** (mesma convenção das 22 fases
`SHELTER_*`):

| Flag | Bloco | Escopo | Status |
|---|---|---|---|
| `DS_V2_DOCS` | A. Doc oficial | Reescrever `docs/DESIGN_SYSTEM.md` com spec v1.0 + sincronizar `ROADMAP.md`, `AI_CONTEXT.md`, `MODULES.md` + material de referência em `docs/design-system-v2/` | 🟡 em execução |
| `DS_V2_TOKENS` | B. Tokens + Iconografia | `src/index.css` (já OK), tailwind config, integrar Material Symbols Outlined como subset (coexistência com lucide) | ⏸ aguardando A |
| `DS_V2_COMPONENTS` | C. Biblioteca | Refatorar `Button`, `Card`, `Input`, `Modal`, `Table`, `Avatar`, `Badge`, `Chip`, `Dialog`, `DropdownMenu` contra spec v1.0 — vira a fonte canônica para D | ⏸ aguardando B |
| `DS_V2_PAGES-HOME` | D.1 Home | Reescrever `src/pages/Home.jsx` do zero contra spec (vitrine, valida a linha estética antes de propagar) | ⏸ aguardando C |
| `DS_V2_PAGES-PETS` | D.2 Pets | `PetFeed`, `PetCard`, `PetDetail`, `CreatePet`, `MyPets`, `RadarSettings` | ⏸ aguardando D.1 |
| `DS_V2_PAGES-ADOPTION` | D.3 Adoção | `AdoptionDetail`, `AdoptionWizard`, fluxo de interesse, avaliação | ⏸ aguardando D.2 |
| `DS_V2_PAGES-ORG` | D.4 Organizações | `ClubsDirectory`, `ClubDetail`, `CreateClub`, `EventDetail`, `OrganizationsHub`, `OrganizationAdminPanel` + sub-abas | ⏸ aguardando D.3 |
| `DS_V2_PAGES-ADMIN` | D.5 Admin + Dashboard | `AdminDashboard`, `AdminPets`, `AdminReports`, `AdminUsers`, `AdminOrganizations`, `AdminCommunities`, `AdminMetrics`, `AdminContentEditor` | ⏸ aguardando D.4 |
| `DS_V2_PAGES-CHAT` | D.6 Chat + Perfil | `ChatPage`, `Profile`, `Login`, `OnboardingQuestionnaire`, institucionais (`Terms`, `Legislation`, `PrivacyPolicy`) | ⏸ aguardando D.5 |
| `DS_V2_MOTION` | E. Movimento | Instalar `framer-motion`, hook `useReducedMotion`, fade+slide `whileInView` (uma vez), stagger 70-90ms (max 6-8 itens), hover-lift (scale 1.01-1.02 + sombra), transições de rota 150ms | ⏸ aguardando D.6 |
| `DS_V2_AUDIT` | F. Auditoria final | `grep` por tokens antigos, contraste WCAG AA (4.5:1 texto / 3:1 grande), foco visível, hierarquia semântica, performance, bundle size, lighthouse | ⏸ aguardando E |

### Workflow por bloco

Cada bloco segue o mesmo ritual:

1. **Worktree isolado** — branch `feat/ds-v2-{bloco}-2026-07-XX`, com
   `git worktree add`.
2. **Tasks SCRUM granulares** — 1 task por unidade coesa (≤30min cada),
   `scrum.cjs start → review → done` em ordem.
3. **Status do SCRUM** atualizado a cada 3 tasks ou ~10min (ver
   `.harness/LOOP_PROMPT.md`).
4. **`npm run build` antes de qualquer push** — se quebrar, reverter
   imediatamente com `git reset --hard HEAD`. Nunca `git push --force`
   cego.
5. **PR por bloco** com screenshots, descrição do que mudou e feature
   flag explícita.
6. **User valida visualmente** e ativa a flag no `platform_settings/global`.
7. **Limpeza automática** no fim: deletar branch após merge, deletar
   worktree órfão, fechar PRs antigos.

### Garantias

- **Nada de regra de negócio** — só camada visual/estrutural.
- **Flag OFF por default** — usuário só vê após ativar.
- **Past learnings aplicadas**:
  - Sem cron atrapalhando merges em massa
  - Sem `-X theirs` cego em código
  - `npm ci` antes de push (validar `package-lock.json`)
  - Pattern de init Firebase em CFs:
    `if (!global.__viralataInitialized) initializeApp(); global.__viralataInitialized = true;`
  - Pattern de wrapper `.js` para `.cjs` em Cloud Functions
  - Firestore rules: sem `[^/]`, sem `r'...'`, preferir `isString() && size() <= N`
- **Sem retrabalho**: tasks pequenas (≤30min), worktree por bloco, merge
  sequencial e validado.
