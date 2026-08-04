/**
 * @fileoverview PetTransferDialog — transfere pet pessoal para abrigo (V4).
 *
 * D-PERSONA-PET-TRANSFER (Q20): "Transferir para abrigo" no detalhe do pet.
 *  - Atualiza owner_type para 'organization' + owner_id para clubId
 *  - Audit log obrigatório
 *  - NÃO tem como desfazer (decisão irreversível, com confirmação forte)
 *
 * Mostra:
 *  - Lista de abrigos do user (memberships em club_members)
 *  - Se user não tem abrigo, oferece "Criar novo abrigo" (→ ShelterEntry)
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Building2, AlertTriangle, ArrowRight, Loader2, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { db } from '@/core/config/firebase';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { createAuditLog } from '@/core/services/auditService';
import { useUserClubMemberships } from '@/modules/organizations/hooks/useClubs';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { logger } from '@/core/lib/logger';
import { cn } from '@/core/lib/utils';

export function PetTransferDialog({ open, onOpenChange, pet, onTransferred }) {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_PET_TRANSFER);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: memberships = [], isLoading: isLoadingMemberships } = useUserClubMemberships(user?.uid);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1=selecionar abrigo, 2=confirmar irreversível

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedClubId(null);
      setConfirmText('');
      setError(null);
    }
  }, [open]);

  if (!enabled) return null;
  if (!pet) return null;
  if (pet.owner_type !== 'user') return null; // só transfere pets pessoais
  if (user?.uid !== pet.owner_id) return null; // só o dono pode transferir

  const handleTransfer = async () => {
    if (confirmText !== 'TRANSFERIR') {
      setError('Digite "TRANSFERIR" (em maiúsculas) para confirmar.');
      return;
    }
    if (!selectedClubId) {
      setError('Selecione um abrigo de destino.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Atualiza o pet
      await updateDoc(doc(db, 'pets', pet.id), {
        owner_type: 'organization',
        owner_id: selectedClubId,
        transferred_at: serverTimestamp(),
        transferred_by: user.uid,
        updated_at: serverTimestamp(),
      });

      // 2. Audit log (obrigatório)
      await createAuditLog({
        action: 'pet_transferred_to_shelter',
        actor: user,
        details: {
          pet_id: pet.id,
          pet_name: pet.title || pet.name || 'Sem nome',
          from_owner_type: 'user',
          from_owner_id: user.uid,
          to_owner_type: 'organization',
          to_owner_id: selectedClubId,
          irreversible: true,
        },
      });

      // 3. Callback
      onTransferred?.(selectedClubId);
      onOpenChange(false);
    } catch (err) {
      logger.error('[PetTransferDialog] transfer failed:', err);
      setError('Não foi possível transferir. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="pet-transfer-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Transferir pet para abrigo
          </DialogTitle>
          <DialogDescription>
            Esta ação é <strong>irreversível</strong>. O pet será vinculado
            ao abrigo e deixará de ser gerenciado por você como doador.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            {isLoadingMemberships ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : memberships.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Você ainda não é membro de nenhum abrigo.</p>
                <p className="mt-1 text-xs">
                  Crie um novo abrigo ou entre em um existente para poder transferir este pet.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/entrar/abrigo')}
                >
                  Criar ou entrar em abrigo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">Selecione o abrigo de destino:</p>
                <div className="space-y-2">
                  {memberships.map((m) => {
                    const club = m.club || m;
                    const isSelected = selectedClubId === (club.id || m.club_id);
                    return (
                      <button
                        key={club.id || m.club_id}
                        type="button"
                        onClick={() => setSelectedClubId(club.id || m.club_id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/50',
                        )}
                        data-testid={`transfer-club-${club.id || m.club_id}`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700" aria-hidden="true">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{club.name || club.title || 'Abrigo'}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.role === 'admin' ? 'Admin' : 'Membro'}
                          </p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!selectedClubId}
                    data-testid="pet-transfer-next"
                  >
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-medium">Atenção: ação irreversível.</p>
                  <p className="mt-1">
                    O pet <strong>{pet.title || pet.name || 'Sem nome'}</strong> será
                    vinculado permanentemente ao abrigo selecionado.
                    Você não poderá reverter esta ação.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-text" className="text-sm font-medium">
                Para confirmar, digite <strong>TRANSFERIR</strong> em maiúsculas:
              </label>
              <input
                id="confirm-text"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="TRANSFERIR"
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="text-sm text-rose-700" role="alert">{error}</p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                Voltar
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={isSubmitting || confirmText !== 'TRANSFERIR'}
                variant="destructive"
                data-testid="pet-transfer-confirm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  <>
                    Transferir permanentemente
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PetTransferDialog;
