/**
 * @fileoverview Serviço: Gestão de Voluntários — Perfil + Roster (Fase 13).
 *
 * Duas coleções:
 *  1. `users/{uid}/volunteer_profile/main` (id fixo "main") — perfil
 *     global do voluntário (skills, availability, radius, transporte,
 *     aceite do termo). Single-doc subcollection.
 *  2. `clubs/{clubId}/volunteers/{volunteerUid}` (id determinista =
 *     volunteerUid) — rostagem per-shelter. Multi-tenant: cada abrigo
 *     tem sua própria lista de voluntários. O abrigo NÃO lê o
 *     `users/{uid}/volunteer_profile` diretamente — o service faz o
 *     snapshot no momento do join (defense-in-depth + LGPD).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13
 */

import {
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { safeCreateAuditLog } from '@/core/services/auditService';
import {
  upsertVolunteerProfileSchema,
  acceptVolunteerTermsSchema,
  joinShelterAsVolunteerSchema,
  updateShelterVolunteerSchema,
  withdrawVolunteerConsentSchema,
  assertValidVolunteerStatusTransition,
  assertValidBgCheckTransition,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import { VOLUNTEER_TERMS_VERSION } from '@/modules/shelter/domain/legal/volunteerTerms';
import {
  computeDocumentHash,
  TERMS_TYPE,
} from '@/modules/shelter/domain/legal/terms';
import { recordAcceptance } from '@/modules/shelter/services/termsAcceptanceService';

const USERS_COLLECTION = 'users';
const VOLUNTEER_PROFILE_SUBCOLLECTION = 'volunteer_profile';
const VOLUNTEER_PROFILE_DOC_ID = 'main'; // doc fixo por uid
const CLUBS_COLLECTION = 'clubs';
const VOLUNTEERS_SUBCOLLECTION = 'volunteers';

// ════════════════════════════════════════════════════════════════════
// PERFIL GLOBAL (users/{uid}/volunteer_profile/main)
// ════════════════════════════════════════════════════════════════════

function volunteerProfileRef(uid) {
  return doc(
    db,
    USERS_COLLECTION,
    uid,
    VOLUNTEER_PROFILE_SUBCOLLECTION,
    VOLUNTEER_PROFILE_DOC_ID,
  );
}

/**
 * Lê o perfil global do voluntário. Retorna null se não existir.
 */
export async function getVolunteerProfile(uid) {
  if (!db || !uid) return null;
  const snap = await getDoc(volunteerProfileRef(uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Cria ou atualiza (parcial) o perfil global do voluntário.
 * Apenas o próprio `uid` pode escrever.
 *
 * @param {string} uid
 * @param {object} input - campos parciais (validado por upsertVolunteerProfileSchema)
 * @param {object} actor - {uid} deve == uid
 */
export async function upsertVolunteerProfile(uid, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid) throw new Error('uid é obrigatório');
  if (!actor?.uid || actor.uid !== uid) {
    throw new Error('Apenas o próprio voluntário pode editar o perfil.');
  }

  const parsed = upsertVolunteerProfileSchema.parse(input);
  const ref = volunteerProfileRef(uid);
  const current = await getDoc(ref);
  const prev = current.exists() ? current.data() : null;

  const update = {
    ...parsed,
    updated_at: serverTimestamp(),
  };
  if (!current.exists()) {
    update.created_at = serverTimestamp();
  }

  await setDoc(ref, update, { merge: true });

  await safeCreateAuditLog({
    action: prev ? 'volunteer_profile_updated' : 'volunteer_profile_created',
    actor,
    details: { uid, fields: Object.keys(parsed) },
  }).catch((err) => {
    logger.warn('volunteerProfileService.upsertVolunteerProfile', {
      msg: 'audit failed (non-blocking — see [AUDIT_FAILURE] in logger.error)',
      err: String(err),
    });
  });

  return { id: VOLUNTEER_PROFILE_DOC_ID, ...update };
}

/**
 * Grava o aceite do termo de voluntariado. Idempotente: se a versão
 * já foi aceita, apenas atualiza o timestamp.
 *
 * Conformidade: Lei 14.063/2020 (assinatura eletrônica avançada).
 *
 *  1. Computa `document_hash` = SHA-256(`signature_text` + terms_version + accepted_at)
 *     via `computeDocumentHash` (canônico, browser/node compatível).
 *  2. Persiste o aceite em `users/{uid}/volunteer_profile/main` (cópia
 *     desnormalizada para queries simples).
 *  3. Registra o aceite canônico em `users/{uid}/terms_acceptances/{id}`
 *     via `termsAcceptanceService.recordAcceptance` (prova legal
 *     imutável, com `document_hash` + `ip_address` + `user_agent` +
 *     `liveness_verified` + `legal_basis`).
 *  4. Audit log com o hash do documento (não o nome em claro — LGPD).
 *
 * O Cloud Function `recomputeAcceptanceHash` (ver
 * `functions/recomputeAcceptanceHash.js`) recomputa o hash
 * server-side ao final pra detectar adulteração do payload client.
 *
 * @param {string} uid
 * @param {object} acceptance - {terms_version, signature_text, liveness_verified?, ip_address?, user_agent?, legal_basis?}
 * @param {object} actor - {uid, displayName?} deve == uid
 */
export async function acceptVolunteerTerms(uid, acceptance, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid) throw new Error('uid é obrigatório');
  if (!actor?.uid || actor.uid !== uid) {
    throw new Error('Apenas o próprio voluntário pode aceitar o termo.');
  }

  const parsed = acceptVolunteerTermsSchema.parse(acceptance);
  const now = new Date().toISOString();

  // Hash canônico SHA-256 (Lei 14.063/2020). Combina signature +
  // versão + timestamp para tornar o hash único por aceite.
  const document_hash = await computeDocumentHash(
    `${parsed.signature_text}|${parsed.terms_version}|${now}`,
  );

  const ref = volunteerProfileRef(uid);
  const current = await getDoc(ref);
  const prev = current.exists() ? current.data() : null;

  const update = {
    terms_accepted_at: now,
    terms_version: parsed.terms_version,
    document_hash,
    updated_at: serverTimestamp(),
  };
  if (!current.exists()) {
    update.created_at = serverTimestamp();
  }

  await setDoc(ref, update, { merge: true });

  // Grava o aceite canônico imutável em users/{uid}/terms_acceptances/
  // (Firestore rules: update bloqueado após criação).
  await recordAcceptance(
    uid,
    {
      terms_type: TERMS_TYPE.VOLUNTEER,
      terms_version: parsed.terms_version,
      document_hash,
      signature_text: parsed.signature_text,
      ip_address: acceptance.ip_address || 'unknown',
      user_agent: acceptance.user_agent || '',
      liveness_verified: Boolean(acceptance.liveness_verified),
      legal_basis: acceptance.legal_basis || 'execução de contrato de voluntário (LGPD Art. 7º V)',
    },
    actor,
  ).catch((err) => {
    logger.warn('volunteerProfileService.acceptVolunteerTerms', {
      msg: 'recordAcceptance failed (non-blocking — perfil atualizado)',
      err: String(err),
    });
  });

  await safeCreateAuditLog({
    action: 'volunteer_terms_accepted',
    actor,
    details: {
      uid,
      terms_version: parsed.terms_version,
      document_hash,
    },
  }).catch((err) => {
    logger.warn('volunteerProfileService.acceptVolunteerTerms', {
      msg: 'audit failed (non-blocking — see [AUDIT_FAILURE] in logger.error)',
      err: String(err),
    });
  });

  return {
    id: VOLUNTEER_PROFILE_DOC_ID,
    terms_accepted_at: now,
    terms_version: parsed.terms_version,
    document_hash,
    prev_terms_version: prev?.terms_version || null,
  };
}

// ════════════════════════════════════════════════════════════════════
// ROSTER PER-SHELTER (clubs/{clubId}/volunteers/{volunteerUid})
// ════════════════════════════════════════════════════════════════════

function shelterVolunteerRef(shelterClubId, volunteerUid) {
  return doc(
    db,
    CLUBS_COLLECTION,
    shelterClubId,
    VOLUNTEERS_SUBCOLLECTION,
    volunteerUid,
  );
}

/**
 * Lista voluntários do abrigo, com filtros opcionais.
 */
export async function listShelterVolunteers(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const { status, maxResults = 200 } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('volunteer_name', 'asc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, CLUBS_COLLECTION, shelterClubId, VOLUNTEERS_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getShelterVolunteer(shelterClubId, volunteerUid) {
  if (!db || !shelterClubId || !volunteerUid) return null;
  const snap = await getDoc(shelterVolunteerRef(shelterClubId, volunteerUid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Voluntário entra na rostagem de um abrigo. Cria doc em
 * `clubs/{clubId}/volunteers/{volunteerUid}` com snapshot do perfil
 * global (campos desnormalizados) + snapshot do aceite do termo.
 *
 * O abrigo NÃO precisa estar envolvido no aceite — o voluntário já
 * aceitou o termo globalmente (em `users/{uid}/volunteer_profile/main`).
 * Esta função espelha esse aceite no doc per-shelter (LGPD — cada
 * abrigo tem seu próprio registro de quando o voluntário aderiu).
 *
 * @param {object} input - {shelter_club_id, volunteer_uid, ...}
 * @param {object} actor - {uid} deve == volunteer_uid OU ser admin do abrigo
 */
export async function joinShelterAsVolunteer(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = joinShelterAsVolunteerSchema.parse(input);

  // Valida que o aceite do termo bate com a versão atual
  if (parsed.terms_version !== VOLUNTEER_TERMS_VERSION) {
    throw new Error(
      `Versão do termo (${parsed.terms_version}) não corresponde à versão aceita (${VOLUNTEER_TERMS_VERSION}).`,
    );
  }

  // Verifica que o voluntário aceitou o termo globalmente
  const profile = await getVolunteerProfile(parsed.volunteer_uid);
  if (!profile?.terms_accepted_at || profile.terms_version !== parsed.terms_version) {
    throw new Error(
      'Voluntário precisa aceitar o termo globalmente antes de entrar na rostagem de um abrigo.',
    );
  }

  const ref = shelterVolunteerRef(parsed.shelter_club_id, parsed.volunteer_uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Voluntário já está na rostagem deste abrigo.');
  }

  const now = new Date().toISOString();
  const doc_data = {
    shelter_club_id: parsed.shelter_club_id,
    volunteer_uid: parsed.volunteer_uid,
    volunteer_name: parsed.volunteer_name,
    volunteer_photo_url: parsed.volunteer_photo_url,
    volunteer_email: parsed.volunteer_email,
    volunteer_phone: parsed.volunteer_phone,
    status: 'active',
    joined_at: now,
    background_check_status: 'not_required',
    terms_accepted_at: profile.terms_accepted_at,
    terms_version: parsed.terms_version,
    signature_text: parsed.signature_text,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  await setDoc(ref, doc_data);

  await safeCreateAuditLog({
    action: 'volunteer_joined_shelter',
    actor,
    details: {
      shelter_club_id: parsed.shelter_club_id,
      volunteer_uid: parsed.volunteer_uid,
      terms_version: parsed.terms_version,
    },
  }).catch((err) => {
    logger.warn('volunteerProfileService.joinShelterAsVolunteer', {
      msg: 'audit failed (non-blocking — see [AUDIT_FAILURE] in logger.error)',
      err: String(err),
    });
  });

  return { id: parsed.volunteer_uid, ...doc_data };
}

/**
 * Atualiza status da rostagem OU background check de um voluntário.
 * Apenas o abrigo pode chamar.
 *
 * @param {string} shelterClubId
 * @param {string} volunteerUid
 * @param {object} input - {status?, background_check_status?, background_check_notes?}
 * @param {object} actor - {uid} deve ser admin do abrigo
 */
export async function updateShelterVolunteer(shelterClubId, volunteerUid, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !volunteerUid) throw new Error('shelterClubId e volunteerUid obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateShelterVolunteerSchema.parse(input);

  const ref = shelterVolunteerRef(shelterClubId, volunteerUid);
  const current = await getDoc(ref);
  if (!current.exists()) throw new Error('Voluntário não encontrado na rostagem.');
  const prev = current.data();

  // Valida tenant
  if (prev.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  const update = { updated_at: serverTimestamp() };

  if (parsed.status && parsed.status !== prev.status) {
    assertValidVolunteerStatusTransition(prev.status, parsed.status);
    update.status = parsed.status;
    if (parsed.status === 'left') {
      const now = new Date().toISOString();
      update.left_at = now;
      update.exit_at = now;
    }
  }

  if (parsed.exit_reason !== undefined) {
    update.exit_reason = parsed.exit_reason;
  }
  if (parsed.exit_note !== undefined) {
    update.exit_note = parsed.exit_note;
  }

  if (parsed.background_check_status && parsed.background_check_status !== prev.background_check_status) {
    assertValidBgCheckTransition(prev.background_check_status, parsed.background_check_status);
    update.background_check_status = parsed.background_check_status;
    update.background_check_at = new Date().toISOString();
  }

  if (parsed.background_check_notes !== undefined) {
    update.background_check_notes = parsed.background_check_notes;
  }

  if (Object.keys(update).length === 1) {
    // só updated_at, noop
    return { id: volunteerUid, ...prev };
  }

  await updateDoc(ref, update);

  await safeCreateAuditLog({
    action: 'volunteer_roster_updated',
    actor,
    details: {
      shelter_club_id: shelterClubId,
      volunteer_uid: volunteerUid,
      changes: Object.keys(update).filter((k) => k !== 'updated_at'),
    },
  }).catch((err) => {
    logger.warn('volunteerProfileService.updateShelterVolunteer', {
      msg: 'audit failed (non-blocking — see [AUDIT_FAILURE] in logger.error)',
      err: String(err),
    });
  });

  return { id: volunteerUid, ...prev, ...update };
}

/**
 * Voluntário sai do abrigo (ou abrigo o remove). Status → 'left'.
 * Aceita feedback de saída opcional (TASK-242, LGPD Art. 18 IX):
 * `exit_reason` (city_change | time | personal | other) e `exit_note`.
 */
export async function leaveShelter(shelterClubId, volunteerUid, actor, feedback = {}) {
  const { exit_reason, exit_note } = feedback || {};
  return updateShelterVolunteer(
    shelterClubId,
    volunteerUid,
    {
      status: 'left',
      ...(exit_reason ? { exit_reason } : {}),
      ...(exit_note ? { exit_note } : {}),
    },
    actor,
  );
}

/**
 * Lista todas as rostagens (per-shelter) nas quais o voluntário está
 * presente, independente do status. Usa `collectionGroup('volunteers')`
 * com `where('volunteer_uid', '==', uid)` — a query precisa do índice
 * composto `volunteer_uid ASC + volunteer_name ASC` declarado em
 * `firestore.indexes.json` (single-field NÃO é suficiente aqui).
 */
export async function listUserVolunteerRosters(uid, options = {}) {
  if (!db || !uid) return [];
  const { status, maxResults = 200 } = options;

  const constraints = [where('volunteer_uid', '==', uid)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('volunteer_name', 'asc'));
  constraints.push(limit(maxResults));

  const q = query(
    collectionGroup(db, 'volunteers'),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    // collectionGroup docs não trazem o path do parent — extraímos
    // o clubId do path (`clubs/{clubId}/volunteers/{uid}`)
    const segs = d.ref.path.split('/');
    return {
      id: d.id,
      ...data,
      shelter_club_id: data.shelter_club_id || (segs.length >= 2 ? segs[1] : null),
    };
  });
}

/**
 * Revoga o consentimento de voluntariado do usuário. LGPD Art. 18 IX
 * ("direito de revogação do consentimento a qualquer momento").
 *
 * Escopos:
 *  - 'profile': revoga aceite do termo; mantém vínculo com abrigos
 *  - 'roster':  sai de TODOS os abrigos; mantém perfil global
 *  - 'all':     revoga tudo (perfil + roster)
 *
 * @param {string} uid - voluntário
 * @param {object} input - { scope: 'profile' | 'roster' | 'all', note?: string }
 * @param {object} actor - {uid} deve == uid
 */
export async function withdrawVolunteerConsent(uid, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!uid) throw new Error('uid é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  // Defesa: só o próprio voluntário pode revogar (não há admin
  // legítimo que precise disso — se houver, é caso de plataforma,
  // não de consentimento individual).
  if (actor.uid !== uid) {
    throw new Error('Apenas o próprio voluntário pode revogar o consentimento.');
  }

  const parsed = withdrawVolunteerConsentSchema.parse(input);
  const { scope, note } = parsed;
  const now = new Date().toISOString();

  let profileTouched = false;
  let rostersUpdated = 0;

  // 1. Perfil global (revoga aceite do termo) — scopes 'profile' ou 'all'
  if (scope === 'profile' || scope === 'all') {
    const profileRef = volunteerProfileRef(uid);
    await setDoc(profileRef, {
      terms_accepted_at: null,
      terms_version: null,
      consent_withdrawn_at: now,
      consent_withdrawn_scope: scope,
      consent_withdrawn_note: note || null,
      deleted_at: now,
      updated_at: serverTimestamp(),
    }, { merge: true });
    profileTouched = true;
  }

  // 2. Rosters per-shelter (sai de todos) — scopes 'roster' ou 'all'
  if (scope === 'roster' || scope === 'all') {
    const rostersSnap = await getDocs(
      query(collectionGroup(db, 'volunteers'), where('volunteer_uid', '==', uid)),
    );
    if (!rostersSnap.empty) {
      const batch = writeBatch(db);
      rostersSnap.docs.forEach((d) => {
        const prev = d.data();
        if (prev.status === 'left') return; // já saiu, não reescreve
        batch.update(d.ref, {
          status: 'left',
          left_reason: 'consent_withdrawn',
          left_at: now,
          left_by: actor.uid,
          updated_at: serverTimestamp(),
        });
      });
      await batch.commit();
      rostersUpdated = rostersSnap.size;
    }
  }

  await safeCreateAuditLog({
    action: 'volunteer_consent_withdrawn',
    actor,
    details: {
      uid,
      scope,
      profile_touched: profileTouched,
      rosters_updated: rostersUpdated,
      note: note || null,
      timestamp: now,
    },
  }).catch((err) => {
    logger.warn('volunteerProfileService.withdrawVolunteerConsent', {
      msg: 'audit failed (non-blocking — see [AUDIT_FAILURE] in logger.error)',
      err: String(err),
    });
  });

  return { ok: true, scope, profileTouched, rostersUpdated, timestamp: now };
}

/**
 * Remove o doc do roster (hard delete). Apenas platform_admin.
 */
export async function deleteShelterVolunteer(shelterClubId, volunteerUid, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const ref = shelterVolunteerRef(shelterClubId, volunteerUid);
  const current = await getDoc(ref);
  if (!current.exists()) return { id: volunteerUid, deleted: false };
  const prev = current.data();
  if (prev.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  await deleteDoc(ref);

  await safeCreateAuditLog({
    action: 'volunteer_roster_deleted',
    actor,
    details: { shelter_club_id: shelterClubId, volunteer_uid: volunteerUid },
  }).catch((err) => {
    logger.warn('volunteerProfileService.deleteShelterVolunteer', {
      msg: 'audit failed (non-blocking — see [AUDIT_FAILURE] in logger.error)',
      err: String(err),
    });
  });

  return { id: volunteerUid, deleted: true };
}
