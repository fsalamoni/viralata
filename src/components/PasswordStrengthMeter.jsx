/**
 * @fileoverview PasswordStrengthMeter — indicador visual de força de senha
 * (TASK-040).
 *
 * Mostra:
 * - Barra colorida de força (fraca/média/forte/muito forte)
 * - Lista de requisitos com check (✓/✗)
 * - Sugestões em tempo real
 *
 * Feature flag: SHELTER_SECURITY_HARDENING
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePassword, strengthLabel, strengthColor, PASSWORD_POLICY } from '@/core/lib/passwordPolicy';
import { cn } from '@/core/lib/utils';

const REQUIREMENTS = [
  { key: 'length', label: `Mínimo ${PASSWORD_POLICY.minLength} caracteres` },
  { key: 'lowercase', label: 'Letra minúscula' },
  { key: 'uppercase', label: 'Letra maiúscula' },
  { key: 'digit', label: 'Dígito (0-9)' },
  { key: 'special', label: 'Caractere especial' },
];

/**
 * @param {object} props
 * @param {string} props.password
 * @param {string} [props.confirmPassword] — para checar match
 * @param {string} [props.confirmErrorMessage] — mensagem de erro customizada para mismatch
 */
export function PasswordStrengthMeter({
  password = '',
  confirmPassword = '',
  confirmErrorMessage = 'As senhas não coincidem',
  className,
}) {
  const result = validatePassword(password);
  const { strength, score, errors } = result;

  // Verifica cada requirement
  const checks = {
    length: password.length >= PASSWORD_POLICY.minLength,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const showMatchError = confirmPassword && confirmPassword !== password;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Barra de força */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Força da senha</span>
          <span className="font-medium" style={{ color: strengthColor(strength) }}>
            {strengthLabel(strength)}
          </span>
        </div>
        <div
          className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Força da senha: ${strengthLabel(strength)}`}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.max(score, password ? 8 : 0)}%`,
              backgroundColor: strengthColor(strength),
            }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      <ul className="space-y-1 text-xs" aria-label="Requisitos de senha">
        {REQUIREMENTS.map((req) => {
          const met = checks[req.key];
          return (
            <li
              key={req.key}
              className={cn(
                'flex items-center gap-1.5',
                met ? 'text-emerald-700' : 'text-muted-foreground',
              )}
            >
              {met ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <X className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              <span aria-label={met ? `${req.label} — ok` : `${req.label} — pendente`}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Erros extras (comum, etc.) */}
      {errors.length > 0 && password && (
        <ul className="text-xs text-destructive space-y-0.5">
          {errors
            .filter((e) => !REQUIREMENTS.some((r) => e.includes(r.label)))
            .map((err, i) => (
              <li key={i} className="flex items-start gap-1">
                <X className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
                {err}
              </li>
            ))}
        </ul>
      )}

      {/* Match de confirmação */}
      {confirmPassword !== undefined && confirmPassword !== '' && (
        <div
          className={cn(
            'text-xs flex items-center gap-1.5',
            showMatchError ? 'text-destructive' : 'text-emerald-700',
          )}
          role={showMatchError ? 'alert' : 'status'}
        >
          {showMatchError ? (
            <X className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Check className="h-3 w-3" aria-hidden="true" />
          )}
          {showMatchError ? confirmErrorMessage : 'As senhas coincidem'}
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
