/**
 * @fileoverview errorTracker — wrapper de error tracking (TASK-176).
 *
 * Suporta Sentry via dynamic import (sem dependência no build).
 * Fallback: console.error + localStorage queue.
 *
 * **Como ativar Sentry**:
 * 1. `npm install @sentry/react`
 * 2. Setar `VITE_SENTRY_DSN` em .env
 * 3. Pronto — o tracker detecta e inicializa
 *
 * **Fallback**:
 * - Se Sentry não estiver instalado, captura erro + contexto
 *   e guarda em localStorage (até 50 entries) para admin ver
 *   em /admin (futuro)
 *
 * **API**:
 * - initErrorTracker(config) — chamada 1x no main.jsx
 * - captureError(error, context, extraTags) — captura erro com tags opcionais
 * - captureVolunteerError(error, extraContext) — captura erro com domain:volunteer tag (TASK-283)
 * - captureMessage(msg, level) — captura mensagem
 * - setUser(user) — associa user
 * - clearUser() — limpa
 */

let initialized = false;
let sentryAvailable = false;
let Sentry = null;
const queue = [];

async function tryLoadSentry() {
  try {
    // Dynamic import - não quebra build se não tiver
    const SENTRY_PKG = '@' + 'sentry/react';
    Sentry = await import(/* @vite-ignore */ SENTRY_PKG).catch(() => null);
    if (Sentry) {
      sentryAvailable = true;
      return true;
    }
  } catch (e) {
    // Sentry não disponível
  }
  return false;
}

const FALLBACK_KEY = '__viralata_error_queue__';
const MAX_QUEUE = 50;

/**
 * Inicializa o tracker. Chame 1x no main.jsx.
 *
 * @param {object} config
 * @param {string} [config.dsn] — Sentry DSN
 * @param {string} [config.environment='production']
 * @param {number} [config.sampleRate=0.1] — 0..1
 * @param {boolean} [config.enableInDev=false]
 */
export async function initErrorTracker(config = {}) {
  if (initialized) return;
  initialized = true;

  const dsn = config.dsn || import.meta.env?.VITE_SENTRY_DSN;
  const env = config.environment || import.meta.env?.MODE || 'production';
  const sampleRate = config.sampleRate ?? 0.1;
  const enableInDev = config.enableInDev ?? false;

  if (!dsn && env === 'development' && !enableInDev) {
    return; // sem DSN e em dev, skip
  }

  const loaded = await tryLoadSentry();
  if (loaded && Sentry) {
    Sentry.init({
      dsn,
      environment: env,
      sampleRate,
      tracesSampleRate: sampleRate,
      beforeSend(event) {
        // Filtra erros conhecidos (ex: ResizeObserver loop)
        if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
          return null;
        }
        return event;
      },
    });
  } else if (dsn) {
    // DSN setado mas Sentry não instalado
    console.warn('[errorTracker] DSN setado mas @sentry/react não instalado. Usando fallback.');
  }
}

/**
 * Captura um erro. Sempre loga; envia pra Sentry se disponível.
 *
 * @param {Error|string} error
 * @param {object} [context]
 * @param {object} [extraTags] — tags extras para Sentry (ex: { domain: 'volunteer' })
 */
export function captureError(error, context = {}, extraTags = {}) {
  // Sempre loga
  // eslint-disable-next-line no-console
  console.error('[errorTracker]', error, context, extraTags);

  if (sentryAvailable && Sentry) {
    Sentry.captureException(error, { extra: context, tags: extraTags });
    return;
  }
  // Fallback: queue localStorage
  enqueueFallback({
    type: 'error',
    message: error?.message || String(error),
    stack: error?.stack || null,
    context,
    tags: extraTags,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : null,
  });
}

/**
 * Captura erro com domain=volunteer tag (TASK-283).
 * Usa Sentry.withScope para isolar o tag ao escopo deste erro.
 *
 * @param {Error|string} error
 * @param {object} [extraContext]
 */
export function captureVolunteerError(error, extraContext = {}) {
  if (sentryAvailable && Sentry) {
    Sentry.withScope((scope) => {
      scope.setTag('domain', 'volunteer');
      scope.setExtras(extraContext);
      Sentry.captureException(error);
    });
  } else {
    // Fallback: console + queue
    // eslint-disable-next-line no-console
    console.error('[errorTracker][volunteer]', error, extraContext);
    enqueueFallback({
      type: 'error',
      domain: 'volunteer',
      message: error?.message || String(error),
      stack: error?.stack || null,
      context: extraContext,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : null,
    });
  }
}

/**
 * Captura uma mensagem (info/warning/error).
 */
export function captureMessage(message, level = 'info', context = {}) {
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](
    `[errorTracker] [${level}]`,
    message,
    context,
  );

  if (sentryAvailable && Sentry) {
    Sentry.captureMessage(message, level, { extra: context });
    return;
  }
  enqueueFallback({
    type: 'message',
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Associa usuário aos próximos eventos.
 */
export function setUser(user) {
  if (sentryAvailable && Sentry) {
    Sentry.setUser(user ? {
      id: user.uid,
      email: user.email,
      username: user.displayName,
    } : null);
  }
}

/**
 * Limpa usuário (logout).
 */
export function clearUser() {
  if (sentryAvailable && Sentry) {
    Sentry.setUser(null);
  }
}

function enqueueFallback(entry) {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    if (arr.length > MAX_QUEUE) arr.shift();
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(arr));
  } catch (e) {
    // localStorage indisponível
  }
}

/**
 * Lista entries de fallback (para admin).
 */
export function getFallbackQueue() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Limpa fallback queue.
 */
export function clearFallbackQueue() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(FALLBACK_KEY);
}

export const ERROR_TRACKER_CONFIG = {
  FALLBACK_KEY,
  MAX_QUEUE,
};

export const __test__ = { tryLoadSentry, enqueueFallback };
