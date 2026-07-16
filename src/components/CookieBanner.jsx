/**
 * @fileoverview CookieBanner — banner de consentimento de cookies
 * (Fase 19 / Bloco 2).
 *
 * Banner dismissible exibido na primeira visita. Persiste a
 * decisão em `localStorage.cookie_consent`. Reaparece se a
 * versão do consentimento mudar.
 *
 * NÃO é bloqueante (pode-se recusar; cookies não essenciais
 * permanecem desligados). O banner usa o componente
 * `<LegalPage>` para o conteúdo da versão longa, mas é uma
 * ilha flutuante (não uma página).
 *
 * LGPD (Lei 13.709/2018, art. 7º, I) + Marco Civil da
 * Internet (Lei 12.965/2014, art. 7º, III) + Deliberação
 * ANPD/CD/ANPD Nº 4/2023.
 *
 * Gated por feature flag `SHELTER_LEGAL_TERMS_V1` — quando
 * desligada, retorna null (puramente aditivo).
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { createAuditLog } from '@/core/services/auditService';
import { FEATURE_FLAG } from '@/core/featureFlags';
import {
  CONSENT_VERSION,
  buildConsentRecord,
} from '@/modules/shelter/domain/legal/texts/cookies';

const STORAGE_KEY = 'cookie_consent';

function readStoredConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.version !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredConsent(record) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage cheio ou indisponível — silently degrade
  }
}

function clearStoredConsent() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * CookieBanner
 * Renderiza um banner fixo no rodapé da página enquanto não houver
 * consentimento (ou se a versão estiver desatualizada). Após aceite
 * ou recusa, o banner desaparece.
 */
export function CookieBanner() {
  const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1);
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      setHydrated(true);
      return undefined;
    }
    const stored = readStoredConsent();
    const isCurrent = stored?.version === CONSENT_VERSION;
    setVisible(!isCurrent);
    setHydrated(true);
    return undefined;
  }, [enabled]);

  // TASK-106: além do localStorage (persistência local, vale para
  // anônimos), grava trilha em audit_log quando há usuário logado —
  // prova de consentimento LGPD Art. 8º §2º. Best-effort: falha de
  // rede não bloqueia a decisão do usuário.
  const persistDecision = useCallback((accepted) => {
    const record = buildConsentRecord(accepted, typeof navigator !== 'undefined' ? navigator.userAgent : null);
    writeStoredConsent(record);
    setVisible(false);
    if (user?.uid) {
      createAuditLog({
        action: 'cookie_consent_recorded',
        actor: { uid: user.uid, email: user.email },
        details: {
          consent: record.consent,
          version: record.version,
          categories: record.categories,
        },
      }).catch(() => {});
    }
  }, [user]);

  const handleAccept = useCallback(() => persistDecision(true), [persistDecision]);
  const handleReject = useCallback(() => persistDecision(false), [persistDecision]);

  // API helper para "Configurações > Privacidade" — exposto em
  // window para que outras UIs possam reabrir o banner.
  // Importante: a atribuição é feita em useEffect para não causar
  // re-renders ou side-effects durante a fase de render do React.
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return undefined;
    if (window.__cookieConsentApi__) return undefined;
    window.__cookieConsentApi__ = {
      reopen: () => {
        clearStoredConsent();
        setVisible(true);
      },
      reset: clearStoredConsent,
      getCurrent: readStoredConsent,
    };
    return () => {
      // Só remove a API se ela ainda for a nossa referência.
      if (window.__cookieConsentApi__) delete window.__cookieConsentApi__;
    };
  }, [enabled]);

  if (!enabled || !hydrated || !visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <section className="arena-section-card mx-auto max-w-3xl border-primary/30 bg-white/95 shadow-lg backdrop-blur">
        <div className="arena-section-card-body space-y-3 p-4 sm:p-5">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Esta plataforma usa cookies 🍪
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Usamos cookies essenciais para você navegar. Não usamos cookies
              de marketing ou analytics no momento. Você pode ler nossa{' '}
              <Link
                to="/legal/cookies"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Política de Cookies
              </Link>{' '}
              e a{' '}
              <Link
                to="/legal/politica-de-privacidade"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Política de Privacidade
              </Link>{' '}
              (LGPD).
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:items-center">
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              data-testid="cookie-configure-link"
            >
              {/* Link para a página /legal/cookies onde o usuário
                  pode ler os detalhes de cada categoria e
                  personalizar o consentimento por categoria. */}
              <Link to="/legal/cookies">Configurar</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="w-full sm:w-auto"
              data-testid="cookie-reject-btn"
            >
              Recusar não essenciais
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              className="w-full sm:w-auto"
              data-testid="cookie-accept-btn"
            >
              Aceitar Todos
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Helper exportado para testes e para uso externo (ex.: página
 * de configurações de privacidade). Use este helper se precisar
 * ler o estado do consentimento fora do componente.
 */
export const CookieConsentStorage = Object.freeze({
  STORAGE_KEY,
  read: readStoredConsent,
  write: writeStoredConsent,
  clear: clearStoredConsent,
  CURRENT_VERSION: CONSENT_VERSION,
});
