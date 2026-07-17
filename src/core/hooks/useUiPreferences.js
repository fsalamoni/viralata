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

/**
 * V3 (TASK-V3-UI-1): modos da barra superior (header) do site.
 * Mesmo padrão das outras barras: sempre visível, autohide (some com
 * scroll down, aparece com scroll up), ou escondida.
 * Default `fixed` — user sempre vê onde está.
 */
export const TOPBAR_MODES = Object.freeze({
  FIXED: 'fixed',
  AUTOHIDE: 'autohide',
  HIDDEN: 'hidden',
});

/**
 * V3 (TASK-V3-UI-2): cards por página do feed de pets, por viewport.
 * - Mobile (<640px): opções [4, 8, 12], default 8 (1 coluna)
 * - Tablet (640-1024px): opções [8, 12, 20], default 12 (2 colunas)
 * - Desktop (>=1024px): opções [12, 20, 40, 100], default 12 (3-5 colunas)
 * Múltiplos de 4 para casar com 4 colunas; mobile usa 1 coluna então
 * aceita qualquer múltiplo de 4.
 */
export const CARDS_PER_PAGE_OPTIONS = Object.freeze({
  mobile: [4, 8, 12],
  tablet: [8, 12, 20],
  desktop: [12, 20, 40, 100],
});

/**
 * V3 (TASK-V3-UI-3): nº de colunas do grid de pets por viewport.
 * `auto` = responsivo (1 mobile, 2 tablet, 3-4 desktop, 4 desktop wide).
 * User pode fixar `3`, `4`, `5` (desktop) ou `1`, `2` (mobile/tablet).
 */
export const GRID_COLUMNS_OPTIONS = Object.freeze({
  auto: 'auto',
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
});

const DEFAULT_PREFS = Object.freeze({
  footerMode: FOOTER_MODES.FIXED,
  bottomTabBarMode: BOTTOM_TAB_MODES.FIXED,
  // V3 additions
  topBarMode: TOPBAR_MODES.FIXED,
  feedCardsPerPage: Object.freeze({
    mobile: 8,
    tablet: 12,
    desktop: 12,
  }),
  feedGridColumns: Object.freeze({
    mobile: 'auto',
    tablet: 'auto',
    desktop: 'auto',
  }),
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

/**
 * V3 (TASK-V3-UI-2 helper): retorna o nº de cards por página baseado no
 * viewport atual + preferência do user. Usado pelo PaginationControls.
 * @param {object} prefs - retorno de useUiPreferences()
 * @param {'mobile'|'tablet'|'desktop'} viewport
 * @returns {number}
 */
export function getCardsPerPageForViewport(prefs, viewport) {
  const v = viewport === 'mobile' || viewport === 'tablet' ? viewport : 'desktop';
  const val = prefs?.feedCardsPerPage?.[v];
  if (typeof val === 'number') return val;
  return DEFAULT_PREFS.feedCardsPerPage[v];
}

/**
 * V3 (TASK-V3-UI-3 helper): retorna o nº de colunas do grid para o viewport.
 * `auto` = deixa o Tailwind decidir (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
 * @param {object} prefs
 * @param {'mobile'|'tablet'|'desktop'} viewport
 * @returns {'auto'|1|2|3|4|5}
 */
export function getGridColumnsForViewport(prefs, viewport) {
  const v = viewport === 'mobile' || viewport === 'tablet' ? viewport : 'desktop';
  const val = prefs?.feedGridColumns?.[v];
  if (val === 'auto' || val === 1 || val === 2 || val === 3 || val === 4 || val === 5) return val;
  return 'auto';
}

export const UI_PREFERENCES_DEFAULTS = DEFAULT_PREFS;
export { DEFAULT_PREFS as UI_PREFS_DEFAULTS };
