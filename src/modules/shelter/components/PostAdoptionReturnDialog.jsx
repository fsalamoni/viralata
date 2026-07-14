/**
 * @fileoverview PostAdoptionReturnDialog — dialog para adotante iniciar
 * devolução de animal ao abrigo (TASK-308).
 *
 * Chama postAdoptionService.markAsReturned().
 * Gated por feature flag SHELTER_POST_ADOPTION_RETURN (default OFF).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialogAction } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { markAsReturned } from '@/modules/shelter/services/postAdoptionService';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';

const REASON_MIN_LENGTH = 10;

const PRESET_REASONS = [
  'Mudança de endereço / cidade',
  'Problema de saúde do adotante',
  'Adaptação não funcionou',
  'Falta de condições financeiras',
  'Animal apresentou comportamento inesperado',
  'Outro motivo',
];

/**
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, postAdoption: object, petName?: string }} props
 */
export function PostAdoptionReturnDialog({ open, onOpenChange, postAdoption, petName }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const finalReason = reason === 'Outro motivo' ? customReason.trim() : reason;

  const mutation = useMutation({
    mutationFn: () => {
      if (!postAdoption?.id || !postAdoption?.shelter_club_id) {
        return Promise.reject(new Error('postAdoption inválido'));
      }
      return markAsReturned(postAdoption.shelter_club_id, postAdoption.id, finalReason, {
        uid: user?.uid || 'anonymous',
      });
    },
    onSuccess: () => {
      logger.info('PostAdoptionReturnDialog', { msg: 'return submitted', postAdoptionId: postAdoption?.id });
      queryClient.invalidateQueries({ queryKey: ['postAdoption', postAdoption?.id] });
      queryClient.invalidateQueries({ queryKey: ['myPostAdoption'] });
      onOpenChange(false);
      setReason('');
      setCustomReason('');
    },
    onError: (err) => {
      logger.error('PostAdoptionReturnDialog', { msg: 'return failed', err: String(err) });
    },
  });

  const isValid = finalReason.length >= REASON_MIN_LENGTH;
  const isLoading = mutation.isPending;

  function handleOpenChange(next) {
    if (!isLoading) {
      onOpenChange(next);
      if (!next) {
        setReason('');
        setCustomReason('');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Devolver {petName ? `"${petName}"` : 'o animal'} ao abrigo
          </DialogTitle>
          <DialogDescription>
            Esta ação notificará o abrigo. O animal voltará a ficar disponível
            para adoção. Deseja continuar?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Motivo da devolução *</Label>
            <div className="mt-1.5 space-y-1.5">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    reason === r
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="return-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-primary"
                    disabled={isLoading}
                  />
                  {r}
                </label>
              ))}
            </div>
          </div>

          {reason === 'Outro motivo' && (
            <div>
              <Label className="text-sm font-medium">Descreva o motivo *</Label>
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Conte o que aconteceu…"
                rows={3}
                maxLength={1000}
                className="mt-1.5 resize-none"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {customReason.length}/1000 caracteres (mínimo {REASON_MIN_LENGTH})
              </p>
            </div>
          )}

          {mutation.isError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              Erro ao registrar devolução. Tente novamente.
            </p>
          )}
        </div>

        <DialogFooter>
          <AlertDialogAction
            disabled={!isValid || isLoading}
            onClick={(e) => {
              e.preventDefault();
              if (isValid) mutation.mutate();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              'Confirmar devolução'
            )}
          </AlertDialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PostAdoptionReturnDialog;
