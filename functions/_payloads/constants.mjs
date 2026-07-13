/**
 * @fileoverview Identificadores deterministas e helpers de mock data.
 *
 * Todo documento gerado pelos mocks carrega o campo `_mock: true` para que o
 * `clearAll()` consiga identificar e remover só os dados de demo, sem mexer
 * em nada que o usuário tenha criado manualmente.
 *
 * Os IDs são prefixados com `mock_` (e os de "pessoas" com `mock_usr_`) para
 * serem trivialmente identificáveis no console do Firestore e em queries de
 * auditoria.
 */

/** Tag que `clearAll()` usa para encontrar os documentos. */
export const MOCK_TAG = 'mock';

/** Prefixo canônico de ID. */
export const MOCK_ID_PREFIX = 'mock_';

/** Prefixo de "pessoa" (user, owner, autor, ator). */
export const MOCK_USER_PREFIX = 'mock_usr_';

/** Prefixo de organização. */
export const MOCK_CLUB_PREFIX = 'mock_org_';

/** Prefixo de comunidade (entidade editorial). */
export const MOCK_COMMUNITY_PREFIX = 'mock_com_';

/** Prefixo de pet. */
export const MOCK_PET_PREFIX = 'mock_pet_';

/** Prefixo de evento. */
export const MOCK_EVENT_PREFIX = 'mock_evt_';

/** Prefixo de post do mural. */
export const MOCK_POST_PREFIX = 'mock_post_';

/** Prefixo de campanha/doação. */
export const MOCK_DONATION_PREFIX = 'mock_don_';

/** Prefixo de chamado (legado). */
export const MOCK_CAMPAIGN_PREFIX = 'mock_cmp_';

/** Prefixo de lançamento contábil. */
export const MOCK_LEDGER_PREFIX = 'mock_led_';

/** Prefixo de thread de fórum. */
export const MOCK_FORUM_PREFIX = 'mock_frm_';

/** Prefixo de conversa. */
export const MOCK_CONVERSATION_PREFIX = 'mock_cnv_';

/** Prefixo de notificação. */
export const MOCK_NOTIFICATION_PREFIX = 'mock_ntf_';

/** Prefixo de audit log. */
export const MOCK_AUDIT_PREFIX = 'mock_aud_';

/** Prefixo de comunidade-post. */
export const MOCK_COMMUNITY_POST_PREFIX = 'mock_cpo_';

/** Prefixo de adoção/interesse. */
export const MOCK_INTEREST_PREFIX = 'mock_int_';

/** Prefixo de avaliação pós-adoção. */
export const MOCK_RATING_PREFIX = 'mock_rat_';

/** Prefixo de denúncia (abuse_report). */
export const MOCK_REPORT_PREFIX = 'mock_rep_';

/** Versão do payload — incrementa quando o shape dos mocks muda. */
export const MOCK_DATA_VERSION = '2026-07-12.1';

/** Metadado injetado em todo documento de mock. */
export function mockMeta(extra = {}) {
  return {
    _mock: true,
    _mock_version: MOCK_DATA_VERSION,
    _mock_loaded_at_ms: Date.now(),
    ...extra,
  };
}

/**
 * Calcula um timestamp ISO "dias atrás" a partir de `now`.
 * Útil para gerar `created_at_ms` espalhados pelos últimos N dias,
 * criando um histórico realista para o feed e dashboards.
 */
export function daysAgoIso(days) {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

/** Mesmo que `daysAgoIso`, mas em milissegundos (usado em campos `*_ms`). */
export function daysAgoMs(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}
