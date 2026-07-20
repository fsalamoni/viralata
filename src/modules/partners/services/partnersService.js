/**
 * @fileoverview Partners service — CRUD + aggregations.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §3.1
 */
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, increment,
} from 'firebase/firestore';

import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { parsePartnerOrThrow } from '../schemas/partnerSchema.js';
import { PARTNER_STATUS } from '../domain/constants.js';

const COLLECTION = 'partners';

/**
 * Get all partners (admin).
 * @param {object} filters
 * @param {string} [filters.status]
 * @param {string} [filters.category]
 * @returns {Promise<Array>}
 */
export async function listPartners(filters = {}) {
  const constraints = [];
  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters.category) {
    constraints.push(where('category', '==', filters.category));
  }
  constraints.push(orderBy('updatedAt', 'desc'));
  constraints.push(limit(500));

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get active partners (for public listing — limited use).
 */
export async function listActivePartners(limitCount = 100) {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', PARTNER_STATUS.ACTIVE),
    orderBy('name', 'asc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single partner by ID.
 */
export async function getPartner(partnerId) {
  if (!partnerId) return null;
  const ref = doc(db, COLLECTION, partnerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Create a new partner.
 *
 * @param {object} input - partner data (validated by partnerSchema)
 * @param {object} actor - {uid, displayName}
 * @returns {Promise<{id: string}>}
 */
export async function createPartner(input, actor) {
  if (!actor?.uid) throw new Error('createPartner: actor required');

  const validated = parsePartnerOrThrow({
    ...input,
    status: input.status || PARTNER_STATUS.PENDING_REVIEW,
  });

  // Auto-generate ID
  const partnerRef = doc(collection(db, COLLECTION));
  const data = {
    ...validated,
    totalClicks: 0,
    totalViews: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    activatedAt: validated.status === PARTNER_STATUS.ACTIVE ? serverTimestamp() : null,
    createdBy: actor.uid,
  };

  await setDoc(partnerRef, data);
  await createAuditLog('partner_created', {
    actor_uid: actor.uid,
    target_id: partnerRef.id,
    metadata: { name: validated.name, category: validated.category, status: validated.status },
  });

  logger.info('partner created', { id: partnerRef.id, name: validated.name });
  return { id: partnerRef.id };
}

/**
 * Update a partner.
 */
export async function updatePartner(partnerId, input, actor) {
  if (!actor?.uid) throw new Error('updatePartner: actor required');
  if (!partnerId) throw new Error('updatePartner: partnerId required');

  const validated = parsePartnerOrThrow(input);
  const partnerRef = doc(db, COLLECTION, partnerId);

  // Se mudou para active pela primeira vez
  const current = await getPartner(partnerId);
  const activatedNow = current && current.status !== PARTNER_STATUS.ACTIVE && validated.status === PARTNER_STATUS.ACTIVE;

  const data = {
    ...validated,
    updatedAt: serverTimestamp(),
    ...(activatedNow ? { activatedAt: serverTimestamp() } : {}),
  };

  await updateDoc(partnerRef, data);
  await createAuditLog('partner_updated', {
    actor_uid: actor.uid,
    target_id: partnerId,
    metadata: { changes: Object.keys(validated) },
  });

  logger.info('partner updated', { id: partnerId });
  return { id: partnerId };
}

/**
 * Delete a partner (and all its banners subcollection).
 */
export async function deletePartner(partnerId, actor) {
  if (!actor?.uid) throw new Error('deletePartner: actor required');
  if (!partnerId) throw new Error('deletePartner: partnerId required');

  // Delete all banners (cascade)
  const bannersSnap = await getDocs(collection(db, COLLECTION, partnerId, 'banners'));
  for (const bannerDoc of bannersSnap.docs) {
    await deleteDoc(bannerDoc.ref);
  }

  // Delete partner doc
  await deleteDoc(doc(db, COLLECTION, partnerId));

  await createAuditLog('partner_deleted', {
    actor_uid: actor.uid,
    target_id: partnerId,
    metadata: { banners_deleted: bannersSnap.size },
  });

  logger.info('partner deleted', { id: partnerId, bannersDeleted: bannersSnap.size });
}

/**
 * Increment partner totals (denormalized counters).
 */
export async function incrementPartnerCounters(partnerId, { views = 0, clicks = 0 }) {
  if (!partnerId) return;
  const partnerRef = doc(db, COLLECTION, partnerId);
  const update = { updatedAt: serverTimestamp() };
  if (views) update.totalViews = increment(views);
  if (clicks) update.totalClicks = increment(clicks);
  await updateDoc(partnerRef, update).catch((err) => {
    logger.warn('incrementPartnerCounters failed', { partnerId, err: String(err) });
  });
}
