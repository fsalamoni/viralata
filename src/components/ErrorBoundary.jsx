import React from 'react';
import { recordClientError } from '@/core/services/observabilityService';
import { captureError } from '@/core/services/errorTracker';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    recordClientError(error, { source: 'ErrorBoundary', info, fatal: true });
    captureError(error, { source: 'ErrorBoundary', info, fatal: true });
    // Log to console for visibility
    console.error('[ErrorBoundary] caught:', error);
    if (info?.componentStack) console.error(info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const errorText = `${this.state.error?.name || 'Error'}: ${this.state.error?.message || this.state.error}`;
      const stackText = this.state.error?.stack || '';
      const componentStack = this.state.info?.componentStack || '';
      const isDebug = typeof window !== 'undefined' && (
        window.location.search.includes('debug=1') ||
        window.location.search.includes('showError=1')
      );

      return (
        <div className="min-h-screen flex items-center justify-center bg-secondary p-6">
          <div className="max-w-md w-full bg-card rounded-lg shadow p-6 border">
            <h1 className="text-xl font-semibold text-foreground mb-2">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Ocorreu um erro inesperado. Recarregue a página para tentar novamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Recarregar
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 p-3 bg-secondary rounded text-xs overflow-auto max-h-64">
                {String(this.state.error?.stack || this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
