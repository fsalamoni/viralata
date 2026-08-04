# PERSONA_CAPABILITIES — Segmentação de Funcionalidades por Persona

> **Status**: BLUEPRINT DE SEGMENTAÇÃO (guia para implementação)
> **Data**: 2026-08-04 · **Autor**: Claude · **Solicitante**: fsalamoni@gmail.com
> **Base**: rotas e componentes REAIS do `main` (App.jsx, Layout.jsx,
> PersonaBottomTabBar.jsx) + `docs/PLAN_PERSONAS_V4.md` §18.
> **Objetivo**: cada persona vê e acessa **apenas** o que é útil para a sua
> experiência. Topbar, navegação e ferramentas se adaptam à persona ativa.

---

## §1. Princípios (as regras que guiam TODA a segmentação)

1. **Persona = experiência.** A navegação (topbar + barra inferior + CTAs do
   header) mostra só o que interessa àquela persona. Ex.: **o Feed é
   exclusivo do Adotante** — nenhuma outra persona precisa dele.

2. **Esconder da navegação ≠ bloquear a URL.** Páginas **públicas**
   (detalhe público de pet, página pública de abrigo/comunidade, diretórios,
   vitrines) precisam continuar acessíveis por link direto (SEO,
   compartilhamento em redes, QR). Elas somem da NAVEGAÇÃO de quem não
   precisa, mas continuam abrindo por URL. Isso é intencional.

3. **Painéis administrativos são gated de verdade.** Diferente do conteúdo
   público, os painéis (`/organizacoes/:id/admin`, `/comunidade/:id/admin`) e
   as ferramentas exclusivas (meus-pets do doador, escalas do voluntário) são
   protegidos por `PersonaGate` — só aparecem E só abrem na persona certa
   (com o `platform_admin` como override total).

4. **Segurança real continua nas Firestore rules.** A segmentação por persona
   é de **UX**; nenhuma regra de segurança depende da persona ativa (que é
   estado do cliente). Defense-in-depth: rules gate por
   role/membership/owner_id.

5. **Fonte única da verdade.** Toda a segmentação vem de UM módulo de config
   (`personaCapabilities`). Topbar, barra inferior, CTAs do header e os gates
   de rota derivam dele — nada de listas hardcoded espalhadas (hoje o
   `NAV_ITEMS` do topbar e o botão "Cadastrar Pet" estão soltos e iguais para
   todos).

6. **Admin master = override.** O `platform_admin` enxerga tudo e tem uma
   entrada própria no switcher; nunca é bloqueado.

---

## §2. As 6 personas — o que cada uma VÊ e ACESSA

Legenda de navegação: **Topbar** = nav do header desktop + CTAs;
**Barra** = barra inferior (mobile); **Home** = destino ao ativar a persona.

### §2.1. Adotante (`adopter`) — "Adotar / Ajudar"
O usuário comum: consome conteúdo, adota, apoia a causa.

- **Topbar nav**: Feed · Abrigos · Comunidades · Chat · (busca)
- **Barra**: Feed · Abrigos · Comunidades · [Buscar] · Chat · Perfil
- **Home**: `/feed`
- **PODE (aparece + acessa)**:
  - Feed de pets (`/feed`, `/busca`, `/radar`)
  - Detalhe público do pet (`/pet/:petId`, `/pets/:petId`)
  - Demonstrar interesse e acompanhar (`/quero-adotar/:petId`,
    `/meus-interesses`, `/adocoes/:clubId/:applicationId`, `/adoptions`)
  - Diretórios e páginas públicas (`/organizacoes`, `/organizacoes/:id`,
    `/comunidade`, `/comunidade/:id`, `/comunidades/:slug`, `/abrigos/:id`,
    `/vitrines`, `/lares-temporarios`, `/eventos`)
  - Interagir no mural/fórum público (curtir/comentar — read+interact)
  - Denunciar maus-tratos (`/denuncias/nova`)
  - Chat 1:1 com doadores/abrigos (`/chat`)
- **NÃO vê / NÃO acessa (some da nav; painéis são gated)**:
  - Cadastrar pet, "Meus pets", candidatos (é do Doador)
  - Qualquer painel admin de abrigo/comunidade
  - Ferramentas de voluntário
  - `/admin/*`
- **Onboarding 1º acesso**: `/onboarding/adotante` (dados de cadastro +
  perfil de adotante: moradia, rotina, família, orçamento, LGPD).

### §2.2. Doador Individual (`donor`) — "Doar um pet"
Cuida de pets que coloca para adoção. **Não** navega para adotar.

- **Topbar nav**: Meus pets · Candidatos · Chat · **CTA: + Cadastrar pet**
- **Barra**: Meus pets · [+ Pet] · Candidatos · Chat · Perfil
- **Home**: `/meus-pets` (ou `/dashboard/doador`); se 0 pets → `/pets/new`
- **PODE**: criar/editar pet (`/pets/new`, `/pets/:id/edit`), meus pets
  (`/meus-pets`, `/dashboard/doador`), ver/gerir candidatos aos seus pets,
  marcar como adotado + avaliar, página pública do próprio pet, chat com
  interessados.
- **NÃO vê**: **Feed** (não está procurando adotar), **Radar**, "quero
  adotar" em pets de terceiros, painéis de abrigo/comunidade, voluntário,
  `/admin/*`.
- **Onboarding**: `/onboarding/doador` (dados + motivo da doação,
  experiência) → direciona para cadastrar o 1º pet.

### §2.3. Membro de Abrigo (`shelter_staff`) — "Meu abrigo"
Visão **administrativa** de UM abrigo (escopo = `active_shelter_id`), com as
funcionalidades que o dono/admin lhe atribuiu (`club_members.permissions`).

- **Topbar**: logo do abrigo + **seletor de abrigo** (se >1) · nav: Painel ·
  Pets · Mural · Candidatos (conforme permissões) · Notif · Avatar
- **Barra**: Painel · Mural · Pets · Candidatos · Perfil (itens conforme
  permissão)
- **Home**: `/organizacoes/:orgId/admin`
- **PODE (dentro do painel, por permissão granular)**:
  - Gestão de animais (planilha, importar/exportar, cadastrar/editar,
    tabelas operacionais: medicações, consultas, tratamentos, vacinas,
    cuidados, adoções, devoluções)
  - Aprovar/rejeitar candidatos à adoção
  - Mural e fórum do abrigo (gestão)
  - Doações/campanhas · Prestação de contas (finance) · Equipe · Voluntários
    (roster) · Configurações · Kanban · Vitrines · Relatórios · Indicadores ·
    Lares temporários
  - Cadastrar pet do abrigo (`/pets/new` com `owner_type=organization`)
  - Contratos/entrevistas (`/abrigos/:id/contracts`, `/interviews`)
- **NÃO vê**: **Feed**, "Meus pets" (pessoais), Radar, ferramentas de doador,
  painel de **outro** abrigo (troca de escopo via seletor), painel de
  comunidade, `/admin/*`.
- **Onboarding/entrada**: sem abrigo → `/entrar/abrigo` (inserir código OU
  criar). Com vínculo → entra direto no painel.

### §2.4. Membro de Comunidade (`community_staff`) — "Minha comunidade"
Visão administrativa de UMA comunidade (escopo = `active_community_id`).

- **Topbar**: logo da comunidade + **seletor** (se >1) · nav: Painel · Mural ·
  Fórum · Eventos · Notif · Avatar
- **Barra**: Painel · Mural · Fórum · Eventos · Perfil
- **Home**: `/comunidade/:communityId/admin`
- **PODE**: mural, fórum, eventos (criar/gerir RSVPs), equipe, configurações
  da comunidade.
- **NÃO vê (comunidade não tem)**: pets, doações, prestação de contas,
  voluntários; além de Feed, Radar, painel de abrigo, `/admin/*`.
- **Onboarding/entrada**: sem comunidade → `/entrar/comunidade` (código OU
  criar). Com vínculo → painel.

### §2.5. Voluntário (`volunteer`) — "Ser voluntário"
Ferramentas do voluntário; se vinculado a abrigo(s), opera **um por vez**
(escopo = `active_volunteer_club_id`), com o que aquele abrigo lhe atribuiu.
**Não é** membro/equipe — permissões mais limitadas.

- **Topbar**: logo + **seletor de abrigo vinculado** · nav: Início · Escalas ·
  Tarefas · Notif · Avatar
- **Barra**: Início · Escalas · Tarefas · Mural (do abrigo) · Perfil
- **Home**: `/perfil/voluntario` (com contexto do abrigo selecionado)
- **PODE**: perfil de voluntário (raio, experiência), escalas/turnos, minhas
  tarefas, auditoria de participação, mural/fórum do abrigo (interagir, sem
  poderes admin), eventos do abrigo (participar), pets do abrigo (**somente
  leitura**), lares temporários (se for foster).
- **NÃO vê**: painel admin do abrigo, edição de pets, financeiro, equipe,
  configurações; Feed, Radar, doador, comunidade admin, `/admin/*`.
- **Onboarding/entrada**: não-voluntário → `/voluntarios/seja` (cadastro:
  termo + perfil + abrigo).

### §2.6. Admin Master (`platform_admin`) — oculto
Override total. Só visível para `users/{uid}.role == 'platform_admin'`.

- **Topbar/Barra**: Admin · (acesso rápido) · Perfil
- **Home**: `/admin`
- **PODE**: todo o `/admin/*` (19 sub-páginas: pets, denúncias, usuários,
  organizações, comunidades, métricas, auditoria, notificações,
  configurações, flags, saúde, security-alerts, alertas, admins, mock-data,
  parceiros, personas) **+ override** para ver qualquer persona/abrigo/
  comunidade.

---

## §3. Matriz mestre rota → persona

`A`=Adotante · `D`=Doador · `S`=Abrigo · `C`=Comunidade · `V`=Voluntário ·
`M`=Admin master · `PUB`=público (anônimo, sempre acessível por URL).
"nav" = aparece na navegação da persona; "url" = acessível por link mas fora
da nav; "—" = não acessível (gated).

| Rota | A | D | S | C | V | M |
|---|---|---|---|---|---|---|
| `/feed`, `/busca`, `/radar` | **nav** | — | — | — | — | nav |
| `/pet/:id`, `/pets/:id` (público) | nav | url(seu) | url | url | url | url |
| `/quero-adotar/:id`, `/meus-interesses`, `/adocoes/...`, `/adoptions` | **nav** | — | — | — | — | url |
| `/pets/new`, `/meus-pets`, `/pets/:id/edit`, `/dashboard/doador` | — | **nav** | nav¹ | — | — | url |
| `/organizacoes`, `/comunidade`, `/vitrines`, `/lares-temporarios`, `/eventos` (diretórios/público) | nav | url | url | url | url | nav |
| `/organizacoes/:id`, `/comunidade/:id`, `/comunidades/:slug`, `/abrigos/:id` (páginas públicas) | url | url | url | url | url | url |
| `/organizacoes/:orgId/admin` | — | — | **nav**(scope) | — | — | url |
| `/comunidade/:id/admin` | — | — | — | **nav**(scope) | — | url |
| `/perfil/voluntario`, `/voluntarios/pool` | — | — | — | — | **nav**(scope) | url |
| `/voluntarios`, `/voluntarios/seja`, `/voluntarios/termo` | url² | — | — | — | nav | url |
| `/entrar/abrigo` | — | — | nav(sem abrigo) | — | — | url |
| `/entrar/comunidade` | — | — | — | nav(sem com.) | — | url |
| `/chat` | **nav** | **nav** | nav | — | — | url |
| `/denuncias/nova` | nav | url | url | url | url | url |
| `/perfil`, `/preferencias`, `/acesso`, notificações | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `/admin/*` | — | — | — | — | — | **nav** |
| `/`, `/login`, `/legal/*`, `/termos`, `/politica-privacidade`, `/legislacao` | PUB | PUB | PUB | PUB | PUB | PUB |

¹ Abrigo cadastra pet via `/pets/new?owner_type=organization` a partir do
painel. ² "Seja voluntário" é um CTA de conversão disponível ao adotante
(qualquer um pode virar voluntário), mas não um item de nav principal.

**Rotas legadas a redirecionar** (herança do template esportivo, fora do
escopo de persona): `/atletas`, `/clubes`, `/inicio`, `/mural` (alias),
`/dashboard/doador` (manter como home doador). Tratar com redirects.

---

## §4. Segmentação no Banco de Dados

A segmentação **de dados** já é boa; o que falta é a **fonte de capacidades**
(config) e amarrar tudo a ela. Estrutura canônica:

### §4.1. Estado da persona (em `users/{uid}`)
- `active_persona: string` — persona ativa (`'shelter_staff:clubId'` etc.)
- `personas_enabled: string[]` — personas liberadas (cache; a verdade são os
  vínculos abaixo)
- `active_shelter_id`, `active_community_id`, `active_volunteer_club_id` —
  escopo selecionado por persona escopada
- `role` — `'user' | 'platform_admin'`
- **Identidade compartilhada** (comum a todas as personas): `full_name`,
  `phone`, `city`, `state`, `cpf`, `lgpd_consent_at`, `profile_completed`

### §4.2. Perfil POR persona (subcoleções — dado isolado)
- `users/{uid}/adopter_profile/main` — moradia, rotina, família, orçamento,
  preferências de espécie/raio ✅ existe
- `users/{uid}/donor_profile/main` — motivo, experiência, contato ✅ existe
- `users/{uid}/volunteer_profile/main` — termo, assinatura, raio, skills,
  disponibilidade ✅ existe
- **Abrigo/Comunidade não usam subcoleção em `users`** — a fonte canônica é o
  vínculo (abaixo), que já carrega papel + permissões.

### §4.3. Vínculos + permissões granulares (grants)
- `club_members/{clubId_uid}` → `{ role, permissions{animals,finance,
  donations,feed,team,...} }` — grant de abrigo ✅
- `community_members/{communityId_uid}` → `{ role, permissions }` — grant de
  comunidade ✅
- `clubs/{clubId}/volunteers/{uid}` → `{ status, permissions[shifts,tasks,
  audit], ... }` — roster de voluntário POR abrigo (isolado) ✅

### §4.4. Definição de capacidades = CONFIG de app (não DB)
"O que cada TIPO de persona vê/faz" é **regra da aplicação**, não dado
por-usuário — não deve ser duplicado no Firestore (seria denormalização
frágil). Fica em **um** módulo `src/core/domain/personaCapabilities.js`
(fonte única). O DB guarda o **estado** (persona ativa), os **perfis** e os
**grants**; o app resolve as **capacidades** cruzando persona + grants.

> Regra de ouro de segmentação: **DB = estado + perfis + grants** (por
> usuário); **código = capacidades** (por tipo de persona). Cada perfil de
> persona numa subcoleção própria; nada de misturar campos de personas
> diferentes no doc raiz de `users` além da identidade compartilhada.

---

## §5. Arquitetura proposta (fonte única de verdade)

Criar `src/core/domain/personaCapabilities.js` exportando, por
`PERSONA_TYPE`, um descritor:

```js
// Pseudo-estrutura (a detalhar na implementação)
{
  [PERSONA_TYPE.ADOPTER]: {
    home: '/feed',
    topbarNav: [ {label:'Feed', to:'/feed'}, {label:'Abrigos', to:'/organizacoes'},
                 {label:'Comunidades', to:'/comunidade'}, {label:'Chat', to:'/chat'} ],
    bottomNav: [ ... ],                 // (hoje em PersonaBottomTabBar — unificar)
    headerCTAs: [],                     // sem "Cadastrar pet"
    shows: { chat:true, notifications:true, search:true },
    // padrões de rota EXCLUSIVOS desta persona (para PersonaGate):
    ownsRoutes: ['/feed','/radar','/meus-interesses','/quero-adotar','/adoptions'],
  },
  [PERSONA_TYPE.DONOR]: {
    home: '/meus-pets',
    topbarNav: [ {label:'Meus pets', to:'/meus-pets'}, {label:'Candidatos', ...}, {label:'Chat', to:'/chat'} ],
    headerCTAs: [ {label:'+ Cadastrar pet', to:'/pets/new'} ],
    ownsRoutes: ['/meus-pets','/pets/new','/dashboard/doador'],
    ...
  },
  // shelter_staff / community_staff usam funções (scopeId → rotas do painel)
  // volunteer idem (clubId)
  // platform_admin: home '/admin', vê tudo
}
```

Tudo passa a **derivar** disso:
- **Topbar** (`Layout.jsx`): troca o `NAV_ITEMS` hardcoded + o botão fixo
  "Cadastrar Pet" por `capabilities[activePersona.type].topbarNav/headerCTAs`.
  Com `V4_PERSONA_ENABLED` OFF → mantém o `NAV_ITEMS` atual (fallback).
- **Barra inferior** (`PersonaBottomTabBar.jsx`): passa a ler `bottomNav` da
  mesma fonte (hoje tem a sua própria tabela — unificar para não divergir).
- **Gates de rota** (`PersonaRouteGates` / `PersonaGate`): as rotas
  exclusivas (`ownsRoutes`) recebem gate; o conteúdo público continua sem
  gate (acessível por URL). Admin master faz override.

---

## §6. Plano de implementação (fatias verificáveis, atrás das flags)

1. **`personaCapabilities.js`** — a fonte única (nav, CTAs, home, ownsRoutes,
   shows) + testes de unidade. (sem efeito visual)
2. **Topbar adaptativo** — `Layout` deriva nav desktop + CTAs da persona
   ativa. Resolve o exemplo do solicitante ("só o adotante tem Feed"). V4
   OFF = comportamento atual.
3. **Unificar a barra inferior** com a mesma fonte (remove a tabela
   duplicada do `PersonaBottomTabBar`).
4. **Gating das rotas exclusivas** por persona (donor: meus-pets/novo;
   volunteer: perfil/voluntario; adopter: interesses/radar), preservando o
   acesso público por URL. Fallback do gate: auto-ativar a persona se o user
   já a possui, senão `/acesso`.
5. **Home dinâmica** — `/` redireciona para a home da persona ativa (V4 ON).
6. **Redirects de rotas legadas** (`/atletas`, `/clubes`, `/inicio`).

Tudo atrás de `V4_PERSONA_*` (default OFF): zero impacto no público até
ligar; o solicitante (que já ligou) valida cada fatia.

---

## §7. Status de implementação (2026-08-04)

- **Fatia 1 — FEITO**: `src/core/domain/personaCapabilities.js` (fonte única:
  topbarNav, headerCTAs, bottomNav por persona) + testes.
- **Fatia 2 — FEITO**: topbar adaptativo — `Layout` renderiza
  `PersonaTopbarNav` / `PersonaHeaderCTAs` / `PersonaMobileNav` quando a V4
  está ligada (Feed só do adotante; "Cadastrar pet" só do doador; nav do
  abrigo/comunidade/voluntário por escopo). Com a flag OFF → `NAV_ITEMS`
  clássico (inalterado).
- **Fatia 3 — FEITO**: `PersonaBottomTabBar` passou a consumir a mesma fonte
  (removida a tabela duplicada).
- **Fatia 4 — FEITO**: gating das rotas exclusivas por persona
  (`PersonaRouteGates`: AdopterGate p/ `/feed`,`/busca`,`/radar`,
  `/meus-interesses`; DonorGate p/ `/meus-pets`,`/dashboard/doador`;
  PetManageGate p/ `/pets/new`,`/pets/:id/edit` (doador OU abrigo);
  VolunteerGate p/ `/perfil/voluntario`,`/voluntarios/pool`). Conteúdo
  público segue sem gate; admin master tem override; passthrough com V4 OFF.
- **Fatia 5 — FEITO**: home dinâmica — `/` leva à home da persona ativa
  quando a V4 está ligada e o usuário está autenticado (`HomeLanding` +
  `PersonaHomeRedirect`); anon/V4-off → landing.
- **Fatia 6 — JÁ EXISTIA**: `/inicio`→`/feed`, `/clubes`→`/comunidade`,
  `/atletas`→`/feed` já eram redirects no App.jsx.

---

**FIM — blueprint de segmentação por persona (v1.1, 2026-08-04)**
