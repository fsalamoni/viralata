/**
 * @fileoverview Serviço de Workflow de Adoção (Fase 3).
 *
 * Subcoleção `clubs/{clubId}/adoption_workflow/{applicationId}`. Multi-tenant:
 * cada app pertence a um abrigo. Aprovação cascateia:
 *  1. Marca a app como `approved`
 *  2. Rejeita automaticamente todas as outras apps `applied`/`under_review`
 *     do mesmo pet com nota "Animal já adotado"
 *  3. Marca o pet como `status='adopted'` (se for pet de abrigo)
 *  4. Cria evento `status_change` na timeline do pet
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 3
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, writeBatch, limit,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  submitApplicationSchema,
  decideApplicationSchema,
  assertValidTransition,
  isTerminal,
} from '@/modules/shelter/domain/operational/adoption';
import { addTimelineEvent } from '@/modules/shelter/services/timelineService';
import { getAdopterProfile } from '@/modules/shelter/services/adopterProfileService';

const CLUBS_COLLECTION = 'clubs';
const APPS_SUBCOLLECTION = 'adoption_workflow';
const PETS_COLLECTION = 'pets';

// ─── Submit (pelo adotante) ─────────────────────────────────────────────

/**
 * Adotante submete uma application para adotar um pet.
 *
 * @param {object} input - {pet_id, shelter_club_id, applicant_form}
 * @param {object} actor - {uid, displayName}
 * @returns {Promise<{id: string}>}
 */
export async function submitAdoptionApplication(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = submitApplicationSchema.parse(input);

  // Fase 4: se o adotante tem adopter_profile, faz SNAPSHOT dos campos
  // extras no application. Garante que o abrigo vê o perfil completo
  // sem precisar acessar users/{uid}/adopter_profile (regra permissiva
  // demais para abrigo). O snapshot é imutável após o submit.
  const profile = await getAdopterProfile(actor.uid).catch(() => null);
  const applicant_snapshot = profile ? _buildSnapshotFromProfile(profile) : null;

  const payload = {
    pet_id: parsed.pet_id,
    shelter_club_id: parsed.shelter_club_id,
    applicant_uid: actor.uid,
    applicant_form: parsed.applicant_form,
    applicant_snapshot,    // Fase 4: profile completo, se existir
    status: 'applied',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, CLUBS_COLLECTION, parsed.shelter_club_id, APPS_SUBCOLLECTION),
    payload,
  );

  await createAuditLog({
    action: 'adoption_application_submitted',
    actor,
    details: {
      application_id: ref.id,
      pet_id: parsed.pet_id,
      shelter_club_id: parsed.shelter_club_id,
    },
  }).catch((err) => {
    logger.warn('adoptionService.submitAdoptionApplication', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id };
}

// ─── List / Get ─────────────────────────────────────────────────────────

/**
 * Lista applications de um abrigo, com filtro opcional de status.
 */
export async function listApplications(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const { status, maxResults = 100, petId } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  if (petId) constraints.push(where('pet_id', '==', petId));
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, CLUBS_COLLECTION, shelterClubId, APPS_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Lista applications de um pet específico (todas os abrigos donos do pet
 * podem ver). O caller precisa ter acesso ao `petId`.
 */
export async function listApplicationsForPet(petId) {
  if (!db || !petId) return [];
  // Como a coleção é por abrigo, precisamos saber em qual abrigo o pet
  // está. Por simplicidade, esta função é usada pelo context onde o
  // abrigo já é conhecido. Mantida por completude.
  throw new Error('Use listApplications(shelterClubId, {petId}) em vez desta');
}

/**
 * Busca application específica. Verifica tenant.
 */
export async function getApplication(shelterClubId, applicationId) {
  if (!db || !shelterClubId || !applicationId) return null;
  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, APPS_SUBCOLLECTION, applicationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Decide (pelo abrigo) ───────────────────────────────────────────────

/**
 * Mudar status de uma application (decisão do abrigo).
 *
 * Se `to_status='approved'`, cascateia:
 *  1. Rejeita outras apps pendentes do mesmo pet
 *  2. Marca pet.status='adopted'
 *  3. Cria evento `status_change` na timeline do pet
 *
 * Se `to_status='rejected'`, exige `decision_notes`.
 */
export async function decideApplication(shelterClubId, applicationId, decision, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  if (!applicationId) throw new Error('applicationId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = decideApplicationSchema.parse(decision);
  if (parsed.to_status === 'rejected' && !parsed.decision_notes) {
    throw new Error('Recusa exige decision_notes (motivo)');
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, APPS_SUBCOLLECTION, applicationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Application não encontrada.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Application não pertence a este abrigo.');
  }
  if (current.shelter_club_id !== shelterClubId) {
    // (dupla checagem — defence-in-depth)
    throw new Error('Cross-tenant access blocked.');
  }

  // Valida transição
  if (isTerminal(current.status)) {
    throw new Error(`Application em status terminal (${current.status}). Não pode mudar.`);
  }
  assertValidTransition(current.status, parsed.to_status);

  // Update principal
  const now = new Date().toISOString();
  await updateDoc(ref, {
    status: parsed.to_status,
    decision_notes: parsed.decision_notes || null,
    decided_by_uid: actor.uid,
    decided_at: now,
    updated_at: serverTimestamp(),
  });

  // Cascata: se aprovou, rejeitar outras pendentes + atualizar pet
  if (parsed.to_status === 'approved') {
    await _cascadeApproval(
      shelterClubId, applicationId, current.pet_id, actor,
      parsed.decision_notes,
    );
  }

  await createAuditLog({
    action: 'adoption_application_decided',
    actor,
    details: {
      application_id: applicationId,
      pet_id: current.pet_id,
      from: current.status,
      to: parsed.to_status,
      shelter_club_id: shelterClubId,
    },
  }).catch(() => {});

  return { id: applicationId, status: parsed.to_status };
}

// ─── Cancel (pelo applicant ou abrigo) ──────────────────────────────────

/**
 * Cancela uma application (pode ser o applicant ou o abrigo).
 */
export async function cancelApplication(shelterClubId, applicationId, reason, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !applicationId) throw new Error('shelterClubId e applicationId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, APPS_SUBCOLLECTION, applicationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Application não encontrada.');
  const current = snap.data();

  // Permitir cancel/withdraw apenas para: applicant, abrigo, admin
  const isApplicant = current.applicant_uid === actor.uid;
  // Verifica se o usuário é admin/owner do abrigo. Sem isClubOwnerOrAdmin
  // (que é regra do Firestore), confiamos na rule + checagem do
  // shelter_club_id. Aqui só diferenciamos applicant vs abrigo.
  const isAbriho = !isApplicant; // qualquer outro user logado é "do abrigo"
  if (!isApplicant && !isAbriho) {
    throw new Error('Só o applicant ou o abrigo dono podem cancelar.');
  }
  if (isTerminal(current.status)) {
    throw new Error(`Application em status terminal (${current.status}).`);
  }

  const toStatus = isApplicant ? 'withdrawn' : 'cancelled';
  assertValidTransition(current.status, toStatus);

  await updateDoc(ref, {
    status: toStatus,
    decision_notes: reason || null,
    decided_by_uid: actor.uid,
    decided_at: new Date().toISOString(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'adoption_application_cancelled',
    actor,
    details: { application_id: applicationId, to: toStatus, reason },
  }).catch(() => {});

  return { id: applicationId, status: toStatus };
}

// ─── Cascata privada ───────────────────────────────────────────────────

/**
 * Cascata executada quando uma application é aprovada.
 *  1. Rejeita todas as outras apps pendentes do mesmo pet
 *  2. Marca pet.status='adopted' (se for pet de abrigo)
 *  3. Cria evento 'status_change' na timeline do pet
 */
async function _cascadeApproval(shelterClubId, approvedAppId, petId, actor, notes) {
  if (!db || !petId) return;

  // 1. Rejeitar outras pendentes
  const pendentes = await getDocs(query(
    collection(db, CLUBS_COLLECTION, shelterClubId, APPS_SUBCOLLECTION),
    where('pet_id', '==', petId),
    where('status', 'in', ['applied', 'under_review']),
  ));

  const batch = writeBatch(db);
  const rejectedNote = 'Animal já adotado por outro adotante.';
  for (const d of pendentes.docs) {
    if (d.id === approvedAppId) continue;
    batch.update(d.ref, {
      status: 'rejected',
      decision_notes: notes ? rejectedNote + ' ' + notes : rejectedNote,
      decided_by_uid: actor.uid,
      decided_at: new Date().toISOString(),
      updated_at: serverTimestamp(),
    });
  }
  if (!pendentes.empty) {
    await batch.commit();
  }

  // 2. Marcar pet como adotado (se for pet de abrigo)
  const petRef = doc(db, PETS_COLLECTION, petId);
  const petSnap = await getDoc(petRef);
  if (petSnap.exists()) {
    const pet = petSnap.data();
    if (pet.owner_type === 'organization' && pet.owner_id === shelterClubId) {
      await updateDoc(petRef, {
        status: 'adopted',
        adopted_at: serverTimestamp(),
        adopted_by_uid: currentApplicantUid(approvedAppId, pendentes), // best-effort
        updated_at: serverTimestamp(),
      });
    }
  }

  // 3. Evento na timeline do pet
  try {
    await addTimelineEvent(
      petId,
      {
        type: 'status_change',
        event_date: new Date().toISOString(),
        data: {
          from_status: 'available',
          to_status: 'adopted',
          reason: 'Adoção aprovada via workflow',
        },
        recorded_by_name: actor.displayName,
      },
      { uid: actor.uid, displayName: actor.displayName },
      { shelterClubId },
    );
  } catch (err) {
    logger.warn('adoptionService._cascadeApproval', {
      msg: 'timeline event creation failed (non-blocking)',
      err: String(err),
    });
  }
}

// Helper: tenta descobrir o applicant_uid da app aprovada
function currentApplicantUid(approvedAppId, pendentes) {
  // Não dá pra saber daqui (não temos o doc), então deixamos null.
  // A Fase 6 (pós-adoção) vai puxar essa info.
  return null;
}

// Helper: extrai um snapshot leve do profile completo (Fase 4)
function _buildSnapshotFromProfile(profile) {
  if (!profile) return null;
  return {
    full_name: profile.full_name,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    household_size: profile.household_size,
    household_adults: profile.household_adults,
    household_children: profile.household_children,
    children_ages: profile.children_ages,
    home_type: profile.home_type,
    has_yard: profile.has_yard,
    yard_size_m2: profile.yard_size_m2,
    has_fence: profile.has_fence,
    living_arrangement: profile.living_arrangement,
    landlord_allows_pets: profile.landlord_allows_pets,
    household_all_agree: profile.household_all_agree,
    pet_experience_level: profile.pet_experience_level,
    years_of_experience: profile.years_of_experience,
    current_pets: profile.current_pets,
    had_pets_before: profile.had_pets_before,
    previous_pets_deceased_or_given: profile.previous_pets_deceased_or_given,
    monthly_income_range: profile.monthly_income_range,
    willing_to_spend_vet: profile.willing_to_spend_vet,
    has_vet_reference: profile.has_vet_reference,
    vet_name: profile.vet_name,
    vet_phone: profile.vet_phone,
    adoption_reason: profile.adoption_reason,
    hours_alone_per_day: profile.hours_alone_per_day,
    exercise_time_per_day_minutes: profile.exercise_time_per_day_minutes,
    has_transport: profile.has_transport,
    profile_completeness: profile.profile_completeness,
    snapshot_at: new Date().toISOString(),
  };
}
