/**
 * @fileoverview AdSlotBanner — public-facing banner rotation slot.
 *
 * Substitui o AdSlot placeholder quando PUBLIC_PARTNER_BANNERS_V1 está ON.
 * Renderiza banner rotacionado por sessão + tracking client-side.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §6
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Megaphone, X } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { useActiveBannersForPosition, useTrackView, useTrackClick } from '@/modules/partners/hooks/usePartners';
import { BANNER_LIMITS } from '@/modules/partners/domain/constants';
import { pickBanner, shouldRotate } from '@/modules/partners/domain/rotation';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useReducedMotion } from 'framer-motion';

const ROTATION_DEBOUNCE_MS = BANNER_LIMITS.ROTATION_DEBOUNCE_MS;
const VIEW_DEBOUNCE_KEY = (sid, bannerId) => `partner-view-${sid}-${bannerId}`;

function getSessionId() {
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

function isViewedRecently(sessionId, bannerId) {
  try {
    const ts = window.sessionStorage.getItem(VIEW_DEBOUNCE_KEY(sessionId, bannerId));
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < BANNER_LIMITS.VIEW_DEBOUNCE_MS;
  } catch {
    return false;
  }
}

function markViewed(sessionId, bannerId) {
  try {
    window.sessionStorage.setItem(VIEW_DEBOUNCE_KEY(sessionId, bannerId), String(Date.now()));
  } catch {
    // ignore
  }
}

function getLastBannerId(position) {
  try {
    return window.sessionStorage.getItem(`partner-last-banner-${position}`);
  } catch {
    return null;
  }
}

function setLastBannerId(position, id) {
  try {
    window.sessionStorage.setItem(`partner-last-banner-${position}`, id);
  } catch {
    // ignore
  }
}

function getLastRotation(position) {
  try {
    const ts = window.sessionStorage.getItem(`partner-last-rotation-${position}`);
    return ts ? parseInt(ts, 10) : 0;
  } catch {
    return 0;
  }
}

function setLastRotation(position) {
  try {
    window.sessionStorage.setItem(`partner-last-rotation-${position}`, String(Date.now()));
  } catch {
    // ignore
  }
}

export function AdSlotBanner({ position, page = '', className = '', fallback = null }) {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const { data: banners = [] } = useActiveBannersForPosition(position);
  const trackView = useTrackView();
  const trackClick = useTrackClick();

  const [currentBanner, setCurrentBanner] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const sessionIdRef = useRef(null);
  const lastBannerIdRef = useRef(null);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = getSessionId();
    }
  }, []);

  // Pick banner initially + on rotation timer
  const pickNewBanner = useCallback(() => {
    if (banners.length === 0 || dismissed) return;
    const sid = sessionIdRef.current || 'ssr';
    const lastId = lastBannerIdRef.current;
    const next = pickBanner(banners, sid, lastId);
    if (next) {
      setCurrentBanner(next);
      lastBannerIdRef.current = next.id;
      setLastBannerId(position, next.id);
    }
  }, [banners, position, dismissed]);

  // Initial pick + rotation
  useEffect(() => {
    if (banners.length === 0) return;
    const lastRotation = getLastRotation(position);
    const now = Date.now();
    if (!lastBannerIdRef.current || shouldRotate(lastRotation, now, ROTATION_DEBOUNCE_MS)) {
      lastBannerIdRef.current = getLastBannerId(position);
      pickNewBanner();
      setLastRotation(position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length, position]);

  // Periodic rotation (every 30s if user still on page)
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      const lastRotation = getLastRotation(position);
      const now = Date.now();
      if (shouldRotate(lastRotation, now, ROTATION_DEBOUNCE_MS)) {
        pickNewBanner();
        setLastRotation(position);
      }
    }, 15 * 1000);
    return () => clearInterval(interval);
  }, [banners.length, pickNewBanner, position]);

  // Track view (once per session per banner)
  useEffect(() => {
    if (!currentBanner) return;
    const sid = sessionIdRef.current || 'ssr';
    if (!isViewedRecently(sid, currentBanner.id)) {
      markViewed(sid, currentBanner.id);
      trackView.mutate({
        partnerId: currentBanner.partnerId,
        bannerId: currentBanner.id,
        position,
        page,
        userUid: user?.uid || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBanner?.id, position, user?.uid]);

  if (dismissed || !currentBanner) {
    return fallback;
  }

  const handleClick = (e) => {
    e.preventDefault();
    trackClick.mutate({
      partnerId: currentBanner.partnerId,
      bannerId: currentBanner.id,
      position,
      page,
      userUid: user?.uid || null,
    });
    window.open(currentBanner.linkUrl, '_blank', 'noopener,noreferrer');
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const imgUrl = isMobile && currentBanner.imageUrlMobile ? currentBanner.imageUrlMobile : currentBanner.imageUrl;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card',
        reduce ? '' : 'transition-all duration-300 hover:shadow-md',
        className,
      )}
      data-testid="ad-slot-banner"
      data-position={position}
    >
      <a
        href={currentBanner.linkUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={currentBanner.alt}
      >
        <img
          src={imgUrl}
          alt={currentBanner.alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </a>
      <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        <Megaphone className="h-2.5 w-2.5" aria-hidden="true" />
        Parceiro
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fechar"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

export default AdSlotBanner;
