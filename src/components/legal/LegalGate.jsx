/**
 * @fileoverview LegalGate — gate global para aceites de termos/contratos
 * pendentes (TASK-401 parte 2).
 *
 * **Comportamento**:
 *  - Roda após login (depois de OnboardingGate)
 *  - Lê aceites canônicos em `users/{uid}/terms_acceptances/`
 *  - Compara com `CURRENT_TERMS_VERSION` de cada tipo
 *  - Se há pendente, renderiza TermsAcceptanceModal com **apenas os tipos
 *    pendentes** (não reapresenta o que já está aceito na versão atual)
 *  - Modal fica em tela cheia (não pode fechar sem aceitar) — Lei 14.063/2020
 *
 * **Quando aparece**:
 *  1. User acabou de fazer signup (ainda não aceitou nada)
 *  2. Admin bumpou `CURRENT_TERMS_VERSION` de um termo existente
 *  3. User foi criado pelo admin (mock-data) sem passar pelo fluxo
 *
 * **Quando NÃO aparece**:
 *  - Termos já aceitos na versão atual
 *  - User anônimo
 *  - User não terminou onboarding
 *  - Rotas de auth/onboarding/legal (whitelist)
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  getCurrentAcceptances,
  recordAcceptance,
} from '@/modules/shelter/services/termsAcceptanceService';
import {
  CURRENT_TERMS_VERSION,
  TERMS_TYPE,
  TERMS_TYPE_META,
} from '@/modules/shelter/domain/legal/terms';
import TermsAcceptanceModal from '@/modules/shelter/components/legal/TermsAcceptanceModal';
import { logger } from '@/core/lib/logger';

const LEGAL_ALLOWED_PATHS = [
  '/onboarding',
  '/login',
  '/politica-privacidade',
  '/termos',
  '/legislacao',
  '/legal',
  '/perfil',
  '/logout',
];

/** Tipos exigidos para qualquer user usar a plataforma. */
const REQUIRED_TYPES = [
  TERMS_TYPE.GENERAL,
  TERMS_TYPE.PRIVACY,
  TERMS_TYPE.CONDUCT,
];

function getPendingTypes(acceptances) {
  return REQUIRED_TYPES.filter((type) => {
    const accepted = acceptances.find((a) => a.terms_type === type);
    const current = CURRENT_TERMS_VERSION[type];
    return !accepted || accepted.terms_version !== current;
  });
}

export default function LegalGate({ children }) {
  const location = useLocation();
  const { user, isAuthenticated, isLoadingAuth, isProfileComplete } = useAuth();
  const [pendingTypes, setPendingTypes] = useState(null); // null = checking
  const [busy, setBusy] = useState(false);
  const [acceptances, setAcceptances] = useState([]);

  // Whitelist de paths que não exigem gate
  const isAllowedPath = LEGAL_ALLOWED_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth || !user?.uid) {
      setPendingTypes(null);
      return;
    }
    // Só checa aceites se o user completou o onboarding (já criou profile)
    if (!isProfileComplete) {
      setPendingTypes(null);
      return;
    }
    // Se está em path permitido, não bloqueia
    if (isAllowedPath) {
      setPendingTypes([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const current = await getCurrentAcceptances(user.uid);
        if (!alive) return;
        setAcceptances(current);
        setPendingTypes(getPendingTypes(current));
      } catch (e) {
        logger.error('LegalGate: falhou ao buscar aceites', e);
        // Em caso de erro, NÃO bloqueia (false positive pior que não checar)
        setPendingTypes([]);
      }
    })();
    return () => { alive = false; };
  }, [user?.uid, isAuthenticated, isLoadingAuth, isProfileComplete, isAllowedPath]);

  async function handleAccept({ items, signature }) {
    if (!user?.uid) return;
    setBusy(true);
    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      for (const item of items) {
        // TermsAcceptanceModal envia items com snake_case (terms_type,
        // terms_version, document_hash) — bate com o schema Zod de
        // recordAcceptanceInputSchema. Não renomear.
        await recordAcceptance(
          user.uid,
          {
            terms_type: item.terms_type,
            terms_version: item.terms_version,
            document_hash: item.document_hash,
            signature_text: signature,
            legal_basis: 'consent',
            ip_address: 'unknown', // preenchido por Cloud Function na auditoria
            user_agent: userAgent,
            liveness_verified: false,
          },
          user
        );
      }
      // Recarrega aceites e re-checa pendentes
      const updated = await getCurrentAcceptances(user.uid);
      setAcceptances(updated);
      setPendingTypes(getPendingTypes(updated));
    } catch (e) {
      logger.error('LegalGate: falhou ao gravar aceite', e);
    } finally {
      setBusy(false);
    }
  }

  // Render: enquanto checa, mostra children (não bloqueia render)
  if (pendingTypes === null) {
    return children;
  }
  if (pendingTypes.length === 0) {
    return children;
  }
  // Bloqueia — modal em tela cheia, não pode fechar
  return (
    <>
      {children}
      <TermsAcceptanceModal
        open
        onOpenChange={() => { /* no-op: modal é bloqueante */ }}
        userId={user?.uid}
        userDisplayName={user?.displayName || user?.email || ''}
        types={pendingTypes}
        onAccept={handleAccept}
        title="Termos foram atualizados"
        description={`Há ${pendingTypes.length} documento(s) legal(is) pendente(s) de aceite na versão atual. Por favor, leia e aceite para continuar usando a plataforma.`}
      />
    </>
  );
}
