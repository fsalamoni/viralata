/**
 * @fileoverview PostAdoptionPauseDialog — dialog para adotante pausar
 * acompanhamento pós-adoção (TASK-308).
 *
 * Chama postAdoptionService.pausePostAdoption().
 * Gated por feature flag SHELTER_POST_ADOPTION_RETURN (default OFF).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PauseCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialogAction } from '@/components/ui/alert-dialog';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';
import { pausePostAdoption } from '@/modules/shelter/services/postAdoptionService';

/**
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, postAdoption: object, petName?: string }} props
 */
export function PostAdoptionPauseDialog({ open, onOpenChange, postAdoption, petName }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!postAdoption?.id || !postAdoption?.shelter_club_id) {
        return Promise.reject(new Error('postAdoption inválido'));
      }
      return pausePostAdoption(postAdoption.shelter_club_id, postAdoption.id, {
        uid: user?.uid || 'anonymous',
      });
    },
    onSuccess: () => {
      logger.info('PostAdoptionPauseDialog', { msg: 'paused', postAdoptionId: postAdoption?.id });
      queryClient.invalidateQueries({ queryKey: ['postAdoption', postAdoption?.id] });
      queryClient.invalidateQueries({ queryKey: ['myPostAdoption'] });
      onOpenChange(false);
    },
    onError: (err) => {
      logger.error('PostAdoptionPauseDialog', { msg: 'pause failed', err: String(err) });
    },
  });

  const isLoading = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isLoading) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-primary" />
            Pausar acompanhamento
          </DialogTitle>
          <DialogDescription>
            As tarefas de acompanhamento serão pausadas temporariamente.
            {petName ? ` O registro de "${petName}" continuará intacto.` : ' O registro continuará intacto.'}{' '}
            O abrigo será notificado.
          </DialogDescription>
        </DialogHeader>

        {mutation.isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
            Erro ao pausar. Tente novamente.
          </p>
        )}

        <DialogFooter>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pausando…
              </>
            ) : (
              'Sim, pausar'
            )}
          </AlertDialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PostAdoptionPauseDialog;
