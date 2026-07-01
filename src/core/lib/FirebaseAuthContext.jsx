import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, firebaseDisabledReason } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';

const AuthContext = createContext(null);
const PLATFORM_OWNER_EMAIL = 'fsalamoni@gmail.com';

function isPlatformOwnerEmail(email) {
  return String(email || '').toLowerCase() === PLATFORM_OWNER_EMAIL;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!auth || !db) {
      setUser(null);
      setUserProfile(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          setIsAuthenticated(true);

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const existingProfile = userDoc.data();
            const autoAdminUpdates = isPlatformOwnerEmail(firebaseUser.email)
              ? { role: 'platform_admin' }
              : {};
            await setDoc(
              userDocRef,
              { ...autoAdminUpdates, last_login: serverTimestamp(), updated_at: serverTimestamp() },
              { merge: true },
            );
            const mergedProfile = { uid: firebaseUser.uid, ...existingProfile, ...autoAdminUpdates };
            setUserProfile(mergedProfile);
          } else {
            const isOwner = isPlatformOwnerEmail(firebaseUser.email);
            const newProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              full_name: firebaseUser.displayName || '',
              platform_name: firebaseUser.displayName || '',
              phone: '',
              photo_url: firebaseUser.photoURL || '',
              // Localização
              city: '',
              state: '',
              // Perfilamento comportamental (onboarding obrigatório)
              profile_completed: false,
              housing_type: '',
              has_yard: false,
              daily_walks: '',
              has_children: false,
              children_ages: '',
              has_elderly: false,
              other_pets: [],
              budget_level: '',
              // Preferências de privacidade
              phone_public: false,
              email_public: false,
              // Papel na plataforma
              role: isOwner ? 'platform_admin' : 'user',
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
              last_login: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            logger.info('Novo perfil de usuário criado:', firebaseUser.uid);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        logger.error('Erro na mudança de estado de autenticação:', error);
        setAuthError({ type: 'profile_error', message: error.message, code: error.code });
      } finally {
        setIsLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      const error = {
        type: 'signin_error',
        message: firebaseDisabledReason || 'Login indisponível neste ambiente.',
        code: 'auth/configuration-missing',
      };
      setAuthError(error);
      throw new Error(error.message);
    }
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (error) {
      let userMessage = 'Erro ao fazer login com Google.';
      if (error.code === 'auth/popup-closed-by-user') userMessage = 'Login cancelado. Tente novamente.';
      else if (error.code === 'auth/popup-blocked') userMessage = 'Pop-up bloqueado pelo navegador.';
      else if (error.code === 'auth/network-request-failed') userMessage = 'Erro de conexão. Verifique sua internet.';
      else if (error.code === 'auth/unauthorized-domain') userMessage = 'Domínio não autorizado.';
      setAuthError({ type: 'signin_error', message: userMessage, code: error.code });
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
  };

  const updateUserProfile = async (updates) => {
    if (!user) throw new Error('Nenhum usuário logado');
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      { ...updates, updated_at: serverTimestamp() },
      { merge: true },
    );
    await createAuditLog({
      action: 'user_profile_updated',
      actor: user,
      details: { changed_fields: Object.keys(updates) },
    });
    const nextProfile = { ...userProfile, ...updates };
    setUserProfile(nextProfile);
  };

  const value = {
    user,
    userProfile,
    isAuthenticated,
    isLoadingAuth,
    authError,
    isAuthAvailable: Boolean(auth && googleProvider && db),
    authUnavailableReason: firebaseDisabledReason,
    signInWithGoogle,
    signOut,
    updateUserProfile,
    isPlatformAdmin: userProfile?.role === 'platform_admin',
    isProfileComplete: userProfile?.profile_completed === true,
    isBanned: userProfile?.banned === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
