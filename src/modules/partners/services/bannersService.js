/**
 * @fileoverview Banners service — CRUD + rotation queries.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §3.2
 */
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, increment,
} from 'firebase/firestore';

import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { parseBannerOrThrow } from '../schemas/partnerSchema.js';
import { BANNER_STATUS } from '../domain/constants.js';
import { filterValidBanners } from '../domain/rotation.js';

const SUBCOLLECTION = 'banners';

const getSubRef = (partnerId) => collection(db, 'partners', partnerId, SUBCOLLECTION);
const getDocRef = (partnerId, bannerId) => doc(db, 'partners', partnerId, SUBCOLLECTION, bannerId);

/**
 * List banners for a partner (admin).
 */
export async function listBannersByPartner(partnerId) {
  if (!partnerId) return [];
  const q = query(
    getSubRef(partnerId),
    orderBy('createdAt', 'desc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, partnerId, ...d.data() }));
}

/**
 * List ALL active banners (across all partners) for a given position.
 * Used by public AdSlot for rotation.
 *
 * Returns valid banners (filtered by status, date, max impressions).
 */
export async function listActiveBannersForPosition(position, now = new Date(), limitCount = 50) {
  if (!position) return [];
  const q = query(
    collectionGroup(db, SUBCOLLECTION),
    where('status', '==', BANNER_STATUS.ACTIVE),
    where('position', '==', position),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => {
    const path = d.ref.path;
    const match = path.match(/^partners\/([^/]+)\/banners\/([^/]+)$/);
    return {
      id: d.id,
      partnerId: match ? match[1] : null,
      ...d.data(),
    };
  });
  return filterValidBanners(all, position, now);
}

/**
 * Get a single banner.
 */
export async function getBanner(partnerId, bannerId) {
  if (!partnerId || !bannerId) return null;
  const snap = await getDoc(getDocRef(partnerId, bannerId));
  if (!snap.exists()) return null;
  return { id: snap.id, partnerId, ...snap.data() };
}

/**
 * Create a banner.
 */
export async function createBanner(partnerId, input, actor) {
  if (!actor?.uid) throw new Error('createBanner: actor required');
  if (!partnerId) throw new Error('createBanner: partnerId required');

  const validated = parseBannerOrThrow({ ...input, partnerId });
  const bannerRef = doc(getSubRef(partnerId));

  const data = {
    ...validated,
    currentImpressions: 0,
    currentClicks: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actor.uid,
  };

  await setDoc(bannerRef, data);
  await createAuditLog('partner_banner_created', {
    actor_uid: actor.uid,
    target_id: bannerRef.id,
    metadata: { partnerId, position: validated.position, weight: validated.weight },
  });

  logger.info('partner banner created', { id: bannerRef.id, partnerId });
  return { id: bannerRef.id };
}

/**
 * Update a banner.
 */
export async function updateBanner(partnerId, bannerId, input, actor) {
  if (!actor?.uid) throw new Error('updateBanner: actor required');
  if (!partnerId || !bannerId) throw new Error('updateBanner: ids required');

  const { partnerId: _ignored, ...rest } = input;
  const validated = parseBannerOrThrow({ ...rest, partnerId });

  const data = {
    ...validated,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(getDocRef(partnerId, bannerId), data);

  await createAuditLog('partner_banner_updated', {
    actor_uid: actor.uid,
    target_id: bannerId,
    metadata: { partnerId, changes: Object.keys(validated) },
  });

  logger.info('partner banner updated', { id: bannerId, partnerId });
  return { id: bannerId };
}

/**
 * Toggle banner status (active/paused/draft).
 */
export async function setBannerStatus(partnerId, bannerId, status, actor) {
  if (!actor?.uid) throw new Error('setBannerStatus: actor required');
  await updateDoc(getDocRef(partnerId, bannerId), {
    status,
    updatedAt: serverTimestamp(),
  });
  await createAuditLog('partner_banner_status', {
    actor_uid: actor.uid,
    target_id: bannerId,
    metadata: { partnerId, status },
  });
  logger.info('partner banner status', { id: bannerId, status });
}

/**
 * Delete a banner.
 */
export async function deleteBanner(partnerId, bannerId, actor) {
  if (!actor?.uid) throw new Error('deleteBanner: actor required');
  if (!partnerId || !bannerId) throw new Error('deleteBanner: ids required');

  await deleteDoc(getDocRef(partnerId, bannerId));
  await createAuditLog('partner_banner_deleted', {
    actor_uid: actor.uid,
    target_id: bannerId,
    metadata: { partnerId },
  });
  logger.info('partner banner deleted', { id: bannerId, partnerId });
}

/**
 * Increment banner counters.
 */
export async function incrementBannerCounters(partnerId, bannerId, { views = 0, clicks = 0 }) {
  if (!partnerId || !bannerId) return;
  const update = { updatedAt: serverTimestamp() };
  if (views) update.currentImpressions = increment(views);
  if (clicks) update.currentClicks = increment(clicks);
  await updateDoc(getDocRef(partnerId, bannerId), update).catch((err) => {
    logger.warn('incrementBannerCounters failed', { bannerId, err: String(err) });
  });
}
