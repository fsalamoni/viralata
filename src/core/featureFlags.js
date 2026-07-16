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

  // SHELTER_* (Sistema de Gestão do Abrigo): todas OFF por default.
  // As chaves vêm de SHELTER_FEATURE_FLAG no módulo shelter/.
  // TASK-792: SHELTER_DASHBOARD ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD]: true,
  // TASK-793: SHELTER_KANBAN ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_KANBAN]: true,
  // TASK-794: SHELTER_VOLUNTEERS + SHELTER_VOLUNTEER_PROFILE_V1 ativados.
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS]: true,
  [SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1]: true,
  // TASK-795: SHELTER_HEALTH_RECORDS ativado.
  [SHELTER_FEATURE_FLAG.SHELTER_HEALTH_RECORDS]: true,
  ...(SHELTER_FEATURE_FLAG
    ? Object.fromEntries(Object.values(SHELTER_FEATURE_FLAG).map((k) => [k, false]))
    : {}),

  // Community flags: depois do spread para não serem sobrescritas.
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