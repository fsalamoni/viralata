/**
 * @fileoverview PasswordConfirmDialog — diálogo de confirmação que exige
 * a senha do usuário antes de prosseguir com uma ação destrutiva.
 *
 * TASK-295 (LGPD Art. 18 VI + Firebase Auth best practice): confirmação
 * dupla (email + senha) via `reauthenticateWithCredential` antes de
 * `deleteUser()`. Impede exclusão de conta por sessão hijacked.
 *
 * Wrapper sobre o `ConfirmDialog` canônico (`@/components/ui/confirm-dialog`)
 * com um input de senha adicional. Se a senha estiver errada, mostra
 * erro inline e NÃO fecha o diálogo.
 */

import React, { useState, useRef, useEffect, cloneElement } from 'react';
import { Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/core/config/firebase';
import { ConfirmDialog as ControlledConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

/**
 * @param {object} props
 * @param {boolean} open
 * @param {(open: boolean) => void} onOpenChange
 * @param {string} title
 * @param {string} [description]
 * @param {string} [confirmLabel]
 * @param {boolean} [destructive]
 * @param {boolean} [loading]
 * @param {() => void|Promise<void>} onConfirm - chamado APÓS reauth OK
 * @param {string} [email] - email do user (default: auth.currentUser?.email)
 * @param {React.ReactElement} [trigger] - opcional, botão que abre o dialog
 */
export function PasswordConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirmar ação',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  email,
  trigger,
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [reauthing, setReauthing] = useState(false);
  const inputRef = useRef(null);

  // Reset quando abre/fecha
  useEffect(() => {
    if (open) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setReauthing(false);
      // Auto-focus no input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function handleConfirm() {
    if (!password) {
      setError('Informe sua senha.');
      return;
    }
    const currentUser = auth?.currentUser;
    const userEmail = email || currentUser?.email;
    if (!currentUser || !userEmail) {
      setError('Usuário não autenticado.');
      return;
    }
    setReauthing(true);
    setError(null);
    try {
      const credential = EmailAuthProvider.credential(userEmail, password);
      await reauthenticateWithCredential(currentUser, credential);
      // Reauth OK — agora chama o onConfirm real
      await onConfirm?.();
    } catch (err) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setError('Senha incorreta.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente em alguns minutos.');
      } else {
        setError('Erro ao verificar senha. Tente novamente.');
      }
    } finally {
      setReauthing(false);
    }
  }

  const triggerWithHandler = trigger
    ? cloneElement(trigger, {
        onClick: (e) => {
          e?.stopPropagation?.();
          e?.preventDefault?.();
          onOpenChange(true);
          trigger.props?.onClick?.(e);
        },
      })
    : null;

  return (
    <>
      {triggerWithHandler}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {destructive && <Lock className="h-4 w-4 text-destructive" />}
              {title}
            </DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="password-confirm" className="text-sm font-semibold">
              Confirme sua senha
            </Label>
            <div className="relative">
              <Input
                id="password-confirm"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && !reauthing) {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-confirm-error' : undefined}
                disabled={loading || reauthing}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p id="password-confirm-error" role="alert" className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Por segurança, valide sua identidade antes de prosseguir.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || reauthing}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading || reauthing || !password}
            >
              {reauthing ? 'Verificando...' : (loading ? 'Processando...' : confirmLabel)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PasswordConfirmDialog;
