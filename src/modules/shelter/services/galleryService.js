/**
 * @fileoverview Serviço: Galeria de Fotos (Fase 10).
 *
 * Coleção `pet_photos/{photoId}`. Multi-tenant via `shelter_club_id`.
 * Soft delete + 30d purge (Cloud Function apaga Storage após 30d).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.2 (Fase 10)
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  createPetPhotoSchema,
  updatePetPhotoSchema,
  daysUntilPurge,
  PURGE_DAYS,
} from '@/modules/shelter/domain/operational/gallery';

const PHOTOS_COLLECTION = 'pet_photos';

// ─── Helpers internos ──────────────────────────────────────────────────

async function _verifyPhotoTenant(photoId, shelterClubId) {
  const ref = doc(db, PHOTOS_COLLECTION, photoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Foto não encontrada.');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data };
}

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lista fotos de um pet, com filtros opcionais.
 * Por padrão exclui soft-deletadas (deleted_at != null).
 */
export async function listPetPhotos(petId, shelterClubId, options = {}) {
  if (!db) return [];
  if (!petId || !shelterClubId) throw new Error('petId e shelterClubId obrigatórios');
  const { category, includeDeleted = false, maxResults = 200 } = options;

  const constraints = [
    where('pet_id', '==', petId),
    where('shelter_club_id', '==', shelterClubId),
  ];
  if (category) constraints.push(where('category', '==', category));
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(collection(db, PHOTOS_COLLECTION), ...constraints);
  const snap = await getDocs(q);
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!includeDeleted) {
    docs = docs.filter((d) => !d.deleted_at);
  }
  return docs;
}

/**
 * Lista fotos DELETADAS (lixeira) de um pet — para a aba "Lixeira".
 */
/**
 * TASK-142: galeria PÚBLICA do abrigo — fotos não-deletadas das
 * categorias liberadas nas rules para leitura anônima. A query
 * PRECISA repetir os filtros da rule (deleted_at == null + category
 * in [...]), senão o Firestore nega o resultado inteiro.
 */
export const PUBLIC_PHOTO_CATEGORIES = Object.freeze(['rescue', 'profile', 'adoption', 'exhibition']);

export async function listPublicShelterPhotos(shelterClubId, { maxResults = 24 } = {}) {
  if (!db || !shelterClubId) return [];
  const q = query(
    collection(db, PHOTOS_COLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    where('deleted_at', '==', null),
    where('category', 'in', [...PUBLIC_PHOTO_CATEGORIES]),
    orderBy('created_at', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listDeletedPhotos(petId, shelterClubId) {
  if (!db) return [];
  if (!petId || !shelterClubId) throw new Error('petId e shelterClubId obrigatórios');
  const q = query(
    collection(db, PHOTOS_COLLECTION),
    where('pet_id', '==', petId),
    where('shelter_club_id', '==', shelterClubId),
    where('deleted_at', '!=', null),
    orderBy('deleted_at', 'desc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPetPhoto(photoId, shelterClubId) {
  if (!db) return null;
  try {
    return await _verifyPhotoTenant(photoId, shelterClubId);
  } catch (err) {
    logger.warn('galleryService.getPetPhoto', {
      msg: 'access blocked or not found',
      err: String(err?.message || err),
    });
    return null;
  }
}

// ─── Create ────────────────────────────────────────────────────────────

export async function createPetPhoto(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createPetPhotoSchema.parse(input);

  const payload = {
    pet_id: parsed.pet_id,
    shelter_club_id: parsed.shelter_club_id,
    category: parsed.category,
    url: parsed.url,
    thumb_url: parsed.thumb_url || null,
    storage_path: parsed.storage_path,
    uploaded_by_uid: actor.uid,
    uploaded_by_name: actor.displayName || null,
    caption: parsed.caption || null,
    original_metadata: parsed.original_metadata || null,
    deleted_at: null,
    deleted_by_uid: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, PHOTOS_COLLECTION), payload);

  await createAuditLog({
    action: 'pet_photo_uploaded',
    actor,
    details: {
      pet_id: parsed.pet_id,
      photo_id: ref.id,
      category: parsed.category,
      shelter_club_id: parsed.shelter_club_id,
    },
  }).catch((err) => {
    logger.warn('galleryService.createPetPhoto', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...payload };
}

// ─── Update ───────────────────────────────────────────────────────────

export async function updatePetPhoto(photoId, shelterClubId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyPhotoTenant(photoId, shelterClubId);

  const parsed = updatePetPhotoSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(db, PHOTOS_COLLECTION, photoId);
  await updateDoc(ref, {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'pet_photo_updated',
    actor,
    details: { photo_id: photoId, changed: Object.keys(parsed) },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

// ─── Soft delete (lixeira) ───────────────────────────────────────────

/**
 * Soft delete: marca deleted_at + deleted_by_uid. NÃO remove o doc.
 * Cloud Function agendada apaga fisicamente do Storage após 30d.
 */
export async function softDeletePetPhoto(photoId, shelterClubId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyPhotoTenant(photoId, shelterClubId);

  const ref = doc(db, PHOTOS_COLLECTION, photoId);
  const now = new Date().toISOString();
  await updateDoc(ref, {
    deleted_at: now,
    deleted_by_uid: actor.uid,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'pet_photo_soft_deleted',
    actor,
    details: { photo_id: photoId, deleted_at: now },
  }).catch(() => {});

  return { ok: true, deleted_at: now, days_until_purge: PURGE_DAYS };
}

/**
 * Restaurar foto da lixeira (antes dos 30d).
 */
export async function restorePetPhoto(photoId, shelterClubId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const photo = await _verifyPhotoTenant(photoId, shelterClubId);
  if (!photo.deleted_at) {
    return { ok: true, noop: true };
  }

  // Bloqueia restauração após 30d (purge já deve ter acontecido)
  const remaining = daysUntilPurge(photo.deleted_at);
  if (remaining === 0) {
    throw new Error('Foto já expirou (30 dias). Não é possível restaurar.');
  }

  const ref = doc(db, PHOTOS_COLLECTION, photoId);
  await updateDoc(ref, {
    deleted_at: null,
    deleted_by_uid: null,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'pet_photo_restored',
    actor,
    details: { photo_id: photoId },
  }).catch(() => {});

  return { ok: true, restored: true, days_remaining: remaining };
}

// ─── Aggregates ──────────────────────────────────────────────────────

/**
 * Conta fotos de um pet (excluindo deletadas).
 */
export async function countPetPhotos(petId, shelterClubId) {
  if (!db) return 0;
  const q = query(
    collection(db, PHOTOS_COLLECTION),
    where('pet_id', '==', petId),
    where('shelter_club_id', '==', shelterClubId),
    where('deleted_at', '==', null),
  );
  const snap = await getDocs(q);
  return snap.size;
}
