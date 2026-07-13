/**
 * Mock · Chat (conversas + mensagens), notificações, audit logs, denúncias.
 *
 * - 2 conversas: 1 direta (adotante → ONG) e 1 em grupo (comunidade).
 * - ~10 mensagens distribuídas.
 * - 8 notificações para o usuário real (com datas recentes).
 * - 6 audit_logs mostrando ações recentes.
 * - 2 abuse_reports (denúncias de maus-tratos).
 *
 * As conversas têm o usuário real em `member_ids` (regra do Firestore).
 */

import { MOCK_CONVERSATION_PREFIX, MOCK_NOTIFICATION_PREFIX, MOCK_AUDIT_PREFIX, MOCK_REPORT_PREFIX, mockMeta, daysAgoMs, daysAgoIso } from './constants.js';
import { MOCK_USER_IDS } from './users.js';
import { MOCK_CLUB_IDS } from './clubs.js';
import { MOCK_PET_IDS } from './pets.js';

const _cid = (n) => `${MOCK_CONVERSATION_PREFIX}${String(n).padStart(3, '0')}`;
const _mid = (cn, n) => `mock_msg_${String(cn).padStart(3, '0')}_${String(n).padStart(3, '0')}`;
const _nid = (n) => `${MOCK_NOTIFICATION_PREFIX}${String(n).padStart(3, '0')}`;
const _aid = (n) => `${MOCK_AUDIT_PREFIX}${String(n).padStart(3, '0')}`;
const _rid = (n) => `${MOCK_REPORT_PREFIX}${String(n).padStart(3, '0')}`;

const MARINA = MOCK_USER_IDS['Marina Castro'];
const RAFAEL = MOCK_USER_IDS['Rafael Monteiro'];
const CAMILA = MOCK_USER_IDS['Camila Ferreira'];
const ANDRE = MOCK_USER_IDS['André Nakamura'];
const PATRICIA = MOCK_USER_IDS['Patrícia Lima'];
const LUCAS = MOCK_USER_IDS['Lucas Almeida'];

const CLB1 = MOCK_CLUB_IDS['Instituto Patinhas do Bem'];
const CLB2 = MOCK_CLUB_IDS['Associação Bigodes do Rio'];

const BOLINHA = MOCK_PET_IDS['Bolinha'];

/* ============================================================== *
 * 1. Conversations                                                *
 * ============================================================== */
const conversations = [
  {
    n: 1,
    type: 'direct',
    title: '',
    members: ['REAL_USER_UID', MARINA],
    pet_id: BOLINHA,
    pet_title: 'Bolinha',
    last: { text: 'Combinado! Sábado às 10h no Parque Villa-Lobos. 🚗', sender: 'REAL_USER_NAME', days: 0.5 },
  },
  {
    n: 2,
    type: 'group',
    title: 'Cuidadores Sudeste 2026',
    members: ['REAL_USER_UID', ANDRE, PATRICIA, LUCAS, CAMILA],
    pet_id: null,
    pet_title: '',
    last: { text: 'Pessoal, preparei uma apostila sobre FIV+. Compartilho na próxima reunião.', sender: 'Patrícia Lima', days: 0.2 },
  },
];

export const mockConversations = conversations.map((c) => ({
  id: _cid(c.n),
  data: {
    type: c.type,
    title: c.title,
    member_ids: c.members,
    members: c.members.map((uid, idx) => ({
      uid,
      name: idx === 0 ? 'REAL_USER_NAME' : (uid === MARINA ? 'Marina Castro' : uid === ANDRE ? 'André Nakamura' : uid === PATRICIA ? 'Patrícia Lima' : uid === LUCAS ? 'Lucas Almeida' : 'Camila Ferreira'),
    })),
    hidden_for: [],
    pet_id: c.pet_id,
    pet_title: c.pet_title,
    last_message: {
      text: c.last.text,
      sender_id: c.members[0], // REAL_USER_UID em runtime
      sender_name: c.last.sender,
      at_ms: daysAgoMs(c.last.days),
    },
    created_at: daysAgoIso(8),
    created_at_ms: daysAgoMs(8),
    updated_at: daysAgoIso(c.last.days),
    ...mockMeta({ kind: 'conversation', title: c.title || 'Conversa direta' }),
  },
}));

/* ============================================================== *
 * 2. Mensagens                                                    *
 * ============================================================== */
const messages = [
  // Conversa 1 (Marina + real user)
  { cn: 1, sender: 'REAL_USER_NAME', senderId: 'REAL_USER_UID', text: 'Oi Marina! Vi seu interesse no Bolinha. Quando você pode vir conhecê-lo?', days: 3 },
  { cn: 1, sender: 'Marina Castro', senderId: MARINA, text: 'Oi! Que bom receber o contato. Tenho disponibilidade sábado de manhã ou domingo à tarde.', days: 2.5 },
  { cn: 1, sender: 'REAL_USER_NAME', senderId: 'REAL_USER_UID', text: 'Sábado às 10h no Parque Villa-Lobos? Estaremos com 12 cães. Leva a família toda!', days: 1 },
  { cn: 1, sender: 'Marina Castro', senderId: MARINA, text: 'Vou levar meu marido e as crianças. Eles estão ansiosos. Posso levar petisco?', days: 0.8 },
  { cn: 1, sender: 'REAL_USER_NAME', senderId: 'REAL_USER_UID', text: 'Pode sim, ele ama biscoito canino! Até sábado 👋', days: 0.6 },
  { cn: 1, sender: 'REAL_USER_NAME', senderId: 'REAL_USER_UID', text: 'Combinado! Sábado às 10h no Parque Villa-Lobos. 🚗', days: 0.5 },

  // Conversa 2 (grupo Cuidadores)
  { cn: 2, sender: 'André Nakamura', senderId: ANDRE, text: 'Pessoal, abrimos a pauta da reunião de agosto. Sugestões?', days: 4 },
  { cn: 2, sender: 'Patrícia Lima', senderId: PATRICIA, text: 'Sugiro trazer um caso clínico difícil pra discussão em grupo.', days: 3.5 },
  { cn: 2, sender: 'Lucas Almeida', senderId: LUCAS, text: 'Posso apresentar o caso da Nina, que entrou em cio logo após castração.', days: 2 },
  { cn: 2, sender: 'Camila Ferreira', senderId: CAMILA, text: 'Boa. Vou compartilhar os números de adoção do mês.', days: 1.5 },
  { cn: 2, sender: 'Patrícia Lima', senderId: PATRICIA, text: 'Pessoal, preparei uma apostila sobre FIV+. Compartilho na próxima reunião.', days: 0.2 },
];

export const mockMessages = messages.map((m, idx) => ({
  id: _mid(m.cn, idx + 1),
  conversationId: _cid(m.cn),
  data: {
    sender_id: m.senderId,
    sender_name: m.sender,
    text: m.text,
    attachments: [],
    edited: false,
    created_at: daysAgoIso(m.days),
    created_at_ms: daysAgoMs(m.days),
    ...mockMeta({ kind: 'chat_message', conversation_id: _cid(m.cn) }),
  },
}));

/* ============================================================== *
 * 3. Notificações                                                 *
 * ============================================================== */
const notifications = [
  { n: 1, type: 'adoption_interest', title: 'Novo interesse em adoção', message: 'Marina Castro demonstrou interesse em adotar o Bolinha.', link: '/meus-pets', days: 3, read: false, actor: MARINA },
  { n: 2, type: 'chat_message', title: 'Nova mensagem', message: 'Marina Castro: "Pode sim, ele ama biscoito canino! Até sábado 👋"', link: '/chat', days: 0.6, read: false, actor: MARINA },
  { n: 3, type: 'club_join_request', title: 'Pedido de ingresso', message: 'Rafael Monteiro pediu para ingressar no Instituto Patinhas do Bem.', link: '/organizacoes/' + CLB1 + '/admin', days: 2, read: false, actor: RAFAEL },
  { n: 4, type: 'club_event_published', title: 'Novo evento publicado', message: 'Mutirão de Adoção — Parque Villa-Lobos, dia 26/07.', link: '/organizacoes/' + CLB1, days: 5, read: true, actor: null },
  { n: 5, type: 'forum_reply', title: 'Nova resposta no fórum', message: 'André Nakamura respondeu: "Fila com criança só funciona se o cão for socializado..."', link: '/organizacoes/' + CLB1, days: 9, read: true, actor: ANDRE },
  { n: 6, type: 'adoption_match', title: 'Match com pet compatível', message: 'O pet "Luna" (cachorro, pequeno) combina com seu perfil.', link: '/feed', days: 1, read: false, actor: null },
  { n: 7, type: 'pet_status_changed', title: 'Status do pet atualizado', message: 'Pipoca (cachorro, mini) foi marcado como adotado.', link: '/meus-pets', days: 12, read: true, actor: null },
  { n: 8, type: 'generic', title: 'Bem-vindo à plataforma de demos!', message: 'Esses são os dados mocados — você pode apagá-los a qualquer momento em /admin/mock-data.', link: '/admin/mock-data', days: 0, read: false, actor: null },
];

export const mockNotifications = notifications.map((n) => ({
  id: _nid(n.n),
  data: {
    user_id: 'REAL_USER_UID', // sempre para o admin
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    actor_id: n.actor,
    created_at: daysAgoIso(n.days),
    created_at_ms: daysAgoMs(n.days),
    ...mockMeta({ kind: 'notification' }),
  },
}));

/* ============================================================== *
 * 4. Audit logs                                                   *
 * ============================================================== */
const auditLogs = [
  { n: 1, action: 'club_created', label: 'Organização criada', actor: 'REAL_USER_NAME', days: 200, details: { club_id: CLB1 } },
  { n: 2, action: 'pet_created', label: 'Pet cadastrado', actor: 'REAL_USER_NAME', days: 75, details: { pet_id: MOCK_PET_IDS['Bolinha'] } },
  { n: 3, action: 'club_event_created', label: 'Evento criado', actor: 'REAL_USER_NAME', days: 30, details: { event_id: 'mock_evt_001' } },
  { n: 4, action: 'adoption_completed', label: 'Adoção concluída', actor: 'REAL_USER_NAME', days: 12, details: { pet_id: MOCK_PET_IDS['Pipoca'], adopter_id: MARINA } },
  { n: 5, action: 'club_member_invited', label: 'Membro convidado para a organização', actor: 'REAL_USER_NAME', days: 150, details: { club_id: CLB1, user_id: CAMILA } },
  { n: 6, action: 'platform_feature_flag_changed', label: 'Feature flag alterada (admin)', actor: 'REAL_USER_NAME', days: 0.5, details: { flag: 'mock_data_panel', enabled: true } },
];

export const mockAuditLogs = auditLogs.map((a) => ({
  id: _aid(a.n),
  data: {
    action: a.action,
    action_label: a.label,
    actor_id: 'REAL_USER_UID',
    actor_name: a.actor,
    actor_email: 'fsalamoni@gmail.com',
    user_id: 'REAL_USER_UID',
    user_name: a.actor,
    user_email: 'fsalamoni@gmail.com',
    details: a.details,
    created_at_ms: daysAgoMs(a.days),
    created_at: daysAgoIso(a.days),
    ...mockMeta({ kind: 'audit_log' }),
  },
}));

/* ============================================================== *
 * 5. Denúncias (abuse_reports)                                    *
 * ============================================================== */
const reports = [
  { n: 1, reporter: 'REAL_USER_NAME', days: 7, desc: 'Cachorro magro, preso em varanda de apartamento, sem água visível.', addr: 'Rua Augusta, 1500 — São Paulo', photoCount: 2 },
  { n: 2, reporter: 'André Nakamura', days: 15, desc: 'Gato com sinais de espancamento, dono nega atendimento veterinário.', addr: 'Rua do Catete, 200 — Rio de Janeiro', photoCount: 1 },
];

export const mockAbuseReports = reports.map((r) => ({
  id: _rid(r.n),
  data: {
    reporter_uid: r.reporter === 'REAL_USER_NAME' ? 'REAL_USER_UID' : MOCK_USER_IDS[r.reporter],
    reporter_name: r.reporter,
    description: r.desc,
    address: r.addr,
    latitude: -23.55,
    longitude: -46.63,
    photo_urls: Array.from({ length: r.photoCount }, (_, i) => `https://demo.viralata.app/mock/report_${r.n}_${i + 1}.jpg`),
    status: 'pending',
    created_at: daysAgoIso(r.days),
    created_at_ms: daysAgoMs(r.days),
    ...mockMeta({ kind: 'abuse_report' }),
  },
}));

export default {
  mockConversations,
  mockMessages,
  mockNotifications,
  mockAuditLogs,
  mockAbuseReports,
};
