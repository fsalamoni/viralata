/**
 * @fileoverview PetFavoriteButton — favoritar pet (V3, TASK-V3-PET-DETAIL-5).
 *
 * Persiste em `users/{uid}.favorites: string[]` (array de petIds).
 * Toggle on/off com optimistic UI.
 *
 * Tokens: `text-muted-foreground` (off), `text-destructive fill-destructive` (on).
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Favoritar"
 */
import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { toast } from 'sonner';
import { cn } from '@/core/lib/utils';

export function PetFavoriteButton({ petId, className, size = 'md' }) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  // Carrega estado inicial
  useEffect(() => {
    if (!user?.uid || !petId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled || !snap.exists()) return;
        const favs = snap.data()?.favorites || [];
        setFavorited(Array.isArray(favs) && favs.includes(petId));
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, petId]);

  const toggle = useCallback(async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user?.uid) {
      toast.info('Faça login para favoritar pets.');
      return;
    }
    if (!petId || pending) return;
    setPending(true);
    // Optimistic
    const wasFavorited = favorited;
    setFavorited(!wasFavorited);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        { favorites: wasFavorited ? arrayRemove(petId) : arrayUnion(petId) },
        { merge: true },
      );
    } catch (err) {
      // Reverte optimistic
      setFavorited(wasFavorited);
      toast.error('Não foi possível favoritar. Tente novamente.');
    } finally {
      setPending(false);
    }
  }, [user?.uid, petId, favorited, pending]);

  const sizeClasses = size === 'sm'
    ? 'h-9 w-9'
    : size === 'lg'
      ? 'h-12 w-12'
      : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar este pet'}
      title={favorited ? 'Favorito' : 'Favoritar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-border bg-card/90 backdrop-blur-sm transition-all',
        'hover:scale-105 hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-60',
        sizeClasses,
        favorited && 'border-destructive/40 text-destructive',
        className,
      )}
      data-testid="pet-favorite-button"
    >
      <Heart
        className={cn(
          iconSize,
          'transition-colors',
          favorited ? 'fill-current' : '',
        )}
        aria-hidden="true"
      />
    </button>
  );
}
