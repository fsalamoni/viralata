import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { registerPwa } from '@core/pwa/registerPwa';
import './index.css';
import { initErrorTracker } from '@/core/services/errorTracker';
import { recordClientError } from '@/core/services/observabilityService';
import { captureError } from '@/core/services/errorTracker';

initErrorTracker().catch(() => {});

// ─── Global error handlers — capturam erros fora do tree React ──────────────────
// window.onerror: exceções síncronas não capturadas por ErrorBoundary.
window.addEventListener('error', (event) => {
  const { message, filename, lineno, colno, error } = event;
  // Ignorar erros de recursos externos (favicon, fonts, etc.) — são ruído.
  if (filename && !filename.includes(window.location.origin)) return;
  recordClientError(error || new Error(message), {
    source: 'window:error',
    filename,
    lineno,
    colno,
    fatal: false,
  });
  captureError(error || new Error(message), {
    source: 'window:error',
    filename,
    lineno,
    colno,
    fatal: false,
  });
});

// window.addEventListener('unhandledrejection'): Promises rejeitadas sem .catch().
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  // Rejeições com Error object (não string/primitivo) são erros reais.
  if (reason instanceof Error) {
    recordClientError(reason, { source: 'unhandledrejection', fatal: false });
    captureError(reason, { source: 'unhandledrejection', fatal: false });
  } else if (reason != null) {
    // primitives — log but don't full-error-track (framework-level rejections).
    // eslint-disable-next-line no-console
    console.warn('[unhandledrejection]', reason);
  }
  // Prevent default browser behavior (don't show console error).
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Registro do PWA (no-op quando VITE_PWA_ENABLED !== 'true').
registerPwa();
