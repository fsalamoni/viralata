import { MAX_REGISTRATIONS_PER_MODALITY } from './constants.js';

export function hasUnlimitedEntries(maxEntries) {
  return maxEntries === null || maxEntries === undefined || maxEntries === '';
}

export function normalizeMaxEntries(maxEntries, { defaultValue = 32, allowUnlimited = true } = {}) {
  if (allowUnlimited && hasUnlimitedEntries(maxEntries)) return null;
  const fallback = Math.min(Math.max(Math.trunc(Number(defaultValue) || 32), 2), MAX_REGISTRATIONS_PER_MODALITY);
  const parsed = Math.trunc(Number(maxEntries));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 2), MAX_REGISTRATIONS_PER_MODALITY);
}

export function isRegistrationCapacityReached(occupiedCount, maxEntries) {
  return !hasUnlimitedEntries(maxEntries) && occupiedCount >= Number(maxEntries);
}

export function getCapacityProgress(occupiedCount, maxEntries) {
  if (hasUnlimitedEntries(maxEntries)) return null;
  return Math.max(0, Math.min(100, Math.round((occupiedCount / Math.max(1, Number(maxEntries))) * 100)));
}
