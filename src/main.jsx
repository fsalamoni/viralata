import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { registerPwa } from '@core/pwa/registerPwa';
import './index.css';
import { initErrorTracker } from '@/core/services/errorTracker';
initErrorTracker().catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Registro do PWA (no-op quando VITE_PWA_ENABLED !== 'true').
registerPwa();
