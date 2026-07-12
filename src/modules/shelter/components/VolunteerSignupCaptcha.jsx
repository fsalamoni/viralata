/**
 * VolunteerSignupCaptcha — hCaptcha fallback for /voluntarios/seja
 *
 * Por que hCaptcha: App Check usa reCAPTCHA Enterprise (pago). hCaptcha
 * (free tier, GDPR-compliant) é o fallback para defesa bot do formulário
 * PÚBLICO de inscrição de voluntários, onde bots poderiam criar perfis
 * falsos em escala.
 *
 * Por que só em /voluntarios/seja: é a única página pública onde um
 * anônimo cria documento no Firestore. Demais rotas (perfil, admin)
 * são auth-gated e menos vulneráveis a bot.
 *
 * Setup: VITE_HCAPTCHA_SITE_KEY no .env (gratuito em hcaptcha.com).
 * Em dev, se a chave não estiver configurada, exibe estado de erro
 * mas NÃO bloqueia o submit — a defesa bot vira responsabilidade do
 * App Check + Cloud Functions em produção.
 */
import { useEffect, useRef, useState } from 'react';

const HCAPTCHA_SCRIPT_URL = 'https://js.hcaptcha.com/1/api.js';
const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

export default function VolunteerSignupCaptcha({ onVerify, onError }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) {
      setError('hcaptcha-not-configured');
      return undefined;
    }

    if (!document.querySelector(`script[src="${HCAPTCHA_SCRIPT_URL}"]`)) {
      const script = document.createElement('script');
      script.src = HCAPTCHA_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    let cancelled = false;
    const checkLoaded = setInterval(() => {
      if (cancelled) {
        clearInterval(checkLoaded);
        return;
      }
      if (window.hcaptcha && containerRef.current && widgetIdRef.current === null) {
        clearInterval(checkLoaded);
        try {
          widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
            sitekey: SITE_KEY,
            callback: (response) => {
              tokenRef.current = response;
              setVerified(true);
              setError(null);
              onVerify?.(response);
            },
            'expired-callback': () => {
              tokenRef.current = null;
              setVerified(false);
            },
            'error-callback': (err) => {
              setError(typeof err === 'string' ? err : 'hcaptcha-error');
              setVerified(false);
              onError?.(err);
            },
          });
        } catch (err) {
          setError(err?.message ?? 'hcaptcha-render-failed');
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearInterval(checkLoaded);
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          // widget já removido ou página em unload — ignora
        }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onError]);

  if (error === 'hcaptcha-not-configured') {
    return (
      <div
        className="captcha-error rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        role="alert"
        data-testid="captcha-not-configured"
      >
        <p className="font-medium">Verificação de segurança desabilitada em dev.</p>
        <p className="text-xs">
          Em produção, configure VITE_HCAPTCHA_SITE_KEY para ativar a defesa bot.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="captcha-error rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900"
        role="alert"
      >
        <p className="font-medium">Verificação de segurança indisponível.</p>
        <p className="text-xs">Por favor recarregue a página ou tente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="captcha-container" data-testid="volunteer-signup-captcha">
      <div ref={containerRef} className="h-captcha" data-sitekey={SITE_KEY} />
      {verified && (
        <p
          className="captcha-verified mt-2 text-sm text-emerald-700"
          role="status"
          data-testid="captcha-verified"
        >
          ✓ Verificação de segurança concluída
        </p>
      )}
    </div>
  );
}
