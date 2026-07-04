/**
 * Serviço de Clubes (organizações de adoção) — CRUD, membros, eventos e mural.
 *
 * Decisões de segurança/robustez:
 *  - Criação da organização e da primeira associação (admin) são escritas
 *    sequenciais (não em batch) para que a regra de segurança possa validar
 *    `clubs.created_by` ao criar o membro admin. Em caso de falha na segunda
 *    escrita, a organização é removida (rollback best-effort).
 *  - O contador `member_count` é apenas cosmético; nunca é fonte de verdade.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { notifyUsers, NOTIFICATION_TYPE } from '@/core/services/notificationService';
import { CLUB_DIRECTORY_STATUS, isClubPubliclyVisible } from '@/modules/communities/domain/directory';
import {
  CLUB_COLLECTIONS,
  CLUB_ROLE,
  CLUB_PERMISSION_KEYS,
  CLUB_EVENT_TYPE,
  EVENT_CHAT_LIMITS,
  EVENT_VISIBILITY,
  INVITE_STATUS,
  INVITE_SOURCE,
  JOIN_REQUEST_STATUS,
  MEMBER_INVITE_STATUS,
  CAMPAIGN_STATUS,
  LEDGER_TYPE,
} from '../domain/constants.js';

const COL = CLUB_COLLECTIONS;

function eventInviteId(eventId, userId) {
  return `${eventId}_${userId}`;
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function memberDocId(clubId, userId) {
  return `${clubId}_${userId}`;
}

function rsvpDocId(eventId, userId) {
  return `${eventId}_${userId}`;
}

function trimmed(value) {
  return String(value ?? '').trim();
}

/**
 * Executa um conjunto de operações de escrita em lotes de no máximo 450
 * (limite do Firestore é 500 por batch), de forma segura para grandes volumes.
 * @param {Array<{ type: 'set'|'delete', ref: any, data?: object }>} ops
 */
async function commitInChunks(ops) {
  const CHUNK = 450;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const batch = writeBatch(db);
    ops.slice(i, i + CHUNK).forEach((op) => {
      if (op.type === 'delete') batch.delete(op.ref);
      else batch.set(op.ref, op.data);
    });
    await batch.commit();
  }
}

function memberPayload(clubId, user, profile, role) {
  return {
    club_id: clubId,
    user_id: user.uid,
    user_name: profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Usuário',
    user_email: user.email || '',
    photo_url: profile?.photo_url || user.photoURL || '',
    role,
    joined_at: serverTimestamp(),
  };
}

/* --------------------------------- Clubs -------------------------------- */

export async function createClub(creator, profile, data) {
  if (!creator?.uid) throw new Error('Usuário não autenticado.');
  if (!trimmed(data.name)) throw new Error('Informe o nome da organização.');

  const id = doc(collection(db, COL.clubs)).id;
  const payload = {
    id,
    name: trimmed(data.name),
    description: trimmed(data.description),
    city: trimmed(data.city),
    state: trimmed(data.state),
    logo_url: trimmed(data.logo_url),
    contact_email: trimmed(data.contact_email),
    contact_phone: trimmed(data.contact_phone),
    instagram: trimmed(data.instagram),
    home_venue: trimmed(data.home_venue),
    cnpj: trimmed(data.cnpj),
    donation_link: trimmed(data.donation_link),
    invite_code: inviteCode(),
    member_count: 1,
    directory_status: CLUB_DIRECTORY_STATUS.ACTIVE,
    featured: false,
    community_id: '',
    community_name: '',
    created_by: creator.uid,
    creator_name: profile?.platform_name || creator.displayName || creator.email || '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(doc(db, COL.clubs, id), payload);
  try {
    await setDoc(doc(db, COL.members, memberDocId(id, creator.uid)), memberPayload(id, creator, profile, CLUB_ROLE.ADMIN));
  } catch (err) {
    // Rollback: evita clube órfão sem administrador.
    await deleteDoc(doc(db, COL.clubs, id)).catch(() => {});
    throw err;
  }

  await createAuditLog({ action: 'club_created', actor: creator, details: { club_id: id, name: payload.name } });
  logger.info('club_created', { id });
  return id;
}

export async function getClub(id) {
  if (!db || !id) return null;
  const snap = await getDoc(doc(db, COL.clubs, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getClubByInviteCode(code) {
  if (!db) return null;
  const snap = await getDocs(query(collection(db, COL.clubs), where('invite_code', '==', trimmed(code).toUpperCase())));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function listClubs() {
  if (!db) return [];
  const snap = await getDocs(collection(db, COL.clubs));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isClubPubliclyVisible);
}

export async function listMyClubs(userId) {
  if (!db || !userId) return [];
  const memberSnap = await getDocs(query(collection(db, COL.members), where('user_id', '==', userId)));
  const memberships = memberSnap.docs.map((d) => d.data());
  const results = [];
  for (const membership of memberships) {
    const club = await getClub(membership.club_id);
    if (club) results.push({ ...club, my_role: membership.role });
  }
  return results;
}

export async function updateClub(id, updates, actor) {
  const allowed = ['name', 'description', 'city', 'state', 'logo_url', 'contact_email', 'contact_phone', 'instagram', 'home_venue', 'cnpj', 'donation_link'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) sanitized[key] = trimmed(updates[key]);
  });
  await updateDoc(doc(db, COL.clubs, id), { ...sanitized, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_updated', actor, details: { club_id: id, fields: Object.keys(sanitized) } });
}

export async function regenerateInviteCode(id, actor) {
  const code = inviteCode();
  await updateDoc(doc(db, COL.clubs, id), { invite_code: code, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_invite_regenerated', actor, details: { club_id: id } });
  return code;
}

export async function deleteClub(id, actor) {
  // Remove eventos e posts ANTES dos membros: a regra de segurança para
  // excluí-los exige que o ator ainda seja admin (sua associação precisa
  // existir). Membros são removidos por último, depois o clube.
  const subcollections = [
    { col: COL.events, field: 'club_id' },
    { col: COL.rsvps, field: 'club_id' },
    { col: COL.posts, field: 'club_id' },
    { col: COL.campaigns, field: 'club_id' },
    { col: COL.ledger, field: 'club_id' },
    { col: COL.members, field: 'club_id' },
  ];
  for (const { col, field } of subcollections) {
    try {
      const snap = await getDocs(query(collection(db, col), where(field, '==', id)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    } catch (err) {
      logger.error(`Falha ao limpar ${col} do clube ${id}:`, err);
    }
  }
  await deleteDoc(doc(db, COL.clubs, id));
  await createAuditLog({ action: 'club_deleted', actor, details: { club_id: id } });
}

/* -------------------------------- Members ------------------------------- */

export async function listClubMembers(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.members), where('club_id', '==', clubId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMembership(clubId, userId) {
  if (!db || !clubId || !userId) return null;
  const snap = await getDoc(doc(db, COL.members, memberDocId(clubId, userId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function joinClubByCode(code, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const club = await getClubByInviteCode(code);
  if (!club) throw new Error('Código de convite inválido.');

  const existing = await getMembership(club.id, user.uid);
  if (existing) return club;

  await setDoc(doc(db, COL.members, memberDocId(club.id, user.uid)), memberPayload(club.id, user, profile, CLUB_ROLE.MEMBER));
  // Atualização cosmética do contador (best-effort).
  await updateDoc(doc(db, COL.clubs, club.id), { member_count: increment(1), updated_at: serverTimestamp() }).catch(() => {});
  await createAuditLog({ action: 'club_member_joined', actor: user, details: { club_id: club.id } });
  return club;
}

export async function leaveClub(clubId, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const members = await listClubMembers(clubId);
  const me = members.find((m) => m.user_id === user.uid);
  if (!me) return;
  const admins = members.filter((m) => m.role === CLUB_ROLE.ADMIN);
  if (me.role === CLUB_ROLE.ADMIN && admins.length === 1 && members.length > 1) {
    throw new Error('Você é o único administrador. Promova outro membro a administrador antes de sair.');
  }

  await deleteDoc(doc(db, COL.members, memberDocId(clubId, user.uid)));
  await updateDoc(doc(db, COL.clubs, clubId), { member_count: increment(-1), updated_at: serverTimestamp() }).catch(() => {});
  await createAuditLog({ action: 'club_member_left', actor: user, details: { club_id: clubId } });
}

export async function setMemberRole(clubId, member, role, actor) {
  if (!member?.user_id) throw new Error('Membro inválido.');
  const club = await getClub(clubId);
  if (club?.created_by === member.user_id) {
    throw new Error('O proprietário da organização não pode ter o papel alterado.');
  }
  if (role !== CLUB_ROLE.ADMIN && member.role === CLUB_ROLE.ADMIN) {
    // Impede remover o último administrador.
    const members = await listClubMembers(clubId);
    const admins = members.filter((m) => m.role === CLUB_ROLE.ADMIN);
    if (admins.length <= 1) throw new Error('A organização precisa ter pelo menos um administrador.');
  }
  const updates = { role, updated_at: serverTimestamp() };
  // Rebaixar de admin para membro precisa limpar as permissões granulares:
  // hasClubPermission() concede acesso pela permissions map independente do
  // role, então sem isso o membro rebaixado continuaria com acesso de admin.
  if (role !== CLUB_ROLE.ADMIN) updates.permissions = {};
  await updateDoc(doc(db, COL.members, memberDocId(clubId, member.user_id)), updates);
  await createAuditLog({
    action: role === CLUB_ROLE.ADMIN ? 'club_admin_added' : 'club_admin_removed',
    actor,
    details: { club_id: clubId, user_id: member.user_id },
  });
}

/**
 * Permissões granulares do painel de administração de um membro:
 * `animals`, `finance`, `donations`, `feed`, `team`. O proprietário tem
 * todas implicitamente e não pode ser editado (ver `domain/permissions.js`).
 */
export async function setMemberPermissions(clubId, member, permissions, actor) {
  if (!member?.user_id) throw new Error('Membro inválido.');
  const club = await getClub(clubId);
  if (club?.created_by === member.user_id) {
    throw new Error('O proprietário da organização já tem todas as permissões.');
  }
  const sanitized = {};
  CLUB_PERMISSION_KEYS.forEach((key) => {
    sanitized[key] = !!permissions[key];
  });
  await updateDoc(doc(db, COL.members, memberDocId(clubId, member.user_id)), {
    permissions: sanitized,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'club_member_permissions_updated',
    actor,
    details: { club_id: clubId, user_id: member.user_id, permissions: sanitized },
  });
}

export async function removeMember(clubId, member, actor) {
  if (!member?.user_id) throw new Error('Membro inválido.');
  const club = await getClub(clubId);
  if (club?.created_by === member.user_id) {
    throw new Error('O proprietário da organização não pode ser removido.');
  }
  if (member.role === CLUB_ROLE.ADMIN) {
    const members = await listClubMembers(clubId);
    const admins = members.filter((m) => m.role === CLUB_ROLE.ADMIN);
    if (admins.length <= 1) throw new Error('Não é possível remover o último administrador.');
  }
  await deleteDoc(doc(db, COL.members, memberDocId(clubId, member.user_id)));
  await updateDoc(doc(db, COL.clubs, clubId), { member_count: increment(-1), updated_at: serverTimestamp() }).catch(() => {});
  await createAuditLog({ action: 'club_member_removed', actor, details: { club_id: clubId, user_id: member.user_id } });
}

/* ------------------ Join requests & membership invites ------------------ */

/** Uids dos administradores de um clube (para notificações). */
async function listClubAdminIds(clubId) {
  const members = await listClubMembers(clubId).catch(() => []);
  return members.filter((m) => m.role === CLUB_ROLE.ADMIN).map((m) => m.user_id).filter(Boolean);
}

/**
 * Não-membro pede para ingressar no clube. Cria (ou reaproveita) o pedido
 * pendente e notifica os administradores. Id determinístico evita duplicidade.
 */
export async function requestToJoinClub(club, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!club?.id) throw new Error('Organização inválida.');
  const existingMember = await getMembership(club.id, user.uid).catch(() => null);
  if (existingMember) return { alreadyMember: true };

  const id = memberDocId(club.id, user.uid);
  const requesterName = profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Usuário';
  await setDoc(doc(db, COL.joinRequests, id), {
    id,
    club_id: club.id,
    club_name: trimmed(club.name),
    user_id: user.uid,
    user_name: requesterName,
    user_email: user.email || '',
    photo_url: profile?.photo_url || user.photoURL || '',
    status: JOIN_REQUEST_STATUS.PENDING,
    created_at: serverTimestamp(),
    created_at_ms: Date.now(),
    updated_at: serverTimestamp(),
  });

  const adminIds = await listClubAdminIds(club.id);
  notifyUsers(adminIds, {
    title: `${requesterName} pediu para entrar em "${trimmed(club.name).slice(0, 50)}"`,
    message: 'Toque para aprovar ou recusar o pedido na administração da organização.',
    type: NOTIFICATION_TYPE.CLUB_JOIN_REQUEST,
    link: `/organizacoes/${club.id}/admin?tab=team`,
    actor: { uid: user.uid, displayName: requesterName },
  });
  await createAuditLog({ action: 'club_join_requested', actor: user, details: { club_id: club.id } });
  return { ok: true };
}

export async function getMyJoinRequest(clubId, userId) {
  if (!db || !clubId || !userId) return null;
  const snap = await getDoc(doc(db, COL.joinRequests, memberDocId(clubId, userId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listMyJoinRequests(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(query(collection(db, COL.joinRequests), where('user_id', '==', userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listJoinRequests(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(
    query(collection(db, COL.joinRequests), where('club_id', '==', clubId), where('status', '==', JOIN_REQUEST_STATUS.PENDING)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
}

export async function approveJoinRequest(request, actor) {
  if (!request?.club_id || !request?.user_id) throw new Error('Pedido inválido.');
  // Admin cria a associação do solicitante (regra permite admin criar membro).
  await setDoc(doc(db, COL.members, memberDocId(request.club_id, request.user_id)), {
    club_id: request.club_id,
    user_id: request.user_id,
    user_name: request.user_name || 'Usuário',
    user_email: request.user_email || '',
    photo_url: request.photo_url || '',
    role: CLUB_ROLE.MEMBER,
    joined_at: serverTimestamp(),
  });
  await updateDoc(doc(db, COL.joinRequests, memberDocId(request.club_id, request.user_id)), {
    status: JOIN_REQUEST_STATUS.APPROVED,
    responded_by: actor?.uid || null,
    updated_at: serverTimestamp(),
  }).catch(() => {});
  await updateDoc(doc(db, COL.clubs, request.club_id), { member_count: increment(1), updated_at: serverTimestamp() }).catch(() => {});
  notifyUsers([request.user_id], {
    title: `Pedido aprovado: você agora é membro de "${trimmed(request.club_name).slice(0, 50)}"`,
    message: 'Toque para abrir a organização e ver eventos, mural e fórum.',
    type: NOTIFICATION_TYPE.CLUB_JOIN_APPROVED,
    link: `/comunidade/${request.club_id}`,
    actor,
  });
  await createAuditLog({ action: 'club_join_approved', actor, details: { club_id: request.club_id, user_id: request.user_id } });
}

export async function rejectJoinRequest(request, actor) {
  if (!request?.club_id || !request?.user_id) throw new Error('Pedido inválido.');
  await updateDoc(doc(db, COL.joinRequests, memberDocId(request.club_id, request.user_id)), {
    status: JOIN_REQUEST_STATUS.REJECTED,
    responded_by: actor?.uid || null,
    updated_at: serverTimestamp(),
  });
  notifyUsers([request.user_id], {
    title: `Seu pedido para "${trimmed(request.club_name).slice(0, 50)}" não foi aprovado`,
    message: 'Você pode falar com um administrador da organização para mais informações.',
    type: NOTIFICATION_TYPE.CLUB_JOIN_REJECTED,
    link: `/comunidade/${request.club_id}`,
    actor,
  });
  await createAuditLog({ action: 'club_join_rejected', actor, details: { club_id: request.club_id, user_id: request.user_id } });
}

/**
 * Admin convida um usuário para o clube. `target` = { user_id, user_name,
 * user_email, photo_url }. O convidado recebe notificação e decide aceitar.
 */
export async function inviteMemberToClub(club, target, inviter, profile) {
  if (!inviter?.uid) throw new Error('Usuário não autenticado.');
  if (!target?.user_id) throw new Error('Selecione um usuário para convidar.');
  const existingMember = await getMembership(club.id, target.user_id).catch(() => null);
  if (existingMember) throw new Error('Este usuário já é membro da organização.');

  const id = memberDocId(club.id, target.user_id);
  const inviterName = profile?.platform_name || inviter.displayName || inviter.email || 'Um administrador';
  await setDoc(doc(db, COL.memberInvites, id), {
    id,
    club_id: club.id,
    club_name: trimmed(club.name),
    user_id: target.user_id,
    user_name: target.user_name || 'Usuário',
    user_email: target.user_email || '',
    photo_url: target.photo_url || '',
    status: MEMBER_INVITE_STATUS.PENDING,
    invited_by: inviter.uid,
    inviter_name: inviterName,
    created_at: serverTimestamp(),
    created_at_ms: Date.now(),
    updated_at: serverTimestamp(),
  });
  notifyUsers([target.user_id], {
    title: `${inviterName} convidou você para a organização "${trimmed(club.name).slice(0, 50)}"`,
    message: 'Toque para aceitar ou recusar o convite.',
    type: NOTIFICATION_TYPE.CLUB_INVITE,
    link: `/comunidade/${club.id}`,
    actor: { uid: inviter.uid, displayName: inviterName },
  });
  await createAuditLog({ action: 'club_member_invited', actor: inviter, details: { club_id: club.id, user_id: target.user_id } });
}

export async function listClubInvites(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(
    query(collection(db, COL.memberInvites), where('club_id', '==', clubId), where('status', '==', MEMBER_INVITE_STATUS.PENDING)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
}

export async function listMyClubInvites(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(
    query(collection(db, COL.memberInvites), where('user_id', '==', userId), where('status', '==', MEMBER_INVITE_STATUS.PENDING)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMyClubInvite(clubId, userId) {
  if (!db || !clubId || !userId) return null;
  const snap = await getDoc(doc(db, COL.memberInvites, memberDocId(clubId, userId)));
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.status === MEMBER_INVITE_STATUS.PENDING ? { id: snap.id, ...data } : null;
}

export async function acceptClubInvite(invite, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!invite?.club_id) throw new Error('Convite inválido.');
  // O próprio convidado cria sua associação (regra permite user_id==uid && member).
  await setDoc(doc(db, COL.members, memberDocId(invite.club_id, user.uid)), memberPayload(invite.club_id, user, profile, CLUB_ROLE.MEMBER));
  await updateDoc(doc(db, COL.memberInvites, memberDocId(invite.club_id, user.uid)), {
    status: MEMBER_INVITE_STATUS.ACCEPTED,
    updated_at: serverTimestamp(),
  }).catch(() => {});
  await updateDoc(doc(db, COL.clubs, invite.club_id), { member_count: increment(1), updated_at: serverTimestamp() }).catch(() => {});
  const me = profile?.platform_name || user.displayName || user.email || 'Um usuário';
  if (invite.invited_by) {
    notifyUsers([invite.invited_by], {
      title: `${me} aceitou o convite e entrou em "${trimmed(invite.club_name).slice(0, 50)}"`,
      message: 'O usuário agora faz parte da organização.',
      type: NOTIFICATION_TYPE.CLUB_INVITE_ACCEPTED,
      link: `/organizacoes/${invite.club_id}/admin?tab=team`,
      actor: { uid: user.uid, displayName: me },
    });
  }
  await createAuditLog({ action: 'club_invite_accepted', actor: user, details: { club_id: invite.club_id } });
}

export async function declineClubInvite(invite, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  await updateDoc(doc(db, COL.memberInvites, memberDocId(invite.club_id, user.uid)), {
    status: MEMBER_INVITE_STATUS.DECLINED,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'club_invite_declined', actor: user, details: { club_id: invite.club_id } });
}

/**
 * Convida vários usuários de uma vez. Cada convite é independente: falhas
 * individuais (ex.: já é membro) não abortam os demais. Retorna um resumo.
 */
export async function inviteMembersToClub(club, targets, inviter, profile) {
  const list = (Array.isArray(targets) ? targets : [targets]).filter((t) => t?.user_id);
  if (list.length === 0) throw new Error('Selecione ao menos um usuário.');
  const results = await Promise.allSettled(
    list.map((t) => inviteMemberToClub(club, t, inviter, profile)),
  );
  const invited = results.filter((r) => r.status === 'fulfilled').length;
  return { invited, failed: results.length - invited };
}

/** Admin cancela um convite pendente. */
export async function cancelClubInvite(invite, actor) {
  if (!invite?.club_id || !invite?.user_id) throw new Error('Convite inválido.');
  await deleteDoc(doc(db, COL.memberInvites, memberDocId(invite.club_id, invite.user_id)));
  await createAuditLog({ action: 'club_invite_cancelled', actor, details: { club_id: invite.club_id, user_id: invite.user_id } });
}

/* -------------------------------- Events -------------------------------- */

/* -------------------------------- Events (e novos avisos) ---------------- */

function sortEvents(list) {
  return list.sort((a, b) => String(a.starts_at || '').localeCompare(String(b.starts_at || '')));
}

/**
 * Lista os eventos visíveis para o usuário em um clube:
 *  - tenta a consulta ampla (funciona para admins/criadores ou quando não há
 *    evento privado bloqueando a leitura);
 *  - se as regras bloquearem (há eventos privados que o usuário não pode ler),
 *    cai para: eventos públicos + eventos privados em que o usuário foi
 *    convidado (via event_invites).
 */
export async function listClubEvents(clubId, userId) {
  if (!db || !clubId) return [];
  try {
    const snap = await getDocs(query(collection(db, COL.events), where('club_id', '==', clubId)));
    return sortEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    logger.info('listClubEvents: fallback para eventos públicos + convites', { clubId, err: err?.code });
    const byId = new Map();
    try {
      const pub = await getDocs(
        query(collection(db, COL.events), where('club_id', '==', clubId), where('visibility', '==', EVENT_VISIBILITY.PUBLIC)),
      );
      pub.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
    } catch (e) {
      logger.error('Falha ao listar eventos públicos do clube:', e);
    }
    if (userId) {
      const invites = await listMyEventInvites(userId).catch(() => []);
      for (const inv of invites.filter((i) => i.club_id === clubId)) {
        if (byId.has(inv.event_id)) continue;
        const ev = await getClubEvent(inv.event_id).catch(() => null);
        if (ev) byId.set(ev.id, ev);
      }
    }
    return sortEvents(Array.from(byId.values()));
  }
}

export async function getClubEvent(eventId) {
  if (!db || !eventId) return null;
  const snap = await getDoc(doc(db, COL.events, eventId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createClubEvent(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!trimmed(data.title)) throw new Error('Informe o título do evento.');
  const id = doc(collection(db, COL.events)).id;
  const visibility = data.visibility === EVENT_VISIBILITY.PRIVATE ? EVENT_VISIBILITY.PRIVATE : EVENT_VISIBILITY.PUBLIC;
  await setDoc(doc(db, COL.events, id), {
    id,
    club_id: clubId,
    title: trimmed(data.title),
    description: trimmed(data.description),
    type: data.type || CLUB_EVENT_TYPE.SOCIAL,
    location: trimmed(data.location),
    starts_at: data.starts_at || null,
    recurring: !!data.recurring,
    visibility,
    created_by: user.uid,
    created_by_name: data.created_by_name || user.displayName || user.email || '',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  // O criador já entra como participante confirmado do evento.
  try {
    await setDoc(doc(db, COL.eventInvites, eventInviteId(id, user.uid)), {
      id: eventInviteId(id, user.uid),
      event_id: id,
      club_id: clubId,
      user_id: user.uid,
      user_name: data.created_by_name || user.displayName || user.email || 'Usuário',
      user_photo: data.created_by_photo || user.photoURL || '',
      status: INVITE_STATUS.GOING,
      source: INVITE_SOURCE.CLUB,
      invited_by: user.uid,
      created_at: serverTimestamp(),
      created_at_ms: Date.now(),
      updated_at: serverTimestamp(),
    });
  } catch (err) {
    logger.error('Falha ao registrar o criador como participante do evento:', err);
  }
  // Semeia a primeira data do evento (quando informada) para que a página do
  // evento já mostre a data com local/horário e permita respostas por data.
  if (data.starts_at) {
    try {
      await addEventDate(id, { club_id: clubId, date_time: data.starts_at, location: trimmed(data.location) }, user);
    } catch (err) {
      logger.error('Falha ao criar a data inicial do evento:', err);
    }
  }
  // Avisa os membros do clube quando um evento PÚBLICO é criado.
  if (visibility === EVENT_VISIBILITY.PUBLIC) {
    try {
      const memberIds = (await listClubMembers(clubId)).map((m) => m.user_id).filter(Boolean);
      const creatorName = data.created_by_name || user.displayName || user.email || 'Um membro';
      notifyUsers(memberIds, {
        title: `Novo evento na organização: "${trimmed(data.title).slice(0, 60)}"`,
        message: `${creatorName} criou um evento. Toque para ver e responder.`,
        type: NOTIFICATION_TYPE.CLUB_EVENT_PUBLISHED,
        link: `/comunidade/${clubId}/eventos/${id}`,
        actor: { uid: user.uid, displayName: creatorName },
      });
    } catch (err) {
      logger.error('Falha ao notificar membros sobre novo evento:', err);
    }
  }
  await createAuditLog({ action: 'club_event_created', actor: user, details: { club_id: clubId, event_id: id } });
  return id;
}

export async function updateClubEvent(eventId, updates, actor) {
  const allowed = ['title', 'description', 'type', 'location', 'starts_at', 'recurring', 'visibility'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] === undefined) return;
    if (key === 'starts_at') sanitized[key] = updates[key] || null;
    else if (key === 'type') sanitized[key] = updates[key];
    else if (key === 'recurring') sanitized[key] = !!updates[key];
    else if (key === 'visibility') sanitized[key] = updates[key] === EVENT_VISIBILITY.PRIVATE ? EVENT_VISIBILITY.PRIVATE : EVENT_VISIBILITY.PUBLIC;
    else sanitized[key] = trimmed(updates[key]);
  });
  await updateDoc(doc(db, COL.events, eventId), { ...sanitized, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_event_updated', actor, details: { event_id: eventId } });
}

/* ----------------------- Event invites / participants ------------------- */

export async function listEventInvites(eventId) {
  if (!db || !eventId) return [];
  const snap = await getDocs(query(collection(db, COL.eventInvites), where('event_id', '==', eventId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
}

export async function listMyEventInvites(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(query(collection(db, COL.eventInvites), where('user_id', '==', userId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Eventos disponíveis para o usuário na página inicial:
 *  - eventos públicos dos clubes em que o usuário é membro;
 *  - eventos (públicos ou privados) para os quais o usuário foi convidado, de
 *    qualquer clube.
 */
export async function listAvailableEvents(userId, clubIds = []) {
  if (!db || !userId) return [];
  const byId = new Map();
  for (const cid of clubIds) {
    try {
      const snap = await getDocs(
        query(collection(db, COL.events), where('club_id', '==', cid), where('visibility', '==', EVENT_VISIBILITY.PUBLIC)),
      );
      snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data(), my_invite_status: null }));
    } catch (err) {
      logger.error('Falha ao listar eventos públicos para o início:', err);
    }
  }
  const invites = await listMyEventInvites(userId).catch(() => []);
  const statusByEvent = new Map(invites.map((i) => [i.event_id, i.status]));
  for (const inv of invites) {
    if (!byId.has(inv.event_id)) {
      const ev = await getClubEvent(inv.event_id).catch(() => null);
      if (ev) byId.set(ev.id, { ...ev, my_invite_status: inv.status });
    }
  }
  // Anota a resposta do usuário (quando houver) também nos públicos.
  const result = Array.from(byId.values()).map((ev) => ({
    ...ev,
    my_invite_status: ev.my_invite_status ?? statusByEvent.get(ev.id) ?? null,
  }));
  return result.sort((a, b) => String(a.starts_at || '').localeCompare(String(b.starts_at || '')));
}

export async function getMyEventInvite(eventId, userId) {
  if (!db || !eventId || !userId) return null;
  const snap = await getDoc(doc(db, COL.eventInvites, eventInviteId(eventId, userId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Convida um usuário (do clube ou da plataforma) para o evento e notifica-o.
 * `target` = { user_id, user_name, user_photo, source }.
 */
export async function inviteToEvent(event, target, inviter, profile) {
  if (!inviter?.uid) throw new Error('Usuário não autenticado.');
  if (!target?.user_id) throw new Error('Selecione um usuário para convidar.');
  const id = eventInviteId(event.id, target.user_id);
  // Verificação best-effort: se já existe, não sobrescreve a resposta atual.
  try {
    const existing = await getDoc(doc(db, COL.eventInvites, id));
    if (existing.exists()) return existing.data();
  } catch (err) {
    logger.info('inviteToEvent: verificação de convite existente ignorada', { err: err?.code });
  }

  const payload = {
    id,
    event_id: event.id,
    club_id: event.club_id,
    user_id: target.user_id,
    user_name: target.user_name || 'Usuário',
    user_photo: target.user_photo || '',
    status: INVITE_STATUS.INVITED,
    source: target.source === INVITE_SOURCE.PLATFORM ? INVITE_SOURCE.PLATFORM : INVITE_SOURCE.CLUB,
    invited_by: inviter.uid,
    created_at: serverTimestamp(),
    created_at_ms: Date.now(),
    updated_at: serverTimestamp(),
  };
  await setDoc(doc(db, COL.eventInvites, id), payload);

  const inviterName = profile?.platform_name || inviter.displayName || inviter.email || 'Um usuário';
  notifyUsers([target.user_id], {
    title: `${inviterName} convidou você para "${trimmed(event.title).slice(0, 60)}"`,
    message: 'Toque para ver o evento e responder: Vou, Talvez ou Não vou.',
    type: NOTIFICATION_TYPE.EVENT_INVITE,
    link: `/comunidade/${event.club_id}/eventos/${event.id}`,
    actor: { uid: inviter.uid, displayName: inviterName },
  });
  return payload;
}

/** Resposta do próprio usuário (Vou/Talvez/Não vou) — cria ou atualiza o convite. */
export async function setMyEventResponse(event, status, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const id = eventInviteId(event.id, user.uid);
  await setDoc(
    doc(db, COL.eventInvites, id),
    {
      id,
      event_id: event.id,
      club_id: event.club_id,
      user_id: user.uid,
      user_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
      user_photo: profile?.photo_url || user.photoURL || '',
      status,
      source: INVITE_SOURCE.CLUB,
      updated_at: serverTimestamp(),
      created_at_ms: Date.now(),
    },
    { merge: true },
  );
}

export async function removeEventInvite(eventId, userId) {
  await deleteDoc(doc(db, COL.eventInvites, eventInviteId(eventId, userId)));
}

async function deleteSubcollection(eventId, sub) {
  try {
    const snap = await getDocs(collection(db, COL.events, eventId, sub));
    if (snap.empty) return;
    await commitInChunks(snap.docs.map((d) => ({ type: 'delete', ref: d.ref })));
  } catch (err) {
    logger.error(`Falha ao limpar subcoleção ${sub} do evento ${eventId}:`, err);
  }
}

export async function deleteClubEvent(eventId, actor) {
  // RSVPs legados e convites/participações (coleções de nível superior).
  for (const colName of [COL.rsvps, COL.eventInvites]) {
    try {
      const snap = await getDocs(query(collection(db, colName), where('event_id', '==', eventId)));
      if (!snap.empty) await commitInChunks(snap.docs.map((d) => ({ type: 'delete', ref: d.ref })));
    } catch (err) {
      logger.error(`Falha ao limpar ${colName} do evento:`, err);
    }
  }
  // Limpa as subcoleções do evento (best-effort) antes de remover o documento.
  for (const sub of [COL.eventDates, COL.eventDateRsvps, COL.eventMessages, COL.eventParticipants]) {
    await deleteSubcollection(eventId, sub);
  }
  await deleteDoc(doc(db, COL.events, eventId));
  await createAuditLog({ action: 'club_event_deleted', actor, details: { event_id: eventId } });
}

/* --------------------------- Event dates -------------------------------- */

export async function listEventDates(eventId) {
  if (!db || !eventId) return [];
  const snap = await getDocs(collection(db, COL.events, eventId, COL.eventDates));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.date_time || '').localeCompare(String(b.date_time || '')));
}

export async function addEventDate(eventId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const ref = doc(collection(db, COL.events, eventId, COL.eventDates));
  await setDoc(ref, {
    id: ref.id,
    event_id: eventId,
    club_id: data.club_id || '',
    date_time: data.date_time || null,
    location: trimmed(data.location),
    note: trimmed(data.note),
    created_by: user.uid,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEventDate(eventId, dateId, updates) {
  const allowed = ['date_time', 'location', 'note'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] === undefined) return;
    sanitized[key] = key === 'date_time' ? (updates[key] || null) : trimmed(updates[key]);
  });
  await updateDoc(doc(db, COL.events, eventId, COL.eventDates, dateId), { ...sanitized, updated_at: serverTimestamp() });
}

export async function deleteEventDate(eventId, dateId) {
  await clearEventDateData(eventId, dateId);
  await deleteDoc(doc(db, COL.events, eventId, COL.eventDates, dateId));
}

/* ------------------------- Per-date RSVP -------------------------------- */

export async function listEventDateRsvps(eventId) {
  if (!db || !eventId) return [];
  const snap = await getDocs(collection(db, COL.events, eventId, COL.eventDateRsvps));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setEventDateRsvp(eventId, dateId, status, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  await setDoc(doc(db, COL.events, eventId, COL.eventDateRsvps, `${dateId}_${user.uid}`), {
    event_id: eventId,
    date_id: dateId,
    user_id: user.uid,
    user_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
    user_photo: profile?.photo_url || user.photoURL || '',
    status,
    updated_at: serverTimestamp(),
  });
}

/* --------------------------- Event chat --------------------------------- */

export async function listEventMessages(eventId) {
  if (!db || !eventId) return [];
  const snap = await getDocs(collection(db, COL.events, eventId, COL.eventMessages));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
}

export async function sendEventMessage(eventId, text, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const body = trimmed(text, EVENT_CHAT_LIMITS.MESSAGE_MAX);
  if (!body) throw new Error('Escreva uma mensagem.');
  const ref = doc(collection(db, COL.events, eventId, COL.eventMessages));
  await setDoc(ref, {
    id: ref.id,
    event_id: eventId,
    text: body,
    sender_id: user.uid,
    sender_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
    sender_photo: profile?.photo_url || user.photoURL || '',
    edited: false,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEventMessage(eventId, messageId, text) {
  await updateDoc(doc(db, COL.events, eventId, COL.eventMessages, messageId), {
    text: trimmed(text, EVENT_CHAT_LIMITS.MESSAGE_MAX),
    edited: true,
    edited_at: serverTimestamp(),
  });
}

export async function deleteEventMessage(eventId, messageId) {
  await deleteDoc(doc(db, COL.events, eventId, COL.eventMessages, messageId));
}

/* --------------------------- Participants -------------------------------- */

export async function listEventParticipants(eventId) {
  if (!db || !eventId) return [];
  const snap = await getDocs(collection(db, COL.events, eventId, COL.eventParticipants));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
}

export async function addEventParticipant(eventId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const name = trimmed(data.name);
  if (!name) throw new Error('Informe o nome do participante.');
  const ref = doc(collection(db, COL.events, eventId, COL.eventParticipants));
  await setDoc(ref, {
    id: ref.id,
    event_id: eventId,
    date_id: data.date_id || null,
    name,
    user_id: data.user_id || null,
    photo_url: trimmed(data.photo_url),
    source: data.source || 'guest',
    added_by: user.uid,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function removeEventParticipant(eventId, participantId) {
  await deleteDoc(doc(db, COL.events, eventId, COL.eventParticipants, participantId));
}

/** Remove participantes associados a uma data do evento (ao excluí-la). */
export async function clearEventDateData(eventId, dateId) {
  if (!dateId) return;
  try {
    const parts = await getDocs(collection(db, COL.events, eventId, COL.eventParticipants));
    const ops = parts.docs
      .filter((d) => d.data().date_id === dateId)
      .map((d) => ({ type: 'delete', ref: d.ref }));
    if (ops.length > 0) await commitInChunks(ops);
  } catch (err) {
    logger.error('Falha ao limpar dados da data do evento:', err);
  }
}

export async function listEventRsvps(eventId) {
  if (!db || !eventId) return [];
  const snap = await getDocs(query(collection(db, COL.rsvps), where('event_id', '==', eventId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setEventRsvp(event, status, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  await setDoc(doc(db, COL.rsvps, rsvpDocId(event.id, user.uid)), {
    event_id: event.id,
    club_id: event.club_id,
    user_id: user.uid,
    user_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
    status,
    updated_at: serverTimestamp(),
  });
}

/* --------------------------------- Posts -------------------------------- */

export async function listClubPosts(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.posts), where('club_id', '==', clubId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
}

export async function createClubPost(clubId, input, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  // Aceita string (mensagem) ou objeto { content, images }.
  const payload = typeof input === 'string' ? { content: input } : (input || {});
  const text = trimmed(payload.content);
  const images = Array.isArray(payload.images)
    ? payload.images
        .filter((img) => img && img.url)
        .slice(0, 10)
        .map((img) => ({
          url: img.url,
          path: img.path || '',
          name: img.name || 'imagem',
          content_type: img.contentType || img.content_type || '',
          size: img.size || 0,
        }))
    : [];

  if (!text && images.length === 0) throw new Error('Escreva uma mensagem ou anexe uma imagem.');

  const id = doc(collection(db, COL.posts)).id;
  await setDoc(doc(db, COL.posts, id), {
    id,
    club_id: clubId,
    author_id: user.uid,
    author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
    author_photo: profile?.photo_url || user.photoURL || '',
    content: text.slice(0, 2000),
    images,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  return id;
}

export async function deleteClubPost(postId, actor) {
  await deleteDoc(doc(db, COL.posts, postId));
  await createAuditLog({ action: 'club_post_deleted', actor, details: { post_id: postId } });
}

/* ---------------------- Chamados de doação (campanhas) ------------------- */

function sortByCreatedDesc(list) {
  return list.sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
}

export async function listClubCampaigns(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.campaigns), where('club_id', '==', clubId)));
  return sortByCreatedDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function createClubCampaign(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!trimmed(data.title)) throw new Error('Informe o título do chamado.');
  const goal = Number(data.goal) || 0;
  if (goal <= 0) throw new Error('Informe uma meta de arrecadação maior que zero.');
  const id = doc(collection(db, COL.campaigns)).id;
  await setDoc(doc(db, COL.campaigns, id), {
    id,
    club_id: clubId,
    title: trimmed(data.title),
    description: trimmed(data.description),
    goal,
    raised: Number(data.raised) || 0,
    deadline: trimmed(data.deadline) || null,
    status: CAMPAIGN_STATUS.ACTIVE,
    created_by: user.uid,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'club_campaign_created', actor: user, details: { club_id: clubId, campaign_id: id } });
  return id;
}

export async function updateClubCampaign(campaignId, updates, actor) {
  const allowed = ['title', 'description', 'goal', 'raised', 'deadline', 'status'];
  const sanitized = {};
  allowed.forEach((key) => {
    if (updates[key] === undefined) return;
    if (key === 'goal' || key === 'raised') sanitized[key] = Number(updates[key]) || 0;
    else if (key === 'deadline') sanitized[key] = trimmed(updates[key]) || null;
    else if (key === 'status') sanitized[key] = updates[key] === CAMPAIGN_STATUS.CONCLUDED ? CAMPAIGN_STATUS.CONCLUDED : CAMPAIGN_STATUS.ACTIVE;
    else sanitized[key] = trimmed(updates[key]);
  });
  await updateDoc(doc(db, COL.campaigns, campaignId), { ...sanitized, updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_campaign_updated', actor, details: { campaign_id: campaignId, fields: Object.keys(sanitized) } });
}

/**
 * Registra um valor recebido somando ao total já arrecadado, via `increment()`
 * atômico do Firestore — evita lost-update quando dois admins registram
 * valores da mesma campanha ao mesmo tempo (cada um partindo de um snapshot
 * local desatualizado de `raised`).
 */
export async function addCampaignFunds(campaignId, amount, actor) {
  const value = Number(amount) || 0;
  if (value <= 0) throw new Error('Informe um valor maior que zero.');
  await updateDoc(doc(db, COL.campaigns, campaignId), { raised: increment(value), updated_at: serverTimestamp() });
  await createAuditLog({ action: 'club_campaign_funds_added', actor, details: { campaign_id: campaignId, amount: value } });
}

export async function deleteClubCampaign(campaignId, actor) {
  await deleteDoc(doc(db, COL.campaigns, campaignId));
  await createAuditLog({ action: 'club_campaign_deleted', actor, details: { campaign_id: campaignId } });
}

/* --------------------- Prestação de contas (financeiro) ------------------ */

export async function listClubLedger(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.ledger), where('club_id', '==', clubId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

export async function createLedgerEntry(clubId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const type = data.type === LEDGER_TYPE.EXPENSE ? LEDGER_TYPE.EXPENSE : LEDGER_TYPE.REVENUE;
  const value = Number(data.value) || 0;
  if (value <= 0) throw new Error('Informe um valor maior que zero.');
  if (!trimmed(data.category)) throw new Error('Selecione uma categoria.');
  if (!trimmed(data.date)) throw new Error('Informe a data do lançamento.');
  const id = doc(collection(db, COL.ledger)).id;
  await setDoc(doc(db, COL.ledger, id), {
    id,
    club_id: clubId,
    type,
    category: trimmed(data.category),
    value,
    date: trimmed(data.date),
    note: trimmed(data.note),
    created_by: user.uid,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  await createAuditLog({ action: 'club_ledger_entry_created', actor: user, details: { club_id: clubId, entry_id: id, type, value } });
  return id;
}

export async function deleteLedgerEntry(entryId, actor) {
  await deleteDoc(doc(db, COL.ledger, entryId));
  await createAuditLog({ action: 'club_ledger_entry_deleted', actor, details: { entry_id: entryId } });
}
