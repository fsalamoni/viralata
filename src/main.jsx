import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { registerPwa } from '@core/pwa/registerPwa';
import './index.css';
import { checkXlsxSecurity } from '@/core/services/security/xlsxMonitor';

// TASK-016: monitora versão do SheetJS (xlsx). Loga warning se vulnerável
// a CVE GHSA-4r6h-8v6p-xvw6 ou GHSA-5pgg-2g8v-p4x9. Ver docs/security/XLSX_SECURITY.md.
checkXlsxSecurity();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Registro do PWA (no-op quando VITE_PWA_ENABLED !== 'true').
registerPwa();
