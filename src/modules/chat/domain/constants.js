/**
 * Constantes do domínio de Chat (mensagens diretas e em grupo).
 *
 * Coleções Firestore:
 *  - conversations   (uma conversa direta ou em grupo)
 *  - chat_messages   (mensagens; cada doc replica `member_ids` da conversa
 *                     para que as regras de segurança validem o acesso sem
 *                     leituras cruzadas caras)
 *
 * Decisão de modelagem: as consultas usam apenas `where` (array-contains /
 * igualdade) e ordenam no cliente, evitando índices compostos e erros de
 * runtime por "índice ausente".
 */

export const CHAT_COLLECTIONS = Object.freeze({
  conversations: 'conversations',
  messages: 'chat_messages',
});

export const CONVERSATION_TYPE = Object.freeze({
  DIRECT: 'direct',
  GROUP: 'group',
});

/** Limites de robustez. */
export const CHAT_LIMITS = Object.freeze({
  MESSAGE_MAX_CHARS: 4000,
  GROUP_TITLE_MAX: 80,
  MAX_ATTACHMENTS: 10,
  MAX_GROUP_MEMBERS: 50,
});
