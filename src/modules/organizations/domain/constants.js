/**
 * Constantes do domínio de Clubes (organizações de adoção — ONGs e lojas).
 *
 * Coleções Firestore:
 *  - clubs                   (dados da organização)
 *  - club_members            (vínculo usuário↔organização, id = `${clubId}_${uid}`)
 *  - club_events             (eventos: mutirão de adoção, confraternização, reunião…)
 *  - club_event_rsvps        (presença em evento, id = `${eventId}_${uid}`)
 *  - club_events/{id}/dates        (datas do evento: data, local, horário)
 *  - club_events/{id}/date_rsvps   (resposta por data, id = `${dateId}_${uid}`)
 *  - club_events/{id}/messages     (chat cronológico do evento)
 *  - club_events/{id}/participants (participantes do evento)
 *  - club_posts              (mural de avisos/interação)
 *  - club_forum_threads      (tópicos de fórum da organização)
 *  - club_forum_threads/{id}/comments    (subcoleção de comentários do tópico)
 *  - club_forum_threads/{id}/poll_votes  (subcoleção de votos; id do doc = uid)
 */

export const CLUB_COLLECTIONS = Object.freeze({
  clubs: 'clubs',
  members: 'club_members',
  joinRequests: 'club_join_requests',
  memberInvites: 'club_member_invites',
  events: 'club_events',
  rsvps: 'club_event_rsvps',
  eventInvites: 'event_invites',
  posts: 'club_posts',
  forumThreads: 'club_forum_threads',
  forumComments: 'comments',
  forumPollVotes: 'poll_votes',
  campaigns: 'club_campaigns',
  ledger: 'club_ledger',
  // Subcoleções de um evento (club_events/{eventId}/...).
  eventDates: 'dates',
  eventDateRsvps: 'date_rsvps',
  eventMessages: 'messages',
  eventParticipants: 'participants',
});

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
  MONTHLY: 'monthly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
});

export const FINANCE_PERIOD_LABELS = Object.freeze({
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
