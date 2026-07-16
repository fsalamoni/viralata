/**
 * FormField — wrapper semântico label + helper + error + required indicator.
 * Estilo consistente para todos os formulários da plataforma.
 * TASK-606
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/core/lib/utils';

/**
 * @param {object} props
 * @param {string} [props.label]       - Texto do label
 * @param {string} [props.htmlFor]     - ID do input controlado
 * @param {string} [props.helper]      - Texto de ajuda abaixo do campo
 * @param {string} [props.error]       - Mensagem de erro (mostra ícone vermelho)
 * @param {boolean} [props.required]   - Mostra asterisco após label
 * @param {string} [props.className]    - Classe extra no wrapper
 * @param {React.ReactNode} props.children - O campo (Input, Select, etc.)
 */
export function FormField({ label, htmlFor, helper, error, required, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[12.5px] font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>
          )}
        </label>
      )}
      {children}
      {helper && !error && (
        <p className="text-[11.5px] text-muted-foreground">{helper}</p>
      )}
      {error && (
        <p className="text-[11.5px] text-destructive flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
