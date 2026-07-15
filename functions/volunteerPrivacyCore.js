/**
 * @fileoverview Cloud Functions — LGPD Art. 18: soft-delete e anonimização
 * de voluntários (Fase 22 / TASK-272).
 *
 * Três operações:
 *  1. softDeleteVolunteer (callable, Admin SDK)
 *     → Anonimiza PII + marca `deleted_at`/`anonymized_at` em
 *       `clubs/{clubId}/volunteers/{uid}` e perfil global.
 *     → Permissão: platform_admin OU shelter owner/admin/animals.
 *
 *  2. eraseMyVolunteerData (callable, self-service)
 *     → Apaga perfil `users/{uid}/volunteer_profile/main` +
 *       todas as rostagens + participations + documents.
 *     → Permissão: o próprio voluntário (uid).
 *     → Preserva histórico de termos (Lei 14.063/2020) via
 *       `terms_accepted_at` + `terms_version` em cada doc.
 *
 *  3. hardDeleteVolunteerDocument (callable, Admin SDK)
 *     → Apaga um documento específico (photo, bg_check, etc.) de um
 *       voluntário que já foi anonimizado (after softDelete).
 *     → Permissão: platform_admin.
 *
 * Padrão Core/Trigger: a lógica pura fica aqui; a amarração com
 * `onCall` é feita em `functions/index.js`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 * @see TASK-272
 */

'use strict';

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('crypto');

if (!getApps().length) initializeApp();
const db = getFirestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Gera pseudonym_uid determinístico (mesmo uid → mesmo pseudonym). */
function makePseudonymUid(uid) {
  return 'pseudonym_' + crypto.createHash('sha256').update(uid + '|viralata-lgpd').digest('hex').slice(0, 16);
}

/** Gera placeholder de nome anônimo com ID curto. */
function anonymizedName(uid) {
  const short = uid ? uid.slice(0, 6) : 'XXXXXX';
  return `Voluntário #${short}`;
}

// ─── Permissão helpers (executam no Firestore Admin SDK) ────────────────────

/**
 * Verifica se `actorUid` é platform_admin.
 * Lê `platform_config/master` para pegar a lista de admin UIDs.
 */
async function isPlatformAdmin(actorUid, targetDb = db) {
  if (!actorUid) return false;
  try {
    const snap = await targetDb.collection('platform_config').doc('master').get();
    if (!snap.exists) return false;
    const data = snap.data();
    return Array.isArray(data.admin_uids) && data.admin_uids.includes(actorUid);
  } catch {
    return false;
  }
}

/**
 * Verifica se `actorUid` tem permissão no abrigo (owner / admin / animals).
 */
async function hasShelterPermission(actorUid, clubId, targetDb = db) {
  if (!actorUid || !clubId) return false;
  try {
    const snap = await targetDb.collection('clubs').doc(clubId).get();
    if (!snap.exists) return false;
    const club = snap.data();
    if (club.created_by === actorUid) return true;
    const perms = club.member_permissions || {};
    return ['owner', 'admin', 'animals'].some(
      (role) =>
        Array.isArray(perms[role]) && perms[role].includes(actorUid),
    );
  } catch {
    return false;
  }
}

// ─── Soft-delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete de voluntário (LGPD Art. 18 VI).
 *
 * (a) clubs/{clubId}/volunteers/{uid}:
 *     - deleted_at, anonymized_at, pseudonym_uid ← set
 *     - volunteer_name ← placeholder
 *     - volunteer_email, volunteer_phone, volunteer_photo_url, signature_text ← null
 *     - status = 'left', left_reason = 'lgpd_deletion'
 *     - FKs (volunteer_uid, shelter_club_id) PRESERVADOS (histórico).
 *
 * (b) users/{uid}/volunteer_profile/main:
 *     - deleted_at, anonymized_at, pseudonym_uid ← set
 *     - notes, availability, radius_km, transport_* ← null
 *
 * (c) Participations (collectionGroup onde volunteer_uid == uid):
 *     - volunteer_name ← placeholder
 *
 * (d) Audit log.
 *
 * Erros no cascade NAO bloqueiam o soft-delete principal (best-effort).
 *
 * @param {object} opts
 * @param {string} opts.clubId
 * @param {string} opts.volunteerUid
 * @param {string} opts.actorUid  - quem chamou (para o audit log)
 * @param {object} [opts.targetDb] - Firestore db (default: global, para testes)
 * @param {object} [opts.logger]   - logger override (default: console)
 * @returns {{ ok: boolean, pseudonymUid: string, counts: object }}
 */
async function runSoftDeleteVolunteer({ clubId, volunteerUid, actorUid, targetDb = db, logger: _logger = console } = {}) {
  const log = (level, msg, data) => _logger[level]?.(`[volunteerPrivacy] ${msg}`, data);
  log('info', 'softDeleteVolunteer ini', { clubId, volunteerUid, actorUid });

  if (!clubId || !volunteerUid) {
    throw new Error('clubId e volunteerUid são obrigatórios.');
  }

  const pseudonymUid = makePseudonymUid(volunteerUid);
  const now = FieldValue.serverTimestamp();
  const nowISO = new Date().toISOString();

  // ── (a) clubs/{clubId}/volunteers/{uid} ──────────────────────────────────
  let rosterOk = false;
  try {
    const rosterRef = targetDb.collection('clubs').doc(clubId).collection('volunteers').doc(volunteerUid);
    await targetDb.runTransaction(async (tx) => {
      const snap = await tx.get(rosterRef);
      if (!snap.exists) { rosterOk = false; return; }
      tx.update(rosterRef, {
        deleted_at: now,
        anonymized_at: now,
        pseudonym_uid: pseudonymUid,
        volunteer_name: anonymizedName(volunteerUid),
        volunteer_email: null,
        volunteer_phone: null,
        volunteer_photo_url: null,
        signature_text: null,
        status: 'left',
        left_reason: 'lgpd_deletion',
        left_at: nowISO,
        updated_at: now,
      });
      rosterOk = true;
    });
    log('info', 'roster anonymized', { clubId, volunteerUid, rosterOk });
  } catch (err) {
    log('warn', 'roster update failed (non-blocking)', { err: String(err), clubId, volunteerUid });
  }

  // ── (b) users/{uid}/volunteer_profile/main ─────────────────────────────────
  let profileOk = false;
  try {
    const profileRef = targetDb.collection('users').doc(volunteerUid).collection('volunteer_profile').doc('main');
    await targetDb.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef);
      if (!snap.exists) return;
      tx.update(profileRef, {
        deleted_at: now,
        anonymized_at: now,
        pseudonym_uid: pseudonymUid,
        notes: null,
        availability: [],
        radius_km: null,
        transport_available: false,
        has_vehicle: false,
        updated_at: now,
      });
    });
    profileOk = true;
    log('info', 'profile anonymized', { volunteerUid });
  } catch (err) {
    log('warn', 'profile update failed (non-blocking)', { err: String(err), volunteerUid });
  }

  // ── (c) Participations — anonimizar volunteer_name ─────────────────────────
  let partCount = 0;
  try {
    const partSnap = await targetDb
      .collectionGroup('volunteer_participations')
      .where('volunteer_uid', '==', volunteerUid)
      .get();
    if (!partSnap.empty) {
      const batch = targetDb.batch();
      partSnap.forEach((d) => {
        batch.update(d.ref, {
          volunteer_name: anonymizedName(volunteerUid),
          updated_at: now,
        });
      });
      await batch.commit();
      partCount = partSnap.size;
    }
    log('info', 'participations anonymized', { count: partCount });
  } catch (err) {
    log('warn', 'participations anonymization failed (non-blocking)', { err: String(err) });
  }

  // ── (d) Audit log ───────────────────────────────────────────────────────────
  let auditOk = false;
  try {
    const auditRef = targetDb.collection('audit_logs').doc();
    await targetDb.runTransaction(async (tx) => {
      tx.set(auditRef, {
        action: 'volunteer_soft_deleted',
        actor_uid: actorUid || null,
        target_uid: volunteerUid,
        target_club_id: clubId,
        details: {
          pseudonym_uid: pseudonymUid,
          roster_updated: rosterOk,
          profile_updated: profileOk,
          participations_anonymized: partCount,
        },
        created_at: now,
        created_at_ms: Date.now(),
      });
    });
    auditOk = true;
  } catch (err) {
    log('warn', 'audit log failed (non-blocking)', { err: String(err) });
  }

  log('info', 'softDeleteVolunteer done', { pseudonymUid, rosterOk, profileOk, partCount, auditOk });
  return { ok: true, pseudonymUid, counts: { roster: rosterOk ? 1 : 0, profile: profileOk ? 1 : 0, participations: partCount } };
}

// ─── Self-service erase ───────────────────────────────────────────────────────

/**
 * Apaga todos os dados de voluntariado de um voluntário (self-service LGPD).
 *
 * Operações:
 *  1. [profile] users/{uid}/volunteer_profile/main
 *  2. [roster] clubs/{clubId}/volunteers/{uid} via collectionGroup DELETE (hard delete;
 *     o voluntário pede erasure, não há razão para manter histórico
 *     visível pelo abrigo — TASK-272 (c)).
 *  3. [participations] clubs/{clubId}/volunteer_participations/{pId} onde volunteer_uid == uid
 *  4. [documents] clubs/{clubId}/volunteer_documents/{docId} onde volunteer_uid == uid
 *  5. Audit log em audit_logs (ação: volunteer_data_erased_self_service).
 *
 * Mantém TODOS os aceites de termos (terms_accepted_at, terms_version,
 * terms_type, terms_ip, terms_user_agent, terms_hash) — Lei 14.063/2020.
 * Esses campos são prova legal, não PII.
 *
 * Erros no cascade NÃO bloqueiam o erase principal (best-effort).
 *
 * @param {object} opts
 * @param {string} opts.uid      - voluntário logado
 * @param {string} opts.actorUid - mesmo uid (self-service)
 * @param {object} [opts.targetDb]
 * @param {object} [opts.logger]
 * @returns {{ ok: boolean, counts: object }}
 */
async function runEraseMyVolunteerData({ uid, actorUid, targetDb = db, logger: _logger = console } = {}) {
  const log = (level, msg, data) => _logger[level]?.(`[volunteerPrivacy] ${msg}`, data);
  log('info', 'eraseMyVolunteerData ini', { uid, actorUid });

  if (!uid) throw new Error('uid é obrigatório.');

  const now = FieldValue.serverTimestamp();
  const counts = { profile: 0, roster: 0, participations: 0, documents: 0 };

  // ── (1) users/{uid}/volunteer_profile/main → DELETE ───────────────────────
  let profileDeleted = false;
  try {
    const profileRef = targetDb.collection('users').doc(uid).collection('volunteer_profile').doc('main');
    await targetDb.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef);
      if (!snap.exists) { profileDeleted = false; return; }
      // Preserva os campos de aceite legal (terms_*).
      // APPEND-only: lemos os campos antes de deletar para log.
      const data = snap.data();
      const legalFields = {
        terms_accepted_at: data.terms_accepted_at || null,
        terms_version: data.terms_version || null,
        terms_type: data.terms_type || null,
        terms_ip: data.terms_ip || null,
        terms_user_agent: data.terms_user_agent || null,
        terms_hash: data.terms_hash || null,
        erased_at: now,
        erased_by: uid,
      };
      tx.set(profileRef, legalFields, { merge: true });
      profileDeleted = true;
    });
    counts.profile = profileDeleted ? 1 : 0;
    log('info', 'profile erased', { uid, profileDeleted });
  } catch (err) {
    log('warn', 'profile erase failed (non-blocking)', { err: String(err) });
  }

  // ── (2) clubs/*/volunteers/{uid} → hard delete ─────────────────────────────
  try {
    const rosterSnap = await targetDb
      .collectionGroup('volunteers')
      .where('volunteer_uid', '==', uid)
      .get();
    const batch = targetDb.batch();
    rosterSnap.forEach((d) => batch.delete(d.ref));
    if (!rosterSnap.empty) await batch.commit();
    counts.roster = rosterSnap.size;
    log('info', 'roster docs deleted', { count: rosterSnap.size });
  } catch (err) {
    log('warn', 'roster delete failed (non-blocking)', { err: String(err) });
  }

  // ── (3) clubs/*/volunteer_participations/* → hard delete ───────────────────
  try {
    const partSnap = await targetDb
      .collectionGroup('volunteer_participations')
      .where('volunteer_uid', '==', uid)
      .get();
    const batch = targetDb.batch();
    partSnap.forEach((d) => batch.delete(d.ref));
    if (!partSnap.empty) await batch.commit();
    counts.participations = partSnap.size;
    log('info', 'participation docs deleted', { count: partSnap.size });
  } catch (err) {
    log('warn', 'participations delete failed (non-blocking)', { err: String(err) });
  }

  // ── (4) clubs/*/volunteer_documents/* → hard delete ───────────────────────
  try {
    const docSnap = await targetDb
      .collectionGroup('volunteer_documents')
      .where('volunteer_uid', '==', uid)
      .get();
    const batch = targetDb.batch();
    docSnap.forEach((d) => batch.delete(d.ref));
    if (!docSnap.empty) await batch.commit();
    counts.documents = docSnap.size;
    log('info', 'volunteer_document docs deleted', { count: docSnap.size });
  } catch (err) {
    log('warn', 'volunteer_documents delete failed (non-blocking)', { err: String(err) });
  }

  // ── (5) Audit log ───────────────────────────────────────────────────────────
  try {
    const auditRef = targetDb.collection('audit_logs').doc();
    await targetDb.runTransaction(async (tx) => {
      tx.set(auditRef, {
        action: 'volunteer_data_erased_self_service',
        actor_uid: uid,
        target_uid: uid,
        details: { ...counts },
        created_at: now,
        created_at_ms: Date.now(),
      });
    });
  } catch (err) {
    log('warn', 'audit log failed (non-blocking)', { err: String(err) });
  }

  log('info', 'eraseMyVolunteerData done', { counts });
  return { ok: true, counts };
}

// ─── Admin-only: hard delete de documento específico ────────────────────────

/**
 * Apaga um documento específico de voluntário (após soft-delete).
 * Ex: `clubs/{clubId}/volunteer_documents/{docId}`.
 * Apenas platform_admin pode chamar.
 *
 * @param {object} opts
 * @param {string} opts.clubId
 * @param {string} opts.collectionPath - e.g. 'volunteer_documents'
 * @param {string} opts.docId
 * @param {string} opts.actorUid
 * @param {object} [opts.targetDb]
 * @param {object} [opts.logger]
 */
async function runHardDeleteVolunteerDocument({ clubId, collectionPath, docId, actorUid, targetDb = db, logger: _logger = console } = {}) {
  const log = (level, msg, data) => _logger[level]?.(`[volunteerPrivacy] ${msg}`, data);
  log('info', 'hardDeleteVolunteerDocument ini', { clubId, collectionPath, docId, actorUid });

  if (!clubId || !collectionPath || !docId) {
    throw new Error('clubId, collectionPath e docId são obrigatórios.');
  }

  const validCollections = ['volunteer_documents', 'volunteer_background_checks'];
  if (!validCollections.includes(collectionPath)) {
    throw new Error(`Coleção não permitida: ${collectionPath}. Válidas: ${validCollections.join(', ')}`);
  }

  const docRef = targetDb.collection('clubs').doc(clubId).collection(collectionPath).doc(docId);
  await targetDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;
    tx.delete(docRef);
  });

  // Audit log
  try {
    const auditRef = targetDb.collection('audit_logs').doc();
    await targetDb.runTransaction(async (tx) => {
      tx.set(auditRef, {
        action: 'volunteer_document_hard_deleted',
        actor_uid: actorUid,
        target_club_id: clubId,
        details: { collectionPath, docId },
        created_at: FieldValue.serverTimestamp(),
        created_at_ms: Date.now(),
      });
    });
  } catch {}

  log('info', 'hardDeleteVolunteerDocument done', { clubId, collectionPath, docId });
  return { ok: true };
}

// ─── Exports (puros — amarração com onCall fica em index.js) ─────────────────

module.exports = {
  runSoftDeleteVolunteer,
  runEraseMyVolunteerData,
  runHardDeleteVolunteerDocument,
  makePseudonymUid,
  anonymizedName,
  isPlatformAdmin,
  hasShelterPermission,
};
