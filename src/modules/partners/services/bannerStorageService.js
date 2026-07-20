/**
 * @fileoverview Storage service for partner banner images.
 *
 * - Path: `partner-banners/{partnerId}/{bannerId}/{slot}.{ext}`
 * - Validates: type (jpg/png/webp), size (max 500KB)
 * - Compresses via canvas if > 400KB
 * - Returns download URL
 *
 * @see docs/PARTNER_SPACES_PLAN.md §2.2
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/core/config/firebase';
import { BANNER_LIMITS } from '../domain/constants.js';
import { logger } from '@/core/lib/logger';

const ACCEPTED_TYPES = BANNER_LIMITS.ALLOWED_TYPES;
const MAX_SIZE = BANNER_LIMITS.MAX_SIZE_BYTES;

function sanitizeFilename(name) {
  return String(name || 'banner')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'banner';
}

function getExtensionFromType(type) {
  switch (type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * Validate file before upload.
 * @param {File} file
 * @returns {{ok: true, type: string, ext: string} | {ok: false, error: string}}
 */
export function validateBannerFile(file) {
  if (!file) return { ok: false, error: 'Arquivo vazio' };
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: `Tipo não suportado: ${file.type}. Use JPG, PNG ou WebP.` };
  }
  if (file.size > MAX_SIZE) {
    return {
      ok: false,
      error: `Arquivo muito grande (${(file.size / 1024).toFixed(0)}KB). Max ${(MAX_SIZE / 1024).toFixed(0)}KB.`,
    };
  }
  return { ok: true, type: file.type, ext: getExtensionFromType(file.type) };
}

/**
 * Compress image via canvas (browser only). Returns Blob or null on error.
 * @param {File|Blob} file
 * @param {number} maxWidth
 * @param {number} quality 0..1
 * @returns {Promise<Blob|null>}
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.85) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (!file) return null;

  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return null;

    const ratio = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });
    return blob;
  } catch (err) {
    logger.warn('compressImage failed', { err: String(err) });
    return null;
  }
}

/**
 * Upload banner image to Firebase Storage.
 *
 * @param {object} input
 * @param {File|Blob} input.file
 * @param {string} input.partnerId
 * @param {string} input.bannerId
 * @param {'desktop'|'mobile'} input.slot
 * @param {string} [input.filename]
 * @returns {Promise<string>} download URL
 */
export async function uploadBannerImage({ file, partnerId, bannerId, slot, filename }) {
  if (!file) throw new Error('uploadBannerImage: file required');
  if (!partnerId) throw new Error('uploadBannerImage: partnerId required');
  if (!bannerId) throw new Error('uploadBannerImage: bannerId required');
  if (!['desktop', 'mobile'].includes(slot)) {
    throw new Error('uploadBannerImage: slot must be desktop|mobile');
  }

  const ext = file.type ? getExtensionFromType(file.type) : 'webp';
  const safeName = sanitizeFilename(filename || `banner-${slot}`);
  const path = `partner-banners/${partnerId}/${bannerId}/${slot}-${safeName}.${ext}`;
  const storageRef = ref(storage, path);

  // Upload
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/webp',
    cacheControl: 'public, max-age=86400',
  });

  const url = await getDownloadURL(storageRef);
  logger.info('partner banner uploaded', { path, url });
  return url;
}

/**
 * Delete a banner image from Storage.
 *
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function deleteBannerImage(url) {
  if (!url) return;
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (err) {
    // Ignore 404 (file not found)
    if (err?.code !== 'storage/object-not-found') {
      logger.warn('deleteBannerImage failed', { err: String(err) });
    }
  }
}

/**
 * Build storage path (for reference, e.g. for partner card previews).
 */
export function buildBannerStoragePath(partnerId, bannerId, slot) {
  return `partner-banners/${partnerId}/${bannerId}/${slot}`;
}
