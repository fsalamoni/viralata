/**
 * Constantes do domínio de Clubes (organizações de adoção — ONGs e lojas).
 *
 * Coleções Firestore:
 *  - clubs                       (dados da organização)
 *  - club_members                (vínculo usuário↔organização, id = `${clubId}_${uid}`)
 *  - club_events                 (eventos: mutirão de adoção, confraternização, reunião…)
 *  - club_event_rsvps            (presença em evento, id = `${eventId}_${uid}`)
 *  - club_events/{id}/dates          (datas do evento: data, local, horário)
 *  - club_events/{id}/date_rsvps     (resposta por data, id = `${dateId}_${uid}`)
 *  - club_events/{id}/messages       (chat cronológico do evento)
 *  - club_events/{id}/participants   (participantes do evento)
 *  - club_posts                  (mural de avisos/interação)
 *  - club_post_likes             (curtidas; id = `${postId}_${uid}`)
 *  - club_post_comments          (comentários; doc com author_id, text, post_id)
 *  - club_forum_threads          (tópicos de fórum da organização)
 *  - club_forum_threads/{id}/comments    (subcoleção de comentários do tópico)
 *  - club_forum_threads/{id}/poll_votes  (subcoleção de votos; id do doc = uid)
 *  - club_campaigns              (chamados de doação — v1 legado)
 *  - club_donations              (chamados de doação — v2 com PIX, QR e comprovantes)
 *  - club_donation_receipts      (comprovantes enviados pelo público)
 *  - club_ledger                 (lançamentos da prestação de contas)
 *  - club_ledger_categories      (categorias configuráveis de receita/despesa)
 *  - club_chat_threads           (conversas com a ONG; doc com user_id, status)
 *  - club_chat_threads/{id}/messages    (mensagens da thread)
 */

/** Chamados de doação (campanhas de arrecadação) de uma organização. */
export const CAMPAIGN_STATUS = Object.freeze({
  ACTIVE: 'active',
  CONCLUDED: 'concluded',
});

/** Lançamentos da prestação de contas de uma organização. */
export const LEDGER_TYPE = Object.freeze({
  REVENUE: 'revenue',
  EXPENSE: 'expense',
});

export const LEDGER_CATEGORY_PRESETS = Object.freeze({
  [LEDGER_TYPE.REVENUE]: Object.freeze(['Doações', 'Eventos', 'Parcerias', 'Outros']),
  [LEDGER_TYPE.EXPENSE]: Object.freeze(['Alimentação', 'Veterinário e saúde', 'Medicamentos', 'Transporte', 'Estrutura', 'Marketing', 'Outros']),
});

/** Janela de agregação exibida na aba de Prestação de Contas. */
export const FINANCE_PERIOD = Object.freeze({
  FULL: 'full',
  MONTHLY: 'monthly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
});

export const FINANCE_PERIOD_LABELS = Object.freeze({
  [FINANCE_PERIOD.FULL]: 'Integral',
  [FINANCE_PERIOD.MONTHLY]: 'Mensal',
  [FINANCE_PERIOD.SEMIANNUAL]: 'Semestral',
  [FINANCE_PERIOD.ANNUAL]: 'Anual',
});

/** Limites e regras das enquetes do fórum. */
export const FORUM_POLL = Object.freeze({
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 10,
  OPTION_MAX_CHARS: 120,
  QUESTION_MAX_CHARS: 200,
});

/** Limites do chat de um evento. */
export const EVENT_CHAT_LIMITS = Object.freeze({
  MESSAGE_MAX: 4000,
});

/** Limites gerais do fórum. */
export const FORUM_LIMITS = Object.freeze({
  TITLE_MAX: 140,
  BODY_MAX: 20000,
  COMMENT_MAX: 20000,
  MAX_ATTACHMENTS: 10,
});

/** Papel do membro dentro da organização. */
export const CLUB_ROLE = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

export const CLUB_ROLE_LABELS = Object.freeze({
  [CLUB_ROLE.ADMIN]: 'Administrador',
  [CLUB_ROLE.MEMBER]: 'Membro',
});

/**
 * Permissões granulares do painel de administração da organização.
 * O proprietário (`clubs.created_by`) sempre tem as 5, de forma implícita e
 * não editável pela UI. Um administrador comum sem `permissions` explícito
 * também é tratado como tendo todas (compatibilidade com admins criados
 * antes desta granularidade existir) — ver `domain/permissions.js`.
 */
export const CLUB_PERMISSION = Object.freeze({
  ANIMALS: 'animals',
  FINANCE: 'finance',
  DONATIONS: 'donations',
  FEED: 'feed',
  TEAM: 'team',
});

export const CLUB_PERMISSION_KEYS = Object.freeze(Object.values(CLUB_PERMISSION));

export const CLUB_PERMISSION_LABELS = Object.freeze({
  [CLUB_PERMISSION.ANIMALS]: 'Gerenciar animais',
  [CLUB_PERMISSION.FINANCE]: 'Prestação de contas',
  [CLUB_PERMISSION.DONATIONS]: 'Chamados de doação',
  [CLUB_PERMISSION.FEED]: 'Publicar no mural',
  [CLUB_PERMISSION.TEAM]: 'Gerenciar equipe',
});

/** Estado de um pedido de ingresso (não-membro pede para entrar na organização). */
export const JOIN_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

/** Estado de um convite de associação (admin convida um usuário para a organização). */
export const MEMBER_INVITE_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
});

/** Tipos de evento da organização. */
export const CLUB_EVENT_TYPE = Object.freeze({
  ADOPTION_FAIR: 'adoption_fair',
  SOCIAL: 'social',
  MEETING: 'meeting',
  OTHER: 'other',
});

export const CLUB_EVENT_TYPE_LABELS = Object.freeze({
  [CLUB_EVENT_TYPE.ADOPTION_FAIR]: 'Mutirão de adoção',
  [CLUB_EVENT_TYPE.SOCIAL]: 'Confraternização',
  [CLUB_EVENT_TYPE.MEETING]: 'Reunião',
  [CLUB_EVENT_TYPE.OTHER]: 'Outro',
});

/**
 * Rótulo do tipo do evento, tolerante a dados legados (tipos antigos do
 * produto anterior — `game_day`/`training`/`tournament` — viram "Mutirão
 * de adoção").
 */
export function eventTypeLabel(type) {
  if (type === 'game_day' || type === 'training' || type === 'tournament') {
    return CLUB_EVENT_TYPE_LABELS[CLUB_EVENT_TYPE.ADOPTION_FAIR];
  }
  return CLUB_EVENT_TYPE_LABELS[type] || 'Evento';
}

/** Resposta de presença em um evento. */
export const RSVP_STATUS = Object.freeze({
  GOING: 'going',
  MAYBE: 'maybe',
  NOT_GOING: 'not_going',
});

export const RSVP_STATUS_LABELS = Object.freeze({
  [RSVP_STATUS.GOING]: 'Vou',
  [RSVP_STATUS.MAYBE]: 'Talvez',
  [RSVP_STATUS.NOT_GOING]: 'Não vou',
});

/** Visibilidade do evento. */
export const EVENT_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

export const EVENT_VISIBILITY_LABELS = Object.freeze({
  [EVENT_VISIBILITY.PUBLIC]: 'Público (toda a organização)',
  [EVENT_VISIBILITY.PRIVATE]: 'Privado (somente convidados)',
});

/** Trata a ausência do campo como público (compatibilidade com eventos antigos). */
export function isPrivateEvent(event) {
  return (event?.visibility || EVENT_VISIBILITY.PUBLIC) === EVENT_VISIBILITY.PRIVATE;
}

/**
 * Estado do convite/participação de um usuário em um evento.
 * `invited` = convidado e ainda sem resposta; demais reaproveitam o RSVP.
 */
export const INVITE_STATUS = Object.freeze({
  INVITED: 'invited',
  GOING: RSVP_STATUS.GOING,
  MAYBE: RSVP_STATUS.MAYBE,
  NOT_GOING: RSVP_STATUS.NOT_GOING,
});

export const INVITE_STATUS_LABELS = Object.freeze({
  [INVITE_STATUS.INVITED]: 'Convidado',
  [INVITE_STATUS.GOING]: 'Vou',
  [INVITE_STATUS.MAYBE]: 'Talvez',
  [INVITE_STATUS.NOT_GOING]: 'Não vou',
});

/** Origem do participante do evento. */
export const INVITE_SOURCE = Object.freeze({
  CLUB: 'club', // membro da organização
  PLATFORM: 'platform', // outro usuário da plataforma (convidado em evento privado)
});

/* ========================================================================
 * Modelo de dados — Novas coleções para o módulo de Organizações (ONGs)
 * (Etapa 1: estrutura de dados para as 6 abas da ONG)
 * ========================================================================
 *
 * Esta seção adiciona a base de dados necessária para suportar:
 *  - Mural com likes, comentários e permissões por post
 *  - Chamados de doação com PIX/QR e comprovantes de contribuição
 *  - Prestação de contas com categorias customizáveis e filtro integral
 *  - Equipe com privacidade por membro (público/seguidores/membros)
 *  - Chat dedicado entre usuários e a ONG
 *  - Histórico de quem pode editar/excluir o quê
 */

/** Privacidade de uma informação (campo) de um membro da equipe. */
export const PRIVACY_LEVEL = Object.freeze({
  PUBLIC: 'public',         // visível para qualquer usuário da plataforma
  FOLLOWERS: 'followers',   // visível para seguidores/membros da ONG
  MEMBERS: 'members',       // visível apenas para a equipe da ONG
  PRIVATE: 'private',       // visível apenas para o próprio membro
});

export const PRIVACY_LEVEL_LABELS = Object.freeze({
  [PRIVACY_LEVEL.PUBLIC]: 'Público (toda a plataforma)',
  [PRIVACY_LEVEL.FOLLOWERS]: 'Apenas seguidores / membros da ONG',
  [PRIVACY_LEVEL.MEMBERS]: 'Apenas para a equipe da ONG',
  [PRIVACY_LEVEL.PRIVATE]: 'Apenas para mim',
});

/** Ordem de "abertura" (do mais aberto para o mais restrito) para
 *  verificar se o caller atende ao nível mínimo exigido. */
const PRIVACY_RANK = Object.freeze({
  [PRIVACY_LEVEL.PUBLIC]: 0,
  [PRIVACY_LEVEL.FOLLOWERS]: 1,
  [PRIVACY_LEVEL.MEMBERS]: 2,
  [PRIVACY_LEVEL.PRIVATE]: 3,
});

/**
 * Retorna `true` se `viewerLevel` representa um grau de visibilidade
 * suficiente para enxergar um campo definido como `requiredLevel`.
 * - PUBLIC é visto por qualquer um.
 * - FOLLOWERS é visto por membros da ONG (que também são seguidores).
 * - MEMBERS é visto apenas pela equipe.
 * - PRIVATE é visto só pelo próprio dono do campo.
 */
export function meetsPrivacy(viewerLevel, requiredLevel) {
  const v = PRIVACY_RANK[viewerLevel];
  const r = PRIVACY_RANK[requiredLevel];
  if (v == null || r == null) return false;
  return v >= r;
}

/** Conjunto padrão de campos de um membro que podem ter privacidade própria. */
export const MEMBER_FIELD = Object.freeze({
  FULL_NAME: 'full_name',
  PHOTO: 'photo',
  PHONE: 'phone',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  TITLE: 'title',
  BIO: 'bio',
  HISTORY: 'history',
});

export const MEMBER_FIELD_LABELS = Object.freeze({
  [MEMBER_FIELD.FULL_NAME]: 'Nome completo',
  [MEMBER_FIELD.PHOTO]: 'Foto',
  [MEMBER_FIELD.PHONE]: 'Telefone',
  [MEMBER_FIELD.EMAIL]: 'E-mail',
  [MEMBER_FIELD.WHATSAPP]: 'WhatsApp',
  [MEMBER_FIELD.TITLE]: 'Função / cargo',
  [MEMBER_FIELD.BIO]: 'Descrição',
  [MEMBER_FIELD.HISTORY]: 'Histórico na ONG',
});

/** Quais campos do member são visíveis por padrão em cada nível de privacidade. */
export const MEMBER_FIELD_DEFAULT_PRIVACY = Object.freeze({
  [MEMBER_FIELD.FULL_NAME]: PRIVACY_LEVEL.PUBLIC,
  [MEMBER_FIELD.PHOTO]: PRIVACY_LEVEL.PUBLIC,
  [MEMBER_FIELD.PHONE]: PRIVACY_LEVEL.MEMBERS,
  [MEMBER_FIELD.EMAIL]: PRIVACY_LEVEL.MEMBERS,
  [MEMBER_FIELD.WHATSAPP]: PRIVACY_LEVEL.FOLLOWERS,
  [MEMBER_FIELD.TITLE]: PRIVACY_LEVEL.PUBLIC,
  [MEMBER_FIELD.BIO]: PRIVACY_LEVEL.PUBLIC,
  [MEMBER_FIELD.HISTORY]: PRIVACY_LEVEL.FOLLOWERS,
});

/** Permissões de interação configuráveis POR POST do mural. */
export const POST_INTERACTION = Object.freeze({
  NONE: 'none',           // sem curtidas nem comentários
  LIKES: 'likes',         // apenas curtidas
  COMMENTS: 'comments',   // apenas comentários
  BOTH: 'both',           // curtidas e comentários
});

export const POST_INTERACTION_LABELS = Object.freeze({
  [POST_INTERACTION.NONE]: 'Nenhuma interação',
  [POST_INTERACTION.LIKES]: 'Apenas curtidas',
  [POST_INTERACTION.COMMENTS]: 'Apenas comentários',
  [POST_INTERACTION.BOTH]: 'Curtidas e comentários',
});

/** Estado de um comprovante de contribuição. */
export const RECEIPT_STATUS = Object.freeze({
  PENDING: 'pending',     // enviado pelo usuário, ainda não visto
  REVIEWED: 'reviewed',   // visto pela equipe
  CONFIRMED: 'confirmed', // contribuição confirmada pela equipe
  REJECTED: 'rejected',   // não reconhecido / inválido
});

export const RECEIPT_STATUS_LABELS = Object.freeze({
  [RECEIPT_STATUS.PENDING]: 'Aguardando análise',
  [RECEIPT_STATUS.REVIEWED]: 'Visualizado',
  [RECEIPT_STATUS.CONFIRMED]: 'Confirmado',
  [RECEIPT_STATUS.REJECTED]: 'Rejeitado',
});

/** Tipos de chat dedicado entre usuário e ONG. */
export const CHAT_THREAD_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
});

/** Tipos de anexo do mural (espelha a comunidade). */
export const POST_ATTACHMENT_TYPE = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
});

/** Limites e regras do mural e chat da ONG. */
export const ORG_MURAL_LIMITS = Object.freeze({
  CONTENT_MAX: 4000,
  ATTACHMENT_MAX: 10,
  ATTACHMENT_MAX_BYTES: 25 * 1024 * 1024, // 25MB
  COMMENT_MAX: 2000,
});

export const ORG_CHAT_LIMITS = Object.freeze({
  MESSAGE_MAX: 4000,
});

export const ORG_DONATION_LIMITS = Object.freeze({
  TITLE_MAX: 140,
  DESCRIPTION_MAX: 4000,
  PIX_KEY_MAX: 200,
  BANK_INFO_MAX: 1000,
  RECEIPT_NOTE_MAX: 1000,
});

/** Limites da aba "Equipe" / card de membro. */
export const ORG_TEAM_LIMITS = Object.freeze({
  TITLE_MAX: 120,
  BIO_MAX: 2000,
  HISTORY_MAX: 4000,
  NAME_MAX: 120,
  PHONE_MAX: 30,
  WHATSAPP_MAX: 30,
});

/* =================== Coleções do Firestore =================== */
//
// Adiciona a esta lista (mantida congelada) todas as coleções/IDs
// canônicos de subcoleção de uma organização. Use o helper
// `CLUB_COLLECTIONS.<key>` em todo o código — nunca string solta.
export const CLUB_COLLECTIONS = Object.freeze({
  clubs: 'clubs',
  members: 'club_members',
  joinRequests: 'club_join_requests',
  memberInvites: 'club_member_invites',
  events: 'club_events',
  rsvps: 'club_event_rsvps',
  eventInvites: 'event_invites',
  posts: 'club_posts',
  postLikes: 'club_post_likes',
  postComments: 'club_post_comments',
  forumThreads: 'club_forum_threads',
  forumComments: 'comments',
  forumPollVotes: 'poll_votes',
  campaigns: 'club_campaigns',          // alias de "chamados de doação" (legado)
  donations: 'club_donations',          // nova coleção para chamados de doação (v2)
  donationReceipts: 'club_donation_receipts',
  ledger: 'club_ledger',
  ledgerCategories: 'club_ledger_categories',
  chatThreads: 'club_chat_threads',
  chatMessages: 'messages',             // subcoleção de uma thread
  // Subcoleções de um evento (club_events/{eventId}/...).
  eventDates: 'dates',
  eventDateRsvps: 'date_rsvps',
  eventMessages: 'messages',
  eventParticipants: 'participants',
});

/** Limites da prestação de contas. */
export const FINANCE_LIMITS = Object.freeze({
  CATEGORY_MAX: 60,
  NOTE_MAX: 280,
  VALUE_MIN: 0.01,
});

/** Tipos de categoria configuráveis pelo admin da ONG. */
export const LEDGER_CATEGORY_TYPE = Object.freeze({
  REVENUE: LEDGER_TYPE.REVENUE,
  EXPENSE: LEDGER_TYPE.EXPENSE,
});
