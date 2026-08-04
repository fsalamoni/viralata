# PLAN-PERSONAS-V4 — Separação da Plataforma em 6 Acessos Dedicados

> **Status**: GUIA DE ESTRUTURAÇÃO E PLANEJAMENTO (NÃO EXECUTAR)
> **Versão**: v1.1 — DEFINIÇÕES APROVADAS (2026-08-03)
> **Data**: 2026-08-03
> **Autor**: Mavis
> **Solicitante**: Flávio Salomone (`fsalamoni@gmail.com`)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Documento-guia para o Claude** — contém mapeamento completo,
> análise de viabilidade, decisões de design e roadmap para
> implementação da V4 da plataforma (multi-acesso).
>
> **Mudança estrutural**: A plataforma deixa de ter uma única
> "experiência genérica" e passa a ter **6 acessos dedicados**,
> com permissões, layouts, e funcionalidades específicos para
> cada persona.
>
> **Última atualização**: 2026-08-03 (respostas do owner
> incorporadas em §11 e §15).

---

## §0. Sumário Executivo

A plataforma Viralata atende hoje **múltiplas personas em um único
ambiente**, o que gera confusão para o usuário (e para o
desenvolvedor). Esta V4 separa a plataforma em **6 acessos
distintos**, cada um com escopo bem definido:

| # | Persona | Nome da persona (UX) | Acesso | Quem usa |
|---|---|---|---|---|
| 1 | **Adotante** | "Adotar / Ajudar" | `adopter` | Qualquer pessoa interessada em adotar ou na causa animal |
| 2 | **Doador Individual** | "Doar um pet" | `donor` | Tutores que têm um pet para doação |
| 3 | **Membro de Abrigo** | "Meu abrigo" | `shelter_staff` | Equipe de um abrigo (ONG/loja) |
| 4 | **Membro de Comunidade** | "Minha comunidade" | `community_staff` | Equipe de uma comunidade |
| 5 | **Voluntário** | "Voluntariar" | `volunteer` | Cadastrados no programa de voluntariado |
| 6 | **Admin Master** | (oculto) | `platform_admin` | Apenas o owner + atribuídos |

**O usuário pode ter múltiplos acessos** (ex.: um tutor pode ser
adotante + doador + voluntário). Há um **botão switch** que
permite trocar de acesso a qualquer momento. O **admin master**
é o único oculto, visível só para atribuídos.

**Cada acesso tem seu próprio conjunto de dados de perfil**,
**onboarding inicial** e **layout/navegação dedicada**.

---

## §1. Mapa de Conhecimentos (Documentos de Referência)

Esta seção lista TODOS os documentos que o Claude deve consultar
para compreender a estrutura atual antes de propor qualquer
mudança na V4.

### §1.1. Documentos de Arquitetura e Panorama

| Doc | Conteúdo | Quando consultar |
|---|---|---|
| `docs/AI_CONTEXT.md` | Documento-mestre denso. ~1 leitura = entender tudo | **SEMPRE PRIMEIRO** |
| `docs/AI_GUIDE/00-START-HERE.md` | Meta-guia + índice | **SEMPRE** |
| `docs/AI_GUIDE/01-ARCHITECTURE.md` | Stack, camadas, módulos | Antes de mexer em arquitetura |
| `docs/AI_GUIDE/02-DATA-MODEL.md` | Coleções Firestore | Antes de mexer em dados |
| `docs/AI_GUIDE/03-MODULES.md` | O que cada módulo faz | Antes de mexer em módulo |
| `docs/AI_GUIDE/04-PAGES-ROUTES.md` | Rotas e páginas | Antes de mexer em rotas |
| `docs/MODULES.md` | Mesma coisa que 03, panorama | Antes de mexer em módulo |
| `docs/DATA_MODEL.md` | Coleções Firestore detalhado | Antes de mexer em dados |
| `docs/AI_GUIDE/05-DESIGN-SYSTEM.md` | DS v1.0 oficial | Antes de mexer em design |
| `docs/DESIGN_SYSTEM.md` | DS v1.0 com detalhes visuais | Antes de mexer em design |
| `docs/AI_GUIDE/06-PWA-CACHE.md` | Service Worker, PWA | Antes de mexer em PWA |
| `docs/AI_GUIDE/07-FIRESTORE-RULES.md` | Regras Firestore | Antes de mexer em rules |
| `docs/AI_GUIDE/08-TESTING.md` | Padrões de teste | Antes de mexer em testes |

### §1.2. Documentos de Regra Inviolável

| Doc | Conteúdo | Quando consultar |
|---|---|---|
| `docs/AI_GUIDE/11-CORE-DIRECTIVES.md` | 23 regras inegociáveis (§1-§23) | **SEMPRE antes de qualquer código** |
| `docs/AI_GUIDE/13-DECISIONS.md` | Decisões D-* (50+ decisões) | Antes de reverter/modificar D-* |
| `docs/AI_GUIDE/12-CODING-STANDARDS.md` | Padrões de código | Antes de escrever código |
| `docs/AI_GUIDE/15-RECENT-FIXES.md` | Últimas 30 dias de fixes | Antes de debugar bug recente |
| `docs/AI_GUIDE/14-TROUBLESHOOTING.md` | Troubleshooting por categoria | Quando algo quebra |
| `docs/AI_GUIDE/19-FAQ-AND-MISTAKES.md` | FAQ + armadilhas | Quando em dúvida sobre padrão |

### §1.3. Documentos de Regência por Página V3

Cada página V3 tem seu documento. Para a V4, vários desses
documentos precisarão ser **reescritos** (a persona implica um
escopo diferente).

| Página | Doc Regência | Persona V4 |
|---|---|---|
| Home | `docs/REGENCY_HOME_V3.md` | 1 (Adotante) |
| Login | `docs/REGENCY_LOGIN_V3.md` | Todos (gate único) |
| Perfil | `docs/REGENCY_PROFILE_V3.md` | Todos (perfil global) |
| Voluntários landing | `docs/REGENCY_VOLUNTEER_V3.md` | 5 (Voluntário) |
| Voluntário signup | `docs/REGENCY_VOLUNTEER_V3.md` | 5 (Voluntário) |
| Voluntário perfil | `docs/REGENCY_VOLUNTEER_V3.md` | 5 (Voluntário) |
| Org Admin | `docs/REGENCY_ORG_ADMIN_V3.md` | 3 (Membro de Abrigo) |
| Shelter Admin | `docs/REGENCY_SHELTER_ADMIN_V3.md` | 3 (Membro de Abrigo) |
| Club Detail | `docs/REGENCY_CLUB_DETAIL_V3.md` | 1 (Adotante) — vista pública |
| Community Admin | `docs/REGENCY_COMMUNITY_ADMIN_V3.md` | 4 (Membro de Comunidade) |
| Community Detail | `docs/REGENCY_COMMUNITY_DETAIL_V3.md` | 1 (Adotante) — vista pública |
| Mural | `docs/REGENCY_MURAL_V3.md` | 1 (Adotante) — leitura; 3/4 — gestão |
| Pet Ops | `docs/REGENCY_PET_OPS_V3.md` | 2 (Doador) + 3 (Membro de Abrigo) |
| Pet Detail | `docs/REGENCY_PET_DETAIL_V3.md` | 1 (Adotante) — vista pública |
| Pet Detail View | `docs/REGENCY_PET_DETAIL_VIEW_V3.md` | 1 (Adotante) — vista pública |
| Foster | `docs/REGENCY_FOSTER_V3.md` | 1 (Adotante) — vista pública |
| Adoption | `docs/REGENCY_ADOPTION_V3.md` | 1 (Adotante) |
| Events | `docs/REGENCY_EVENTS_V3.md` | Todos (varia por contexto) |
| Search | `docs/REGENCY_SEARCH_V3.md` | 1 (Adotante) |
| Feed | `docs/REGENCY_FEED_V3.md` | 1 (Adotante) |
| Chat | `docs/REGENCY_CHAT_V3.md` | Todos (1:1 e grupo) |
| Legal | `docs/REGENCY_LEGAL_V3.md` | Todos (página institucional) |
| Admin | (não tem V3, é V1) | 6 (Admin Master) |

### §1.4. Documentos de Decisão

| Doc | Conteúdo |
|---|---|
| `docs/AI_GUIDE/13-DECISIONS.md` | 50+ decisões D-* (canônico) |
| `docs/PLAN_V3_REDESIGN.md` | Plano original do V3 (referência histórica) |
| `docs/AUDITS/AUDIT_2026-07-11.md` | Auditoria completa (estado pré-V3) |
| `docs/FULL_AUDIT_2026-07-17.md` | Auditoria completa (107 tasks) |
| `docs/SHELTER_MGMT_ROADMAP.md` | Roadmap do Sistema de Gestão do Abrigo |

### §1.5. Código-fonte Relevante

```
src/
├── App.jsx                                       # Roteamento (639 linhas)
├── core/
│   ├── lib/FirebaseAuthContext.jsx               # Auth (user, perfil, isPlatformAdmin)
│   ├── featureFlags.js                           # Catálogo de flags
│   └── lib/FeatureFlagsContext.jsx               # Provider de flags
├── components/
│   ├── Layout.jsx                                # Shell (TopBar + BottomTabBar + Outlet)
│   ├── BottomTabBar.jsx                          # Navegação inferior mobile
│   └── TopBar.jsx                                # (verificar se existe)
├── pages/
│   ├── Home.jsx                                  # Landing pública
│   ├── Login.jsx
│   ├── Profile.jsx                               # Wrapper V1/V3
│   ├── VolunteerProgram.v3.jsx                   # Landing /voluntarios
│   ├── VolunteerSignup.jsx                       # Signup 5 steps
│   ├── VolunteerProfile.jsx                      # /perfil/voluntario
│   ├── PetFeed.jsx                               # /feed
│   ├── CreatePet.jsx                             # /pets/new
│   ├── MyPets.jsx                                # /meus-pets
│   ├── MyInterests.jsx                           # /meus-interesses
│   ├── AdoptionWizard.jsx                        # /quero-adotar/:petId
│   ├── AdoptionDetail.jsx                        # /adocoes/:clubId/:applicationId
│   └── PostAdoptionDashboard.jsx                 # /adoptions
├── modules/
│   ├── pets/
│   │   ├── hooks/usePetPermissions.js            # Defense-in-depth de permissões
│   │   └── ...                                   # CRUD + matching + radar
│   ├── organizations/
│   │   ├── domain/permissions.js                 # isClubOwner, hasClubPermission
│   │   ├── domain/constants.js                   # CLUB_PERMISSION, CLUB_ROLE
│   │   └── pages/OrganizationAdminPanel.v3.jsx   # Painel admin
│   ├── communities/
│   │   ├── domain/permissions.js                 # isCommunityOwner, hasCommunityPermission
│   │   ├── domain/constants.js                   # COMMUNITY_PERMISSION, COMMUNITY_ROLE
│   │   └── pages/CommunityAdminPanel.jsx
│   ├── shelter/
│   │   ├── hooks/useVolunteerProfile.js          # Volunteer profile + roster
│   │   └── components/VolunteerProfileForm.jsx
│   ├── onboarding/
│   │   ├── pages/OnboardingQuestionnaire.jsx     # Questionário de perfil
│   │   └── domain/profileCompletion.js           # isAdopterProfileComplete
│   ├── admin/
│   │   └── pages/*                               # Painel do platform_admin
│   └── ...                                       # chat, notifications, reports
├── firestore.rules                               # Regras (~3000+ linhas)
└── firestore.indexes.json                        # 68 índices
```

---

## §2. Análise da Estrutura Atual (Single-Experience)

### §2.1. Persona detection atual (implícita)

Hoje, o sistema **NÃO tem** uma noção de "persona" ou "acesso".
A única forma de saber quem é o usuário é por:

1. **`users/{uid}.role`** — `platform_admin | user` (2 valores)
2. **`club_members/{clubId_uid}`** — para identificar membros de abrigo
3. **`community_members/{communityId_uid}`** — para identificar membros de comunidade
4. **`volunteer_profile/main`** (em `users/{uid}/volunteer_profile/`) — para identificar voluntários
5. **`pets/{id}.owner_id` + `owner_type`** — para identificar doadores de pets

A UI mistura tudo num único ambiente:

- O **adotante** vê `/feed`, `/pets/:id`, `/organizacoes`, `/comunidade`, etc.
- O **doador individual** (que cadastrou um pet) vê `/meus-pets`,
  pode gerenciar seus pets, vê `/pets/:id/edit` com botões de ação.
- O **membro de abrigo** pode acessar `/organizacoes/:id/admin`
  com permissões granulares.
- O **membro de comunidade** pode acessar `/comunidade/:id/admin`.
- O **voluntário** tem `/perfil/voluntario`.
- O **platform_admin** tem `/admin/*` (oculto, `isPlatformAdmin`).

### §2.2. Problemas Identificados

1. **Confusão de identidade**: o usuário não sabe se está "como
   pessoa" ou "como membro de abrigo". Ao mesmo tempo, vê
   `/meus-pets` (seus pets pessoais) E `/organizacoes/:id/admin`
   (pets do abrigo). Onde ele está? Em qual contexto?

2. **Onboarding monolítico**: hoje o `OnboardingQuestionnaire`
   (em `src/modules/onboarding/pages/OnboardingQuestionnaire.jsx`)
   pergunta coisas que **só fazem sentido para adotantes**:
   moradia, rotina de passeios, filhos, outros pets em casa,
   orçamento. Pergunta isso a um **doador** ou **membro de
   abrigo** que não vai adotar?

3. **BottomTabBar genérica**: o `BottomTabBar.jsx` mostra
   `Feed, ONGs, Comunidade, +, Chat, Perfil` para TODOS os
   usuários autenticados, independente da persona. Um **membro
   de abrigo** que está operando o abrigo não precisa de
   `Feed`; precisa de `Painel`.

4. **Permissões espalhadas**: as permissões estão em 4 lugares
   diferentes (clubes, comunidades, voluntário, platform_admin).
   Cada módulo tem seu próprio sistema. Não há visão unificada
   de "o que esse usuário pode fazer".

5. **Onboarding de abrigo fora do fluxo**: a rota
   `/abrigo/:clubId/onboarding` (em `src/App.jsx`) existe para
   configurar um abrigo recém-criado, mas está solta — não está
   integrada ao fluxo "primeiro acesso como abrigo".

6. **Perfil global é único**: `users/{uid}` tem um único
   conjunto de campos (`housing_type`, `has_yard`, etc.) que
   é específico do adotante. Não há campos para doador,
   membro de abrigo, voluntário, etc.

7. **Sem "modo" explícito**: o app não sabe se o usuário está
   navegando "como adotante", "como doador", "como membro de
   abrigo", etc. Isso é um problema de UX e de auditoria.

### §2.3. O que a V4 vai resolver

1. **Identidade explícita por acesso**: o usuário escolhe
   conscientemente em qual "modo" quer operar.
2. **Onboarding por persona**: cada persona tem seu questionário
   de primeiro acesso.
3. **BottomTabBar contextual**: muda por persona.
4. **Permissões unificadas por acesso**: cada acesso tem um
   conjunto de permissões claro.
5. **Onboarding de abrigo/comunidade integrado**: ao escolher
   "membro de abrigo" e não ter abrigo, o fluxo de
   "código de convite OU criar novo" é o onboarding.
6. **Perfis por persona**: cada persona tem seus dados
   específicos persistidos em subcoleções.
7. **Switch entre acessos**: o usuário pode ter múltiplos
   acessos e alterna entre eles via um botão switch.

---

## §3. As 6 Personas (Definição Detalhada)

### §3.1. Persona 1 — Adotante (`adopter`)

> **Nome UX sugerido**: "Adotar / Ajudar"
> **Tagline**: "Encontre seu novo melhor amigo ou apoie a causa animal"

#### Quem é
Pessoa interessada em adotar um pet ou simplesmente navegar pela
plataforma para ajudar (curtir posts, comentar, denunciar maus-tratos,
apoiar campanhas de doação, participar de comunidades). É o usuário
**mais comum** e o **primeiro** que se cadastra.

#### Funcionalidades
- ✅ Ver feed de pets disponíveis para adoção (`/feed`)
- ✅ Ver detalhes públicos de um pet (`/pet/:petId`)
- ✅ Demonstrar interesse de adoção (`/quero-adotar/:petId`)
- ✅ Acompanhar pedidos de adoção (`/meus-interesses`,
  `/adocoes/:clubId/:applicationId`)
- ✅ Dashboard pós-adoção (`/adoptions`)
- ✅ Chat 1:1 com doadores de pets e abrigos (`/chat`)
- ✅ Ver diretório de ONGs (`/organizacoes`)
- ✅ Ver perfil público de uma ONG (`/organizacoes/:id`)
- ✅ Ver diretório de comunidades (`/comunidade`)
- ✅ Ver perfil público de comunidade (`/comunidade/:id`)
- ✅ Apoiar campanhas de doação (PIX, comprovante)
- ✅ Ver mural público de ONGs/comunidades (read-only)
- ✅ Ver fórum público de ONGs/comunidades (read-only)
- ✅ Denunciar maus-tratos (`/denuncias/nova`)
- ✅ Ver eventos públicos
- ✅ Ver vitrines públicas (`/vitrines`)
- ✅ Ver lares temporários públicos (`/lares-temporarios`)
- ✅ Ativar Radar de Pets (`/radar`)
- ✅ Avaliar pós-adoção
- ✅ Configurar preferências (`/preferencias`)

#### Funcionalidades NÃO disponíveis
- ❌ Criar pets para doação (pertence ao Doador)
- ❌ Painel admin de abrigo
- ❌ Painel admin de comunidade
- ❌ Painel admin de voluntário (apenas a página de perfil)
- ❌ Painel de platform_admin

#### Onboarding (primeiro acesso)
1. Login com Google (`/login`)
2. **Questionário de adotante** (substitui/atualiza o atual
   `OnboardingQuestionnaire`):
   - Nome completo, telefone
   - Cidade, estado
   - **Moradia**: tipo, tem quintal
   - **Rotina**: passeios, presença em casa
   - **Família**: filhos, idades, idosos
   - **Outros pets**: espécie, quantidade
   - **Orçamento mensal para pet**
   - **LGPD consent** (termos, privacidade, código de conduta)
3. **Liberação**: acesso ao feed com pets compatíveis

#### Onde os dados ficam
- `users/{uid}` — perfil global (campos adotante):
  `full_name`, `phone`, `city`, `state`, `housing_type`, `has_yard`,
  `daily_walks`, `has_children`, `children_ages`, `has_elderly`,
  `other_pets`, `budget_level`, `lgpd_consent_at`, `profile_completed`
- `users/{uid}/adopter_profile/main` (NOVO) — perfil específico do
  adotante (campos extras que não vão pro `users` global):
  preferências de espécie, raio de busca, etc.
- `adoption_interests/{petId_userId}` — interesses
- `adoption_ratings/{petId_raterUid}` — avaliações
- `pet_radars/{uid}` — radar

#### Layout
- **BottomTabBar**: `Feed, ONGs, Comunidade, +, Chat, Perfil`
  (atual, sem mudanças)
- **TopBar**: Logo + Busca + Notificações + Avatar
- **Home (`/`)**: Landing institucional com CTAs de adoção

---

### §3.2. Persona 2 — Doador Individual (`donor`)

> **Nome UX sugerido**: "Doar um pet"
> **Tagline**: "Encontre um lar amoroso para o pet que você cuida"

#### Quem é
Tutor que tem um pet disponível para adoção. Pode ser uma pessoa
física com 1 ou mais pets, ou alguém que resgata animais
independentemente. **Não** quer administrar um abrigo; só quer
**colocar pets para adoção** e gerenciar os candidatos.

#### Funcionalidades
- ✅ **Criar pet para adoção** (`/pets/new`)
- ✅ **Meus pets** (`/meus-pets`)
- ✅ **Editar pet** (`/pets/:id/edit`)
- ✅ **Ver candidatos/interessados** nos seus pets (read de
  `InterestPanel` em `PetDetail`)
- ✅ **Aprovar/rejeitar candidatos**
- ✅ **Marcar pet como adotado** (com avaliação)
- ✅ **Ver detalhes públicos do próprio pet** (`/pet/:id`)
- ✅ **Compartilhar pet** (story card, QR)
- ✅ **Chat 1:1** com interessados (já incluso como adotante)
- ✅ Tudo que a persona **Adotante** tem (exceto radar, que não
  faz sentido quando você é doador)

#### Funcionalidades NÃO disponíveis
- ❌ Painel admin de abrigo
- ❌ Painel admin de comunidade
- ❌ Voluntariado (acesso separado)
- ❌ Painel de platform_admin
- ❌ Radar de pets (você é quem doa, não quem procura)
- ❌ Demonstrar interesse em outros pets (você é o doador)

#### Onboarding (primeiro acesso)
1. Login com Google
2. **Questionário de doador** (NOVO):
   - Dados básicos (nome, telefone, cidade, estado)
   - **Sobre você como doador**: motivo da doação, experiência
     prévia com pets
   - **Sobre seus pets atuais**: quantos, espécie, condições
   - LGPD consent
3. **Direcionamento para `/pets/new`** (cadastrar o primeiro pet)
4. Após cadastrar: libera dashboard de pets (`/meus-pets`)

#### Onde os dados ficam
- `users/{uid}` — perfil global (campos doador):
  `full_name`, `phone`, `city`, `state`, `donor_since`,
  `donor_motivation`, `has_donated_before`, `lgpd_consent_at`
- `users/{uid}/donor_profile/main` (NOVO) — perfil específico:
  pets_count, total_donated, etc.
- `pets/{id}` (com `owner_type: 'user'`, `owner_id: uid`) — os
  pets do doador

#### Layout
- **BottomTabBar** (específico doador): `Meus pets, +Pet, Candidatos, Chat, Perfil`
- **TopBar**: Logo + "Meus pets" + Notificações + Avatar
- **Home**: Dashboard de pets (cards com status, candidatos pendentes)

#### Caso especial
Se o doador **também** quer adotar (ex.: mudou de cidade e tem
que doar o pet antigo antes de adotar outro), ele pode ter o
acesso `adopter` também. O switch entre acessos resolve isso.

---

### §3.3. Persona 3 — Membro de Abrigo (`shelter_staff`)

> **Nome UX sugerido**: "Meu abrigo"
> **Tagline**: "Gerencie seu abrigo, equipe, pets, finanças e mais"

#### Quem é
Membro de uma ONG ou loja parceira. Pode ser:
- **Proprietário** (`club.created_by === user.uid`) — tem todas as
  permissões, é implícito
- **Admin** (`membership.role === 'admin'`) — tem todas as
  permissões por padrão (compatibilidade com versões antigas)
- **Membro com permissões granulares** (`membership.permissions`)
  — tem só as permissões atribuídas pelo admin

#### Fluxo de entrada
1. Login com Google
2. **Tela de seleção de abrigo** (se o user é membro de mais
   de 1 abrigo): "Selecione o abrigo que deseja gerenciar"
3. Se for membro de apenas 1: entra direto no painel
4. Se não for membro de nenhum: **fluxo de primeiro acesso**:
   - Opção A: "Inserir código de convite" (vínculo a abrigo
     existente)
   - Opção B: "Criar novo abrigo" (fluxo de `CreateOrganization`
     + `ShelterOnboardingWizard`)

#### Funcionalidades (dependem das permissões do membro)

**Gestão de Animais** (`/organizacoes/:id/admin?tab=pets`):
- ✅ Planilha inline de pets (`ClubPetsDataGrid`)
- ✅ Importar/exportar pets em massa (.xlsx/.csv/.json)
- ✅ Cadastrar pet (reusa `/pets/new` com `owner_type=organization`)
- ✅ Editar/excluir pet
- ✅ Tabelas operacionais agregadas (medicações, consultas,
  tratamentos, vacinas, cuidados, devoluções, histórico de
  adotantes) — `PetOpsTab` + sub-abas
- ✅ Aprovar/rejeitar candidatos à adoção

**Mural e Fórum** (`?tab=feed`):
- ✅ Criar/editar/excluir posts do mural
- ✅ Criar tópicos de fórum
- ✅ Aprovar/rejeitar comentários (se permissão)

**Doações** (`?tab=donations`):
- ✅ Criar/editar campanhas de doação
- ✅ Ver comprovantes
- ✅ Configurar meta/prazo
- ✅ Aprovar/rejeitar doações

**Prestação de Contas** (`?tab=finance`):
- ✅ Lançamentos de receita/despesa
- ✅ Categorias de receita/despesa
- ✅ Relatórios por período

**Equipe** (`?tab=team`):
- ✅ Convidar membros
- ✅ Aprovar pedidos de ingresso
- ✅ Atribuir permissões granulares
- ✅ Remover membros comuns

**Configurações** (`?tab=settings`):
- ✅ Editar identidade do abrigo
- ✅ Configurar código de convite
- ✅ Excluir abrigo (apenas proprietário)

**Voluntários** (`?tab=volunteers`, se permissão):
- ✅ Ver roster
- ✅ Aprovar/rejeitar background check
- ✅ Pausar/retomar/bloquear
- ✅ Importar/exportar CSV

#### Onboarding (primeiro acesso como abrigo)
**Cenário A: criar novo abrigo**
1. Login
2. Escolher persona "Membro de abrigo"
3. Não tem abrigo vinculado → tela de opção
4. Escolhe "Criar novo abrigo"
5. `CreateOrganization` (form de identidade)
6. `ShelterOnboardingWizard` (configurar abrigo, 5 steps)
7. Entra no painel admin

**Cenário B: entrar por código**
1. Login
2. Escolher persona "Membro de abrigo"
3. Não tem abrigo vinculado → tela de opção
4. Escolhe "Inserir código de convite"
5. Cola o código
6. Vira membro (precisa de aprovação se código exigir, ou entra
   direto se for código aberto)
7. Entra no painel admin (com permissões do que foi atribuído)

#### Onde os dados ficam
- `users/{uid}` — perfil global (campos abrigo):
  `full_name`, `phone`, `lgpd_consent_at`
- `club_members/{clubId_uid}` — vínculo (com `role`, `permissions`)
- `clubs/{clubId}` — dados do abrigo
- `club_pets/...`, `club_events/...`, `club_posts/...`, etc.

#### Layout
- **BottomTabBar** (específico abrigo): `Painel, Mural, Candidatos, Pets, Perfil`
  (somente se o membro tem permissão; senão some)
- **TopBar**: Logo do abrigo + Seletor de abrigo (se múltiplos) +
  Notificações + Avatar
- **Home do acesso**: `/organizacoes/:id/admin` (não `/feed`)

#### Seletor de abrigo (multi-club)
Se o user é membro de múltiplos abrigos, ele **seleciona
ativamente** em qual quer operar. A escolha fica persistida
em `users/{uid}.active_shelter_id` (NOVO). O switcher no TopBar
permite trocar.

---

### §3.4. Persona 4 — Membro de Comunidade (`community_staff`)

> **Nome UX sugerido**: "Minha comunidade"
> **Tagline**: "Gerencie sua comunidade, mural, fórum e eventos"

#### Quem é
Membro de uma comunidade (grupo de usuários). Pode ser:
- **Proprietário** (`community.created_by === user.uid`)
- **Admin** (`community_members.role === 'admin'`)
- **Membro com permissões granulares** (`permissions`)

#### Fluxo de entrada
Idêntico ao abrigo:
1. Login
2. Tela de seleção de comunidade (se múltiplas)
3. Se não tem: opção "Inserir código" OU "Criar nova"

#### Funcionalidades (dependem das permissões)
- ✅ Mural da comunidade (criar/editar posts)
- ✅ Fórum da comunidade (criar tópicos)
- ✅ Eventos (criar, gerenciar RSVPs)
- ✅ Configurações (identidade, código de convite)
- ✅ Equipe (administrar membros)

#### Diferença vs. Abrigo
Comunidades **não têm**:
- ❌ Pets
- ❌ Doações
- ❌ Prestação de contas
- ❌ Voluntários

#### Onboarding
**Cenário A: criar nova comunidade**
1. Login → escolher persona "Membro de comunidade"
2. Não tem comunidade → "Criar nova"
3. `CreateCommunity` (form simples)
4. Entra no painel admin da comunidade

**Cenário B: entrar por código**
1. Login → escolher persona
2. "Inserir código"
3. Cola → vira membro
4. Entra no painel

#### Onde os dados ficam
- `users/{uid}` — perfil global
- `community_members/{communityId_uid}` — vínculo
- `communities/{communityId}` — dados

#### Layout
- **BottomTabBar** (específico comunidade): `Mural, Fórum, Eventos, Equipe, Perfil`
- **TopBar**: Logo comunidade + Seletor + Notificações + Avatar
- **Home do acesso**: `/comunidade/:id/admin`

---

### §3.5. Persona 5 — Voluntário (`volunteer`)

> **Nome UX sugerido**: "Voluntariar"
> **Tagline**: "Ajude abrigos com seu tempo e suas habilidades"

#### Quem é
Pessoa cadastrada no programa de voluntariado. Pode:
- **Não estar vinculado a nenhum abrigo** (cadastrado, mas inativo)
- **Estar vinculado a 1+ abrigos** (operando como voluntário lá)

#### Fluxo de entrada
1. Login com Google
2. **Se nunca foi voluntário**:
   - Tela de cadastro (`VolunteerSignup`, 5 steps)
   - Aceita termo (`acceptVolunteerTerms`)
   - Preenche perfil (`VolunteerProfileForm`)
   - Escolhe abrigo (ou fica sem abrigo, inativo)
3. **Se já é voluntário**:
   - **Se tem 1 abrigo vinculado**: entra direto no painel do
     voluntário daquele abrigo
   - **Se tem múltiplos**: tela de seleção ("Em qual abrigo
     você quer voluntariar agora?")

#### Funcionalidades

**Independente do abrigo** (`/perfil/voluntario`):
- ✅ Ver perfil de voluntário
- ✅ Editar perfil (raio, experiência, observações)
- ✅ Ver histórico de escalas
- ✅ Auditoria de participação

**Vinculado a abrigo selecionado** (após selecionar):
- ✅ **Escalas** do abrigo (browse de turnos)
- ✅ **Minhas tarefas** no abrigo
- ✅ **Audit trail** de ações
- ✅ **Mural do abrigo** (interagir, mas SEM poderes admin)
- ✅ **Fórum do abrigo** (ler, postar)
- ✅ **Eventos do abrigo** (participar)
- ✅ **Pets do abrigo** (apenas leitura; sem permissão de gestão)

#### O que NÃO é
Voluntário **NÃO É** membro de abrigo. Ele tem permissões
**diferentes e mais limitadas** que um admin. Especificamente:
- ❌ Não pode editar pets do abrigo
- ❌ Não pode editar mural/fórum (apenas postar como autor)
- ❌ Não pode ver financeiro
- ❌ Não pode ver equipe
- ❌ Não pode editar configurações

#### Onde os dados ficam
- `users/{uid}` — perfil global (campos voluntário)
- `users/{uid}/volunteer_profile/main` — perfil voluntário
  (raio, experiência, observações, `signature_text`,
  `terms_accepted_at`, `terms_accepted_version`)
- `clubs/{clubId}/volunteers/{volunteerUid}` — vínculo por abrigo
  (com `status: 'active' | 'paused' | 'blocked'`,
  `permissions: ['shifts', 'tasks', 'audit']`)
- `users/{uid}.active_volunteer_club_id` (NOVO) — abrigo
  selecionado atualmente

#### Layout
- **BottomTabBar** (específico voluntário): `Início, Escalas, Tarefas, Mural, Perfil`
  (com seletor de abrigo no TopBar)
- **TopBar**: Logo + Seletor de abrigo vinculado + Notificações + Avatar
- **Home do acesso**: `/perfil/voluntario` (com contexto do abrigo selecionado)

#### Seletor de abrigo (multi-roster)
Se voluntário está em múltiplos abrigos, ele **seleciona
ativamente** em qual quer operar. A escolha fica persistida em
`users/{uid}.active_volunteer_club_id`. Cada abrigo tem seus
próprios dados, escalas, tarefas — totalmente isolados.

---

### §3.6. Persona 6 — Admin Master da Plataforma (`platform_admin`)

> **Nome UX**: (oculto, sem tagline público)
> **Visibilidade**: Apenas `fsalamoni@gmail.com` + atribuídos via
> `users/{uid}.role === 'platform_admin'`

#### Quem é
Owner do projeto + um conjunto seleto de usuários com role
`platform_admin`. Gerencia **tudo** que existe na plataforma.

#### Funcionalidades (TODAS as áreas)
- ✅ `/admin` (dashboard) + todas as 19 sub-páginas
- ✅ `/admin/pets`, `/admin/denuncias`, `/admin/usuarios`
- ✅ `/admin/organizacoes`, `/admin/comunidades`
- ✅ `/admin/metricas`, `/admin/auditoria`
- ✅ `/admin/notificacoes`, `/admin/configuracoes`
- ✅ `/admin/flags`, `/admin/saude`, `/admin/security-alerts`
- ✅ `/admin/alertas`, `/admin/admins`, `/admin/mock-data`
- ✅ `/admin/parceiros` (espaço de parceiros)
- ✅ **Acesso implícito a TODAS as outras personas**:
  - Vê o feed como adotante
  - Vê pets como doador
  - Vê painel admin de QUALQUER abrigo
  - Vê painel admin de QUALQUER comunidade
  - Vê perfil de QUALQUER voluntário

#### Onde os dados ficam
- `users/{uid}.role === 'platform_admin'`
- Sem necessidade de onboarding (já vem com tudo)

#### Layout
- **BottomTabBar**: `Admin, Feed, Perfil` (custom, super admin)
- **TopBar**: Logo + Acesso rápido + Notificações + Avatar
- **Home do acesso**: `/admin` (dashboard)

#### Atribuição
O owner atribui o role `platform_admin` via:
- `/admin/admins` (gerenciamento de admins)
- Direto no Firestore (para emergências)

---

## §4. Switch de Acesso (Botão Trocar Persona)

### §4.1. Comportamento

A qualquer momento, o usuário autenticado pode ver um **botão
"switch"** no TopBar que mostra os acessos que ele possui.

```
[Avatar ▾] ou [Persona atual ▾]
  ├── Adotante (atual) ✓
  ├── Doador (3 pets)
  ├── Meu abrigo — Cão do Bem
  ├── Meu abrigo — Patinhas Felizes
  ├── Minha comunidade — Adotantes RJ
  ├── Voluntário — Patinhas Felizes
  ├── Voluntário — Cão do Bem
  └── Admin master (se visível)
```

Clicar em outra persona → muda a persona ativa → layout
re-renderiza → BottomTabBar/TopBar atualizam → rotas mudam.

### §4.2. Persistência

A persona ativa é persistida em:
- `users/{uid}.active_persona` (NOVO) — string: `'adopter' | 'donor' | 'shelter_staff:clubId' | 'community_staff:communityId' | 'volunteer:clubId' | 'platform_admin'`
- `localStorage['viralata:active_persona']` — fallback offline

Para personas com escopo (abrigo/comunidade/voluntário com múltiplos
vínculos), a chave inclui o ID:
- `'shelter_staff:TM9MBn5aFXgObfRZ39m9'` (proprietário do Cão do Bem)
- `'volunteer:TM9MBn5aFXgObfRZ39m9'` (voluntário no Cão do Bem)

### §4.3. Quando trocar de persona

- **Default no login**: a última persona usada
- **Se user só tem 1 acesso**: vai direto, sem mostrar switch
- **Se user tem 2+ acessos**: mostra switch no TopBar
- **Pós-onboarding**: a persona recém-criada fica ativa

### §4.4. Implementação

```jsx
// Novo hook: useActivePersona
function useActivePersona() {
  const { user, userProfile } = useAuth();
  const [active, setActive] = useState(
    userProfile?.active_persona ?? 'adopter'
  );
  // Persist + sync
  return { active, setActive, available: listAvailablePersonas(userProfile) };
}
```

---

## §5. Onboarding por Persona

### §5.1. Fluxo Geral

```
Login com Google
  ↓
Verificar: tem persona ativa? (active_persona)
  ├── SIM → entrar no shell da persona
  └── NÃO → tela de "Bem-vindo, escolha seu acesso"
              ↓
              ┌──────────────┬──────────────┬──────────────┬──────────────┐
              ↓              ↓              ↓              ↓
          Adotante      Doador       Membro Abrigo  Membro Comunidade  Voluntário
              ↓              ↓              ↓              ↓              ↓
          Onboarding    Onboarding    Onboarding     Onboarding      Onboarding
          (perfil       (perfil      (código/       (código/        (termo +
           adotante)     doador)      criar)         criar)          perfil)
              ↓              ↓              ↓              ↓              ↓
          /feed         /pets/new     /organizacoes  /comunidade/    /perfil/
                                       /:id/admin     :id/admin       voluntario
```

### §5.2. Onboarding por persona

**Adotante** (`OnboardingQuestionnaire` atualizado):
- Mantém questionário atual, mas renomeia
- Após completar: `users/{uid}.profile_completed = true` + libera
  feed
- Adiciona: `users/{uid}/adopter_profile/main` (campos extras)

**Doador** (NOVO `DonorOnboarding`):
- Dados básicos
- Sobre você como doador
- Direciona para `/pets/new` ao concluir

**Membro de Abrigo** (NOVO `ShelterEntry`):
- Se tem abrigo vinculado: pula para "qual abrigo?"
- Se não tem: tela com 2 botões
  - **Inserir código** → `joinClubByCode` → painel
  - **Criar novo abrigo** → `CreateOrganization` → `ShelterOnboardingWizard` → painel

**Membro de Comunidade** (NOVO `CommunityEntry`):
- Análogo ao abrigo

**Voluntário** (reusa `VolunteerSignup`):
- Termo → perfil → abrigo (ou inativo)

**Platform Admin**: sem onboarding (já tem tudo)

### §5.3. Onde os dados de onboarding ficam

Decisão: cada persona tem seu perfil em subcoleção:
- `users/{uid}/adopter_profile/main` — adotante
- `users/{uid}/donor_profile/main` — doador
- `users/{uid}/shelter_memberships/{clubId}` — membro abrigo (NÃO
  mexer em `club_members` que é de outro schema)
- `users/{uid}/community_memberships/{communityId}` — membro comunidade
- `users/{uid}/volunteer_profile/main` — voluntário (já existe)

**Importante**: a coleção `club_members`/`community_members` atual
fica (é a fonte canônica para permissões). As subcoleções em
`users` são cópias para fácil acesso pelo shell.

---

## §6. Impactos Técnicos

### §6.1. TopBar / BottomTabBar (UX principal)

**Atual**: BottomTabBar hardcoded em `src/components/BottomTabBar.jsx`:
```js
const bottomTabItems = [
  { label: 'Feed', icon: PawPrint, to: '/feed' },
  { label: 'ONGs', icon: Building2, to: '/organizacoes' },
  { label: 'Comunidade', icon: Users, to: '/comunidade' },
  { label: 'Criar', icon: Plus, to: '/pets/new', center: true },
  { label: 'Chat', icon: MessageCircle, to: '/chat' },
  { label: 'Perfil', icon: User, to: '/perfil' },
];
```

**V4**: cada persona tem seu próprio array de items. Componente
aceita prop `persona` ou usa `useActivePersona()`:
```js
const BOTTOM_TAB_BY_PERSONA = {
  adopter: [...],
  donor: [...],
  shelter_staff: [...],
  community_staff: [...],
  volunteer: [...],
  platform_admin: [...],
};
```

### §6.2. Roteamento

Manter as rotas existentes. O que muda:
- Cada rota ganha um **guard de persona**:
  - `/organizacoes/:id/admin` requer persona `shelter_staff` ou
    `platform_admin`
  - `/comunidade/:id/admin` requer `community_staff` ou
    `platform_admin`
  - `/perfil/voluntario` requer `volunteer` ou `platform_admin`
  - `/meus-pets` requer `donor` ou `platform_admin`
  - `/admin/*` requer `platform_admin` (apenas)
- **Rota nova**: `/acesso` (ou `/persona`) — tela de seleção de
  acesso (primeira vez ou troca)
- **Rota nova**: `/entrar/abrigo`, `/entrar/comunidade` — fluxos
  de código de convite

### §6.3. AuthContext

`src/core/lib/FirebaseAuthContext.jsx` ganha:
- `userProfile.personas` (NOVO) — array computado de personas
  disponíveis: `['adopter', 'donor', 'shelter_staff:clubId1', ...]`
- `userProfile.active_persona` (NOVO) — persona ativa
- `setActivePersona(persona)` (NOVO) — função para trocar

### §6.4. Firestore Rules

Regras existentes continuam (já têm permissões granulares). O que
muda:
- Adicionar `request.auth.uid.active_persona` em **alguns** reads
  (ex.: `pets/{id}` allow read se `owner_id === auth.uid` E
  persona ativa é `donor` ou `shelter_staff` daquele owner)
- **MAS** manter defense-in-depth: a regra principal é sempre
  baseada em `users/{uid}.role` ou `club_members`, não em persona
- Persona é puramente UX (não muda a regra de segurança)

### §6.5. Feature Flags

Cada persona pode ter suas próprias feature flags:
- `V4_PERSONA_ADOPTER` (default OFF)
- `V4_PERSONA_DONOR` (default OFF)
- `V4_PERSONA_SHELTER_STAFF` (default OFF)
- `V4_PERSONA_COMMUNITY_STAFF` (default OFF)
- `V4_PERSONA_VOLUNTEER` (default OFF)
- `V4_PERSONA_PLATFORM_ADMIN` (default OFF)
- `V4_PERSONA_SWITCHER` (default OFF)
- `V4_PERSONA_SELECTION` (default OFF) — tela de primeira escolha

Default OFF para todas. Migração gradual.

### §6.6. Schema de dados (novas coleções/campos)

**`users/{uid}` — campos novos**:
- `active_persona: string` — persona ativa atual
- `personas_enabled: string[]` — lista de personas liberadas
  (calculada a partir de memberships, mas cacheada)
- `active_shelter_id: string?` — se persona ativa é
  `shelter_staff` ou `volunteer`, qual abrigo
- `active_community_id: string?` — análogo
- `active_volunteer_club_id: string?` — análogo
- `adopter_profile: { ... }?` — denormalizado para acesso rápido
  (ou subcoleção)
- `donor_profile: { ... }?` — denormalizado

**Subcoleções novas**:
- `users/{uid}/adopter_profile/main`
- `users/{uid}/donor_profile/main`
- `users/{uid}/shelter_memberships/{clubId}` (cache da membership)
- `users/{uid}/community_memberships/{communityId}` (cache)

**Manter**:
- `users/{uid}/volunteer_profile/main` (já existe)

### §6.7. OnboardingQuestionnaire (refator)

`src/modules/onboarding/pages/OnboardingQuestionnaire.jsx` ganha
uma prop `persona`:
- `persona="adopter"` → fluxo atual
- `persona="donor"` → fluxo novo
- `persona="shelter_staff"` → redireciona para `/entrar/abrigo`
- `persona="community_staff"` → redireciona para `/entrar/comunidade`
- `persona="volunteer"` → redireciona para `/voluntarios/seja`

---

## §7. Componentes Novos (a serem criados)

| Componente | Caminho | Função |
|---|---|---|
| `PersonaSwitcher` | `src/components/PersonaSwitcher.jsx` | Botão dropdown no TopBar com a lista de personas |
| `PersonaGate` | `src/components/guards/PersonaGate.jsx` | HOC que valida persona ativa |
| `PersonaSelection` | `src/pages/PersonaSelection.jsx` | Tela de primeira escolha |
| `DonorOnboarding` | `src/pages/onboarding/DonorOnboarding.jsx` | Questionário do doador |
| `ShelterEntry` | `src/pages/onboarding/ShelterEntry.jsx` | Código OU criar |
| `CommunityEntry` | `src/pages/onboarding/CommunityEntry.jsx` | Código OU criar |
| `ShelterPicker` | `src/components/ShelterPicker.jsx` | Seletor de abrigo (multi-club) |
| `CommunityPicker` | `src/components/CommunityPicker.jsx` | Seletor de comunidade |
| `VolunteerShelterPicker` | `src/components/VolunteerShelterPicker.jsx` | Seletor de abrigo (multi-roster) |
| `PersonaBottomTabBar` | `src/components/PersonaBottomTabBar.jsx` | BottomTabBar contextual por persona |

---

## §8. Decisões D-* a criar (durante implementação)

Quando a V4 for implementada, criar no `13-DECISIONS.md`:

- **D-PERSONA-DEFINITION** — 6 personas canônicas (adopter, donor,
  shelter_staff, community_staff, volunteer, platform_admin)
- **D-PERSONA-MULTI** — usuário pode ter múltiplas personas
- **D-PERSONA-SWITCH** — botão switch sempre visível (exceto
  quando só tem 1 persona)
- **D-PERSONA-PERSISTENCE** — `active_persona` em
  `users/{uid}` + localStorage
- **D-PERSONA-UX-NOT-SECURITY** — persona é UX, não muda
  Firestore rules
- **D-PERSONA-ONBOARDING-FIRST** — toda persona nova exige
  onboarding de primeiro acesso
- **D-PERSONA-DATA-ISOLATION** — cada persona tem seu próprio
  conjunto de dados de perfil (subcoleções)
- **D-PERSONA-SHELTER-SCOPE** — abrigo selecionado fica em
  `active_shelter_id`, troca explícita
- **D-PERSONA-VOLUNTEER-MULTI-ROSTER** — voluntário pode
  selecionar entre múltiplos abrigos, dados isolados
- **D-PERSONA-ADMIN-HIDDEN** — `platform_admin` só aparece no
  switcher se `users/{uid}.role === 'platform_admin'`

---

## §9. Roadmap de Implementação (Proposto)

> **IMPORTANTE**: o user pediu para **NÃO EXECUTAR NADA**, apenas
> criar este guia. O roadmap abaixo é uma sugestão de fases
> para quando a implementação começar.

### Fase 0 — Preparação (1-2 sprints)
- [ ] Validar este guia com o user
- [ ] Mapear todas as personas atuais (quem é quem hoje)
- [ ] Identificar regressões potenciais
- [ ] Adicionar feature flags V4_PERSONA_*

### Fase 1 — Schema de dados (1 sprint)
- [ ] Adicionar campos em `users/{uid}` (com fallback)
- [ ] Criar subcoleções `adopter_profile`, `donor_profile`,
  `shelter_memberships`, `community_memberships`
- [ ] Migrar dados existentes (script)
- [ ] Atualizar `firestore.rules` se necessário

### Fase 2 — PersonaSwitcher + PersonaGate (1 sprint)
- [ ] Componente `PersonaSwitcher` (TopBar)
- [ ] Componente `PersonaGate` (route guard)
- [ ] Hook `useActivePersona`
- [ ] Persistência em `users/{uid}.active_persona` + localStorage

### Fase 3 — PersonaSelection (1 sprint)
- [ ] Tela `/acesso` (primeira escolha)
- [ ] Integrar com `OnboardingGate` (só redireciona se
  `active_persona` não definida)
- [ ] Redirecionar para onboarding da persona escolhida

### Fase 4 — Persona Adotante (1 sprint)
- [ ] Refatorar `OnboardingQuestionnaire` para usar `persona="adopter"`
- [ ] Subcoleção `adopter_profile`
- [ ] Manter BottomTabBar atual (já é do adotante)
- [ ] Adicionar link "Quer ser doador?" no perfil

### Fase 5 — Persona Doador (1 sprint)
- [ ] `DonorOnboarding` (novo)
- [ ] Subcoleção `donor_profile`
- [ ] BottomTabBar do doador
- [ ] Dashboard de pets (Home do doador)
- [ ] Fluxo de "primeiro pet" (direcionar para `/pets/new`)

### Fase 6 — Persona Membro de Abrigo (1-2 sprints)
- [ ] Tela `ShelterEntry` (código OU criar)
- [ ] Refatorar `ShelterOnboardingWizard` para integrar
- [ ] Seletor de abrigo (multi-club)
- [ ] BottomTabBar do abrigo
- [ ] Home do abrigo = painel admin (`/organizacoes/:id/admin`)
- [ ] Verificar todas as permissões funcionam

### Fase 7 — Persona Membro de Comunidade (1 sprint)
- [ ] Tela `CommunityEntry`
- [ ] Seletor de comunidade
- [ ] BottomTabBar da comunidade
- [ ] Home da comunidade = painel admin

### Fase 8 — Persona Voluntário (1-2 sprints)
- [ ] Tela de seleção de abrigo (multi-roster)
- [ ] BottomTabBar do voluntário (contextual ao abrigo)
- [ ] Refatorar `VolunteerProfile` para incluir contexto
- [ ] Garantir isolamento de dados por abrigo

### Fase 9 — Persona Platform Admin (1 sprint)
- [ ] BottomTabBar do admin
- [ ] Garantir que admin vê tudo (todas as personas)
- [ ] `PersonaSwitcher` inclui "Admin master" só para role
  `platform_admin`

### Fase 10 — Polimento e rollout (1-2 sprints)
- [ ] Testes E2E por persona
- [ ] Auditoria de regressões
- [ ] Migração gradual via flags
- [ ] Documentação atualizada (regências, decisões, etc.)
- [ ] Onboarding guiado (tour por cada persona)

### Fase 11 — Limpeza (1 sprint)
- [ ] Remover BottomTabBar genérica (substituída por persona)
- [ ] Remover `OnboardingQuestionnaire` monolítico
- [ ] Remover rotas legadas (com redirects)

---

## §10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Quebrar fluxo de voluntário | Alto (V3 recém-fixado) | Manter `VolunteerSignup` como está; só adicionar contexto |
| Quebrar painel admin de abrigo | Alto | Manter `/organizacoes/:id/admin`; só mudar visual |
| Regressão em permissões | Alto | Toda mudança de persona é UX-only; rules não mudam |
| Migração de dados | Médio | Script idempotente; fallback para subcoleção ausente |
| Usuário com 1 persona não vê benefício | Médio | Onboarding guiado explicando as opções |
| Complexidade do switcher | Médio | Switcher só aparece com 2+ personas; simples dropdown |
| Performance (queries extras) | Baixo | Cache em `users/{uid}.personas_enabled` (atualizar onSnapshot) |
| Adoção pelo user | Médio | Onboarding tour + ajuda contextual |

---

## §11. Perguntas em Aberto — RESPOSTAS DO OWNER (2026-08-03)

> **STATUS**: 30/30 perguntas respondidas. Todas as respostas
> validadas pelo owner (`fsalamoni@gmail.com`) em 2026-08-03.
> Ver **§15 "Definições Aprovadas"** para a consolidação
> operacional dessas respostas em formato de regras D-*.

### BLOCO 1 — Multi-persona e Combinações

**Q1.** O user pode ter **múltiplas personas ativas simultaneamente** (não apenas uma por vez)?
- **RESPOSTA**: SIM, via switch — uma de cada vez, mas pode trocar
  a qualquer momento. **NÃO deve misturar as funcionalidades de
  cada agente**. Cada persona tem seu contexto dedicado.

**Q2.** Um **voluntário pode se tornar doador**? E se for membro/voluntário de abrigo?
- **RESPOSTA**: SIM, qualquer usuário pode se tornar doador
  individual. É uma persona independente.
  - Se o user for **membro/equipe/voluntário do abrigo X** e tentar
    cadastrar um pet para doação, deve aparecer confirmação
    explícita: **"Você é membro/equipe/voluntário no abrigo X.
    Deseja cadastrar este pet no referido abrigo ou deseja
    adicionar o acesso 'Doador' à sua conta?"**
  - Se escolher "cadastrar no abrigo X" → pet fica com
    `owner_type: 'organization'`, vinculado ao abrigo (não conta
    como doador individual).
  - Se escolher "adicionar acesso Doador" → pet fica com
    `owner_type: 'user'`, vinculado ao user como doador.

**Q3.** Um **doador pode demonstrar interesse em adotar** outro pet?
- **RESPOSTA**: SIM — são papéis/papéis ortogonais. Doador pode
  também ser adotante.

**Q4.** O **voluntário pode ver o feed de pets**? E pode demonstrar interesse?
- **RESPOSTA**: O **feed NÃO deve ser página aberta para todos
  os acessos**. O feed fica **nativamente apenas no acesso
  "Adotante"**. No acesso "Voluntário" (ou outros), **NÃO há
  feed natural** — apenas funcionalidades pertinentes à persona.
  - Se o voluntário **trocar para o acesso "Adotante"**, o feed
    aparece normalmente e ele pode demonstrar interesse como
    qualquer adotante.
  - **Não** há feed read-only em outras personas.

**Q5.** O **membro de abrigo pode demonstrar interesse em adotar** um pet de outro abrigo?
- **RESPOSTA**: SIM — pode ser adotante também. São papéis
  ortogonais.

**Q6.** Membro de **comunidade** pode cadastrar pets, doar, ser voluntário?
- **RESPOSTA**: SIM para todas. Comunidade é um papel/acesso
  independente, não exclusivo. Membro de comunidade pode também
  ser doador, adotante, voluntário, etc.

### BLOCO 2 — Admin Master e Hierarquia

**Q7.** **Admin master** é uma persona separada ou um override?
- **RESPOSTA**: Persona **separada + override**.
  - Aparece no switcher **SÓ para `role: 'platform_admin'`**.
  - Ao entrar em "Admin master", tem **acesso irrestrito** (pode
    controlar tudo da plataforma).
  - O usuário com `role: 'platform_admin'` possui **TODAS as
    personas disponíveis**. Pode navegar como qualquer um dos
    papéis.
  - **Quando está em outras personas** (não "admin master"), **NÃO
    tem poderes de admin master** — apenas as permissões normais
    daquela persona. Isso permite testar a UX como usuário comum.
  - **Apenas no acesso "admin master"** tem controle absoluto de
    tudo.

**Q8.** Quem pode **atribuir o role `platform_admin`**?
- **RESPOSTA**: Apenas o owner (`fsalamoni@gmail.com`). Outros
  admins não podem promover. **Mais seguro, evita escalonamento
  de privilégios**.

**Q9.** O **admin master vê TUDO** no switcher ou só os que ele é membro?
- **RESPOSTA**:
  - **Em outras personas** (não "admin master"): vê apenas o que
    ele possui dentro delas (navegação comum, como usuário
    comum).
  - **Em "admin master"**: **Override total** — vê tudo, sem
    precisar ser membro. Atalho `/admin` para visão agregada de
    plataforma.

### BLOCO 3 — UX/UI, Onboarding e Switch

**Q10.** **Nomes UX** (na landing "como você quer entrar?"):
- Adotante → **"Adotar / Ajudar"** ✅
- Doador → **"Doar um pet"** ✅
- Membro de Abrigo → **"Meu abrigo"** ✅
- Membro de Comunidade → **"Minha comunidade"** ✅
- Voluntário → **"Ser voluntário"** ✅
- Admin Master → **(oculto)** ✅

**Q11.** Pode escolher **múltiplas personas na primeira vez**?
- **RESPOSTA**: **Uma por vez**.
  - Pode adicionar outras depois via switcher → "Adicionar outro
    acesso".
  - Pode adicionar também via landing page.
  - **Escolhe o acesso ao entrar**.
  - **Sempre que reentrar, entra no último acesso que estava
    ativo** (persistido em `active_persona` no Firestore).
  - Mantém registro do histórico de acessos usados.

**Q12.** O **onboarding de cada persona é executado UMA vez** ou toda vez que troca?
- **RESPOSTA**: **UMA vez por persona**. Campos preenchidos
  persistem. Trocar de persona não pede onboarding de novo.

**Q13.** O usuário pode **voltar atrás na escolha de persona**?
- **RESPOSTA**: SIM — sempre pode escolher outra persona via
  switcher, mesmo que não tenha feito o onboarding completo da
  anterior.

**Q14.** A **troca de persona exige confirmação** (modal)?
- **RESPOSTA**: **NÃO** — troca instantânea, estilo Google
  Account switcher. Sem fricção.

**Q15.** O **switcher fica sempre visível** ou só quando há 2+ personas?
- **RESPOSTA**: Só quando há 2+ personas. Se só tem 1, não
  polui o TopBar. **Mas DEVE haver um modo claro do usuário
  criar as demais personas** (link "Adicionar outro acesso" no
  TopBar/Perfil) — para não ficar preso sempre apenas na
  primeira que entrou.

**Q16.** No **primeiro acesso** (sem persona definida), o user é direcionado para `/acesso` ou vê a landing?
- **RESPOSTA**: **Direcionar para `/acesso`** — após login, força
  a escolha. Landing pública continua acessível via botão
  "Voltar" ou URL direta.

### BLOCO 4 — Multi-vínculos e Edge Cases

**Q17.** **Membro de 2 abrigos** (multi-club): switcher aparece onde?
- **RESPOSTA**: **No TopBar (dropdown)**, com badge "1" ou "2"
  indicando o abrigo ativo. Persistido em `active_shelter_id`.

**Q18.** **Voluntário em 2 abrigos** (multi-roster): isolamento de dados?
- **RESPOSTA**: **SIM** — cada abrigo tem escalas, tarefas e
  audit trail **isolados**. Switcher de abrigo no TopBar.

**Q19.** **Membro de abrigo desiste de ser voluntário** do mesmo abrigo. Como fica?
- **RESPOSTA**: **São papéis independentes** — sair do
  voluntariado NÃO remove a membership. Membership de abrigo
  continua.

**Q20.** **Pet pessoal do doador pode ser transferido para o abrigo** que ele faz parte?
- **RESPOSTA**: SIM, via **"Transferir para abrigo"** no detalhe
  do pet.
  - Atualiza `owner_type: 'organization'` + `owner_id: clubId`.
  - **Audit log obrigatório**.
  - **Não tem como desfazer** (decisão irreversível, com
    confirmação forte).

**Q21.** **Pets órfãos** (cadastrados por user que desativou a conta):
- **RESPOSTA**:
  - Mantidos com `owner_type: 'user'`, `owner_id: <uid-desativado>`.
  - **Pets devem ficar OCULTOS no feed** (não aparecem para
    adotantes).
  - **Cadastro é único** (deduplicado por `pet_code` ou
    fingerprint de nome+espécie+porte+idade). Se o user
    desativado entrar novamente (por outro abrigo/usuário), o
    sistema **puxa informações do cadastro anterior** se for o
    mesmo pet.
  - Se havia conversas em andamento, **os pets são listados
    como "Pets sem responsável" no admin master**.
  - Adotantes podem ser contatados pelo admin master (e só por
    ele).

**Q22.** O **platform_admin pode se "demitir"** do cargo?
- **RESPOSTA**: **NÃO diretamente**. Apenas o owner pode
  rebaixar. **Proteção contra auto-rebaixamento**.

### BLOCO 5 — Decisões Adicionais sobre Schema/Onboarding

**Q23.** Onboarding de **Adotante**: mantém o questionário atual?
- **RESPOSTA**: SIM, mas **renomeado para `AdopterOnboarding`**.
  Libera feed após `profile_completed = true`.

**Q24.** Onboarding de **Doador**: campos específicos?
- **RESPOSTA**: SIM, com os campos abaixo (decididos pelo owner +
  campos adicionais que fazem sentido):
  - `donor_motivation` (motivo da doação: mudança de cidade,
    alergias, novo emprego, etc.) — texto
  - `has_donated_before` (boolean)
  - `pets_count` (número, total de pets que já cuidou)
  - `experience_with_species` (array: dogs, cats, rabbits, birds,
    other)
  - `experience_years` (número)
  - `donor_accepts_home_check` (boolean — aceita visita prévia do
    adotante)
  - `donor_accepts_post_adoption_followup` (boolean — aceita
    receber atualizações após a adoção)
  - `donor_preferred_contact_method` (whatsapp/email/chat)
  - `donor_bio` (texto curto, apresentado no card do pet)
  - **Compartilhado com `users/{uid}` global**: cidade, estado,
    telefone, LGPD consent
  - **Tornar onboarding completo** com `profile_completed = true`

**Q25.** Onboarding de **Membro de Abrigo sem abrigo**: 2 caminhos.
- **RESPOSTA**: SIM. **Caminho A**: "Inserir código" → `joinClubByCode`
  → painel. **Caminho B**: "Criar novo abrigo" → `CreateOrganization`
  → `ShelterOnboardingWizard` (5 steps) → painel.

**Q26.** Onboarding de **Voluntário sem vínculo**:
- **RESPOSTA**: SIM, usa o `VolunteerSignup` atual (termo → perfil
  → abrigo). Se não quiser abrigo agora, **fica inativo MAS
  entra em um POOL DE VOLUNTÁRIOS DA PLATAFORMA**.
  - **Pool de voluntários**: usuário cadastrado como voluntário
    sem vínculo com abrigo fica disponível para ser encontrado
    por **filtros de região, tempo disponível, tarefas
    preferidas, raio de atuação, espécies preferidas, etc.**
  - Abrigos podem **buscar/browse** o pool de voluntários para
    convidar.
  - O voluntário recebe notificações quando um abrigo o convida.
  - A página `/voluntarios/pool` (pública para voluntários) lista
    abrigos com vagas abertas; a página admin do abrigo
    (`/organizacoes/:id/admin?tab=volunteers-pool`) lista
    voluntários do pool (com permissão `volunteers:bulk` ou
    similar).

**Q27.** O **switcher mostra apenas personas com onboarding completo**?
- **RESPOSTA**: **Mostra todas**, mas as incompletas têm badge
  "Incompleto" e ao clicar, **redireciona para continuar o
  onboarding** da persona.

**Q28.** Existe **tempo de expiração** de persona inativa?
- **RESPOSTA**: **NÃO** — não há expiração automática. Membro/
  voluntário fica disponível indefinidamente. **Admin do abrigo
  pode pausar/bloquear manualmente** (já existe mecanismo).

**Q29.** **Pets cadastrados antes da V4** — atribuição de personas:
- **RESPOSTA**: **Migração automática**: todo user com pets onde
  `owner_type: 'user'` recebe a persona `donor` automaticamente.
  Verificação no primeiro login pós-V4 (background job + check
  on-load).

**Q30.** A V4 deve ter **período de transição com flag global**?
- **RESPOSTA**: **SIM** — flag `V4_PERSONA_ENABLED` (default OFF).
  Migração gradual, owner liga quando estiver pronto. Componentes
  V4 só aparecem com flag ligada. Plano de ativação:
  1. Owner liga flag em ambiente de staging
  2. Testes E2E completos
  3. Migração de dados em produção (script)
  4. Owner liga flag em produção para o próprio user
  5. Validação manual
  6. Liberação gradual (10% → 50% → 100% via feature flag por
     user/role)

---

## §12. Validação Inicial (sem código)

Antes de iniciar a Fase 0, validar com o user:

1. **Este guia cobre o que você queria?** (verificar com o user)
2. **As 6 personas estão corretas?** (especialmente Doador vs.
   Voluntário)
3. **O switcher está bem modelado?** (especialmente o caso multi-
   abrigo)
4. **O roadmap de 11 fases é viável?** (estimar duração total)
5. **As perguntas em aberto (§11) podem ser respondidas agora?**
6. **Os nomes UX ("Adotar / Ajudar", "Doar um pet", etc.) estão
   bons?** (são sugestões; user pode preferir outros)
7. **A feature flag strategy (todas OFF por default) está OK?**

---

## §13. Resumo das Mudanças por Camada

```
┌─────────────────────────────────────────────────────────────┐
│ Camada UX/UI                                                  │
│  • BottomTabBar contextual por persona                       │
│  • TopBar com PersonaSwitcher                                │
│  • Tela /acesso (primeira escolha)                           │
│  • Telas de onboarding por persona                           │
│  • Seletores de abrigo/comunidade                            │
│  • Documentos de regência reescritos por persona             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Camada de Estado (AuthContext)                               │
│  • userProfile.active_persona                                │
│  • userProfile.personas_enabled                              │
│  • setActivePersona(persona)                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Camada de Roteamento                                          │
│  • PersonaGate (route guard)                                 │
│  • Novas rotas: /acesso, /entrar/abrigo, /entrar/comunidade │
│  • Permissões por rota (já existem, mas agora com persona)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Camada de Dados (Firestore)                                  │
│  • users/{uid}.active_persona (NOVO)                         │
│  • users/{uid}.personas_enabled (NOVO)                       │
│  • users/{uid}/adopter_profile/main (NOVO)                   │
│  • users/{uid}/donor_profile/main (NOVO)                     │
│  • users/{uid}/shelter_memberships/{clubId} (NOVO)           │
│  • users/{uid}/community_memberships/{communityId} (NOVO)    │
│  • users/{uid}/volunteer_profile/main (já existe)            │
│  • Manter: club_members, community_members (canônico)        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Camada de Segurança (Firestore Rules)                        │
│  • SEM mudanças obrigatórias (persona é UX-only)             │
│  • Opcional: tightening de reads em alguns paths             │
└─────────────────────────────────────────────────────────────┘
```

---

## §14. Próximos Passos Imediatos

1. **Validar este guia** com o user (`fsalamoni@gmail.com`).
2. Responder as 10 perguntas em aberto (§11).
3. Confirmar nomes UX das personas (§3, §12).
4. Aprovar/refutar o roadmap de 11 fases (§9).
5. **Somente após esses 4 passos**, iniciar a Fase 0.

---

## §15. Definições Aprovadas (Consolidação Operacional)

> **STATUS**: 30/30 decisões validadas pelo owner em 2026-08-03.
> Esta seção consolida as respostas da §11 em formato de regras
> operacionais **D-PERSONA-*** que devem ser adicionadas ao
> `docs/AI_GUIDE/13-DECISIONS.md` quando a V4 iniciar.

### D-PERSONA-MULTI (Q1, Q3, Q5, Q6)
User pode ter **múltiplas personas** mas apenas **uma ativa por
vez**. Personas são ortogonais (Adotante + Doador + Voluntário +
etc. são combinações válidas). Troca via switch, sem confirmação,
instantânea.

### D-PERSONA-DONOR-EXPLICIT-CONFIRM (Q2)
Se o user já é **membro/equipe/voluntário de abrigo X** e tenta
cadastrar pet para doação, mostrar modal:
> "Você é membro/equipe/voluntário no abrigo X. Deseja cadastrar
> este pet no referido abrigo ou deseja adicionar o acesso
> 'Doador' à sua conta?"

- "Cadastrar no abrigo X" → `owner_type: 'organization'`
- "Adicionar acesso Doador" → `owner_type: 'user'` + ativa persona `donor`

### D-PERSONA-FEED-EXCLUSIVE-ADOPTER (Q4)
**Feed de pets só aparece no acesso "Adotante"**. Outras
personas **NÃO** têm feed (nem read-only). Para adotar, o user
troca para a persona "Adotante" via switcher.

### D-PERSONA-ADMIN-OVERRIDE (Q7, Q9)
- Admin master é **persona separada + override**.
- Aparece no switcher **SÓ** para `role: 'platform_admin'`.
- Em **outras personas** (não "admin master"): **NÃO** tem
  poderes de admin — apenas as permissões normais daquela
  persona. Permite testar UX como usuário comum.
- Em **"admin master"**: **override total** — vê tudo, sem
  precisar ser membro. Atalho `/admin` para visão agregada.
- O user com `role: 'platform_admin'` **possui todas as
  personas disponíveis** (lista sempre completa no switcher).

### D-PERSONA-ADMIN-OWNER-ONLY (Q8)
Apenas o owner (`fsalamoni@gmail.com`) pode atribuir o role
`platform_admin`. Outros admins **NÃO** podem promover. Mais
seguro contra escalonamento de privilégios.

### D-PERSONA-NAMES-UX (Q10)
Nomes UX canônicos:
- Adotante → "Adotar / Ajudar"
- Doador → "Doar um pet"
- Membro de Abrigo → "Meu abrigo"
- Membro de Comunidade → "Minha comunidade"
- Voluntário → "Ser voluntário"
- Admin Master → (oculto)

### D-PERSONA-ONE-AT-A-TIME (Q11)
**Uma persona por vez no primeiro acesso**. Pode adicionar
outras via switcher → "Adicionar outro acesso" (também
acessível via landing page). **Sempre que reentrar, entra no
último acesso ativo** (persistido em `active_persona` no
Firestore).

### D-PERSONA-ONBOARDING-ONCE (Q12)
Onboarding de cada persona é executado **UMA vez**. Campos
preenchidos persistem. Trocar de persona **NÃO** pede
onboarding de novo.

### D-PERSONA-SWITCH-NO-CONFIRM (Q14)
Troca de persona é **instantânea, sem confirmação**. Estilo
Google Account switcher. Sem fricção.

### D-PERSONA-SWITCHER-VISIBILITY (Q15)
Switcher visível **só quando há 2+ personas**. Se só tem 1,
**NÃO** polui o TopBar. Mas **DEVE** haver link "Adicionar
outro acesso" no TopBar/Perfil para criar novas personas.

### D-PERSONA-FIRST-ACCESS-FORCED (Q16)
No primeiro acesso (sem persona definida), user é **direcionado
para `/acesso`** após login. Landing pública continua acessível
via botão "Voltar" ou URL direta.

### D-PERSONA-MULTI-CLUB (Q17)
Membro de múltiplos abrigos: **switcher no TopBar (dropdown)**
com badge numérica indicando o abrigo ativo. Persistido em
`active_shelter_id`.

### D-PERSONA-MULTI-ROSTER-ISOLATED (Q18)
Voluntário em múltiplos abrigos: **dados isolados por abrigo**
(escalas, tarefas, audit trail). Switcher de abrigo no TopBar.

### D-PERSONA-MEMBERSHIP-INDEPENDENT (Q19)
Sair do voluntariado **NÃO** remove membership de abrigo. São
papéis independentes.

### D-PERSONA-PET-TRANSFER (Q20)
Pet pessoal pode ser transferido para abrigo via "Transferir
para abrigo" no detalhe do pet. Atualiza `owner_type` para
`organization`. Audit log obrigatório. **Não tem como
desfazer** (decisão irreversível, com confirmação forte).

### D-PERSONA-ORPHAN-PETS (Q21)
Pets órfãos (user desativado):
- Mantidos com `owner_type: 'user'`, `owner_id: <uid-desativado>`.
- **OCULTOS no feed** (não aparecem para adotantes).
- **Cadastro é único** (deduplicado por fingerprint nome+
  espécie+porte+idade). Re-cadastro do mesmo pet puxa info
  anterior.
- Listados como "Pets sem responsável" no admin master.
- Adotantes contactados **apenas** pelo admin master.

### D-PERSONA-ADMIN-CANNOT-DEMOTE (Q22)
Platform admin **NÃO** pode se rebaixar. Apenas o owner pode
rebaixar. Proteção contra auto-rebaixamento.

### D-PERSONA-ADOPTER-ONBOARDING (Q23)
`AdopterOnboarding` é o `OnboardingQuestionnaire` renomeado.
Libera feed após `profile_completed = true`.

### D-PERSONA-DONOR-ONBOARDING (Q24)
`DonorOnboarding` (novo) com campos:
- `donor_motivation` (texto)
- `has_donated_before` (boolean)
- `pets_count` (número)
- `experience_with_species` (array: dogs, cats, rabbits, birds,
  other)
- `experience_years` (número)
- `donor_accepts_home_check` (boolean)
- `donor_accepts_post_adoption_followup` (boolean)
- `donor_preferred_contact_method` (whatsapp/email/chat)
- `donor_bio` (texto curto)

Compartilhado com `users/{uid}` global: cidade, estado, telefone,
LGPD consent.

### D-PERSONA-SHELTER-ENTRY (Q25)
Onboarding de Membro de Abrigo sem abrigo: 2 caminhos.
- **Código**: `joinClubByCode` → painel
- **Criar novo**: `CreateOrganization` → `ShelterOnboardingWizard`
  (5 steps) → painel

### D-PERSONA-VOLUNTEER-POOL (Q26)
Voluntário sem vínculo com abrigo entra em um **POOL DE
VOLUNTÁRIOS DA PLATAFORMA** (não fica apenas "inativo").
- Filtros: região, tempo disponível, tarefas preferidas, raio
  de atuação, espécies preferidas.
- Abrigos podem **buscar/browse** o pool para convidar.
- Voluntário recebe notificação quando convidado.
- Páginas:
  - `/voluntarios/pool` (pública para voluntários)
  - `/organizacoes/:id/admin?tab=volunteers-pool` (admin do abrigo
    com permissão)

### D-PERSONA-SWITCHER-INCOMPLETE-BADGE (Q27)
Switcher mostra **todas** as personas disponíveis, mas as
incompletas têm badge "Incompleto". Ao clicar, redireciona para
continuar o onboarding.

### D-PERSONA-NO-EXPIRATION (Q28)
Personas **NÃO** expiram automaticamente. Membro/voluntário
fica disponível indefinidamente. Admin do abrigo pode
pausar/bloquear manualmente.

### D-PERSONA-MIGRATION-AUTO (Q29)
Pets cadastrados antes da V4: migração automática no primeiro
login pós-V4. User com `owner_type: 'user'` recebe persona
`donor` automaticamente.

### D-PERSONA-FLAG-GRADUAL (Q30)
Flag `V4_PERSONA_ENABLED` (default OFF). Plano de ativação:
1. Staging (testes E2E)
2. Migração de dados em produção (script)
3. Owner liga no próprio user
4. Validação manual
5. Liberação gradual (10% → 50% → 100%)

---

## §16. Resumo Final

| Item | Status |
|---|---|
| Personas definidas | ✅ 6 (Adotante, Doador, Membro Abrigo, Membro Comunidade, Voluntário, Admin Master) |
| Nomes UX aprovados | ✅ §15 D-PERSONA-NAMES-UX |
| Switcher modelado | ✅ Multi-persona, instantâneo, sem confirmação |
| Onboarding por persona | ✅ Especificado (incluindo `DonorOnboarding`, `AdopterOnboarding`, `ShelterEntry`, `CommunityEntry`) |
| Pool de voluntários | ✅ Detalhado (D-PERSONA-VOLUNTEER-POOL) |
| 30 perguntas respondidas | ✅ §11 |
| 22 decisões D-PERSONA-* | ✅ §15 |
| Edge cases | ✅ Q17-22 (multi-club, multi-roster, pet transfer, orphan pets) |
| Migração de dados | ✅ D-PERSONA-MIGRATION-AUTO |
| Plano de ativação | ✅ D-PERSONA-FLAG-GRADUAL |

---

## §17. Status de Implementação (2026-08-04)

> **ATUALIZAÇÃO**: A V4 foi **implementada completamente** e
> está **em produção** (deploy #1480, #1481) com feature flag
> `V4_PERSONA_ENABLED` default OFF. Veja `docs/EXEC_PLAN_V4_PERSONAS.md`
> para o log completo de execução.

### §17.1. Entregue

| Item | Status | Detalhes |
|---|---|---|
| **Fases 0-11** | ✅ DONE | 14 commits em `feature/v4-personas` |
| **Merge no main** | ✅ DONE | commit `71907a0b` |
| **Deploy #1480** | ✅ DONE | 3m 20s, sw-v91→v92 |
| **Hardening** | ✅ DONE | 11 correções pós-varredura, deploy #1481 |
| **Tests** | ✅ 2487/2487 passing | 65 V4 + 14 integration + 5 firestore |
| **Lint V4** | ✅ 0 errors | Apenas 2 warnings (fast refresh) |
| **Bundle** | ✅ sw-v92.js (216 entries) | Zero impacto (flag OFF) |

### §17.2. Decisões aplicadas (25 D-PERSONA-* + 5 hardening)

Todas em `docs/AI_GUIDE/13-DECISIONS.md §16` (originais) e §17 (hardening):

Originais V4 (25):
- D-PERSONA-MULTI, D-PERSONA-ONE-AT-A-TIME, D-PERSONA-ONBOARDING-ONCE
- D-PERSONA-SWITCH-NO-CONFIRM, D-PERSONA-SWITCHER-VISIBILITY
- D-PERSONA-FIRST-ACCESS-FORCED, D-PERSONA-NO-EXPIRATION
- D-PERSONA-MULTI-CLUB, D-PERSONA-MULTI-ROSTER-ISOLATED
- D-PERSONA-MEMBERSHIP-INDEPENDENT, D-PERSONA-PET-TRANSFER
- D-PERSONA-ORPHAN-PETS, D-PERSONA-ADMIN-CANNOT-DEMOTE
- D-PERSONA-DONOR-EXPLICIT-CONFIRM, D-PERSONA-FEED-EXCLUSIVE-ADOPTER
- D-PERSONA-NAMES-UX, D-PERSONA-SWITCHER-INCOMPLETE-BADGE
- D-PERSONA-MIGRATION-AUTO, D-PERSONA-FLAG-GRADUAL
- D-PERSONA-DONOR-ONBOARDING, D-PERSONA-SHELTER-ENTRY
- D-PERSONA-VOLUNTEER-POOL, D-PERSONA-ADOPTER-ONBOARDING
- D-PERSONA-ADMIN-OVERRIDE, D-PERSONA-ADMIN-OWNER-ONLY

Hardening pós-varredura (5):
- D-V4-FIRESTORE-VALIDATION-ACTIVE-PERSONA
- D-V4-FIRESTORE-VALIDATION-PERSONAS-ENABLED
- D-V4-ENABLE-PERSONA-VALIDATION
- D-V4-PERSONA-SELECTION-ARIA
- D-V4-CHECKLIST-POS-MERGE

### §17.3. Ativação (Rollout Q30)

V4 está **default OFF** — zero impacto em produção. Owner ativa
gradualmente em 5 etapas: 1% → 5% → 25% → 50% → 100% dos
usuários, com 1-2 dias de monitoramento entre cada.

Ver §5 de `docs/AI_GUIDE/19-V4-PERSONAS-INDEX.md` para ativar
via Firebase Remote Config.

### §17.4. Próximos passos (pós-merge)

- **Owner**: ativar `V4_PERSONA_ENABLED` em staging primeiro
- **Owner**: rollout gradual conforme D-PERSONA-FLAG-GRADUAL (Q30)
- **DevOps**: monitorar erros via Sentry/errorTracker
- **Backlog**: 123 ocorrências de `toast({title,description,variant})`
  (D-TOAST-SONNER-API) em chat/communities/organizations

---

**FIM do guia de estruturação e planejamento da V4 — v1.1 (DEFINIÇÕES APROVADAS + IMPLEMENTAÇÃO CONCLUÍDA 2026-08-04)**
