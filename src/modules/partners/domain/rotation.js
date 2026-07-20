/**
 * @fileoverview Pure logic for banner rotation.
 *
 * Deterministic weighted random based on sessionId hash.
 * Anti-repeat: doesn't return same banner 2x in a row.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §6
 */

/**
 * djb2 hash (simple, fast, deterministic).
 * @param {string} str
 * @returns {number} uint32
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Filter active banners for a given position and current time.
 *
 * @param {Array} banners
 * @param {string} position
 * @param {Date} now
 * @returns {Array} valid banners
 */
export function filterValidBanners(banners, position, now = new Date()) {
  if (!Array.isArray(banners)) return [];
  return banners.filter((b) => {
    if (!b) return false;
    if (b.status !== 'active') return false;
    if (b.position !== position) return false;

    // Date range
    const start = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
    const end = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate);
    if (start && now < start) return false;
    if (end && now > end) return false;

    // Max impressions
    if (b.maxImpressions && b.currentImpressions >= b.maxImpressions) return false;

    // Max clicks
    if (b.maxClicks && b.currentClicks >= b.maxClicks) return false;

    return true;
  });
}

/**
 * Pick a banner using weighted random based on sessionId hash.
 * Anti-repeat: doesn't pick the same banner that was shown before.
 *
 * @param {Array} banners - valid banners
 * @param {string} sessionId - unique session ID
 * @param {string|null} lastBannerId - last shown banner ID (for anti-repeat)
 * @returns {object|null} picked banner
 */
export function pickBanner(banners, sessionId, lastBannerId = null) {
  if (!Array.isArray(banners) || banners.length === 0) return null;
  if (!sessionId) sessionId = 'default-session';

  // Anti-repeat: filter out last shown banner (if there are alternatives)
  let candidates = banners;
  if (lastBannerId && banners.length > 1) {
    const others = banners.filter((b) => b.id !== lastBannerId);
    if (others.length > 0) candidates = others;
  }

  // Total weight
  const totalWeight = candidates.reduce((sum, b) => sum + (b.weight || 1), 0);
  if (totalWeight <= 0) return candidates[0];

  // Deterministic hash → picks same banner for same session (stable UX)
  // but rotates between users
  const hash = hashString(sessionId + ':' + Date.now().toString().slice(0, -4)); // change every ~hour
  const target = hash % totalWeight;

  // Cumulative sum
  let cumulative = 0;
  for (const b of candidates) {
    cumulative += (b.weight || 1);
    if (target < cumulative) return b;
  }

  return candidates[candidates.length - 1]; // fallback
}

/**
 * Check if rotation is needed (debounce).
 * Prevents too-frequent rotations for the same user.
 *
 * @param {number} lastRotationAt - timestamp of last rotation
 * @param {number} now - current timestamp
 * @param {number} debounceMs - minimum ms between rotations
 * @returns {boolean}
 */
export function shouldRotate(lastRotationAt, now = Date.now(), debounceMs = 30000) {
  if (!lastRotationAt) return true;
  return (now - lastRotationAt) >= debounceMs;
}
