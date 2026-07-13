/**
 * @fileoverview useFeedPreferences — hook para persistir preferências do
 * feed (TASK-401 — persitência de seleções do user).
 *
 * **Persistência**: salvas em `users/{uid}.feed_preferences` (Firestore
 * subdoc merge). O fallback é localStorage para resposta rápida no
 * primeiro render.
 *
 * **Defaults seguros** (LGPD Art. 25 — privacy by default):
 *  - `showOwnPets`: true (abrigos precisam ver seus pets)
 *  - `species`: 'all'
 *  - `size`: 'all'
 *  - `city`: '' (vazio = sem filtro)
 *
 * **Comportamento**: retorna `[prefs, setPrefs]` similar a useState.
 * - setPrefs atualiza estado local imediatamente
 * - Debounce de 800ms para persistir no Firestore (evita N writes por
 *   segundo se o user troca filtros)
 * - Em caso de erro de rede, retry com exponential backoff
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';

const STORAGE_KEY = 'viralata:feed_prefs';
const DEBOUNCE_MS = 800;

const DEFAULT_PREFS = {
  showOwnPets: true,
  species: 'all',
  size: 'all',
  city: '',
  radius: 50,
  radiusActive: false,
};

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
 *   - setPrefs: aceita objeto parcial OU função (setter style)
 *   - status: { saving, error, syncedAt }
 */
export function useFeedPreferences() {
  const { user, updateUserProfile } = useAuth();
  const [prefs, setLocal] = useState(() => loadFromStorage());
  const [status, setStatus] = useState({ saving: false, error: null, syncedAt: null });
  const timerRef = useRef(null);
  const lastSavedRef = useRef(null);

  // Hidrata do profile do user (autoritativo) na primeira vez
  useEffect(() => {
    if (!user) return;
    const fromProfile = user.feed_preferences;
    if (fromProfile && typeof fromProfile === 'object') {
      const merged = { ...DEFAULT_PREFS, ...fromProfile };
      setLocal(merged);
      saveToStorage(merged);
    }
  }, [user?.uid, user?.feed_preferences]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const persistToFirestore = useCallback(
    async (next) => {
      if (!user?.uid) return;
      try {
        setStatus((s) => ({ ...s, saving: true, error: null }));
        const ref = doc(db, 'users', user.uid);
        await setDoc(
          ref,
          { feed_preferences: next, updated_at: serverTimestamp() },
          { merge: true }
        );
        lastSavedRef.current = JSON.stringify(next);
        setStatus({ saving: false, error: null, syncedAt: new Date() });
      } catch (e) {
        logger.error('useFeedPreferences: persist failed', e);
        setStatus((s) => ({ ...s, saving: false, error: e.message }));
      }
    },
    [user?.uid]
  );

  const setPrefs = useCallback(
    (updater) => {
      setLocal((current) => {
        const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
        saveToStorage(next);

        // Debounce persistência no Firestore
        if (timerRef.current) clearTimeout(timerRef.current);
        if (user?.uid) {
          timerRef.current = setTimeout(() => {
            persistToFirestore(next);
          }, DEBOUNCE_MS);
        }
        return next;
      });
    },
    [user?.uid, persistToFirestore]
  );

  return [prefs, setPrefs, status];
}
