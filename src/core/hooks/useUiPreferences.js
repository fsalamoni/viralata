/**
 * @fileoverview useUiPreferences — preferências visuais persistidas do
 * usuário (TASK-401).
 *
 **Persistência**: `users/{uid}.ui_preferences` (Firestore doc merge).
 * Fallback em localStorage para resposta rápida no primeiro render.
 *
 **Preferências suportadas**:
 *  - `footerMode`: 'fixed' (sempre visível) | 'autohide' (aparece com
 *    mouse próximo) | 'hidden' (não exibe)
 *  - `bottomTabBarMode`: 'fixed' (sempre visível) | 'autohide' | 'hidden'
 *  - `compactMode`: false (default) — quando true, reduz paddings
 *  - `reduceMotion`: false (default) — segue prefers-reduced-motion
 *
 **Defaults seguros** (UX priority + a11y):
 *  - footer: 'fixed' (sempre disponível — exigido Guia Legal v2 §5)
 *  - bottomTabBar: 'fixed' (mobile, autenticado)
 *
 **API**: `[prefs, setPrefs, status]` similar a useState
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';

const STORAGE_KEY = 'viralata:ui_prefs';
const DEBOUNCE_MS = 800;

export const FOOTER_MODES = Object.freeze({
  FIXED: 'fixed',
  AUTOHIDE: 'autohide',
  HIDDEN: 'hidden',
});

export const BOTTOM_TAB_MODES = Object.freeze({
  FIXED: 'fixed',
  AUTOHIDE: 'autohide',
  HIDDEN: 'hidden',
});

const DEFAULT_PREFS = Object.freeze({
  footerMode: FOOTER_MODES.FIXED,
  bottomTabBarMode: BOTTOM_TAB_MODES.FIXED,
  compactMode: false,
  reduceMotion: false,
});

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function saveToStorage(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage indisponível
  }
}

/**
 * @returns {[object, Function, object]} [prefs, setPrefs, status]
 *   - prefs: preferências atuais
 *   - setPrefs: aceita objeto parcial OU função
 *   - status: { saving, error, syncedAt }
 */
export function useUiPreferences() {
  const { user } = useAuth();
  const [prefs, setLocal] = useState(() => loadFromStorage());
  const [status, setStatus] = useState({ saving: false, error: null, syncedAt: null });
  const timerRef = useRef(null);

  // Hidrata do profile do user (autoritativo) na primeira vez
  useEffect(() => {
    if (!user) return;
    const fromProfile = user.ui_preferences;
    if (fromProfile && typeof fromProfile === 'object') {
      const merged = { ...DEFAULT_PREFS, ...fromProfile };
      setLocal(merged);
      saveToStorage(merged);
    }
  }, [user?.uid, user?.ui_preferences]);

  // Cleanup
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const persistToFirestore = useCallback(
    async (next) => {
      if (!user?.uid) return;
      try {
        setStatus((s) => ({ ...s, saving: true, error: null }));
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          { ui_preferences: next, updated_at: serverTimestamp() },
          { merge: true },
        );
        setStatus({ saving: false, error: null, syncedAt: new Date() });
      } catch (e) {
        logger.error('useUiPreferences: persist failed', e);
        setStatus((s) => ({ ...s, saving: false, error: e.message }));
      }
    },
    [user?.uid],
  );

  const setPrefs = useCallback(
    (updater) => {
      setLocal((current) => {
        const next = typeof updater === 'function'
          ? updater(current)
          : { ...current, ...updater };
        saveToStorage(next);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (user?.uid) {
          timerRef.current = setTimeout(() => persistToFirestore(next), DEBOUNCE_MS);
        }
        return next;
      });
    },
    [user?.uid, persistToFirestore],
  );

  return [prefs, setPrefs, status];
}

export const UI_PREFERENCES_DEFAULTS = DEFAULT_PREFS;
export { DEFAULT_PREFS as UI_PREFS_DEFAULTS };
