import { SHELTER_FEATURE_FLAG, SHELTER_FEATURE_FLAG_META as SHELTER_META } from '@/modules/shelter/domain/constants';

/**
 * Catálogo de feature flags da plataforma.
 *
 * As flags são guardadas em um único documento do Firestore
 * (`platform_settings/global`, campo `feature_flags`) e podem ser ligadas/
 * desligadas em tempo de execução pelo admin master.
 *
 * TODAS as flags nascem DESLIGADAS (`false`). Enquanto uma flag está desligada
 * a funcionalidade associada fica completamente invisível e inerte — nada do
 * comportamento já existente é alterado. Isso garante que estas implementações
 * sejam puramente aditivas.
 */

export const FEATURE_FLAG = Object.freeze({
  /**
   * Espaço de anúncios: exibe um card "Conteúdo patrocinado" não intrusivo no
   * feed de pets e no painel de gestão de pets da ONG. Não há integração real
   * com uma rede de anúncios — é apenas o placeholder visual/estrutural,
   * pronto para receber um script de ads futuramente. Aditivo — desligado,
   * nenhum card aparece.
   */
  AD_SLOTS: 'ad_slots',
  /**
   * Bloco "Viralata em números" na Home: contadores agregados públicos
   * (pets cadastrados, adoções, abrigos). Usa getCountFromServer —
   * barato, sem Cloud Function. Aditivo — desligado, o bloco some.
   */
  HOME_STATS_V1: 'home_stats_v1',

  /**
   * Correção de confiabilidade do Feed de pets: aplica filtros de espécie,
   * porte, cidade e raio client-side (em cima de uma única query no Firestore),
   * substituindo o cruzamento atual de índices compostos que falha com
   * `failed-precondition`. Enquanto desligada, o Feed original é renderizado
   * sem qualquer alteração de comportamento.
   */
  PET_FEED_RELIABILITY_FIX: 'pet_feed_reliability_fix',

  /**
   * Mural com curtidas e comentários: habilita o `MuralTabEnhanced`, que
   * permite curtir/descurtir posts e ler/adicionar/excluir comentários
   * diretamente na UI. Enquanto desligada, o mural original é renderizado
   * (somente leitura, sem like/comment).
   */
  MURAL_LIKES_AND_COMMENTS: 'mural_likes_and_comments',

  /**
   * Explicação de bloqueio de adoção/chat: na página do pet, mostra um card
   * ("Por que não posso adotar/chat?") listando os motivos do bloqueio
   * quando o usuário não pode registrar interesse nem abrir conversa com o
   * responsável (perfil incompleto, pet já adotado/em processo, você é o
   * dono, etc.). As validações de permissão ficam ativas independente da
   * flag — ela controla apenas a UX explicativa. Desligada, o usuário
   * recebe o botão desabilitado sem explicação.
   */
  PET_ADOPTION_GATING: 'pet_adoption_gating',

  /**
   * Mural com anexos: habilita o `MuralTabAdmin`, que permite ao admin da
   * comunidade (ou membros com permissão `feed`) criar posts com anexos
   * (imagens, vídeos, PDFs, documentos) além de curtidas e comentários.
   * Quando ligada, sobrescreve `MURAL_LIKES_AND_COMMENTS` (a versão Admin
   * já inclui tudo da Enhanced). Desligada, o mural renderiza em modo
   * somente leitura ou sem anexos (conforme as outras flags).
   */
  MURAL_RICH_POSTS: 'mural_rich_posts',

  /**
   * Cabeçalho-padrão das páginas (PageHero): quando ligada, as páginas que
   * já usam o componente `<PageHero>` (e as que forem migradas) passam a
   * renderizar o card gradiente laranja→rosa com o título da página DENTRO
   * do card, em vez de um h1 simples sem painel. O gradiente usa as CSS
   * vars `--cover-from`/`--cover-to` (`src/index.css`), que por padrão são
   * laranja→rosa (a cor-padrão da plataforma). A `<ClubDetail>` (capa da
   * ONG) e a `<Home>` (landing de marketing) ficam de fora — elas têm
   * padrões visuais próprios. Desligada, cada `<PageHero>` se degrada
   * para um `<header>` simples sem gradiente; páginas que ainda não usam
   * `<PageHero>` permanecem inalteradas. É puramente aditiva.
   */
  PAGE_HERO_ENABLED: 'page_hero_enabled',

  /**
   * Layout-padrão das páginas (largura, padding e espaçamento uniformes):
   * quando ligada, todas as páginas autenticadas passam a compartilhar o
   * mesmo wrapper raiz (`arena-page mx-auto max-w-6xl px-5 py-6 pb-12
   * space-y-6`) — 1152px de largura, 24px lateral e de topo, 24px de gap
   * entre seções filhas. Resolve as inconsistências históricas entre
   * páginas (algumas max-w-3xl, outras max-w-5xl, outras px-4, outras
   * px-5, outras com padding responsivo sm:px-6 lg:px-8). A navegação
   * entre páginas passa a sentir o mínimo de diferença estrutural.
   * Exceções controladas (mantidas como estão): `Home` e `ChatPage`
   * (full-bleed / split-pane) e o `success` de `ClubDetail` (a
   * `ClubCover` assume o topo com pt-0). Desligada, cada página mantém
   * seu wrapper original — puramente aditivo.
   */
  STANDARDIZED_PAGE_LAYOUT: 'standardized_page_layout',

  /**
   * Paridade visual da comunidade com a ONG: quando ligada, a página
   * pública da comunidade passa a usar um `<CommunityCover>` no mesmo
   * padrão do `<ClubCover>` da ONG (banner gradiente, marca-d'água,
   * avatar-iniciais sobreposto, nome, cidade e chips Padronizados).
   * E o painel de administração da comunidade passa a usar o mesmo
   * layout visual do painel da ONG (`arena-panel-strong` no header,
   * `arena-tab-bar`, stat cards `p-6 sm:p-7`, `mt-12 sm:mt-14` entre
   * abas e conteúdo), com **apenas** as abas pertinentes à comunidade
   * (Visão Geral, Mural, Equipe, Configurações). Abas específicas da
   * ONG (Geral, Pets, Doações, Financeiro, Conversas) ficam fora
   * porque não fazem sentido para comunidades.
   *
   * Desligada (default), a página pública da comunidade mantém seu
   * painel-flat simples e o painel admin mantém suas 3 abas originais
   * — puramente aditiva, nenhuma diferença visual antes de ligar.
   */
  COMMUNITY_NGO_PARITY: 'community_ngo_parity',

  /**
   * Detalhe público de evento de comunidade: rota /comunidade/:id/eventos/:eventId
   * com painel de participantes e RSVP (going/maybe/not_going). Cards de evento
   * na EventsTab ganham link para a página. Aditivo — desligado, sem mudança.
   */
  COMMUNITY_EVENT_DETAIL_V1: 'community_event_detail_v1',

  // ─── Sistema de Gestão do Abrigo (Fases 0-21) ───────────────────────────
  // Cada flag = 1 fase do SHELTER_MGMT_ROADMAP. Default OFF.
  // Guard against circular import (constants.js → featureFlags.js → constants.js)
  ...(SHELTER_FEATURE_FLAG ? Object.values(SHELTER_FEATURE_FLAG).reduce(
    (acc, key) => ({ ...acc, [key]: key }),
    {},
  ) : {}),

  /**
   * Painel de dados demo: quando ligada, expõe a rota `/admin/mock-data`
   * com botões para carregar e limpar os conjuntos de dados mockados
   * que vivem em `src/mocks/`. Os documentos são marcados com
   * `_mock: true` para permitir a limpeza precisa sem tocar em nada
   * criado por usuários reais. Útil para demos, treinamento,
   * validação visual de UX com dados realistas e testes de fluxo
   * ponta-a-ponta sem precisar popular manualmente cada coleção.
   *
   * Restrito ao platform_admin (a própria rota tem `AdminRoute`).
   * Default ON no projeto (uso pessoal do admin master). Pode ser
   * desligada em /admin/flags — a página some do menu admin.
   */
  MOCK_DATA_PANEL: 'mock_data_panel',

  /**
   * Melhorias de acessibilidade (WCAG AA): foco visível em todos os dialogs,
   * aria-label em botões de ícone, roles ARIA no kanban (region/list/option),
   * Escape fecha o lightbox, badge contrast ratios, alt text em imagens.
   * Aditivo — desligada, a UI funciona sem as melhorias a11y.
   */
  A11Y_IMPROVEMENTS_V1: 'a11y_improvements_v1',

  // ─── Design System v2 — Fase 4 (DS_V2 Reaplicação) ──────────────────────
  // Cada flag = 1 macrobloco do DS_V2. Default OFF. Ver docs/ROADMAP.md §
  // "Fase 4" + docs/AUDIT_DS_V2.md para o relatório completo.

  /**
   * DS_V2_DOCS — Reaplicação da spec oficial v1.0 na documentação. Bloco A
   * (concluído 2026-07-16, sem código a ligar). Aditivo.
   */
  DS_V2_DOCS: 'ds_v2_docs',

  /**
   * DS_V2_TOKENS — Material Symbols Outlined + Icon wrapper component.
   * Adiciona a fonte variável Material Symbols e um <Icon> canônico para
   * coexistência com lucide-react. Aditivo — desligada, lucide continua.
   */
  DS_V2_TOKENS: 'ds_v2_tokens',

  /**
   * DS_V2_COMPONENTS — Refatora Button, Card, Input, Dialog, Table, Avatar
   * contra a spec v1.0 §3. Mantém 100% de compatibilidade com a API shadcn.
   * Aditivo — desligada, os componentes permanecem na versão anterior.
   */
  DS_V2_COMPONENTS: 'ds_v2_components',

  /**
   * DS_V2_PAGES-HOME — Refinamentos da Home: Icon Material Symbols no hero
   * (size 130 filled), Avatar component nas histórias, H1 Sora 800. Desligada,
   * Home usa a versão anterior.
   */
  DS_V2_PAGES_HOME: 'ds_v2_pages_home',

  /**
   * DS_V2_PAGES-PETS — PetCard (referência canônica §3.3) com aspect-ratio
   * 1.3, Card size="pet", Icon Material Symbols para espécie. PetDetail com
   * Avatar component no bloco do responsável. Aditivo.
   */
  DS_V2_PAGES_PETS: 'ds_v2_pages_pets',

  /**
   * DS_V2_PAGES-ADOPTION — AdoptionDetail, AdoptionWizard, MyApplications
   * validados contra spec (audit only — já estavam alinhados). Aditivo.
   */
  DS_V2_PAGES_ADOPTION: 'ds_v2_pages_adoption',

  /**
   * DS_V2_PAGES-ORG — ClubsDirectory, ClubDetail, EventDetail, OrganizationsHub,
   * OrganizationAdminPanel validados contra spec (audit only). Aditivo.
   */
  DS_V2_PAGES_ORG: 'ds_v2_pages_org',

  /**
   * DS_V2_PAGES-ADMIN — AdminDashboard, AdminMetrics, AdminPets, AdminUsers,
   * AdminReports, AdminContentEditor validados contra spec (audit only).
   * Aditivo.
   */
  DS_V2_PAGES_ADMIN: 'ds_v2_pages_admin',

  /**
   * DS_V2_PAGES-CHAT — ChatPage, Profile, Login, Onboarding, institucionais
   * validados contra spec (audit only). Aditivo.
   */
  DS_V2_PAGES_CHAT: 'ds_v2_pages_chat',

  /**
   * DS_V2_MOTION — Wrappers de motion: <FadeIn>, <Stagger>, <HoverLift> +
   * useReducedMotionSafe. Respeita prefers-reduced-motion. Aditivo.
   */
  DS_V2_MOTION: 'ds_v2_motion',

  /**
   * DS_V2_AUDIT — Auditoria final + correções de tokens literais (badge
   * success: bg-success/15, user-avatar: bg-accent, AdminMockData: bg-success).
   * Aditivo — desligada, tokens literais permanecem.
   */
  DS_V2_AUDIT: 'ds_v2_audit',

  // ─── V3 — Redesign página por página (TASK-V3-FEED-1) ──────────────
  // Cada flag = 1 página. Default OFF. Ativada no admin master quando
  // o redesign da página estiver pronto e validado. Ver
  // docs/PLAN_V3_REDESIGN.md.
  V3_PAGE_FEED: 'v3_page_feed',
  V3_PAGE_HOME: 'v3_page_home',
  V3_PAGE_LOGIN: 'v3_page_login',
  V3_PAGE_LEGAL: 'v3_page_legal',
  V3_PAGE_PET_DETAIL: 'v3_page_pet_detail',
  // TASK-V3-PET-DETAIL-VIEW: flag EXCLUSIVA da página PÚBLICA de
  // visualização de pet (rota /pet/:petId, singular). Separada da
  // V3_PAGE_PET_DETAIL (que rege a página de ADMIN em /pets/:petId).
  // Ver docs/REGENCY_PET_DETAIL_VIEW_V3.md.
  PET_DETAIL_VIEW_V1: 'pet_detail_view_v1',
  V3_PAGE_COMMUNITY_DETAIL: 'v3_page_community_detail',
  V3_PAGE_CLUB_DETAIL: 'v3_page_club_detail',
  V3_PAGE_PROFILE: 'v3_page_profile',
  V3_PAGE_CHAT: 'v3_page_chat',
  V3_PAGE_ADOPTION: 'v3_page_adoption',
  V3_PAGE_ORG_ADMIN: 'v3_page_org_admin',
  V3_PAGE_COMMUNITY_ADMIN: 'v3_page_community_admin',
  V3_PAGE_SHELTER_ADMIN: 'v3_page_shelter_admin',
  V3_PAGE_SEARCH: 'v3_page_search',
  V3_PAGE_EVENTS: 'v3_page_events',
  V3_PAGE_FOSTER: 'v3_page_foster',
  V3_PAGE_VOLUNTEER: 'v3_page_volunteer',
  V3_PAGE_MURAL: 'v3_page_mural',
  V3_PAGE_ADMIN: 'v3_page_admin',
  ADMIN_PARTNER_SPACES_V1: 'admin_partner_spaces_v1',
  PUBLIC_PARTNER_BANNERS_V1: 'public_partner_banners_v1',

  /**
   * Marketplace geral da plataforma: rota `/mercado` que compila os produtos
   * públicos de TODAS as lojas dos abrigos num só lugar, com filtros e
   * ordenação (por abrigo, cidade, estado, categoria, preço). Aparece na
   * navegação de TODAS as personas MENOS o acesso de abrigo (shelter_staff).
   * Depende, na prática, da flag `shelter_store_v1` (é ela que produz os
   * produtos que o marketplace agrega). Aditivo — desligada, a rota e o item
   * de navegação somem. Default OFF.
   */
  PLATFORM_MARKETPLACE_V1: 'platform_marketplace_v1',

  // ─── V4 · PERSONAS (separa plataforma em 6 acessos dedicados) ─────────
  // D-PERSONA-FLAG-GRADUAL (2026-08-03): cada flag = 1 sub-fase.
  // Default OFF em todas — owner liga quando estiver pronto.
  // Ver docs/PLAN_PERSONAS_V4.md v1.1 e docs/AI_GUIDE/13-DECISIONS.md §16.
  V4_PERSONA_ENABLED: 'v4_persona_enabled',                 // Master switch
  V4_PERSONA_ADOPTER: 'v4_persona_adopter',                 // Persona 1
  V4_PERSONA_DONOR: 'v4_persona_donor',                     // Persona 2
  V4_PERSONA_SHELTER_STAFF: 'v4_persona_shelter_staff',     // Persona 3
  V4_PERSONA_COMMUNITY_STAFF: 'v4_persona_community_staff', // Persona 4
  V4_PERSONA_VOLUNTEER: 'v4_persona_volunteer',             // Persona 5
  V4_PERSONA_PLATFORM_ADMIN: 'v4_persona_platform_admin',   // Persona 6
  V4_PERSONA_SWITCHER: 'v4_persona_switcher',               // Botão switch TopBar
  V4_PERSONA_SELECTION: 'v4_persona_selection',             // Tela /acesso primeiro acesso
  V4_PERSONA_VOLUNTEER_POOL: 'v4_persona_volunteer_pool',   // Pool de voluntários Q26
  V4_PERSONA_PET_TRANSFER: 'v4_persona_pet_transfer',       // Transfer pet p/ abrigo Q20
});

/** Metadados de exibição para o painel de flags (admin master). */
export const FEATURE_FLAG_META = Object.freeze({
  [FEATURE_FLAG.HOME_STATS_V1]: {
    label: 'Home · Viralata em números',
    description:
      'Exibe na Home os contadores agregados da plataforma (pets '
      + 'cadastrados, adoções concretizadas, abrigos ativos). Contagem via '
      + 'aggregate query do Firestore. Desligado, o bloco não aparece.',
  },
  [FEATURE_FLAG.AD_SLOTS]: {
    label: 'Espaço de anúncios',
    description:
      'Exibe um card "Conteúdo patrocinado" no feed de pets e no painel de '
      + 'gestão de pets da ONG. Apenas o placeholder visual — não há '
      + 'integração com uma rede de anúncios real. Desligado, nenhum card '
      + 'aparece.',
  },
  [FEATURE_FLAG.PET_FEED_RELIABILITY_FIX]: {
    label: 'Feed de pets · correção de confiabilidade',
    description:
      'Aplica os filtros (espécie, porte, cidade, raio) no cliente, sobre '
      + 'uma única query do Firestore. Elimina o cruzamento de índices '
      + 'compostos que vinha derrubando o feed com `failed-precondition`. '
      + 'Quando o filtro de localização zera a lista mas ainda há pets '
      + 'compatíveis, exibe um banner explicando o fallback e mantém os '
      + 'pets visíveis. Desligada, o feed original segue intacto.',
  },
  [FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS]: {
    label: 'Mural · curtidas e comentários',
    description:
      'Permite curtir/descurtir os posts do mural e ler/adicionar/excluir '
      + 'comentários diretamente na interface. Usa `community_post_likes` '
      + 'e `community_post_comments` (já existentes no Firestore). '
      + 'Desligada, o mural renderiza em modo somente leitura, sem '
      + 'qualquer alteração no comportamento atual.',
  },
[FEATURE_FLAG.PET_ADOPTION_GATING]: {
    label: 'Explicação de bloqueio na adoção/chat',
    description:
      'Mostra um card na página do pet com o(s) motivo(s) de o usuário não '
      + 'conseguir adotar nem abrir chat com o responsável (perfil '
      + 'incompleto, pet já adotado/em processo, você é o dono, etc.). '
      + 'As validações de permissão já ficam ativas mesmo com a flag '
      + 'desligada — ela apenas controla o texto explicativo. Desligada, '
      + 'o usuário recebe o botão desabilitado sem a explicação.',
  },
  [FEATURE_FLAG.MURAL_RICH_POSTS]: {
    label: 'Mural · posts com anexos',
    description:
      'Permite ao admin da comunidade (e membros com permissão `feed`) '
      + 'criar posts no mural com anexos (fotos, vídeos, PDFs, '
      + 'documentos), além de curtidas e comentários. Os anexos são '
      + 'armazenados via `storageService.uploadImage` (Firebase Storage). '
      + 'Desligada, o mural renderiza em modo somente leitura ou sem '
      + 'anexos (conforme as outras flags).',
  },
  [FEATURE_FLAG.PAGE_HERO_ENABLED]: {
    label: 'Cabeçalho-padrão das páginas (PageHero)',
    description:
      'Quando ligada, as páginas que usam `<PageHero>` passam a '
      + 'renderizar o card gradiente laranja→rosa (a cor-padrão da '
      + 'plataforma) com o título da página dentro do card. A Home, a '
      + 'capa da ONG (`ClubDetail`) e a capa de comunidade têm padrões '
      + 'visuais próprios e não são afetadas. Desligada, cada `<PageHero>` '
      + 'se degrada para um cabeçalho simples sem gradiente; páginas '
      + 'ainda não migradas ficam inalteradas. Puramente aditiva.',
  },
  [FEATURE_FLAG.STANDARDIZED_PAGE_LAYOUT]: {
    label: 'Layout-padrão das páginas (largura + espaçamento)',
    description:
      'Quando ligada, todas as páginas autenticadas passam a usar o '
      + 'mesmo wrapper raiz (`arena-page mx-auto max-w-6xl px-5 py-6 '
      + 'pb-12 space-y-6`) — 1152px de largura, 24px de padding '
      + 'lateral e vertical, 24px de gap entre seções. Resolve a '
      + 'inconsistência histórica entre páginas com max-w-3xl/4xl/5xl/6xl, '
      + 'px-4/px-5 e padding responsivo. Exceções mantidas: `Home`, '
      + '`ChatPage` e o topo da `ClubDetail` (que tem `ClubCover`). '
      + 'Desligada, cada página mantém o wrapper original. '
      + 'Puramente aditivo.',
  },
  [FEATURE_FLAG.COMMUNITY_NGO_PARITY]: {
    label: 'Comunidade · paridade visual com a ONG',
    description:
      'Quando ligada, a página pública da comunidade passa a usar o '
      + 'mesmo padrão visual da capa da ONG (`<ClubCover>`-like): '
      + 'banner gradiente, avatar-iniciais sobreposto, nome, cidade '
      + 'e chips Padronizados. E o painel de administração da '
      + 'comunidade passa a usar o mesmo padrão visual do painel da '
      + 'ONG (header `arena-panel-strong`, `arena-tab-bar`, stat '
      + 'cards `p-6 sm:p-7`, `mt-12 sm:mt-14`), com apenas as abas '
      + 'pertinentes à comunidade (Visão Geral, Mural, Equipe, '
      + 'Configurações). Desligada (default), a comunidade mantém '
      + 'seu padrão antigo. Puramente aditivo.',
  },

  [FEATURE_FLAG.COMMUNITY_EVENT_DETAIL_V1]: {
    label: 'Comunidade · detalhe de evento + RSVP',
    description:
      'Cria a página pública de evento em /comunidade/:id/eventos/:eventId '
      + 'com painel de participantes e RSVP going/maybe/not_going. '
      + 'Cards de evento na aba Eventos da comunidade ganham link '
      + 'para a página. Sem a flag, cards não são clicáveis. '
      + 'Puramente aditivo.',
  },


  // SHELTER_* (Sistema de Gestão do Abrigo): meta importada de
  // src/modules/shelter/domain/constants.js (não duplica string).
  ...(SHELTER_META
    ? Object.fromEntries(Object.entries(SHELTER_META).map(([k, v]) => [k, v]))
    : {}),

  // ─── V4 PERSONAS (D-PERSONA-FLAG-GRADUAL, Q30) ─────────────────────────
  // Sistema de personas dedicado (Adotante, Doador, Membro Abrigo,
  // Membro Comunidade, Voluntário, Platform Admin). Ver
  // docs/PLAN_PERSONAS_V4.md v1.1, docs/AI_GUIDE/19-V4-PERSONAS-INDEX.md
  // e docs/AI_GUIDE/13-DECISIONS.md §16-17.
  //
  // Ativação: master V4_PERSONA_ENABLED + personas individuais
  // (V4_PERSONA_ADOPTER, V4_PERSONA_DONOR, etc) + features
  // (V4_PERSONA_SWITCHER, V4_PERSONA_SELECTION, etc).
  //
  // Rollout gradual (Q30): 1% → 5% → 25% → 50% → 100% dos usuários.
  [FEATURE_FLAG.V4_PERSONA_ENABLED]: {
    label: 'V4 Personas · Master switch (D-PERSONA-FLAG-GRADUAL, Q30)',
    description:
      'Liga o sistema de personas V4 (6 personas dedicadas: Adotante, '
      + 'Doador, Membro de Abrigo, Membro de Comunidade, Voluntário, '
      + 'Platform Admin). Default OFF. Quando OFF, todas as 6 personas '
      + 'comportam-se como V3 legacy (user = adotante). Para ativar, '
      + 'ligue este master + ao menos uma persona individual. Rollout '
      + 'gradual: 1% → 5% → 25% → 50% → 100% dos usuários (1-2 dias '
      + 'entre cada etapa, monitorar erros via Sentry).',
  },
  [FEATURE_FLAG.V4_PERSONA_ADOPTER]: {
    label: 'V4 Personas · Adotante (D-PERSONA-MULTI, D-PERSONA-FEED-EXCLUSIVE-ADOPTER)',
    description:
      'Persona 1 — Adotante (legacy). Pode ver o feed de pets para '
      + 'adoção. Já é default para qualquer user com profile_completed. '
      + 'Esta flag existe para consistência com as outras 5 personas '
      + 'e para permitir rollback individual. SÓ funciona se '
      + 'V4_PERSONA_ENABLED = true.',
  },
  [FEATURE_FLAG.V4_PERSONA_DONOR]: {
    label: 'V4 Personas · Doador (D-PERSONA-DONOR-ONBOARDING, Q24)',
    description:
      'Persona 2 — Doador. Pode cadastrar pets para doação e gerenciá-'
      + 'los via /dashboard/doador. Onboarding dedicado com 9 campos '
      + '(Q24): donor_motivation, has_donated_before, pets_count, '
      + 'experience_with_species[], experience_years, '
      + 'donor_accepts_home_check, donor_accepts_post_adoption_followup, '
      + 'donor_preferred_contact_method, donor_bio. Pets pessoais '
      + 'existente migram automaticamente (D-PERSONA-MIGRATION-AUTO, '
      + 'Q29).',
  },
  [FEATURE_FLAG.V4_PERSONA_SHELTER_STAFF]: {
    label: 'V4 Personas · Membro de Abrigo (D-PERSONA-MULTI-CLUB, Q17)',
    description:
      'Persona 3 — Membro de abrigo. Pode gerenciar 1+ abrigos (multi-'
      + 'club Q17) via ShelterPicker no TopBar. Entrada por '
      + 'código de convite OU criar novo abrigo (D-PERSONA-SHELTER-'
      + 'ENTRY, Q25). Multi-club: dados isolados por abrigo, troca '
      + 'instantânea entre abrigos no switcher do TopBar.',
  },
  [FEATURE_FLAG.V4_PERSONA_COMMUNITY_STAFF]: {
    label: 'V4 Personas · Membro de Comunidade',
    description:
      'Persona 4 — Membro de comunidade. Pode gerenciar 1+ comunidades. '
      + 'Estrutura análoga a shelter_staff (multi-community). Entrada por '
      + 'CommunityEntry.',
  },
  [FEATURE_FLAG.V4_PERSONA_VOLUNTEER]: {
    label: 'V4 Personas · Voluntário (D-PERSONA-MULTI-ROSTER-ISOLATED, Q18)',
    description:
      'Persona 5 — Voluntário. Pode ser voluntário em 1+ abrigos '
      + '(multi-roster Q18) com dados isolados por abrigo via '
      + 'VolunteerShelterPicker no TopBar. Se não estiver vinculado a '
      + 'nenhum abrigo, entra no POOL encontrável (D-PERSONA-VOLUNTEER-'
      + 'POOL, Q26).',
  },
  [FEATURE_FLAG.V4_PERSONA_PLATFORM_ADMIN]: {
    label: 'V4 Personas · Platform Admin (D-PERSONA-ADMIN-OVERRIDE, Q7, Q9)',
    description:
      'Persona 6 — Platform Admin (admin master). Visível SÓ para user '
      + 'com role=platform_admin. Override total: vê tudo de todas as '
      + 'personas. SÓ pode ser atribuído pelo owner fixo '
      + '(fsalamoni@gmail.com) — D-PERSONA-ADMIN-OWNER-ONLY (Q8). '
      + 'NÃO pode se auto-rebaixar (D-PERSONA-ADMIN-CANNOT-DEMOTE, Q22).',
  },
  [FEATURE_FLAG.V4_PERSONA_SWITCHER]: {
    label: 'V4 Personas · Botão switch no TopBar (D-PERSONA-SWITCHER-VISIBILITY, Q15)',
    description:
      'Mostra o PersonaSwitcher no TopBar (botão dropdown com persona '
      + 'ativa + lista de personas disponíveis). SÓ aparece se user tem '
      + '2+ personas habilitadas (D-PERSONA-SWITCHER-VISIBILITY, Q15). '
      + 'Troca é instantânea, sem confirmação (D-PERSONA-SWITCH-NO-'
      + 'CONFIRM, Q14). Personas incompletas têm badge "Incompleto" '
      + '(D-PERSONA-SWITCHER-INCOMPLETE-BADGE, Q27).',
  },
  [FEATURE_FLAG.V4_PERSONA_SELECTION]: {
    label: 'V4 Personas · Tela /acesso primeiro acesso (D-PERSONA-FIRST-ACCESS-FORCED, Q16)',
    description:
      'Tela PersonaSelection (/acesso) onde o user escolhe a persona '
      + 'inicial. Aparece no primeiro acesso (Q16) e quando user '
      + 'quer adicionar nova persona via switcher. SÓ funciona se '
      + 'V4_PERSONA_ENABLED = true.',
  },
  [FEATURE_FLAG.V4_PERSONA_VOLUNTEER_POOL]: {
    label: 'V4 Personas · Pool de Voluntários (D-PERSONA-VOLUNTEER-POOL, Q26)',
    description:
      'Permite que voluntários sem abrigo vinculado entrem no POOL '
      + 'encontrável (D-PERSONA-VOLUNTEER-POOL, Q26). Abrigos podem '
      + 'buscar/browse para convidar. Filtros: cidade, estado, raio '
      + '(km), espécies. Rota: /voluntarios/pool. Por enquanto, busca '
      + '"Em breve" — integração real pendente.',
  },
  [FEATURE_FLAG.V4_PERSONA_PET_TRANSFER]: {
    label: 'V4 Personas · Transfer pet pessoal → abrigo (D-PERSONA-PET-TRANSFER, Q20)',
    description:
      'Habilita o PetTransferDialog: doador pode transferir pet pessoal '
      + 'para um abrigo. IRREVERSÍVEL (Q20) — audit log obrigatório. '
      + 'Atualiza owner_type para "organization". Use com cautela: '
      + 'uma vez transferido, o pet é do abrigo.',
  },

  [FEATURE_FLAG.MOCK_DATA_PANEL]: {
    label: 'Painel de dados demo (mock data)',
    description:
      'Expõe a rota `/admin/mock-data` com botões para carregar e '
      + 'limpar os conjuntos de dados mockados. Útil para demos, '
      + 'treinamento e validação visual de UX. Os documentos são '
      + 'marcados com `_mock: true`, então a limpeza é precisa e não '
      + 'toca em nada criado por usuários reais. Restrito ao '
      + 'platform_admin. Default ON; pode ser desligado em /admin/flags '
      + '— a página some do menu admin.',
  },
  [FEATURE_FLAG.A11Y_IMPROVEMENTS_V1]: {
    label: 'Acessibilidade WCAG AA',
    description:
      'Foco visível em dialogs, aria-label em botões de ícone, '
      + 'roles ARIA no kanban (region/list/option), Escape fecha '
      + 'lightbox, contraste em badges, alt text em imagens. '
      + 'Aditivo — desligada, a UI funciona sem as melhorias.',
  },

  // ─── Design System v2 — Fase 4 ──────────────────────────
  [FEATURE_FLAG.DS_V2_DOCS]: {
    label: 'DS_V2 · Doc oficial (Fase 4)',
    description: 'Reaplicação da spec v1.0 em docs/. Sem código a ligar — Bloco A.',
  },
  [FEATURE_FLAG.DS_V2_TOKENS]: {
    label: 'DS_V2 · Tokens + Material Symbols',
    description:
      'Adiciona a fonte variável Material Symbols Outlined (var font, FILL 0-1, wght 500) '
      + 'e o componente <Icon> canônico. Coexistência com lucide-react. '
      + 'Aditivo — desligada, lucide continua sendo o ícone padrão.',
  },
  [FEATURE_FLAG.DS_V2_COMPONENTS]: {
    label: 'DS_V2 · Componentes refatorados',
    description:
      'Button (7 variantes, 46/36/52px), Card (4 variantes, 22/24px), '
      + 'Input (46px, raio 12), Dialog (raio 24, padding 32), Table (zebragem), '
      + 'Avatar (xs/sm/md/lg + gradiente oficial). 100% compatível com shadcn.',
  },
  [FEATURE_FLAG.DS_V2_PAGES_HOME]: {
    label: 'DS_V2 · Home (refinamentos)',
    description:
      'Icon Material Symbols no hero (size 130 filled, spec §4.2 marca), '
      + 'Avatar component nas histórias, H1 Sora 800 explícito. '
      + 'Home já estava bem alinhada (arena-*); este flag ativa o refinamento final.',
  },
  [FEATURE_FLAG.DS_V2_PAGES_PETS]: {
    label: 'DS_V2 · Pets (PetCard + PetDetail)',
    description:
      'PetCard (referência spec §3.3) com aspect-ratio 1.3, Card size="pet", '
      + 'Icon Material Symbols para espécie, hover-lift. PetDetail com Avatar '
      + 'component no bloco do responsável. PetFeed grid 1/2/3/4 já alinhado.',
  },
  [FEATURE_FLAG.DS_V2_PAGES_ADOPTION]: {
    label: 'DS_V2 · Adoção (audit only)',
    description:
      'AdoptionDetail, AdoptionWizard, MyApplications validados contra spec. '
      + 'Audit only — já estavam alinhados após Fases 0-2 do roadmap.',
  },
  [FEATURE_FLAG.DS_V2_PAGES_ORG]: {
    label: 'DS_V2 · Organizações (audit only)',
    description:
      'ClubsDirectory, ClubDetail, EventDetail, OrganizationsHub, '
      + 'OrganizationAdminPanel validados. Audit only — 30+ arquivos já '
      + 'usam arena-* (panel, admin-tabs, stats-grid, chip, heading).',
  },
  [FEATURE_FLAG.DS_V2_PAGES_ADMIN]: {
    label: 'DS_V2 · Admin (audit only)',
    description:
      'AdminDashboard, AdminMetrics, AdminPets, AdminUsers, AdminReports, '
      + 'AdminContentEditor validados. Audit only — já usam arena-admin-header, '
      + 'arena-stats-grid, arena-section-card.',
  },
  [FEATURE_FLAG.DS_V2_PAGES_CHAT]: {
    label: 'DS_V2 · Chat/Profile/Login (audit only)',
    description:
      'ChatPage, Profile, Login, Onboarding, institucionais validados. '
      + 'Audit only — chat já tem messages, profile usa Button, login usa card.',
  },
  [FEATURE_FLAG.DS_V2_MOTION]: {
    label: 'DS_V2 · Motion wrappers',
    description:
      'useReducedMotionSafe hook + wrappers <FadeIn>, <Stagger>, <HoverLift>. '
      + 'Respeita prefers-reduced-motion. framer-motion ^12.42.2 já instalado. '
      + 'Aplicar opt-in: <FadeIn>, <Stagger>, <HoverLift> são drop-in.',
  },
  [FEATURE_FLAG.DS_V2_AUDIT]: {
    label: 'DS_V2 · Auditoria + correções de tokens',
    description:
      'Substituições de tokens literais (bg-emerald-* → bg-success) em '
      + 'badge.jsx, user-avatar.jsx, AdminMockData.jsx. Relatório em '
      + 'docs/AUDIT_DS_V2.md. Aderente à paleta oficial spec §2.1.',
  },

  // V3 — Redesign página por página (TASK-V3-FEED-1, 2026-07-17)
  // Cada flag = 1 página. Default OFF. Ativada no admin master quando
  // o redesign da página estiver pronto e validado visualmente.
  // Ver docs/PLAN_V3_REDESIGN.md e docs/REGENCY_<PAGE>.md.
  [FEATURE_FLAG.V3_PAGE_FEED]: {
    label: 'V3 · Feed (/feed)',
    description:
      'Redesign da página /feed. 6 filtros (espécie, porte, idade, sexo, '
      + 'cidade, raio), ordenação, paginação responsiva por viewport, '
      + 'SwipeDeck com UNDO + haptic, "Ver todos os pets" começa '
      + 'fechado (Collapsible). Doc: docs/REGENCY_FEED_V3.md.',
  },
  [FEATURE_FLAG.V3_PAGE_HOME]: {
    label: 'V3 · Home (/)',
    description: 'Redesign da home/landing.',
  },
  [FEATURE_FLAG.V3_PAGE_LOGIN]: {
    label: 'V3 · Login (/login)',
    description: 'Redesign da página de login.',
  },
  [FEATURE_FLAG.V3_PAGE_LEGAL]: {
    label: 'V3 · Páginas legais (privacidade, termos, legislação)',
    description: 'Redesign das páginas legais (já parcialmente refatoradas pelo TASK-021 CMS Markdown).',
  },
  [FEATURE_FLAG.PET_DETAIL_VIEW_V1]: {
    label: 'V3 · Visualização pública de pet (/pet/:petId)',
    description: 'Página PÚBLICA de visualização de um pet (sem abas, sem botões de gestão). Apresenta o pet de forma atraente para que o visitante se interesse e queira adotar. Tem botão flutuante "Quero adotar" + "Administrar" (este último só visível para quem tem permissão de gestão do pet).',
  },
  [FEATURE_FLAG.V3_PAGE_PET_DETAIL]: {
    label: 'V3 · PetDetail (/pets/:id)',
    description: 'Redesign da página de detalhe do pet.',
  },
  [FEATURE_FLAG.V3_PAGE_COMMUNITY_DETAIL]: {
    label: 'V3 · CommunityDetail (/comunidades/:slug)',
    description: 'Redesign da página de comunidade. Hoje tem layout 2 colunas (Conteúdo + Gestão) — refatorar.',
  },
  [FEATURE_FLAG.V3_PAGE_CLUB_DETAIL]: {
    label: 'V3 · ClubDetail (/organizacoes/:id)',
    description: 'Redesign da página do abrigo. Harmonizar FosterCtaCard (verde-água) com VolunteerCtaCard (laranja).',
  },
  [FEATURE_FLAG.V3_PAGE_PROFILE]: {
    label: 'V3 · Perfil (/perfil)',
    description: 'Redesign do perfil do adotante. Hoje tem tabs estranhas ("Dados pessoais, Adotante, Visual, Voluntário, Lares Temp, Adoções, Privacidade") e "Salvar perfil" sticky mal posicionado.',
  },
  [FEATURE_FLAG.V3_PAGE_CHAT]: {
    label: 'V3 · Chat (/chat)',
    description: 'Redesign do chat.',
  },
  [FEATURE_FLAG.V3_PAGE_ADOPTION]: {
    label: 'V3 · Adoção (fluxo wizard + detail)',
    description: 'Redesign do fluxo de adoção (wizard + detail).',
  },
  [FEATURE_FLAG.V3_PAGE_ORG_ADMIN]: {
    label: 'V3 · OrganizationAdminPanel',
    description: 'Redesign do painel admin da organização.',
  },
  [FEATURE_FLAG.V3_PAGE_COMMUNITY_ADMIN]: {
    label: 'V3 · CommunityAdminPanel',
    description: 'Redesign do painel admin da comunidade.',
  },
  [FEATURE_FLAG.V3_PAGE_SHELTER_ADMIN]: {
    label: 'V3 · ShelterAdminDashboard',
    description: 'Redesign do dashboard admin do abrigo.',
  },
  [FEATURE_FLAG.V3_PAGE_SEARCH]: {
    label: 'V3 · Busca (/busca)',
    description: 'Redesign da busca global.',
  },
  [FEATURE_FLAG.V3_PAGE_EVENTS]: {
    label: 'V3 · Eventos (/eventos + detalhes)',
    description: 'Redesign do feed de eventos e detalhes.',
  },
  [FEATURE_FLAG.V3_PAGE_FOSTER]: {
    label: 'V3 · Lar Temporário (público + dashboard)',
    description: 'Redesign das páginas de Lar Temporário.',
  },
  [FEATURE_FLAG.V3_PAGE_VOLUNTEER]: {
    label: 'V3 · Voluntariado (programa + signup + termo)',
    description: 'Redesign das páginas de Voluntariado.',
  },
  [FEATURE_FLAG.V3_PAGE_MURAL]: {
    label: 'V3 · Mural (/mural)',
    description: 'Redesign do mural público.',
  },
  [FEATURE_FLAG.V3_PAGE_ADMIN]: {
    label: 'V3 · Admin (16 páginas)',
    description: 'Redesign das 16 páginas do painel admin master. Inclui gerenciador de Espaço de Parceiros (TASK-V3-PARTNER-1).',
  },
  [FEATURE_FLAG.ADMIN_PARTNER_SPACES_V1]: {
    label: 'Admin · Espaço de Parceiros',
    description: 'Liga o painel admin de parceiros publicitários em /admin/parceiros (CRUD de parceiros, banners com rotação, relatórios e tracking LGPD-compliant).',
  },
  [FEATURE_FLAG.PUBLIC_PARTNER_BANNERS_V1]: {
    label: 'Público · Banners de Parceiros',
    description: 'Liga o componente AdSlotBanner para rotação client-side de banners em posições do app (Feed, Home, Search, Detalhes). Requer parceiros ativos com banners para renderizar.',
  },
  [FEATURE_FLAG.PLATFORM_MARKETPLACE_V1]: {
    label: 'Plataforma · Marketplace geral (/mercado)',
    description:
      'Compila os produtos públicos de todas as lojas dos abrigos numa '
      + 'vitrine única em /mercado, com filtros e ordenação (abrigo, cidade, '
      + 'estado, categoria, preço). Aparece na navegação de todas as personas '
      + 'exceto o acesso de abrigo. Requer `shelter_store_v1` para haver '
      + 'produtos a agregar. Aditivo — desligada, a rota e o item de menu '
      + 'somem. Default OFF.',
  },
});

/**
 * Valor padrão das flags. Flags de UX e correção de bug nascem LIGADAS
 * (já entregam valor: mural com likes, explicação de bloqueio na adoção,
 * mural admin para criadores de comunidade, e o fix do feed). O admin pode
 * desligar a qualquer momento no /admin/flags — a chave continua existindo
 * no Firestore. Flags estruturais/placeholders (ex: AD_SLOTS) nascem
 * desligadas — não há conteúdo real por trás.
 */
export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  [FEATURE_FLAG.AD_SLOTS]: false,
  [FEATURE_FLAG.HOME_STATS_V1]: false,
  [FEATURE_FLAG.PET_FEED_RELIABILITY_FIX]: true,
  [FEATURE_FLAG.MURAL_LIKES_AND_COMMENTS]: true,
  [FEATURE_FLAG.PET_ADOPTION_GATING]: true,
  [FEATURE_FLAG.MURAL_RICH_POSTS]: true,
  [FEATURE_FLAG.PAGE_HERO_ENABLED]: false,
  [FEATURE_FLAG.STANDARDIZED_PAGE_LAYOUT]: false,
  [FEATURE_FLAG.COMMUNITY_NGO_PARITY]: false,

  ...(SHELTER_FEATURE_FLAG
    ? Object.fromEntries(Object.values(SHELTER_FEATURE_FLAG).map((k) => [k, false]))
    : {}),

  // === SHELTER flags ativados (DEVEM vir DEPOIS do spread acima) ===
  // TASK-792: SHELTER_DASHBOARD ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]: true,
  // TASK-793: SHELTER_KANBAN ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_KANBAN]: true,
  // TASK-794: SHELTER_VOLUNTEERS + SHELTER_VOLUNTEER_PROFILE_V1 ativados.
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1]: true,
  // TASK-795: SHELTER_HEALTH_RECORDS + SHELTER_MEDICATION + SHELTER_PET_TIMELINE ativados.
  [SHELTER_FEATURE_FLAG.SHELTER_HEALTH_RECORDS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_MEDICATION]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_PET_TIMELINE]: true,
  // Tabelas operacionais agregadas (Medicações, Consultas, Tratamentos,
  // Vacinas, Cuidados, Adoções, Devoluções). Substitui Prontuário/Timeline.
  // ATIVADA após validação (build/lint/typecheck/2399 testes OK). Pode ser
  // desligada a qualquer momento em /admin/flags sem regressão.
  [SHELTER_FEATURE_FLAG.SHELTER_PET_OPS_TABLES_V1]: true,
  // TASK-796: SHELTER_FOSTER ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER]: true,
  // TASK-797: SHELTER_EXHIBITIONS + SHELTER_REPORTS + SHELTER_INDICATORS ativados.
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITIONS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_REPORTS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_INDICATORS]: true,
  // TASK-790: SHELTER_DONATIONS ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_DONATIONS]: true,
  // TASK-791: SHELTER_FINANCE ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_FINANCE]: true,
  // BUG-15 fix (2026-07-20): SHELTER_ADMIN_DASHBOARD_V1 ativado por default
  // (admin pessoal do abrigo). V3 do ShelterAdminDashboard.
  [SHELTER_FEATURE_FLAG.SHELTER_ADMIN_DASHBOARD_V1]: true,

  // ─── CUTOVER SHELTER (2026-08-30) ───────────────────────────────────────
  // O administrador da plataforma pediu que TODAS as features do abrigo
  // (desenvolvidas nos últimos PRs) fiquem ativas por default, na versão
  // mais nova. Estas flags são aditivas e auto-gated (cada tela verifica a
  // própria flag). `shelter_foundation` é o portão-mestre que habilita as
  // abas do painel do abrigo. Podem ser desligadas em /admin/flags sem
  // migração de dados.
  // EXCEÇÃO: `shelter_cutover` (chave de migração Org→Abrigo, não é feature
  // de usuário) permanece OFF por default.
  [SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_ONBOARDING_WIZARD]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_APPLICATION_SCORING]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_ANIMAL_UNIFIED_PROFILE]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTION_WORKFLOW]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_FULL_PROFILE]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_POST_ADOPTION_FOLLOWUP]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_POST_ADOPTION_RETURN]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER_PUBLIC_HISTORY_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_GALLERY]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_RSVPS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_WORKFLOW_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS_V2]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH]: true,
  // `shelter_legal_terms` NÃO tem leitor de UI — é só um item da checklist
  // de cutover (REQUIRED_FLAGS_FOR_CUTOVER). Quem controla a UI legal
  // (banner de cookies, rodapé, páginas legais, termos de adoção) é
  // `shelter_legal_terms_v1`. São independentes; ambas ON = cutover pleno.
  [SHELTER_FEATURE_FLAG.SHELTER_LEGAL_TERMS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_SECURITY_HARDENING]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_PLATFORM_HEALTH]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_FCM_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_STORE_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_STORE_V2]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_ACTIONABLE_NOTIFICATIONS_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_TEAM_V2]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER_V2]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_MURAL_V2]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_OPS_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_DOCUMENTS_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_FOSTER_DASHBOARD_V1]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_DASHBOARD_V1]: true,
  // `shelter_cutover` permanece no default do spread (false).

  // Community flags:
  [FEATURE_FLAG.COMMUNITY_EVENT_DETAIL_V1]: false,

  [FEATURE_FLAG.MOCK_DATA_PANEL]: true,
  [FEATURE_FLAG.A11Y_IMPROVEMENTS_V1]: false,

  // Design System v2 — Fase 4: todas OFF por default.
  [FEATURE_FLAG.DS_V2_DOCS]: false,
  [FEATURE_FLAG.DS_V2_TOKENS]: false,
  [FEATURE_FLAG.DS_V2_COMPONENTS]: false,
  [FEATURE_FLAG.DS_V2_PAGES_HOME]: false,
  [FEATURE_FLAG.DS_V2_PAGES_PETS]: false,
  [FEATURE_FLAG.DS_V2_PAGES_ADOPTION]: false,
  [FEATURE_FLAG.DS_V2_PAGES_ORG]: false,
  [FEATURE_FLAG.DS_V2_PAGES_ADMIN]: false,
  [FEATURE_FLAG.DS_V2_PAGES_CHAT]: false,
  [FEATURE_FLAG.DS_V2_MOTION]: false,
  [FEATURE_FLAG.DS_V2_AUDIT]: false,

  // V3 Redesign — CUTOVER (2026-08-30): todas as páginas V3 (validadas e
  // production-ready) passam a nascer LIGADAS, tornando a versão mais nova
  // o padrão do site no ar. O admin pode desligar qualquer uma em
  // /admin/flags para voltar à V1 sem migração de dados.
  // Ver docs/PLAN_V3_REDESIGN.md.
  [FEATURE_FLAG.V3_PAGE_FEED]: true,
  [FEATURE_FLAG.V3_PAGE_HOME]: true,
  [FEATURE_FLAG.V3_PAGE_LOGIN]: true,
  [FEATURE_FLAG.V3_PAGE_LEGAL]: true,
  [FEATURE_FLAG.V3_PAGE_PET_DETAIL]: true,
  // TASK-V3-PET-DETAIL-VIEW: ON por default (rota /pet/:petId pública).
  // Quando user pediu 'arrume os botões de editar/excluir' — esta flag
  // é a solução (página V3 não tem esses botões, só o admin tem).
  [FEATURE_FLAG.PET_DETAIL_VIEW_V1]: true,
  [FEATURE_FLAG.V3_PAGE_COMMUNITY_DETAIL]: true,
  [FEATURE_FLAG.V3_PAGE_CLUB_DETAIL]: true,
  [FEATURE_FLAG.V3_PAGE_PROFILE]: true,
  [FEATURE_FLAG.V3_PAGE_CHAT]: true,
  [FEATURE_FLAG.V3_PAGE_ADOPTION]: true,
  [FEATURE_FLAG.V3_PAGE_ORG_ADMIN]: true,
  [FEATURE_FLAG.V3_PAGE_COMMUNITY_ADMIN]: true,
  [FEATURE_FLAG.V3_PAGE_SHELTER_ADMIN]: true,
  [FEATURE_FLAG.V3_PAGE_SEARCH]: true,
  [FEATURE_FLAG.V3_PAGE_EVENTS]: true,
  [FEATURE_FLAG.V3_PAGE_FOSTER]: true,
  [FEATURE_FLAG.V3_PAGE_VOLUNTEER]: true,
  [FEATURE_FLAG.V3_PAGE_MURAL]: true,
  [FEATURE_FLAG.V3_PAGE_ADMIN]: true,
  [FEATURE_FLAG.ADMIN_PARTNER_SPACES_V1]: true,
  [FEATURE_FLAG.PUBLIC_PARTNER_BANNERS_V1]: true,

  // Loja do Abrigo + Marketplace da plataforma — ambos default OFF (feature
  // nova, puramente aditiva). O abrigo ainda precisa ligar a própria loja
  // nas Configurações da loja para expô-la.
  [FEATURE_FLAG.PLATFORM_MARKETPLACE_V1]: false,

  // ─── V4 PERSONAS — TODAS default OFF (D-PERSONA-FLAG-GRADUAL) ────────
  [FEATURE_FLAG.V4_PERSONA_ENABLED]: false,
  [FEATURE_FLAG.V4_PERSONA_ADOPTER]: false,
  [FEATURE_FLAG.V4_PERSONA_DONOR]: false,
  [FEATURE_FLAG.V4_PERSONA_SHELTER_STAFF]: false,
  [FEATURE_FLAG.V4_PERSONA_COMMUNITY_STAFF]: false,
  [FEATURE_FLAG.V4_PERSONA_VOLUNTEER]: false,
  [FEATURE_FLAG.V4_PERSONA_PLATFORM_ADMIN]: false,
  [FEATURE_FLAG.V4_PERSONA_SWITCHER]: false,
  [FEATURE_FLAG.V4_PERSONA_SELECTION]: false,
  [FEATURE_FLAG.V4_PERSONA_VOLUNTEER_POOL]: false,
  [FEATURE_FLAG.V4_PERSONA_PET_TRANSFER]: false,
});

/**
 * Normaliza um mapa de flags vindo do Firestore, garantindo booleanos e
 * preenchendo as ausentes com `false`. Ignora chaves desconhecidas.
 * @param {Record<string, unknown>|null|undefined} raw
 * @returns {Record<string, boolean>}
 */
export function normalizeFeatureFlags(raw) {
  const out = { ...DEFAULT_FEATURE_FLAGS };
  if (raw && typeof raw === 'object') {
    Object.values(FEATURE_FLAG).forEach((key) => {
      if (typeof raw[key] === 'boolean') out[key] = raw[key];
    });
  }


  return out;
}