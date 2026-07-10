/**
 * @fileoverview Serviço: Gestão de Voluntários (Fase 13).
 *
 * Duas coleções:
 *  1. `users/{userId}/volunteer_profile/{profileId}` — GLOBAL, multi-tenant
 *     apenas via user_id. O voluntário dono cria/edita; platform_admin
 *     também; abrigos NÃO escrevem (somente leitura indireta via
 *     `getUserParticipations`).
 *  2. `clubs/{clubId}/volunteer_participation/{participationId}` —
 *     MULTI-TENANT. Abrigo é owner; voluntário lê apenas as próprias
 *     participações (Firestore rule do match).
 *
 * O service centraliza:
 *  - validação de tenant (shelter_club_id consistente com path)
 *  - audit log (createAuditLog, non-blocking)
 *  - cálculo de `hours_logged` em check-out
 *  - denormalização de `volunteer_name` no create (snapshot leve)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (voluntários)
 */

import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, limit, deleteField,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  createVolunteerProfileSchema,
  updateVolunteerProfileSchema,
  createVolunteerParticipationSchema,
  updateVolunteerParticipationSchema,
  computeHoursLogged,
} from '@/modules/shelter/domain/operational/volunteer';

const USERS_COLLECTION = 'users';
const VOLUNTEER_PROFILE_SUBCOLLECTION = 'volunteer_profile';
const CLUBS_COLLECTION = 'clubs';
const VOLUNTEER_PARTICIPATION_SUBCOLLECTION = 'volunteer_participation';

// Id canônico do doc de perfil (1 por user). Mantemos o doc nomeado
// `main` para simplicidade — ver Fase 4 (adopter_profile).
const DEFAULT_PROFILE_DOC = 'main';

// ─── Helpers internos ───────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// VOLUNTEER PROFILE (GLOBAL, users/{userId}/volunteer_profile/...)
// ═══════════════════════════════════════════════════════════════════════

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lê o perfil padrão (`main`) de um voluntário. Retorna null se não
 * existir.
 */
export async function getVolunteerProfile(userId, profileId = DEFAULT_PROFILE_DOC) {
  if (!db || !userId) return null;
  const snap = await getDoc(
    doc(db, USERS_COLLECTION, userId, VOLUNTEER_PROFILE_SUBCOLLECTION, profileId),
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Helper para o próprio usuário. Aponta para o doc canônico `main`.
 */
export async function getMyVolunteerProfile(userId) {
  return getVolunteerProfile(userId, DEFAULT_PROFILE_DOC);
}

/**
 * Lista perfis em batch (usado pelo abrigo para mostrar cards de
 * voluntários que já participaram de algum evento).
 *
 * @param {string[]} userIds  array de UIDs
 * @returns {Promise<Array<object>>} perfis encontrados (sem ordem garantida)
 */
export async function listVolunteerProfilesByIds(userIds) {
  if (!db) return [];
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const results = await Promise.all(
    userIds.map((uid) => getMyVolunteerProfile(uid).catch(() => null)),
  );
  return results.filter(Boolean);
}

// ─── Create ─────────────────────────────────────────────────────────────

/**
 * Cria o perfil de voluntário. Só pode ser feito uma vez por user (doc
 * canônico `main`). Lança se já existir.
 */
export async function createVolunteerProfile(userId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!userId) throw new Error('userId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (actor.uid !== userId && actor.role !== 'platform_admin') {
    throw new Error('Só o próprio usuário pode criar seu perfil de voluntário.');
  }

  const parsed = createVolunteerProfileSchema.parse({
    ...input,
    user_id: userId,
  });

  const ref = doc(
    db, USERS_COLLECTION, userId, VOLUNTEER_PROFILE_SUBCOLLECTION, DEFAULT_PROFILE_DOC,
  );
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Perfil de voluntário já existe. Use updateVolunteerProfile.');
  }

  const payload = {
    id: DEFAULT_PROFILE_DOC,
    user_id: userId,
    display_name: parsed.display_name,
    skills: parsed.skills || [],
    certifications: parsed.certifications || [],
    availability: parsed.availability || [],
    hours_logged_total: 0,
    transport_provided_count: 0,
    transport_return_count: 0,
    events_attended: [],
    notes: parsed.notes,
    active: parsed.active !== false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by: actor.uid,
  };

  await setDoc(ref, payload);

  await createAuditLog({
    action: 'volunteer_profile_created',
    actor,
    details: { user_id: userId, skills: payload.skills.length },
  }).catch((err) => {
    logger.warn('volunteerService.createVolunteerProfile', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: DEFAULT_PROFILE_DOC, user_id: userId, ...payload };
}

// ─── Update ─────────────────────────────────────────────────────────────

/**
 * Atualiza campos do perfil. Suporta "limpar" via `null` (usa
 * `deleteField()`).
 */
export async function updateVolunteerProfile(userId, profileId, patch, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!userId || !profileId) throw new Error('userId e profileId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (actor.uid !== userId && actor.role !== 'platform_admin') {
    throw new Error('Só o próprio usuário ou platform_admin pode editar o perfil.');
  }

  // Detecta nulls antes do Zod (partial não aceita null)
  const nullFields = [];
  const updatesForParse = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === null) nullFields.push(k);
    else updatesForParse[k] = v;
  }
  const parsed = updateVolunteerProfileSchema.parse(updatesForParse);
  if (Object.keys(parsed).length === 0 && nullFields.length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(
    db, USERS_COLLECTION, userId, VOLUNTEER_PROFILE_SUBCOLLECTION, profileId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Perfil não existe. Crie primeiro com createVolunteerProfile.');
  }
  const current = snap.data() || {};

  // Calcula delta
  const delta = {};
  for (const k of nullFields) {
    if (current[k] !== undefined) delta[k] = deleteField();
  }
  for (const [k, v] of Object.entries(parsed)) {
    if (!deepEqual(current[k] ?? null, v)) delta[k] = v;
  }
  if (Object.keys(delta).length === 0) {
    return { changed_fields: [], noop: true };
  }

  await updateDoc(ref, {
    ...delta,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'volunteer_profile_updated',
    actor,
    details: {
      user_id: userId,
      profile_id: profileId,
      changed_fields: Object.keys(delta).filter((k) => delta[k] !== deleteField()),
    },
  }).catch((err) => {
    logger.warn('volunteerService.updateVolunteerProfile', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return {
    changed_fields: Object.keys(delta).filter((k) => delta[k] !== deleteField()),
  };
}

// ─── Soft delete ───────────────────────────────────────────────────────

/**
 * Soft delete: marca `active: false`. Mantém histórico.
 * (Hard delete só via Cloud Function admin — fora do escopo.)
 */
export async function deleteVolunteerProfile(userId, profileId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!userId || !profileId) throw new Error('userId e profileId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (actor.uid !== userId && actor.role !== 'platform_admin') {
    throw new Error('Só o próprio usuário ou platform_admin pode desativar o perfil.');
  }

  const ref = doc(
    db, USERS_COLLECTION, userId, VOLUNTEER_PROFILE_SUBCOLLECTION, profileId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Idempotente: se não existe, considera OK
    return { id: profileId, user_id: userId, active: false, noop: true };
  }

  await updateDoc(ref, {
    active: false,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'volunteer_profile_deactivated',
    actor,
    details: { user_id: userId, profile_id: profileId },
  }).catch((err) => {
    logger.warn('volunteerService.deleteVolunteerProfile', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: profileId, user_id: userId, active: false };
}

// ═══════════════════════════════════════════════════════════════════════
// VOLUNTEER PARTICIPATION (MULTI-TENANT, clubs/{clubId}/volunteer_...)
// ═══════════════════════════════════════════════════════════════════════

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lista participações do abrigo. Filtros opcionais: volunteerUid,
 * exhibitionId, role.
 */
export async function listParticipations(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');

  const { volunteerUid, exhibitionId, role, maxResults = 200 } = options || {};
  const constraints = [];
  if (volunteerUid) constraints.push(where('volunteer_uid', '==', volunteerUid));
  if (exhibitionId) constraints.push(where('exhibition_id', '==', exhibitionId));
  if (role) constraints.push(where('role', '==', role));
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getParticipation(shelterClubId, participationId) {
  if (!db || !shelterClubId || !participationId) return null;
  const snap = await getDoc(
    doc(db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION, participationId),
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Lista participações DE UM voluntário (cross-tenant — sem
 * shelterClubId). Útil para a página "minhas participações" do
 * próprio voluntário.
 *
 * Estratégia: varre abrigos que o user conhece via participação
 * (não temos collectionGroup indexado aqui, então usamos um fallback
 * simples: o abrigo precisa estar em `club_participations` indexado
 * OU o caller passa uma lista de shelterClubIds).
 *
 * Para o caso de uso típico (voluntário vendo suas próprias
 * participações), o caller coleta primeiro os `shelterClubId`s
 * conhecidos e itera. Aqui retornamos a função helper que recebe
 * uma lista de `shelterClubId`s — mantemos o serviço livre de
 * heurísticas mágicas.
 *
 * @param {string} volunteerUid
 * @param {string[]} shelterClubIds  abrigos a consultar
 * @returns {Promise<Array<object>>}
 */
export async function getUserParticipations(volunteerUid, shelterClubIds) {
  if (!db) return [];
  if (!volunteerUid) throw new Error('volunteerUid é obrigatório');
  if (!Array.isArray(shelterClubIds) || shelterClubIds.length === 0) return [];

  const buckets = await Promise.all(
    shelterClubIds.map((clubId) =>
      listParticipations(clubId, { volunteerUid, maxResults: 100 })
        .catch((err) => {
          logger.warn('volunteerService.getUserParticipations', {
            msg: 'list failed', clubId, err: String(err),
          });
          return [];
        })),
  );
  return buckets.flat();
}

// ─── Create ─────────────────────────────────────────────────────────────

/**
 * Cria uma participation. `volunteer_name` é denormalizado a partir
 * do input (o abrigo informa o nome no convite).
 */
export async function createParticipation(shelterClubId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createVolunteerParticipationSchema.parse({
    ...input,
    shelter_club_id: shelterClubId,
  });

  const ref = await addDoc(
    collection(db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION),
    {
      volunteer_uid: parsed.volunteer_uid,
      volunteer_name: parsed.volunteer_name,
      exhibition_id: parsed.exhibition_id ?? null,
      shelter_club_id: shelterClubId,
      role: parsed.role,
      role_label: parsed.role_label,
      check_in: null,
      check_out: null,
      hours_logged: 0,
      transport_provided: Boolean(parsed.transport_provided),
      notes: parsed.notes,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: actor.uid,
    },
  );

  await createAuditLog({
    action: 'volunteer_participation_created',
    actor,
    details: {
      participation_id: ref.id,
      volunteer_uid: parsed.volunteer_uid,
      role: parsed.role,
      shelter_club_id: shelterClubId,
    },
  }).catch((err) => {
    logger.warn('volunteerService.createParticipation', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: ref.id, shelter_club_id: shelterClubId };
}

// ─── Update ─────────────────────────────────────────────────────────────

export async function updateParticipation(shelterClubId, participationId, patch, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !participationId) {
    throw new Error('shelterClubId e participationId são obrigatórios');
  }
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // Detecta nulls antes do Zod
  const nullFields = [];
  const updatesForParse = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === null) nullFields.push(k);
    else updatesForParse[k] = v;
  }
  const parsed = updateVolunteerParticipationSchema.parse(updatesForParse);
  if (Object.keys(parsed).length === 0 && nullFields.length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(
    db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION, participationId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Participation não encontrada.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  // Calcula delta
  const delta = {};
  for (const k of nullFields) {
    if (current[k] !== undefined) delta[k] = deleteField();
  }
  for (const [k, v] of Object.entries(parsed)) {
    if (!deepEqual(current[k] ?? null, v)) delta[k] = v;
  }
  if (Object.keys(delta).length === 0) {
    return { changed_fields: [], noop: true };
  }

  await updateDoc(ref, {
    ...delta,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'volunteer_participation_updated',
    actor,
    details: {
      participation_id: participationId,
      shelter_club_id: shelterClubId,
      changed_fields: Object.keys(delta).filter((k) => delta[k] !== deleteField()),
    },
  }).catch((err) => {
    logger.warn('volunteerService.updateParticipation', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return {
    changed_fields: Object.keys(delta).filter((k) => delta[k] !== deleteField()),
  };
}

export async function deleteParticipation(shelterClubId, participationId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !participationId || !actor?.uid) {
    throw new Error('Parâmetros inválidos');
  }
  if (actor.role !== 'platform_admin') {
    throw new Error('Só platform_admin pode deletar uma participation.');
  }

  const ref = doc(
    db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION, participationId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) return { id: participationId, noop: true };
  if (snap.data().shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  // Hard delete (só platform_admin chega aqui)
  await updateDoc(ref, {
    deleted_at: serverTimestamp(),
    deleted_by: actor.uid,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'volunteer_participation_deleted',
    actor,
    details: { participation_id: participationId, shelter_club_id: shelterClubId },
  }).catch((err) => {
    logger.warn('volunteerService.deleteParticipation', {
      msg: 'audit failed (non-blocking)', err: String(err),
    });
  });

  return { id: participationId, deleted: true };
}

// ─── Check-in / Check-out ─────────────────────────────────────────────

/**
 * Marca check-in (= now). Idempotente: se já tem check_in, não
 * sobrescreve (a menos que allowOverride=true).
 */
export async function checkInVolunteer(shelterClubId, participationId, actor, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !participationId || !actor?.uid) {
    throw new Error('Parâmetros inválidos');
  }
  const { allowOverride = false } = options || {};

  const ref = doc(
    db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION, participationId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Participation não encontrada.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  if (current.check_in && !allowOverride) {
    throw new Error('Já fez check-in. Use allowOverride para sobrescrever.');
  }
  if (current.check_out) {
    throw new Error('Participation já finalizada (check_out preenchido).');
  }

  const now = new Date().toISOString();
  await updateDoc(ref, {
    check_in: now,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'volunteer_participation_check_in',
    actor,
    details: { participation_id: participationId, shelter_club_id: shelterClubId, check_in: now },
  }).catch(() => {});

  return { id: participationId, check_in: now };
}

/**
 * Marca check-out e calcula `hours_logged` automaticamente. Idempotente:
 * se já tem check_out, recalcula o hours_logged (com allowOverride).
 */
export async function checkOutVolunteer(shelterClubId, participationId, actor, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !participationId || !actor?.uid) {
    throw new Error('Parâmetros inválidos');
  }
  const { allowOverride = false } = options || {};

  const ref = doc(
    db, CLUBS_COLLECTION, shelterClubId, VOLUNTEER_PARTICIPATION_SUBCOLLECTION, participationId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Participation não encontrada.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  if (!current.check_in) {
    throw new Error('Sem check-in prévio. Faça check-in antes do check-out.');
  }
  if (current.check_out && !allowOverride) {
    throw new Error('Já fez check-out. Use allowOverride para recalcular.');
  }

  const now = new Date().toISOString();
  const hours = computeHoursLogged(current.check_in, now);

  await updateDoc(ref, {
    check_out: now,
    hours_logged: hours,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'volunteer_participation_check_out',
    actor,
    details: {
      participation_id: participationId,
      shelter_club_id: shelterClubId,
      check_out: now,
      hours_logged: hours,
    },
  }).catch(() => {});

  return { id: participationId, check_out: now, hours_logged: hours };
}
