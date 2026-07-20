/**
 * @fileoverview Analytics service for partner banner tracking.
 *
 * Records views and clicks to subcollection. Aggregates for reports.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §3.3, §7
 */
import {
  doc, collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, getAggregateFromServer, sum, count,
} from 'firebase/firestore';

import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { parseAnalyticsEventOrThrow } from '../schemas/partnerSchema.js';

const EVENTS = 'events';

const getEventsRef = (partnerId, bannerId) =>
  collection(db, 'partners', partnerId, 'banners', bannerId, EVENTS);

/**
 * Heurística simples de bot detection.
 * @param {string} userAgent
 * @returns {boolean}
 */
export function isLikelyBot(userAgent = '') {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return /bot|crawl|spider|headless|phantom|selenium|puppeteer|playwright|wget|curl|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot/i.test(ua);
}

/**
 * Truncate User-Agent to family only (LGPD-friendly).
 * @param {string} userAgent
 * @returns {string}
 */
export function truncateUserAgent(userAgent = '') {
  if (!userAgent) return 'unknown';
  const ua = userAgent.trim();
  if (!ua) return 'unknown';

  // Simple regex families
  const families = [
    { name: 'Chrome', regex: /Chrome\/([\d.]+)/ },
    { name: 'Firefox', regex: /Firefox\/([\d.]+)/ },
    { name: 'Safari', regex: /Version\/([\d.]+).*Safari/ },
    { name: 'Edge', regex: /Edg\/([\d.]+)/ },
    { name: 'Opera', regex: /OPR\/([\d.]+)/ },
    { name: 'SamsungBrowser', regex: /SamsungBrowser\/([\d.]+)/ },
  ];
  for (const f of families) {
    const m = ua.match(f.regex);
    if (m) return `${f.name} ${m[1].split('.')[0]}`;
  }
  // Mobile
  if (/iPhone/.test(ua)) return 'iOS Safari';
  if (/Android/.test(ua)) return 'Android Browser';
  return ua.slice(0, 50);
}

/**
 * Generate a session ID (sessionStorage-backed).
 * @returns {string}
 */
export function getSessionId() {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let sid = window.sessionStorage.getItem('partner-sid');
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem('partner-sid', sid);
    }
    return sid;
  } catch {
    return 'no-session';
  }
}

/**
 * Track a view (impression).
 *
 * @param {object} input
 * @param {string} input.partnerId
 * @param {string} input.bannerId
 * @param {string} input.position
 * @param {string} input.page - current path
 * @param {string|null} input.userUid
 */
export async function trackView(input) {
  if (!input?.partnerId || !input?.bannerId) return;

  const event = parseAnalyticsEventOrThrow({
    type: 'view',
    userUid: input.userUid || null,
    userAgent: truncateUserAgent(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    sessionId: getSessionId(),
    ipHash: '', // Server-side fill in future
    timestamp: serverTimestamp(),
    isBot: isLikelyBot(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    position: input.position,
    page: input.page || '',
  });

  try {
    await addDoc(getEventsRef(input.partnerId, input.bannerId), event);
  } catch (err) {
    logger.warn('trackView failed', { err: String(err) });
    // Fire-and-forget
  }
}

/**
 * Track a click.
 */
export async function trackClick(input) {
  if (!input?.partnerId || !input?.bannerId) return;

  const event = parseAnalyticsEventOrThrow({
    type: 'click',
    userUid: input.userUid || null,
    userAgent: truncateUserAgent(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    sessionId: getSessionId(),
    ipHash: '',
    timestamp: serverTimestamp(),
    isBot: isLikelyBot(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    position: input.position,
    page: input.page || '',
  });

  try {
    await addDoc(getEventsRef(input.partnerId, input.bannerId), event);
  } catch (err) {
    logger.warn('trackClick failed', { err: String(err) });
  }
}

/**
 * Get recent events for a banner.
 */
export async function listBannerEvents(partnerId, bannerId, maxEvents = 200) {
  if (!partnerId || !bannerId) return [];
  const q = query(
    getEventsRef(partnerId, bannerId),
    orderBy('timestamp', 'desc'),
    limit(maxEvents),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Aggregate counts for a banner.
 */
export async function getBannerStats(partnerId, bannerId) {
  if (!partnerId || !bannerId) return { views: 0, clicks: 0, ctr: 0 };
  try {
    const eventsRef = getEventsRef(partnerId, bannerId);
    const [viewsSnap, clicksSnap] = await Promise.all([
      getAggregateFromServer(query(eventsRef, where('type', '==', 'view')), { count: count() }),
      getAggregateFromServer(query(eventsRef, where('type', '==', 'click')), { count: count() }),
    ]);
    const views = viewsSnap.data().count || 0;
    const clicks = clicksSnap.data().count || 0;
    return {
      views,
      clicks,
      ctr: views > 0 ? (clicks / views) * 100 : 0,
    };
  } catch (err) {
    logger.warn('getBannerStats failed', { err: String(err) });
    return { views: 0, clicks: 0, ctr: 0 };
  }
}

/**
 * Group events by day (for time series chart).
 * @param {Array} events
 * @returns {Array<{date: string, views: number, clicks: number}>}
 */
export function groupEventsByDay(events) {
  const map = new Map();
  for (const e of events) {
    if (!e.timestamp) continue;
    const ts = e.timestamp.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
    const dateKey = ts.toISOString().slice(0, 10);
    const entry = map.get(dateKey) || { date: dateKey, views: 0, clicks: 0 };
    if (e.type === 'view') entry.views++;
    if (e.type === 'click') entry.clicks++;
    map.set(dateKey, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
