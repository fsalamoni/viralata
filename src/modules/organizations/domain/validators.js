/**
 * Validadores / normalizadores de entrada para o módulo de Organizações.
 *
 * Estes helpers existem para:
 *  - Garantir que toda escrita no Firestore saneia strings (trim, limites
 *    máximos) e descarta campos vazios/opcionais não enviados — diminuindo o
 *    risco de documentos "sujos" no banco.
 *  - Padronizar como o `payload` é montado em cada operação de escrita.
 *  - Dar mensagens de erro claras para a UI mostrar ao usuário.
 *
 * Cada função é pura, testável e não toca no Firestore. O service (que faz
 * as escritas) consome o payload retornado.
 */

import {
  ORG_TEAM_LIMITS,
  ORG_MURAL_LIMITS,
  ORG_DONATION_LIMITS,
  ORG_CHAT_LIMITS,
  FINANCE_LIMITS,
  PRIVACY_LEVEL,
  POST_INTERACTION,
  LEDGER_TYPE,
} from './constants.js';
import { normalizePrivacyMap } from './privacy.js';

function trimOrEmpty(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function trimOrNull(v) {
  const s = trimOrEmpty(v);
  return s === '' ? null : s;
}

function cap(v, max) {
  if (v == null) return v;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

/** Lança erro com mensagem clara se a condição não for atendida. */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* ============================== Membro da equipe ============================== */

export function normalizeMemberInput(input = {}) {
  const name = cap(trimOrEmpty(input.user_name), ORG_TEAM_LIMITS.NAME_MAX);
  assert(name, 'Informe o nome do membro.');
  return {
    user_id: trimOrEmpty(input.user_id),
    user_name: name,
    user_email: cap(trimOrEmpty(input.user_email), 200),
    photo_url: trimOrEmpty(input.photo_url),
    phone: cap(trimOrEmpty(input.phone), ORG_TEAM_LIMITS.PHONE_MAX),
    whatsapp: cap(trimOrEmpty(input.whatsapp), ORG_TEAM_LIMITS.WHATSAPP_MAX),
    title: cap(trimOrEmpty(input.title), ORG_TEAM_LIMITS.TITLE_MAX),
    bio: cap(trimOrEmpty(input.bio), ORG_TEAM_LIMITS.BIO_MAX),
    history: cap(trimOrEmpty(input.history), ORG_TEAM_LIMITS.HISTORY_MAX),
    privacy_map: normalizePrivacyMap(input.privacy_map),
  };
}

/* ============================== Mural (post) ============================== */

export function normalizePostInput(input = {}) {
  const text = cap(trimOrEmpty(input.content), ORG_MURAL_LIMITS.CONTENT_MAX);
  const hasText = text.length > 0;
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];

  const allowed = Object.values(POST_INTERACTION);
  const interaction = allowed.includes(input.allow_interaction)
    ? input.allow_interaction
    : POST_INTERACTION.BOTH;

  return {
    content: text,
    attachments: attachments
      .filter((a) => a && a.url)
      .slice(0, ORG_MURAL_LIMITS.ATTACHMENT_MAX)
      .map((a) => ({
        url: String(a.url),
        path: a.path || '',
        name: cap(a.name || 'anexo', 200),
        type: a.type || 'image',
        size: Number(a.size) || 0,
      })),
    allow_likes: interaction === POST_INTERACTION.LIKES || interaction === POST_INTERACTION.BOTH,
    allow_comments: interaction === POST_INTERACTION.COMMENTS || interaction === POST_INTERACTION.BOTH,
    allow_interaction: interaction,
    hasContent: hasText || attachments.length > 0,
  };
}

/* ============================== Comentário de post ============================== */

export function normalizeCommentInput(input = {}) {
  const text = cap(trimOrEmpty(input.text), ORG_MURAL_LIMITS.COMMENT_MAX);
  assert(text, 'Escreva um comentário.');
  return { text };
}

/* ============================== Chamado de doação ============================== */

export function normalizeDonationInput(input = {}) {
  const title = cap(trimOrEmpty(input.title), ORG_DONATION_LIMITS.TITLE_MAX);
  assert(title, 'Informe o título do chamado de doação.');
  const goal = Number(input.goal) || 0;
  assert(goal > 0, 'A meta precisa ser maior que zero.');
  return {
    title,
    description: cap(trimOrEmpty(input.description), ORG_DONATION_LIMITS.DESCRIPTION_MAX),
    goal,
    raised: Number(input.raised) || 0,
    deadline: trimOrNull(input.deadline),
    pix_key: cap(trimOrEmpty(input.pix_key), ORG_DONATION_LIMITS.PIX_KEY_MAX),
    pix_qr_url: trimOrEmpty(input.pix_qr_url),
    bank_info: cap(trimOrEmpty(input.bank_info), ORG_DONATION_LIMITS.BANK_INFO_MAX),
    enable_receipt_upload: input.enable_receipt_upload !== false,
  };
}

/* ============================== Comprovante de contribuição ============================== */

export function normalizeReceiptInput(input = {}) {
  const fileUrl = trimOrEmpty(input.file_url);
  assert(fileUrl, 'Envie o comprovante (imagem ou PDF).');
  return {
    donation_id: trimOrEmpty(input.donation_id),
    file_url: fileUrl,
    file_name: cap(trimOrEmpty(input.file_name), 200),
    file_type: trimOrEmpty(input.file_type),
    file_size: Number(input.file_size) || 0,
    note: cap(trimOrEmpty(input.note), ORG_DONATION_LIMITS.RECEIPT_NOTE_MAX),
  };
}

/* ============================== Lançamento (prestação de contas) ============================== */

export function normalizeLedgerEntryInput(input = {}) {
  const type = input.type === LEDGER_TYPE.EXPENSE ? LEDGER_TYPE.EXPENSE : LEDGER_TYPE.REVENUE;
  const value = Number(input.value) || 0;
  assert(value >= FINANCE_LIMITS.VALUE_MIN, 'Informe um valor maior que zero.');
  const category = trimOrEmpty(input.category);
  assert(category, 'Selecione uma categoria.');
  const date = trimOrEmpty(input.date);
  assert(date, 'Informe a data do lançamento.');
  return {
    type,
    category: cap(category, FINANCE_LIMITS.CATEGORY_MAX),
    value,
    date,
    note: cap(trimOrEmpty(input.note), FINANCE_LIMITS.NOTE_MAX),
  };
}

/** Categoria configurável pelo admin. */
export function normalizeLedgerCategoryInput(input = {}) {
  const type = input.type === LEDGER_TYPE.EXPENSE ? LEDGER_TYPE.EXPENSE : LEDGER_TYPE.REVENUE;
  const label = cap(trimOrEmpty(input.label), FINANCE_LIMITS.CATEGORY_MAX);
  assert(label, 'Informe o nome da categoria.');
  return { type, label };
}

/* ============================== ONG (campos extras da aba Geral) ============================== */

export function normalizeClubInput(input = {}) {
  const name = cap(trimOrEmpty(input.name), 120);
  assert(name, 'Informe o nome da organização.');
  return {
    name,
    description: cap(trimOrEmpty(input.description), 2000),
    history: cap(trimOrEmpty(input.history), 8000), // história da ONG pode ser longa
    city: cap(trimOrEmpty(input.city), 60),
    state: cap(trimOrEmpty(input.state), 2),
    home_venue: cap(trimOrEmpty(input.home_venue), 200),
    contact_email: cap(trimOrEmpty(input.contact_email), 200),
    contact_phone: cap(trimOrEmpty(input.contact_phone), 30),
    whatsapp_number: cap(trimOrEmpty(input.whatsapp_number), 30),
    instagram: cap(trimOrEmpty(input.instagram), 60),
    logo_url: trimOrEmpty(input.logo_url),
    cnpj: cap(trimOrEmpty(input.cnpj), 20),
    donation_link: cap(trimOrEmpty(input.donation_link), 400),
    chat_enabled: input.chat_enabled !== false, // default true
  };
}

/* ============================== Chat (mensagem) ============================== */

export function normalizeChatMessageInput(input = {}) {
  const text = cap(trimOrEmpty(input.text), ORG_CHAT_LIMITS.MESSAGE_MAX);
  assert(text, 'Escreva uma mensagem.');
  return { text };
}
